import { logger } from "../../lib/logger";
import { getImageSource } from "../../lib/imageFocus";
import { fetchTmdbPersonDetails } from "../../lib/tmdbFetcher";
import { normalizeThemeName } from "../../lib/themeNormalizer";

import { isLocalScreenshotUrl, moveLocalScreenshotToContentFolder } from "../../lib/localScreenshot";
import { localizeContentImage, type ContentImageKind } from "../../lib/localContentImage";
import { generatePersonSlug, generateCompanySlug } from "../../lib/slugUtils";
import { saveSimilarityGroupForContent } from "../../lib/similarContentHelper";
import {
  notifyUsersOfNewEpisodes,
  notifyUsersOfNewSeason,
} from "../../lib/newSeasonNotificationHelper";

/**
 * Canonical list of roles considered as "cast" (actors).
 * Used by query, mutation, and helper resolvers for consistent filtering.
 */
export const ACTOR_ROLES = [
  "actor",
  "Actor",
  "voice_actor",
  "Voice_actor",
  "Voice",
  "voice",
];

type SortableCreditPerson = {
  id?: string | number | null;
  name?: string | null;
  order?: number | null;
  creditOrder?: number | null;
  tmdbId?: number | null;
  profileUrl?: string | null;
  profilePath?: string | null;
  character?: string | null;
  role?: string | null;
  department?: string | null;
  biography?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  placeOfBirth?: string | null;
};

function normalizeCreditOrderValue(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function getSortablePersonIdentity(item: SortableCreditPerson): {
  personId: string | null;
  personName: string | null;
} {
  const personId =
    item.id === null || item.id === undefined ? null : String(item.id).trim();
  const personName = item.name?.trim().toLocaleLowerCase() || null;

  return {
    personId: personId && personId.length > 0 ? personId : null,
    personName: personName && personName.length > 0 ? personName : null,
  };
}

async function buildExistingPersonContentCountMap(
  prisma: any,
  items: SortableCreditPerson[],
): Promise<Map<string, number>> {
  const personIds = new Set<string>();
  const personNames = new Set<string>();

  for (const item of items) {
    const { personId, personName } = getSortablePersonIdentity(item);
    if (personId) personIds.add(personId);
    if (personName) personNames.add(personName);
  }

  if (personIds.size === 0 && personNames.size === 0) {
    return new Map();
  }

  const people = await prisma.person.findMany({
    where: {
      OR: [
        ...(personIds.size > 0
          ? [
              {
                id: { in: Array.from(personIds) },
              },
            ]
          : []),
        ...Array.from(personNames).map((name) => ({
          name: { equals: name, mode: "insensitive" as const },
        })),
      ],
    },
    select: {
      id: true,
      name: true,
      contentRoles: {
        select: {
          contentId: true,
        },
      },
    },
  });

  const countMap = new Map<string, number>();
  for (const person of people) {
    const distinctContentCount = new Set(
      (person.contentRoles || []).map((role: { contentId: string }) => role.contentId),
    ).size;

    countMap.set(person.id, distinctContentCount);

    const normalizedName = person.name?.trim().toLocaleLowerCase();
    if (!normalizedName) {
      continue;
    }

    const existingNameCount = countMap.get(normalizedName) ?? 0;
    if (distinctContentCount > existingNameCount) {
      countMap.set(normalizedName, distinctContentCount);
    }
  }

  return countMap;
}

export async function sortCreditPeopleForSaving<T extends SortableCreditPerson>(
  prisma: any,
  items: T[],
): Promise<T[]> {
  if (!Array.isArray(items) || items.length <= 1) {
    return Array.isArray(items) ? [...items] : [];
  }

  const countMap = await buildExistingPersonContentCountMap(prisma, items);

  return items
    .map((item, originalIndex) => {
      const { personId, personName } = getSortablePersonIdentity(item);
      const existingContentCount = personId
        ? (countMap.get(personId) ?? countMap.get(personName || "") ?? 0)
        : (countMap.get(personName || "") ?? 0);
      const tieBreakerOrder =
        normalizeCreditOrderValue(item.creditOrder) ??
        normalizeCreditOrderValue(item.order);

      return {
        item,
        originalIndex,
        existingContentCount,
        tieBreakerOrder,
      };
    })
    .sort((left, right) => {
      if (right.existingContentCount !== left.existingContentCount) {
        return right.existingContentCount - left.existingContentCount;
      }

      if (left.tieBreakerOrder !== right.tieBreakerOrder) {
        if (left.tieBreakerOrder === null) return 1;
        if (right.tieBreakerOrder === null) return -1;
        return left.tieBreakerOrder - right.tieBreakerOrder;
      }

      if (left.originalIndex !== right.originalIndex) {
        return left.originalIndex - right.originalIndex;
      }

      return (left.item.name || "").localeCompare(right.item.name || "", "en", {
        sensitivity: "base",
      });
    })
    .map(({ item }) => item);
}

export async function normalizeCastJsonForSave(
  prisma: any,
  castJson: string | null | undefined,
): Promise<string | null> {
  if (!castJson) {
    return null;
  }

  try {
    const cast = JSON.parse(castJson);
    if (!Array.isArray(cast)) {
      return castJson;
    }

    const sortedCast = await sortCreditPeopleForSaving(prisma, cast);
    return sortedCast.length > 0 ? JSON.stringify(sortedCast) : null;
  } catch {
    return castJson;
  }
}

export async function normalizeCrewJsonForSave(
  prisma: any,
  crewJson: string | null | undefined,
): Promise<string | null> {
  if (!crewJson) {
    return null;
  }

  try {
    const crew = JSON.parse(crewJson);
    if (!Array.isArray(crew)) {
      return crewJson;
    }

    const sortedCrew = await sortCreditPeopleForSaving(prisma, crew);
    return sortedCrew.length > 0 ? JSON.stringify(sortedCrew) : null;
  } catch {
    return crewJson;
  }
}

// ==========================================
// Role mapping & PersonRole helpers
// ==========================================

/**
 * TMDB job title → canonical lowercase role mapping.
 * Used by processCrew to normalize role values.
 */
const JOB_TO_CANONICAL: Record<string, string> = {
  director: "director",
  writer: "writer",
  screenplay: "writer",
  story: "writer",
  novel: "writer",
  author: "author",
  translator: "translator",
  producer: "producer",
  "executive producer": "producer",
  "co-producer": "producer",
  creator: "creator",
  showrunner: "creator",
  "original music composer": "composer",
  music: "composer",
  composer: "composer",
  "director of photography": "cinematographer",
  cinematographer: "cinematographer",
  editor: "editor",
  "film editor": "editor",
};

/**
 * Canonical role → display label for PersonRole table.
 */
const CANONICAL_TO_LABEL: Record<string, string> = {
  actor: "Actor",
  voice_actor: "Voice Actor",
  director: "Director",
  writer: "Writer",
  author: "Author",
  translator: "Translator",
  producer: "Producer",
  creator: "Creator",
  composer: "Composer",
  cinematographer: "Cinematographer",
  editor: "Editor",
  crew: "Crew",
};

/**
 * Maps a TMDB job title to a canonical lowercase role string.
 * e.g. "Executive Producer" → "producer", "Director" → "director"
 * Only exact matches are mapped; unknown jobs return "crew".
 */
export function mapJobToCanonicalRole(job: string): string {
  return JOB_TO_CANONICAL[job.toLowerCase().trim()] || "crew";
}

/**
 * Finds or creates a PersonRole record by canonical role.
 * Ensures PersonRole table stays in sync with actual roles used.
 */
export async function findOrCreatePersonRole(
  prisma: any,
  canonicalRole: string,
): Promise<{ id: number }> {
  const label = CANONICAL_TO_LABEL[canonicalRole] || canonicalRole;

  let personRole = await prisma.personRole.findFirst({
    where: { label: { equals: label, mode: "insensitive" } },
  });

  if (!personRole) {
    personRole = await prisma.personRole.create({
      data: { label, contentTypeId: null },
    });
    logger.info(
      `[findOrCreatePersonRole] Created new PersonRole: "${label}" (id: ${personRole.id})`,
    );
  }

  return personRole;
}

/**
 * TMDB job title'dan doğru PersonRole kaydını bulur/oluşturur.
 * Bilinen roller (Director, Writer, Producer vb.) canonical role'e map edilir.
 * Bilinmeyen roller (Theme Song Performance, Supervising Technical Director vb.)
 * direkt job title ile PersonRole oluşturulur — "Crew" catch-all kullanılmaz.
 *
 * @returns {{ personRoleId: number; canonicalRole: string }} PersonRole ID ve role string
 */
export async function findOrCreatePersonRoleForJob(
  prisma: any,
  jobTitle: string,
  roleCache?: Map<string, { id: number; canonical: string }>,
): Promise<{ id: number; canonical: string }> {
  const cacheKey = jobTitle.toLowerCase().trim();

  // Check cache first
  if (roleCache?.has(cacheKey)) {
    return roleCache.get(cacheKey)!;
  }

  const canonical = mapJobToCanonicalRole(jobTitle);

  let result: { id: number; canonical: string };

  if (canonical !== "crew") {
    // Known role → use canonical PersonRole (Director, Writer, Producer, etc.)
    const personRole = await findOrCreatePersonRole(prisma, canonical);
    result = { id: personRole.id, canonical };
  } else {
    // Unknown role → use the actual job title as PersonRole label
    // e.g. "Theme Song Performance", "Supervising Technical Director"
    const displayLabel = jobTitle.trim();

    let personRole = await prisma.personRole.findFirst({
      where: { label: { equals: displayLabel, mode: "insensitive" } },
    });

    if (!personRole) {
      personRole = await prisma.personRole.create({
        data: { label: displayLabel, contentTypeId: null },
      });
      logger.info(
        `[findOrCreatePersonRoleForJob] Created specific PersonRole: "${displayLabel}" (id: ${personRole.id})`,
      );
    }

    result = { id: personRole.id, canonical: cacheKey };
  }

  // Update cache
  if (roleCache) {
    roleCache.set(cacheKey, result);
  }

  return result;
}

// ==========================================
// Helper: link many-to-many genre relations
// ==========================================
export async function linkGenres(
  prisma: any,
  contentId: string,
  genres: Array<{ id?: number; name: string }>,
  contentTypeId?: number | null,
) {
  for (const g of genres) {
    const normalizedName = g.name.trim().replace(/\s+/g, " ");
    if (!normalizedName) continue;

    let genre = null;

    // 1. Try find by name + contentTypeId (Case-Insensitive)
    // We prioritize name lookup because IDs might be from external systems (IGDB/TMDB)
    let where: any = { name: { equals: normalizedName, mode: "insensitive" } };
    if (contentTypeId) {
      if (contentTypeId === 1 || contentTypeId === 2) {
        where.OR = [
          { contentTypeId: 1 },
          { contentTypeId: 2 },
          { contentTypeId: null },
        ];
      } else {
        where.OR = [{ contentTypeId }, { contentTypeId: null }];
      }
    }
    genre = await prisma.genre.findFirst({ where });

    // Provider IDs are not local lookup IDs. Resolve by canonical name only.
    if (!genre) {
      try {
        genre = await prisma.genre.create({
          data: {
            name: normalizedName,
            contentTypeId:
              contentTypeId === 1 || contentTypeId === 2
                ? null
                : contentTypeId || null,
          },
        });
      } catch (err: any) {
        // Handle unique constraint violation (race condition or missed lookup)
        if (err.code === "P2002") {
          genre = await prisma.genre.findFirst({
            where: { name: { equals: normalizedName, mode: "insensitive" } },
          });
        }
        if (!genre) throw err;
      }
    }

    await prisma.contentGenre.upsert({
      where: { contentId_genreId: { contentId, genreId: genre.id } },
      update: {},
      create: { contentId, genreId: genre.id },
    });
  }
}

// ==========================================
// Helper: link generic many-to-many lookups
// ==========================================
export async function linkLookups(
  prisma: any,
  contentId: string,
  items: Array<{ id?: number; name: string }>,
  modelName: string,
  junctionModel: string,
  fkName: string,
) {
  for (const item of items) {
    const normalizedName = item.name.trim().replace(/\s+/g, " ");
    if (!normalizedName) continue;

    // Provider IDs can collide with local IDs; normalized names are canonical.
    let record = await (prisma as any)[modelName].findFirst({
      where: { name: { equals: normalizedName, mode: "insensitive" } },
    });

    // 3. Create if still not found (with duplicate handling)
    if (!record) {
      try {
        record = await (prisma as any)[modelName].create({
          data: { name: normalizedName },
        });
      } catch (err: any) {
        if (err.code === "P2002") {
          record = await (prisma as any)[modelName].findFirst({
            where: {
              name: { equals: normalizedName, mode: "insensitive" },
            },
          });
        }
        if (!record) throw err;
      }
    }
    const uniqueKey = `contentId_${fkName}`;
    await (prisma as any)[junctionModel].upsert({
      where: { [uniqueKey]: { contentId, [fkName]: record.id } },
      update: {},
      create: { contentId, [fkName]: record.id },
    });
  }
}

// ==========================================
// Helper: ensure languages exist in lookup table
// ==========================================
export async function ensureLanguagesExist(
  prisma: any,
  languages: Array<{ name: string }>,
) {
  if (!languages || languages.length === 0) return;
  
  for (const lang of languages) {
    if (!lang.name || lang.name.trim() === "") continue;
    
    const trimmedName = lang.name.trim().replace(/\s+/g, " ");
    if (!trimmedName) continue;
    let record = await prisma.language.findFirst({
      where: { name: { equals: trimmedName, mode: "insensitive" } },
    });

    if (!record) {
      try {
        await prisma.language.create({
          data: { name: trimmedName },
        });
      } catch (err: any) {
        if (err.code !== "P2002") {
          throw err;
        }
      }
    }
  }
}

const PLATFORM_NAME_ALIASES: Record<string, string> = {
  "pc (microsoft windows)": "PC",
  pc: "PC",
  mac: "macOS",
  "mac os": "macOS",
  "mac os x": "macOS",
  osx: "macOS",
};

export function normalizePlatformName(name: string): string {
  const trimmed = name.trim();
  const canonical = PLATFORM_NAME_ALIASES[trimmed.toLowerCase()];
  return canonical ?? trimmed;
}

/**
 * Platform records come from external providers like IGDB, so their numeric IDs
 * must never be treated as local DB IDs. We always resolve by canonical name.
 */
export async function linkPlatforms(
  prisma: any,
  contentId: string,
  items: Array<{ name: string }>,
) {
  const canonicalNames = Array.from(
    new Set(
      items
        .map((item) => normalizePlatformName(item.name))
        .filter((name) => name.length > 0),
    ),
  );

  for (const name of canonicalNames) {
    let record = await prisma.platform.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (!record) {
      try {
        record = await prisma.platform.create({
          data: { name },
        });
      } catch (err: any) {
        if (err.code === "P2002") {
          record = await prisma.platform.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
          });
        }
        if (!record) throw err;
      }
    }

    await prisma.contentPlatform.upsert({
      where: {
        contentId_platformId: {
          contentId,
          platformId: record.id,
        },
      },
      update: {},
      create: {
        contentId,
        platformId: record.id,
      },
    });
  }
}

// ==========================================
// Helper: link normalized theme relations
// ==========================================
export async function linkThemes(
  prisma: any,
  contentId: string,
  themes: Array<{ id?: number; name: string }>,
) {
  for (const item of themes) {
    const normalizedName = normalizeThemeName(item.name);

    if (!normalizedName) {
      continue;
    }

    let theme = await prisma.theme.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: "insensitive",
        },
      },
    });

    if (theme) {
      // If theme exists but name is different (e.g. casing), update it
      if (theme.name !== normalizedName) {
        theme = await prisma.theme.update({
          where: { id: theme.id },
          data: { name: normalizedName },
        });
      }
    }

    if (!theme) {
      try {
        theme = await prisma.theme.create({
          data: { name: normalizedName },
        });
      } catch (err: any) {
        if (err.code === "P2002") {
          theme = await prisma.theme.findFirst({
            where: {
              name: {
                equals: normalizedName,
                mode: "insensitive",
              },
            },
          });
        }

        if (!theme) {
          throw err;
        }
      }
    }

    await prisma.contentTheme.upsert({
      where: { contentId_themeId: { contentId, themeId: theme.id } },
      update: {},
      create: { contentId, themeId: theme.id },
    });
  }
}

// ==========================================
// Helper: link company relations
// ==========================================
// Map of role names to IDs (must match seed data)
const COMPANY_ROLE_NAMES: Record<number, string> = {
  1: "developer",
  2: "publisher",
  3: "bookpublisher",
  4: "gamepublisher",
  5: "gamedeveloper",
  6: "moviestudio",
};

/**
 * Ensure a companyRole exists in the DB. Auto-creates if missing.
 */
async function ensureCompanyRole(prisma: any, roleId: number): Promise<number> {
  const existing = await prisma.companyRole.findUnique({
    where: { id: roleId },
  });
  if (existing) return existing.id;

  // Auto-create the missing role
  const roleName = COMPANY_ROLE_NAMES[roleId] || `role_${roleId}`;
  logger.warn(
    `[linkCompanies] CompanyRole id=${roleId} not found, auto-creating as "${roleName}"`,
  );
  const created = await prisma.companyRole.create({
    data: { id: roleId, name: roleName },
  });
  return created.id;
}

export async function linkCompanies(
  prisma: any,
  contentId: string,
  companies: Array<{
    id?: string;
    name: string;
    companyRoleId: number;
    description?: string;
    headquarters?: string;
    logoUrl?: string;
    website?: string;
    foundingYear?: number;
  }>,
) {
  for (const c of companies) {
    // Validate that the companyRole exists (auto-create if missing)
    const validRoleId = await ensureCompanyRole(prisma, c.companyRoleId);

    let company = c.id
      ? await prisma.company.findUnique({ where: { id: c.id } })
      : await prisma.company.findFirst({
          where: { name: { equals: c.name, mode: "insensitive" } },
        });
    if (!company) {
      const companySlug = await generateCompanySlug(prisma, c.name);
      const companyLogoUrl = c.logoUrl
        ? await localizeContentImage(c.logoUrl, companySlug, "company")
        : null;
      company = await prisma.company.create({
        data: {
          id: companySlug,
          name: c.name,
          description: c.description,
          headquarters: c.headquarters,
          logoUrl: companyLogoUrl,
          website: c.website,
          foundingYear: c.foundingYear,
          defaultRoleIds: [validRoleId],
        },
      });
      logger.info(
        `[linkCompanies] Created company "${company.name}" (id=${company.id}) with roleId=${validRoleId}`,
      );
    } else {
      // Auto-assign role to company's defaultRoleIds if not already present
      const currentRoles: number[] = company.defaultRoleIds || [];
      if (!currentRoles.includes(validRoleId)) {
        await prisma.company.update({
          where: { id: company.id },
          data: { defaultRoleIds: [...currentRoles, validRoleId] },
        });
        logger.info(
          `[linkCompanies] Added roleId ${validRoleId} to company "${company.name}" (id: ${company.id})`,
        );
      }
    }
    await prisma.contentCompany.upsert({
      where: {
        contentId_companyId_companyRoleId: {
          contentId,
          companyId: company.id,
          companyRoleId: validRoleId,
        },
      },
      update: {},
      create: {
        contentId,
        companyId: company.id,
        companyRoleId: validRoleId,
      },
    });
  }
}

// ==========================================
// Helper: process cast (actors) from JSON
// ==========================================
export async function processCast(
  prisma: any,
  contentId: string,
  castJson: string,
) {
  try {
    const cast = await sortCreditPeopleForSaving(prisma, JSON.parse(castJson));
    if (!Array.isArray(cast)) throw new Error("Cast must be an array");

    // Find or create the "Actor" PersonRole once for all cast members
    const actorPersonRole = await findOrCreatePersonRole(prisma, "actor");

    for (const [index, actor] of cast.entries()) {
      if (!actor.name) continue;

      const rawTmdbPersonId = actor.tmdbId || actor.id; // Support both front-end mapping variations
      const tmdbPersonId =
        rawTmdbPersonId !== null && rawTmdbPersonId !== undefined
          ? Number(rawTmdbPersonId)
          : null;
      const profilePathOrUrl = actor.profileUrl || actor.profilePath;

      let person = await prisma.person.findFirst({
        where: { name: { equals: actor.name, mode: "insensitive" } },
      });

      if (!person) {
        if (tmdbPersonId && Number.isFinite(tmdbPersonId)) {
          try {
            const details = await fetchTmdbPersonDetails(tmdbPersonId);
            const personSlug = await generatePersonSlug(
              prisma,
              details.name || actor.name,
            );
            person = await prisma.person.create({
              data: {
                id: personSlug,
                name: details.name || actor.name,
                profileUrl: details.profilePath || profilePathOrUrl || null,
                gender:
                  details.gender === 1
                    ? "female"
                    : details.gender === 2
                      ? "male"
                      : "unknown",
                biography: details.biography || null,
                birthDate: details.birthday ? new Date(details.birthday) : null,
                deathDate: details.deathday ? new Date(details.deathday) : null,
                placeOfBirth: details.placeOfBirth || null,
              },
            });
            await new Promise((res) => setTimeout(res, 50)); // rate limit protection
          } catch (error) {
            const personSlug = await generatePersonSlug(prisma, actor.name);
            person = await prisma.person.create({
              data: {
                id: personSlug,
                name: actor.name,
                profileUrl: profilePathOrUrl || null,
                biography: actor.biography || null,
                birthDate: actor.birthDate ? new Date(actor.birthDate) : null,
                deathDate: actor.deathDate ? new Date(actor.deathDate) : null,
              },
            });
          }
        } else {
          const personSlug = await generatePersonSlug(prisma, actor.name);
          person = await prisma.person.create({
            data: {
              id: personSlug,
              name: actor.name,
              profileUrl: profilePathOrUrl || null,
              biography: actor.biography || null,
              birthDate: actor.birthDate ? new Date(actor.birthDate) : null,
              deathDate: actor.deathDate ? new Date(actor.deathDate) : null,
            },
          });
        }
      } else if (!person.profileUrl && profilePathOrUrl) {
        await prisma.person.update({
          where: { id: person.id },
          data: { profileUrl: profilePathOrUrl },
        });
      }
      // Ensure character length does not exceed 255 (Prisma schema limit)
      let characterName = actor.character || null;
      if (characterName && characterName.length > 255) {
        characterName = characterName.substring(0, 252) + "...";
      }

      // Check for existing to prevent P2002 unique constraint failed
      const existing = await prisma.contentPerson.findFirst({
        where: {
          contentId,
          personId: person.id,
          personRoleId: actorPersonRole.id,
          character: characterName,
        },
      });

      if (!existing) {
        await prisma.contentPerson.create({
          data: {
            contentId,
            personId: person.id,
            role: "actor",
            personRoleId: actorPersonRole.id,
            character: characterName,
            creditOrder: index,
          },
        });
      }
    }
    logger.debug(
      `[processCast] Processed ${cast.length} cast members for content ${contentId}`,
    );
  } catch (e) {
    logger.error(`[processCast] Failed to parse cast JSON:`, e);
    throw e;
  }
}

// ==========================================
// Franchise helper
// ==========================================
export async function findOrCreateFranchise(
  prisma: any,
  name: string,
): Promise<{ id: string }> {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  let franchise = await prisma.franchise.findFirst({
    where: { name: { equals: normalizedName, mode: "insensitive" } },
  });

  if (!franchise) {
    franchise = await prisma.franchise.create({
      data: { name: normalizedName },
    });
    logger.info(
      `[findOrCreateFranchise] Created new franchise: "${normalizedName}" (id: ${franchise.id})`,
    );
  }

  return franchise;
}

// ==========================================
// Helper: process crew from JSON
// ==========================================
export async function processCrew(
  prisma: any,
  contentId: string,
  crewJson: string,
) {
  try {
    const crew = await sortCreditPeopleForSaving(prisma, JSON.parse(crewJson));
    if (!Array.isArray(crew)) throw new Error("Crew must be an array");

    // Cache PersonRole lookups to avoid repeated DB queries
    const roleCache = new Map<string, { id: number; canonical: string }>();

    for (const [index, member] of crew.entries()) {
      if (!member.name) continue;

      const rawTmdbPersonId = member.tmdbId || member.id;
      const tmdbPersonId =
        rawTmdbPersonId !== null && rawTmdbPersonId !== undefined
          ? Number(rawTmdbPersonId)
          : null;
      const profilePathOrUrl = member.profileUrl || member.profilePath;

      let person = await prisma.person.findFirst({
        where: { name: { equals: member.name, mode: "insensitive" } },
      });

      if (!person) {
        if (tmdbPersonId && Number.isFinite(tmdbPersonId)) {
          try {
            const details = await fetchTmdbPersonDetails(tmdbPersonId);
            const personSlug = await generatePersonSlug(
              prisma,
              details.name || member.name,
            );
            person = await prisma.person.create({
              data: {
                id: personSlug,
                name: details.name || member.name,
                profileUrl: details.profilePath || profilePathOrUrl || null,
                gender:
                  details.gender === 1
                    ? "female"
                    : details.gender === 2
                      ? "male"
                      : "unknown",
                biography: details.biography || null,
                birthDate: details.birthday ? new Date(details.birthday) : null,
                deathDate: details.deathday ? new Date(details.deathday) : null,
                placeOfBirth: details.placeOfBirth || null,
              },
            });
            await new Promise((res) => setTimeout(res, 50)); // rate limit protection
          } catch (error) {
            const personSlug = await generatePersonSlug(prisma, member.name);
            person = await prisma.person.create({
              data: {
                id: personSlug,
                name: member.name,
                profileUrl: profilePathOrUrl || null,
                biography: member.biography || null,
                birthDate: member.birthDate ? new Date(member.birthDate) : null,
                deathDate: member.deathDate ? new Date(member.deathDate) : null,
              },
            });
          }
        } else {
          const personSlug = await generatePersonSlug(prisma, member.name);
          person = await prisma.person.create({
            data: {
              id: personSlug,
              name: member.name,
              profileUrl: profilePathOrUrl || null,
              biography: member.biography || null,
              birthDate: member.birthDate ? new Date(member.birthDate) : null,
              deathDate: member.deathDate ? new Date(member.deathDate) : null,
            },
          });
        }
      } else {
        const updateData: any = {};
        if (!person.profileUrl && profilePathOrUrl) updateData.profileUrl = profilePathOrUrl;
        if (!person.biography && member.biography) updateData.biography = member.biography;
        if (!person.birthDate && member.birthDate) updateData.birthDate = new Date(member.birthDate);
        if (!person.deathDate && member.deathDate) updateData.deathDate = new Date(member.deathDate);
        if (!(person as any).placeOfBirth && member.placeOfBirth) updateData.placeOfBirth = member.placeOfBirth;

        if (Object.keys(updateData).length > 0) {
          await prisma.person.update({
            where: { id: person.id },
            data: updateData,
          });
        }
      }

      // Split combined roles (e.g. "Director, Producer") into separate entries
      const roleParts = member.role
        ? member.role
            .split(",")
            .map((r: string) => r.trim())
            .filter(Boolean)
        : ["crew"];

      for (const jobTitle of roleParts) {
        // Use improved role mapping: known → canonical, unknown → actual job title
        const { id: personRoleId, canonical } =
          await findOrCreatePersonRoleForJob(
            prisma,
            jobTitle,
            roleCache as any,
          );

        // Avoid duplicate entries for same person+role+content
        const existing = await prisma.contentPerson.findFirst({
          where: {
            contentId,
            personId: person.id,
            personRoleId,
          },
        });

        // Ensure job, department, role lengths fit schema (100 or 50)
        let safeJobTitle = jobTitle;
        if (safeJobTitle && safeJobTitle.length > 100) {
          safeJobTitle = safeJobTitle.substring(0, 97) + "...";
        }

        let safeDepartment = member.department || null;
        if (safeDepartment && safeDepartment.length > 100) {
          safeDepartment = safeDepartment.substring(0, 97) + "...";
        }

        let safeRole = canonical;
        if (safeRole && safeRole.length > 50) {
          safeRole = safeRole.substring(0, 47) + "...";
        }

        if (!existing) {
          await prisma.contentPerson.create({
            data: {
              contentId,
              personId: person.id,
              role: safeRole,
              personRoleId,
              job: safeJobTitle,
              department: safeDepartment,
              creditOrder: index,
            },
          });
        }
      }
    }
    logger.debug(
      `[processCrew] Processed ${crew.length} crew members for content ${contentId}`,
    );
  } catch (e) {
    logger.error(`[processCrew] Failed to parse crew JSON:`, e);
    throw e;
  }
}

// ==========================================
// Helper: process TV seasons/episodes
// ==========================================
export async function processSeasons(
  prisma: any,
  contentId: string,
  seasonsJson: string,
) {
  try {
    const seasons = JSON.parse(seasonsJson);
    if (!Array.isArray(seasons)) throw new Error("Seasons must be an array");

    logger.info(
      `[processSeasons] Processing ${seasons.length} seasons for content ${contentId}`,
    );

    let totalRuntime = 0;
    let episodesWithRuntimeCount = 0;

    const validSeasonNumbers = new Set<number>();
    const validEpisodeMap = new Map<number, Set<number>>();
    const newSeasonNumbers: number[] = [];
    const newEpisodesBySeason = new Map<number, number[]>();

    for (const season of seasons) {
      const seasonNumber = season.seasonNumber ?? 1;
      validSeasonNumbers.add(seasonNumber);
      if (!validEpisodeMap.has(seasonNumber)) {
        validEpisodeMap.set(seasonNumber, new Set());
      }
      const existingSeason = await prisma.tvSeason.findUnique({
        where: {
          tvShowId_seasonNumber: {
            tvShowId: contentId,
            seasonNumber,
          },
        },
        select: { id: true },
      });

      const tvSeason = await prisma.tvSeason.upsert({
        where: {
          tvShowId_seasonNumber: {
            tvShowId: contentId,
            seasonNumber,
          },
        },
        update: {
          name: season.name || `Season ${seasonNumber}`,
          overview: season.overview || null,
          airDate: season.airDate ? new Date(season.airDate) : null,
          episodeCount: season.episodes?.length || 0,
          posterUrl: season.posterUrl || season.posterPath || null,
        },
        create: {
          tvShowId: contentId,
          seasonNumber,
          name: season.name || `Season ${seasonNumber}`,
          overview: season.overview || null,
          airDate: season.airDate ? new Date(season.airDate) : null,
          episodeCount: season.episodes?.length || 0,
          posterUrl: season.posterUrl || season.posterPath || null,
        },
      });

      if (!existingSeason) {
        newSeasonNumbers.push(seasonNumber);
      }

      if (season.episodes && Array.isArray(season.episodes)) {
        for (const ep of season.episodes) {
          const episodeNumber = ep.episodeNumber ?? 1;
          validEpisodeMap.get(seasonNumber)!.add(episodeNumber);

          const existingEpisode = await prisma.tvEpisode.findUnique({
            where: {
              tvShowId_seasonNumber_episodeNumber: {
                tvShowId: contentId,
                seasonNumber,
                episodeNumber,
              },
            },
            select: { id: true },
          });

          if (ep.runtime && typeof ep.runtime === "number" && ep.runtime > 0) {
            totalRuntime += ep.runtime;
            episodesWithRuntimeCount++;
          }

          await prisma.tvEpisode.upsert({
            where: {
              tvShowId_seasonNumber_episodeNumber: {
                tvShowId: contentId,
                seasonNumber,
                episodeNumber,
              },
            },
            update: {
              name: ep.name || null,
              overview: ep.overview || null,
              airDate: ep.airDate ? new Date(ep.airDate) : null,
              runtime: ep.runtime || null,
              stillUrl: ep.stillUrl || ep.stillPath || null,
            },
            create: {
              tvShowId: contentId,
              seasonId: tvSeason.id,
              seasonNumber,
              episodeNumber,
              name: ep.name || null,
              overview: ep.overview || null,
              airDate: ep.airDate ? new Date(ep.airDate) : null,
              runtime: ep.runtime || null,
              stillUrl: ep.stillUrl || ep.stillPath || null,
            },
          });

          if (existingSeason && !existingEpisode) {
            const seasonEpisodes = newEpisodesBySeason.get(seasonNumber) ?? [];
            seasonEpisodes.push(episodeNumber);
            newEpisodesBySeason.set(seasonNumber, seasonEpisodes);
          }
        }
      }
    }

    if (episodesWithRuntimeCount > 0) {
      const averageRuntime = Math.round(
        totalRuntime / episodesWithRuntimeCount,
      );
      await prisma.content.update({
        where: { id: contentId },
        data: { runtime: averageRuntime, averageDuration: averageRuntime },
      });
    } else {
      await prisma.content.update({
        where: { id: contentId },
        data: { runtime: null, averageDuration: null },
      });
    }

    // Cleanup seasons and episodes that were removed
    const existingSeasons = await prisma.tvSeason.findMany({
      where: { tvShowId: contentId },
    });
    logger.info(
      `[processSeasons] Cleanup: ${existingSeasons.length} existing seasons, ${validSeasonNumbers.size} valid season numbers`,
    );
    for (const dbSeason of existingSeasons) {
      if (!validSeasonNumbers.has(dbSeason.seasonNumber)) {
        const logs = await prisma.userEpisodeLog.count({
          where: { episode: { tvShowId: contentId, seasonNumber: dbSeason.seasonNumber } },
        });
        if (logs > 0) {
          throw new Error(`Season ${dbSeason.seasonNumber} has user logs and cannot be removed`);
        }
        logger.info(
          `[processSeasons] Deleting removed season ${dbSeason.seasonNumber} (id: ${dbSeason.id})`,
        );
        await prisma.tvEpisode.deleteMany({
          where: { tvShowId: contentId, seasonNumber: dbSeason.seasonNumber },
        });
        await prisma.tvSeason.delete({ where: { id: dbSeason.id } });
      } else {
        const validEps = validEpisodeMap.get(dbSeason.seasonNumber);
        if (validEps) {
          const removedEpisodeNumbers = { notIn: Array.from(validEps) };
          const logs = await prisma.userEpisodeLog.count({
            where: {
              episode: {
                tvShowId: contentId,
                seasonNumber: dbSeason.seasonNumber,
                episodeNumber: removedEpisodeNumbers,
              },
            },
          });
          if (logs > 0) {
            throw new Error(`Season ${dbSeason.seasonNumber} has episode logs that cannot be removed`);
          }
          await prisma.tvEpisode.deleteMany({
            where: {
              tvShowId: contentId,
              seasonNumber: dbSeason.seasonNumber,
              episodeNumber: removedEpisodeNumbers,
            },
          });
        }
      }
    }

    for (const seasonNumber of newSeasonNumbers) {
      await notifyUsersOfNewSeason(prisma, contentId, seasonNumber);
    }

    for (const [seasonNumber, episodeNumbers] of newEpisodesBySeason.entries()) {
      await notifyUsersOfNewEpisodes(prisma, contentId, seasonNumber, episodeNumbers);
    }

  } catch (e) {
    logger.error(`[processSeasons] Failed to parse seasons JSON:`, e);
    throw e;
  }
}

// ==========================================
// Helper: process similar contents (Bidirectional Map)
// ==========================================
export async function processSimilarContents(
  prisma: any,
  contentId: string,
  similarContentIds: string[],
) {
  await saveSimilarityGroupForContent(prisma, contentId, similarContentIds || []);
}

// ==========================================
// Helper: process content citations (Directed Map)
// ==========================================
export async function processContentCitations(
  prisma: any,
  contentId: string,
  citationsReceived?: { citingContentId: string; note?: string; imageUrl?: string }[],
  citationsMade?: { citingContentId: string; note?: string; imageUrl?: string }[]
) {
  // 1. Citations Received
  if (citationsReceived !== undefined) {
    const incomingCitingIds = citationsReceived.map((c) => c.citingContentId);
    await prisma.contentCitation.deleteMany({
      where: {
        citedContentId: contentId,
        citingContentId: { notIn: incomingCitingIds },
      },
    });

    for (const citation of citationsReceived) {
      await prisma.contentCitation.upsert({
        where: {
          citingContentId_citedContentId: {
            citingContentId: citation.citingContentId,
            citedContentId: contentId,
          },
        },
        update: {
          note: citation.note || null,
          imageUrl: citation.imageUrl || null,
        },
        create: {
          citingContentId: citation.citingContentId,
          citedContentId: contentId,
          note: citation.note || null,
          imageUrl: citation.imageUrl || null,
        },
      });
    }
  }

  // 2. Citations Made
  if (citationsMade !== undefined) {
    const incomingCitedIds = citationsMade.map((c) => c.citingContentId);
    await prisma.contentCitation.deleteMany({
      where: {
        citingContentId: contentId,
        citedContentId: { notIn: incomingCitedIds },
      },
    });

    for (const citation of citationsMade) {
      await prisma.contentCitation.upsert({
        where: {
          citingContentId_citedContentId: {
            citingContentId: contentId,
            citedContentId: citation.citingContentId,
          },
        },
        update: {
          note: citation.note || null,
          imageUrl: citation.imageUrl || null,
        },
        create: {
          citingContentId: contentId,
          citedContentId: citation.citingContentId,
          note: citation.note || null,
          imageUrl: citation.imageUrl || null,
        },
      });
    }
  }
}


// ==========================================
// Helper: save poster/backdrop images
// ==========================================
export async function saveImages(
  prisma: any,
  contentId: string,
  posterUrl: string | null | undefined,
  backdropUrl: string | null | undefined,
  isUpdate: boolean,
  additionalImages?: { filePath: string; type: string; id?: number }[],
  mediaPrepared = false,
) {
  let posterImageId: number | null = null;
  let backdropImageId: number | null = null;
  let clearPosterId = false;
  let clearBackdropId = false;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { posterImageId: true, backdropImageId: true },
  });

  // posterUrl === null → user explicitly removed the image as primary
  if (posterUrl === null && isUpdate) {
    clearPosterId = true;
    logger.info(`[saveImages] Primary poster unset for content ${contentId}`);
  } else if (posterUrl) {
    const finalPosterUrl = mediaPrepared
      ? posterUrl
      : await localizeContentImage(posterUrl, contentId, "poster");
    // If the image already exists in DB (we can find it by filePath)
    const existingPoster = await prisma.contentImage.findFirst({
      where: { contentId, filePath: finalPosterUrl, type: "poster" },
      orderBy: { id: "asc" },
    });

    if (existingPoster) {
      // Re-use existing image
      posterImageId = existingPoster.id;
    } else {
      const posterImage = await prisma.contentImage.create({
        data: {
          contentId,
          type: "poster",
          version: "500x750",
          filePath: finalPosterUrl,
        },
      });
      posterImageId = posterImage.id;
    }
  }

  // backdropUrl === null → user explicitly removed the image as primary
  if (backdropUrl === null && isUpdate) {
    clearBackdropId = true;
    logger.info(`[saveImages] Primary backdrop unset for content ${contentId}`);
  } else if (backdropUrl) {
    const finalBackdropUrl = mediaPrepared
      ? getImageSource(backdropUrl)
      : await localizeContentImage(backdropUrl, contentId, "backdrop");
    const backdropSource = getImageSource(finalBackdropUrl);
    const existingBackdrop = await prisma.contentImage.findFirst({
      where: {
        contentId,
        type: "backdrop",
        OR: [
          { filePath: backdropSource },
          { filePath: { startsWith: `${backdropSource}#` } },
        ],
      },
      orderBy: { id: "asc" },
    });

    if (existingBackdrop) {
      if (existingBackdrop.filePath !== finalBackdropUrl) {
        await prisma.contentImage.update({
          where: { id: existingBackdrop.id },
          data: { filePath: finalBackdropUrl },
        });
      }
      backdropImageId = existingBackdrop.id;
    } else {
      const backdropImage = await prisma.contentImage.create({
        data: {
          contentId,
          type: "backdrop",
          version: "original",
          filePath: finalBackdropUrl,
        },
      });
      backdropImageId = backdropImage.id;
    }
  }

  if (posterImageId || clearPosterId || backdropImageId || clearBackdropId) {
    const updateData: any = {};
    if (posterImageId) updateData.posterImageId = posterImageId;
    else if (clearPosterId) updateData.posterImageId = null;
    if (backdropImageId) updateData.backdropImageId = backdropImageId;
    else if (clearBackdropId) updateData.backdropImageId = null;
    await prisma.content.update({ where: { id: contentId }, data: updateData });
  }

  // Process additional alternative images if provided
  if (additionalImages) {
    if (isUpdate) {
      // Find all current images that are NOT the primary poster/backdrop
      const allImages = await prisma.contentImage.findMany({
        where: { contentId },
      });
      for (const old of allImages) {
        // Skip current primary images from deletion
        if (old.id === (posterImageId ?? (clearPosterId ? null : content?.posterImageId))) continue;
        if (old.id === (backdropImageId ?? (clearBackdropId ? null : content?.backdropImageId))) continue;

        const retained = additionalImages.some((image) =>
          image.id ? image.id === old.id : image.filePath === old.filePath,
        );
        if (old.filePath && !retained) {
          const [votes, preferences] = await Promise.all([
            prisma.userImageVote.count({ where: { imageId: old.id } }),
            prisma.userContentPreference.count({
              where: { OR: [{ posterImageId: old.id }, { backdropImageId: old.id }] },
            }),
          ]);
          if (votes > 0 || preferences > 0) {
            throw new Error(`Image ${old.id} has user activity and cannot be removed`);
          }
          await prisma.contentImage.delete({ where: { id: old.id } });
        }
      }
    }

    for (const img of additionalImages) {
      // Ensure we don't recreate the primary image
      if (
        img.filePath === posterUrl ||
        (img.type === "backdrop" && backdropUrl &&
          getImageSource(img.filePath) === getImageSource(backdropUrl))
      ) continue;

      let cleanUrl = img.filePath;
      if (!mediaPrepared && (img.type === "poster" || img.type === "backdrop")) {
        cleanUrl = await localizeContentImage(
          cleanUrl,
          contentId,
          img.type as ContentImageKind,
        );
      }
      const finalUrl = mediaPrepared
        ? cleanUrl
        : img.type === "screenshot"
          ? await localizeContentImage(cleanUrl, contentId, "screenshot")
          : await localizeContentImage(
              cleanUrl,
              contentId,
              img.type as ContentImageKind,
            );

      if (img.id) {
        const existing = await prisma.contentImage.findFirst({ where: { id: img.id, contentId } });
        if (
          existing?.type === img.type &&
          getImageSource(existing.filePath) === getImageSource(finalUrl)
        ) {
          if (existing.filePath !== finalUrl) {
            await prisma.contentImage.update({
              where: { id: existing.id },
              data: { filePath: finalUrl },
            });
          }
          continue;
        }
      }

      // Check if it already exists to avoid duplicates
      const exists = await prisma.contentImage.findFirst({
        where: { contentId, filePath: finalUrl },
      });
      if (!exists) {
        await prisma.contentImage.create({
          data: {
            contentId,
            type: img.type,
            version: img.type === "poster" ? "500x750" : "original",
            filePath: finalUrl,
          },
        });
      }
    }
  }
}

// ==========================================
// Helper: save content screenshots
// ==========================================
export async function saveScreenshots(
  prisma: any,
  contentId: string,
  screenshots: Array<{
    id?: number;
    imageUrl: string;
    difficulty?: number;
    order?: number;
    seasonNumber?: number | null;
    description?: string;
    isEnabledForQuiz?: boolean;
    isSpoiler?: boolean;
    isSensitive?: boolean;
  }>,
  isUpdate: boolean,
  mediaPrepared = false,
) {
  let oldScreenshots: any[] = [];
  
  if (isUpdate) {
    oldScreenshots = await prisma.contentScreenshot.findMany({
      where: { contentId },
    });
    const newScreenshotUrls = screenshots.filter((s) => !s.id).map((s) => s.imageUrl);
    const retainedScreenshotIds = new Set(screenshots.map((s) => s.id).filter(Boolean));

    const toDelete = oldScreenshots.filter(old =>
      old.imageUrl && !retainedScreenshotIds.has(old.id) && !newScreenshotUrls.includes(old.imageUrl),
    );
    
    // Keep files available so an edit can be reverted from its audit snapshot.
    const DELETE_BATCH_SIZE = 5;
    for (let i = 0; i < toDelete.length; i += DELETE_BATCH_SIZE) {
      const batch = toDelete.slice(i, i + DELETE_BATCH_SIZE);
      await Promise.all(batch.map(async (old) => {
        const votes = await prisma.userScreenshotVote.count({
          where: { screenshotId: old.id },
        });
        if (votes > 0) {
          throw new Error(`Screenshot ${old.id} has votes and cannot be removed`);
        }
        await prisma.contentScreenshot.delete({ where: { id: old.id } });
      }));
    }
  }

  // Create or update screenshots in batches
  const results: { id: string; originalIndex: number }[] = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < screenshots.length; i += BATCH_SIZE) {
    const batch = screenshots.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (s, index) => {
      const globalIndex = i + index;
      const existing = isUpdate
        ? oldScreenshots.find(old => s.id ? old.id === s.id : old.imageUrl === s.imageUrl)
        : undefined;
      const finalImageUrl = isLocalScreenshotUrl(s.imageUrl)
        ? moveLocalScreenshotToContentFolder(s.imageUrl, contentId)
        : mediaPrepared
          ? s.imageUrl
          : await localizeContentImage(s.imageUrl, contentId, "screenshot");
      const screenshotData = {
        imageUrl: finalImageUrl,
        difficulty: s.difficulty ?? 1,
        order: s.order ?? globalIndex,
        seasonNumber: s.seasonNumber ?? null,
        isEnabledForQuiz: s.isEnabledForQuiz ?? false,
        isSpoiler: s.isSpoiler ?? false,
        isSensitive: s.isSensitive ?? false,
      };

      if (existing) {
        const hasChanges = Object.entries(screenshotData).some(
          ([field, value]) => existing[field] !== value,
        );
        if (!hasChanges) {
          return { id: existing.id, originalIndex: globalIndex };
        }

        // Sadece değerleri güncelle (smart update)
        const updated = await prisma.contentScreenshot.update({
          where: { id: existing.id },
          data: screenshotData,
        });
        return { id: updated.id, originalIndex: globalIndex };
      } else {
        // Yeni ekle
        const created = await prisma.contentScreenshot.create({
          data: {
            ...(s.id && isUpdate ? { id: s.id } : {}),
            contentId,
            ...screenshotData,
          },
        });
        return { id: created.id, originalIndex: globalIndex };
      }
    }));
    results.push(...batchResults);
  }

  const sortedIds = results.sort((a, b) => a.originalIndex - b.originalIndex).map(r => r.id);

  await prisma.content.update({
    where: { id: contentId },
    data: { screenshotImageIds: sortedIds },
  });

  // Auto-disable: güncelleme sonrası aktif quiz screenshot sayısı 5'in altındaysa quiz'den kaldır
  if (isUpdate) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { isEnabledForQuiz: true },
    });
    if (content?.isEnabledForQuiz) {
      const enabledCount = await prisma.contentScreenshot.count({
        where: {
          contentId,
          isEnabledForQuiz: true,
        },
      });
      if (enabledCount < 5) {
        await prisma.content.update({
          where: { id: contentId },
          data: { isEnabledForQuiz: false },
        });
        logger.warn(
          `[saveScreenshots] Auto-disabled quiz for content ${contentId} (only ${enabledCount} active screenshots after update)`,
        );
      }
    }
  }
}

// ==========================================
// Helper: save content expansions/DLCs
// ==========================================
export async function saveExpansions(
  prisma: any,
  contentId: string,
  expansions: Array<{
    id?: number;
    name: string;
    description?: string;
    posterUrl?: string;
    releaseDate?: string;
    type?: string;
  }>,
  isUpdate: boolean,
  mediaPrepared = false,
) {
  const existing = isUpdate
    ? await prisma.expansion.findMany({ where: { contentId } })
    : [];
  const retainedIds = new Set<number>();
  for (const e of expansions) {
    let finalPosterUrl = e.posterUrl || null;
    if (finalPosterUrl && !mediaPrepared) {
      finalPosterUrl = await localizeContentImage(
        finalPosterUrl,
        `${contentId}-expansion-${e.id ?? e.name}`,
        "expansion",
      );
    }
    const data = {
      name: e.name,
      description: e.description || null,
      posterUrl: finalPosterUrl,
      releaseDate: e.releaseDate ? new Date(e.releaseDate) : null,
      type: e.type || "expansion",
    };
    const match = existing.find((row: any) =>
      !retainedIds.has(row.id) &&
      (e.id ? row.id === e.id : row.name === e.name && row.type === data.type),
    );
    if (match) {
      await prisma.expansion.update({ where: { id: match.id }, data });
      retainedIds.add(match.id);
    } else {
      const created = await prisma.expansion.create({
        data: { contentId, ...data, ...(e.id && isUpdate ? { id: e.id } : {}) },
      });
      retainedIds.add(created.id);
    }
  }
  for (const old of existing) {
    if (retainedIds.has(old.id)) continue;
    const logs = await prisma.userExpansionLog.count({ where: { expansionId: old.id } });
    if (logs > 0) {
      throw new Error(`Expansion ${old.id} has user logs and cannot be removed`);
    }
    await prisma.expansion.delete({ where: { id: old.id } });
  }
}

// ==========================================
// Helper: parse authors string/JSON
// ==========================================
export function parseAuthors(authors: string | undefined): string[] {
  if (!authors) return [];
  try {
    const parsed = JSON.parse(authors);
    return Array.isArray(parsed) ? parsed : [authors];
  } catch {
    return authors.includes(",")
      ? authors.split(",").map((a) => a.trim())
      : [authors];
  }
}

export function parseTranslators(translators: any): string[] {
  if (!translators) return [];
  if (Array.isArray(translators)) {
    return translators
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (typeof translators === "string") {
    try {
      const parsed = JSON.parse(translators);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item : item?.name))
          .filter(Boolean)
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated text.
    }

    return translators
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function syncDefaultBookPublication(
  prisma: any,
  contentId: string,
  input: any,
) {
  if (input.contentTypeId !== 4) return;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      title: true,
      isbn: true,
      pageCount: true,
      releaseDate: true,
      languages: true,
    },
  });

  if (!content) return;

  const publisherLink = await prisma.contentCompany.findFirst({
    where: { contentId, companyRoleId: 3 },
    select: { companyId: true },
  });
  const posterImage = await prisma.contentImage.findFirst({
    where: { contentId, type: "poster" },
    orderBy: [{ id: "desc" }],
    select: { filePath: true },
  });

  const resolvePublisherId = async (publication: any) => {
    if (publication.publisher?.id) {
      const company = await prisma.company.findUnique({
        where: { id: String(publication.publisher.id) },
        select: { id: true },
      });
      if (company) return company.id;
    }

    if (publication.publisher?.name) {
      const company = await prisma.company.findFirst({
        where: { name: { equals: publication.publisher.name, mode: "insensitive" } },
        select: { id: true },
      });
      if (company) return company.id;
    }

    return publisherLink?.companyId ?? null;
  };

  const submittedPublications =
    Array.isArray(input.bookPublications) && input.bookPublications.length > 0
      ? input.bookPublications
      : [
          {
            title: input.title || content.title,
            isbn: input.isbn ?? content.isbn ?? null,
            translators: input.translators,
            language: null,
            pageCount: input.pageCount ?? content.pageCount ?? null,
            coverUrl:
              input.posterUrl === null
                ? null
                : input.posterUrl || posterImage?.filePath || null,
            publishedDate:
              input.publishedDate ||
              input.releaseDate ||
              content.releaseDate?.toISOString().split("T")[0] ||
              null,
            isOriginal: true,
          },
        ];

  const keptPublicationIds: number[] = [];
  let hasOriginalPublication = submittedPublications.some(
    (publication: any) => publication.isOriginal,
  );
  let originalPublicationAssigned = false;

  for (const [index, publication] of submittedPublications.entries()) {
    const publisherId = await resolvePublisherId(publication);
    const isOriginal =
      publication.isOriginal && !originalPublicationAssigned
        ? true
        : !hasOriginalPublication && index === 0;
    if (isOriginal) {
      hasOriginalPublication = true;
      originalPublicationAssigned = true;
    }
    const publicationData = {
      title: publication.title || (index === 0 ? input.title || content.title : null),
      subtitle: publication.subtitle || null,
      isbn: publication.isbn ?? (index === 0 ? input.isbn ?? content.isbn : null) ?? null,
      publisherId,
      translators: parseTranslators(publication.translators),
      language: publication.language || null,
      pageCount:
        publication.pageCount ?? (index === 0 ? input.pageCount ?? content.pageCount : null) ?? null,
      coverUrl:
        publication.coverUrl === null
          ? null
          : publication.coverUrl ||
            (index === 0
              ? input.posterUrl === null
                ? null
                : input.posterUrl || posterImage?.filePath || null
              : null),
      publishedDate:
        publication.publishedDate ||
        (index === 0
          ? input.publishedDate ||
            input.releaseDate ||
            content.releaseDate?.toISOString().split("T")[0]
          : null) ||
        null,
      editionType: publication.editionType || null,
      format: publication.format || null,
      isOriginal,
      isAbridged: Boolean(publication.isAbridged),
    };

    if (publication.id) {
      const existing = await prisma.bookPublication.findFirst({
        where: { id: Number(publication.id), contentId },
        select: { id: true },
      });

      if (existing) {
        await prisma.bookPublication.update({
          where: { id: existing.id },
          data: publicationData,
        });
        keptPublicationIds.push(existing.id);
        continue;
      }
    }

    const created = await prisma.bookPublication.create({
      data: {
        contentId,
        ...publicationData,
        ...(publication.id ? { id: Number(publication.id) } : {}),
      },
      select: { id: true },
    });
    keptPublicationIds.push(created.id);
  }

  if (Array.isArray(input.bookPublications)) {
    const stalePublications = await prisma.bookPublication.findMany({
      where: {
        contentId,
        id: keptPublicationIds.length > 0 ? { notIn: keptPublicationIds } : undefined,
      },
      select: {
        id: true,
        _count: { select: { userContentLogs: true } },
      },
    });

    for (const publication of stalePublications) {
      if (publication._count.userContentLogs === 0) {
        await prisma.bookPublication.delete({ where: { id: publication.id } });
      }
    }
  }
}

// ==========================================
// Helper: fetch content as AdminContent
// ==========================================
export async function fetchAdminContent(prisma: any, id: string) {
  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      franchise: { select: { id: true, name: true } },
      genres: { include: { genre: true } },
      contentThemes: { include: { theme: true } },
      contentMoods: { include: { mood: true } },
      contentGameModes: { include: { gameMode: true } },
      contentGameEngines: { include: { gameEngine: true } },
      contentPerspectives: { include: { perspective: true } },
      contentPlatforms: { include: { platform: true } },
      ageRating: true,
      screenshots: { orderBy: { order: "asc" } },
      companies: { include: { company: true } },
      bookPublications: {
        include: { publisher: true },
        orderBy: [
          { consumeCount: "desc" },
          { totalRatingVotes: "desc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
      },
      expansions: true,
      images: {
        where: { type: { in: ["poster", "backdrop"] } },
        select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
      },
      people: {
        include: { person: true },
      },
      seasons: {
        include: {
          episodes: { orderBy: { episodeNumber: "asc" } },
        },
        orderBy: { seasonNumber: "asc" },
      },
      citationsReceived: {
        include: {
          citingContent: true,
        },
      },
      citationsMade: {
        include: {
          citedContent: true,
        },
      },
    },
  });

  if (!content) throw new Error(`Content not found: ${id}`);

  const posterUrl =
    content.images?.find((img: any) => img.type === "poster")?.filePath || null;
  const backdropUrl =
    content.images?.find((img: any) => img.type === "backdrop")?.filePath ||
    null;
  const primaryBookPublication = (content as any).bookPublications?.[0] || null;

  const cast = (content.people as any[])
    .sort((a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999))
    .filter((cp: any) => ACTOR_ROLES.includes(cp.role))
    .map((cp: any) => ({
      id: cp.person.id,
      name: cp.person.name,
      profileUrl: cp.person.profileUrl || null,
      role: cp.role,
      character: cp.character,
    }));

  const crew = (content.people as any[])
    .sort((a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999))
    .filter((cp: any) => !ACTOR_ROLES.includes(cp.role))
    .map((cp: any) => ({
      id: cp.person.id,
      name: cp.person.name,
      profileUrl: cp.person.profileUrl || null,
      role: cp.role,
      department: cp.department,
      job: cp.job,
    }));

  const seasons = (content.seasons as any[]).map((season: any) => ({
    seasonNumber: season.seasonNumber,
    name: season.name,
    overview: season.overview,
    airDate: season.airDate?.toISOString().split("T")[0],
    posterUrl: season.posterUrl || null,
    episodes: (season.episodes as any[]).map((ep: any) => ({
      episodeNumber: ep.episodeNumber,
      name: ep.name,
      overview: ep.overview,
      airDate: ep.airDate?.toISOString().split("T")[0],
      runtime: ep.runtime,
      stillUrl: ep.stillUrl,
    })),
  }));

  return {
    ...content,
    people: undefined,
    images: undefined,
    franchise: undefined,
    contentThemes: undefined,
    contentMoods: undefined,
    contentGameModes: undefined,
    contentGameEngines: undefined,
    contentPerspectives: undefined,
    contentPlatforms: undefined,
    posterUrl,
    backdropUrl,
    releaseDate: content.releaseDate?.toISOString().split("T")[0] || null,
    firstAirDate: content.firstAirDate?.toISOString().split("T")[0] || null,
    lastAirDate: content.lastAirDate?.toISOString().split("T")[0] || null,
    budget: content.budget ? content.budget.toString() : null,
    revenue: content.revenue ? content.revenue.toString() : null,
    franchiseId: content.franchiseId || null,
    franchiseName: (content as any).franchise?.name || null,
    averageDuration: content.averageDuration || null,
    authors: Array.isArray(content.authors)
      ? JSON.stringify(content.authors)
      : content.authors,
    primaryBookPublication,
    bookPublications: (content as any).bookPublications || [],
    cast: cast.length > 0 ? JSON.stringify(cast) : null,
    crew: crew.length > 0 ? JSON.stringify(crew) : null,
    seasons: seasons.length > 0 ? JSON.stringify(seasons) : null,
    genres: (content.genres as any[]).map((cg: any) => ({
      id: cg.genre.id,
      name: cg.genre.name,
    })),
    screenshots: content.screenshots || [],
    themes: ((content as any).contentThemes || []).map((ct: any) => ({
      id: ct.theme.id,
      name: ct.theme.name,
    })),
    moods: ((content as any).contentMoods || []).map((cm: any) => ({
      id: cm.mood.id,
      name: cm.mood.name,
    })),
    gameModes: ((content as any).contentGameModes || []).map((cgm: any) => ({
      id: cgm.gameMode.id,
      name: cgm.gameMode.name,
    })),
    gameEngines: ((content as any).contentGameEngines || []).map((cge: any) => ({
      id: cge.gameEngine.id,
      name: cge.gameEngine.name,
    })),
    perspectives: ((content as any).contentPerspectives || []).map(
      (cp: any) => ({ id: cp.perspective.id, name: cp.perspective.name }),
    ),
    platforms: ((content as any).contentPlatforms || []).map((cp: any) => ({
      id: cp.platform.id,
      name: cp.platform.name,
    })),
    ageRating: (content as any).ageRating || null,
    expansions: ((content as any).expansions || []).map((e: any) => ({
      ...e,
      releaseDate: e.releaseDate
        ? e.releaseDate instanceof Date
          ? e.releaseDate.toISOString().split("T")[0]
          : e.releaseDate
        : null,
    })),
    trailerUrl: content.trailerUrl || null,
    spotifyPlaylistUrl: content.spotifyPlaylistUrl || null,
    lockedFields: content.lockedFields || [],
    citationsReceived: (content.citationsReceived || []).map((cit: any) => ({
      id: cit.id,
      citingContentId: cit.citingContentId,
      citedContentId: cit.citedContentId,
      note: cit.note || null,
      imageUrl: cit.imageUrl || null,
      createdAt: cit.createdAt,
      updatedAt: cit.updatedAt,
      citingContent: cit.citingContent,
    })),
    citationsMade: (content.citationsMade || []).map((cit: any) => ({
      id: cit.id,
      citingContentId: cit.citingContentId,
      citedContentId: cit.citedContentId,
      note: cit.note || null,
      imageUrl: cit.imageUrl || null,
      createdAt: cit.createdAt,
      updatedAt: cit.updatedAt,
      citingContent: cit.citedContent, // Formda citingContent üzerinden poster okuduğumuz için citedContent'i citingContent anahtarına koyuyoruz
    })),
  };
}

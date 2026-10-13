import { PrismaClient } from "@prisma/client";
import { ContentCompanyInput } from "../../types/admin";
import {
  uploadImageIfBase64,
  deleteBunnyFile,
  isBunnyUrl,
  moveImageToContentFolder,
} from "../../lib/bunny";
import { generatePersonSlug, generateCompanySlug } from "../../lib/slugUtils";

export async function processCompanies(
  contentId: string,
  companies: ContentCompanyInput[] | undefined,
  prisma: PrismaClient,
): Promise<void> {
  if (companies === undefined) return;

  console.log(
    `🏢 [Admin] Processing ${companies.length} companies for content: ${contentId}`,
  );

  // Delete existing relationships first
  await prisma.contentCompany.deleteMany({
    where: { contentId },
  });

  if (companies.length === 0) return;

  // Role ID to name mapping for auto-creation
  const roleIdToName: Record<number, string> = {
    1: "developer",
    2: "publisher",
    3: "bookpublisher",
    4: "gamepublisher",
    5: "gamedeveloper",
    6: "moviestudio",
  };

  for (const companyInput of companies) {
    let company = await prisma.company.findFirst({
      where: { name: companyInput.name },
    });

    if (!company) {
      console.log(`  🆕 Creating new company: ${companyInput.name}`);
      const companySlug = await generateCompanySlug(prisma, companyInput.name);
      company = await prisma.company.create({
        data: {
          id: companySlug,
          name: companyInput.name,
          description: companyInput.description,
          headquarters: companyInput.headquarters,
          logoUrl: companyInput.logoUrl,
          website: companyInput.website,
          foundingYear: companyInput.foundingYear,
        },
      });
    }

    // Validate that the companyRoleId exists, auto-create if missing
    let roleId = companyInput.companyRoleId;
    const existingRole = await prisma.companyRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      const roleName = roleIdToName[roleId] || `role_${roleId}`;
      console.log(
        `  🆕 CompanyRole ID ${roleId} not found, creating: ${roleName}`,
      );
      try {
        await prisma.companyRole.create({
          data: { id: roleId, name: roleName },
        });
      } catch (err: any) {
        // If it was created by another concurrent request, just continue
        if (!err.message?.includes("Unique constraint")) {
          console.error(
            `  ⚠️ Failed to create CompanyRole ${roleId}:`,
            err.message,
          );
          throw err;
        }
      }
    }

    await prisma.contentCompany.create({
      data: {
        contentId,
        companyId: company.id,
        companyRoleId: roleId,
      },
    });
  }
}

export async function processCast(
  contentId: string,
  castJSON: string | undefined,
  prisma: any,
): Promise<void> {
  if (!castJSON) return;

  try {
    const cast = JSON.parse(castJSON);
    console.log("🎭 [Admin] Processing cast:", cast);

    for (const actor of cast) {
      if (!actor.name) continue;

      // Store uploaded profile images in Bunny Storage.
      let profileUrl = actor.profileUrl;
      if (profileUrl) {
        profileUrl = await uploadImageIfBase64(profileUrl, "person");
      }

      // Find or create Person
      let person = await prisma.person.findFirst({
        where: { name: actor.name },
      });

      if (!person) {
        const personSlug = await generatePersonSlug(prisma, actor.name);
        person = await prisma.person.create({
          data: {
            id: personSlug,
            name: actor.name,
            profileUrl: profileUrl || undefined,
          },
        });
        console.log("✨ [Admin] Created person:", person.name);
      } else if (profileUrl && !person.profileUrl) {
        // Update person with profileUrl if they don't have one
        person = await prisma.person.update({
          where: { id: person.id },
          data: { profileUrl: profileUrl },
        });
        console.log("🔄 [Admin] Updated person profileUrl:", person.name);
      }

      // Create ContentPerson relationship
      try {
        await prisma.contentPerson.create({
          data: {
            contentId,
            personId: person.id,
            role: actor.role || "actor",
            character: actor.character || undefined,
            creditOrder: actor.creditOrder || undefined,
          },
        });
        console.log("✅ [Admin] Created ContentPerson relationship:", {
          person: person.name,
          role: actor.role,
        });
      } catch (err: any) {
        // Silently ignore duplicate relationships
        if (!err.message.includes("unique")) {
          console.error(
            "⚠️ [Admin] Error creating ContentPerson:",
            err.message,
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ [Admin] Error processing cast:", err);
  }
}

export async function processCrew(
  contentId: string,
  crewJSON: string | undefined,
  prisma: any,
): Promise<void> {
  if (!crewJSON) return;

  try {
    const crew = JSON.parse(crewJSON);
    console.log("👥 [Admin] Processing crew:", crew);

    for (const crewMember of crew) {
      if (!crewMember.name) continue;

      // Store uploaded profile images in Bunny Storage.
      let profileUrl = crewMember.profileUrl;
      if (profileUrl) {
        profileUrl = await uploadImageIfBase64(profileUrl, "person");
      }

      // Find or create Person
      let person = await prisma.person.findFirst({
        where: { name: crewMember.name },
      });

      if (!person) {
        const personSlug = await generatePersonSlug(prisma, crewMember.name);
        person = await prisma.person.create({
          data: {
            id: personSlug,
            name: crewMember.name,
            profileUrl: profileUrl || undefined,
          },
        });
        console.log("✨ [Admin] Created person:", person.name);
      } else if (profileUrl && !person.profileUrl) {
        // Update person with profileUrl if they don't have one
        person = await prisma.person.update({
          where: { id: person.id },
          data: { profileUrl: profileUrl },
        });
        console.log("🔄 [Admin] Updated person profileUrl:", person.name);
      }

      // Create ContentPerson relationship
      try {
        await prisma.contentPerson.create({
          data: {
            contentId,
            personId: person.id,
            role: crewMember.role || "crew",
            department: crewMember.department || undefined,
            job: crewMember.job || undefined,
            creditOrder: crewMember.creditOrder || undefined,
          },
        });
        console.log("✅ [Admin] Created ContentPerson relationship:", {
          person: person.name,
          role: crewMember.role,
        });
      } catch (err: any) {
        // Silently ignore duplicate relationships
        if (!err.message.includes("unique")) {
          console.error(
            "⚠️ [Admin] Error creating ContentPerson:",
            err.message,
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ [Admin] Error processing crew:", err);
  }
}

export async function processSeasons(
  contentId: string,
  seasonsJSON: string | undefined,
  prisma: any,
): Promise<void> {
  if (!seasonsJSON) return;

  try {
    const seasons = JSON.parse(seasonsJSON);
    console.log("📺 [Admin] Processing seasons:", seasons);

    for (const season of seasons) {
      if (season.seasonNumber === undefined) continue;

      // Get existing season to check for old poster
      const existingSeason = await prisma.tvSeason.findUnique({
        where: {
          tvShowId_seasonNumber: {
            tvShowId: contentId,
            seasonNumber: season.seasonNumber,
          },
        },
        select: { id: true, posterUrl: true },
      });

      // Handle season poster update/removal
      let seasonPosterUrl = season.posterUrl;

      if (seasonPosterUrl === null || seasonPosterUrl === "") {
        // Remove the stored poster when it belongs to Bunny Storage.
        if (
          existingSeason?.posterUrl &&
          isBunnyUrl(existingSeason.posterUrl)
        ) {
          await deleteBunnyFile(existingSeason.posterUrl);
        }
        seasonPosterUrl = null;
      } else if (seasonPosterUrl) {
        // Delete the previous Bunny image when it is replaced.
        if (
          existingSeason?.posterUrl &&
          isBunnyUrl(existingSeason.posterUrl) &&
          seasonPosterUrl !== existingSeason.posterUrl &&
          !seasonPosterUrl.startsWith("data:")
        ) {
          await deleteBunnyFile(existingSeason.posterUrl);
        }
        // Upload a new base64 image to Bunny Storage.
        seasonPosterUrl = await uploadImageIfBase64(
          seasonPosterUrl,
          "seasonPoster",
        );
        if (seasonPosterUrl) {
          seasonPosterUrl = await moveImageToContentFolder(
            seasonPosterUrl,
            "blackbox/seasons",
            contentId,
          );
        }
      }

      // Create or update TvSeason
      const tvSeason = await prisma.tvSeason.upsert({
        where: {
          tvShowId_seasonNumber: {
            tvShowId: contentId,
            seasonNumber: season.seasonNumber,
          },
        },
        create: {
          tvShowId: contentId,
          seasonNumber: season.seasonNumber,
          name: season.name || `Season ${season.seasonNumber}`,
          overview: season.overview || undefined,
          airDate: season.airDate
            ? new Date(`${season.airDate}T00:00:00Z`)
            : undefined,
          episodeCount: season.episodes?.length || 0,
          posterUrl: seasonPosterUrl || undefined,
        },
        update: {
          name: season.name || `Season ${season.seasonNumber}`,
          overview: season.overview || undefined,
          airDate: season.airDate
            ? new Date(`${season.airDate}T00:00:00Z`)
            : undefined,
          episodeCount: season.episodes?.length || 0,
          posterUrl: seasonPosterUrl,
        },
      });

      console.log("📺 [Admin] Created/updated season:", {
        season: season.seasonNumber,
        name: tvSeason.name,
        airDate: tvSeason.airDate,
      });

      // Process episodes for this season
      if (season.episodes && Array.isArray(season.episodes)) {
        for (const episode of season.episodes) {
          if (episode.episodeNumber === undefined) continue;

          // Get existing episode to check for old still
          const existingEpisode = await prisma.tvEpisode.findUnique({
            where: {
              seasonId_episodeNumber: {
                seasonId: tvSeason.id,
                episodeNumber: episode.episodeNumber,
              },
            },
            select: { id: true, stillUrl: true },
          });

          // Handle episode still update/removal
          let episodeStillUrl = episode.stillUrl;

          if (episodeStillUrl === null || episodeStillUrl === "") {
            // Remove the stored still when it belongs to Bunny Storage.
            if (
              existingEpisode?.stillUrl &&
              isBunnyUrl(existingEpisode.stillUrl)
            ) {
              await deleteBunnyFile(existingEpisode.stillUrl);
            }
            episodeStillUrl = null;
          } else if (episodeStillUrl) {
            // Delete the previous Bunny image when it is replaced.
            if (
              existingEpisode?.stillUrl &&
              isBunnyUrl(existingEpisode.stillUrl) &&
              episodeStillUrl !== existingEpisode.stillUrl &&
              !episodeStillUrl.startsWith("data:")
            ) {
              await deleteBunnyFile(existingEpisode.stillUrl);
            }
            // Upload a new base64 image to Bunny Storage.
            episodeStillUrl = await uploadImageIfBase64(
              episodeStillUrl,
              "episodeStill",
            );
            if (episodeStillUrl) {
              episodeStillUrl = await moveImageToContentFolder(
                episodeStillUrl,
                "blackbox/episodes",
                contentId,
              );
            }
          }

          await prisma.tvEpisode.upsert({
            where: {
              seasonId_episodeNumber: {
                seasonId: tvSeason.id,
                episodeNumber: episode.episodeNumber,
              },
            },
            create: {
              seasonId: tvSeason.id,
              episodeNumber: episode.episodeNumber,
              name: episode.name || `Episode ${episode.episodeNumber}`,
              overview: episode.overview || undefined,
              airDate: episode.airDate
                ? new Date(`${episode.airDate}T00:00:00Z`)
                : undefined,
              runtime: episode.runtime || undefined,
              stillUrl: episodeStillUrl || undefined,
            },
            update: {
              name: episode.name || `Episode ${episode.episodeNumber}`,
              overview: episode.overview || undefined,
              airDate: episode.airDate
                ? new Date(`${episode.airDate}T00:00:00Z`)
                : undefined,
              runtime: episode.runtime || undefined,
              stillUrl: episodeStillUrl,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ [Admin] Error processing seasons:", err);
  }
}

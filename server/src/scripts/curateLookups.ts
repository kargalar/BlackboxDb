import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 1. MOODS CATALOG ─────────────────────────────────────────
export const ESSENTIAL_MOODS = [
  "Dark & Gritty",
  "Suspenseful & Tense",
  "Uplifting & Inspiring",
  "Melancholic & Sad",
  "Fun & Hilarious",
  "Chill & Relaxing",
  "Thought-Provoking",
  "Nostalgic",
  "Romantic",
  "Epic & Grand",
  "Mysterious & Intriguing",
  "Intense & Action-Packed",
  "Creepy & Eerie",
  "Absurd & Surreal",
  "Heartwarming & Wholesome",
  "Chaotic & Wild",
];

// Map old mood-like themes to proper Moods
const THEME_TO_MOOD_MAP: Record<string, string> = {
  amused: "Fun & Hilarious",
  hilarious: "Fun & Hilarious",
  funny: "Fun & Hilarious",
  comedy: "Fun & Hilarious",
  suspenseful: "Suspenseful & Tense",
  suspense: "Suspenseful & Tense",
  tense: "Suspenseful & Tense",
  thriller: "Suspenseful & Tense",
  dramatic: "Thought-Provoking",
  excited: "Intense & Action-Packed",
  intense: "Intense & Action-Packed",
  absurd: "Absurd & Surreal",
  surrealism: "Absurd & Surreal",
  surreal: "Absurd & Surreal",
  admiring: "Uplifting & Inspiring",
  inspirational: "Uplifting & Inspiring",
  melancholy: "Melancholic & Sad",
  melancholic: "Melancholic & Sad",
  depressing: "Melancholic & Sad",
  sadness: "Melancholic & Sad",
  dark: "Dark & Gritty",
  gritty: "Dark & Gritty",
  creepy: "Creepy & Eerie",
  eerie: "Creepy & Eerie",
  disturbing: "Creepy & Eerie",
  nostalgia: "Nostalgic",
  nostalgic: "Nostalgic",
  epic: "Epic & Grand",
  mysterious: "Mysterious & Intriguing",
  mystery: "Mysterious & Intriguing",
  heartwarming: "Heartwarming & Wholesome",
  wholesome: "Heartwarming & Wholesome",
  relaxing: "Chill & Relaxing",
  peaceful: "Chill & Relaxing",
  calm: "Chill & Relaxing",
  chaotic: "Chaotic & Wild",
  crazy: "Chaotic & Wild",
};

// ─── 2. CANONICAL THEMES CATALOG ──────────────────────────────
export const CANONICAL_THEMES: Record<string, string[]> = {
  // Sci-Fi & Cyber
  "Cyberpunk": ["cyberpunk", "cyber-punk", "cyberspace", "high tech low life"],
  "Steampunk": ["steampunk", "steam-punk", "victorian sci-fi"],
  "Post-Apocalyptic": ["post-apocalyptic", "post apocalyptic", "after the end", "wasteland", "apocalypse"],
  "Dystopia": ["dystopia", "dystopian", "dystopian future", "totalitarianism", "oppressive regime"],
  "Utopia": ["utopia", "utopian"],
  "Space Exploration": ["space", "space travel", "outer space", "spaceship", "interstellar", "astronaut", "mars", "moon"],
  "Time Travel": ["time travel", "time loop", "time paradox", "temporal", "timetravel"],
  "Artificial Intelligence": ["artificial intelligence", "ai", "android", "cyborg", "robot", "robotics", "sentient ai"],
  "Virtual Reality": ["virtual reality", "vr", "simulation", "simulated reality", "metaverse"],
  "Alien Invasion": ["alien", "aliens", "extraterrestrial", "alien invasion", "ufo", "first contact"],
  "Transhumanism": ["transhumanism", "genetic engineering", "cybernetic", "human enhancement", "cloning", "clone"],
  "Multiverse": ["multiverse", "alternate reality", "parallel universe", "parallel world", "dimension travel"],
  "Alternate History": ["alternate history", "what if", "alternative timeline"],

  // Adventure & World
  "Survival": ["survival", "wilderness survival", "deserted island", "castaway", "surviving"],
  "Open World": ["open world", "free roam", "sandbox world"],
  "Exploration": ["exploration", "expedition", "uncharted", "treasure hunt", "archaeology", "adventurer"],
  "Deep Sea": ["deep sea", "underwater", "ocean", "submarine", "abyss"],
  "Lost Worlds & Ruins": ["lost world", "ancient ruins", "hidden city", "atlantis"],
  "Wilderness & Nature": ["wilderness", "jungle", "forest", "nature", "mountain", "desert"],

  // Crime, Noir & Thriller
  "Noir": ["noir", "film noir", "hardboiled", "cynical detective"],
  "Neo-Noir": ["neo-noir", "neo noir", "modern noir"],
  "Heist": ["heist", "bank robbery", "caper", "robbery", "master thief", "ocean's"],
  "Murder Mystery": ["murder", "murder mystery", "homicide", "whodunit", "locked room mystery"],
  "Psychological": ["psychological", "mind game", "paranoia", "hallucination", "mental illness", "psychiatrist"],
  "Serial Killer": ["serial killer", "serial murder", "psychopath"],
  "Organized Crime": ["organized crime", "mafia", "mob", "gangster", "cartel", "yakuza", "triad"],
  "Espionage & Spy": ["espionage", "spy", "secret agent", "covert operations", "cia", "mi6", "undercover"],
  "Conspiracy": ["conspiracy", "conspiracy theory", "cover-up", "secret society", "deep state"],
  "Detective & Investigation": ["detective", "police", "investigation", "private eye", "sleuth", "forensics"],
  "Revenge": ["revenge", "vengeance", "payback", "getting even", "vendetta"],
  "Law & Justice": ["law", "lawyer", "courtroom", "legal drama", "judge", "trial"],

  // Supernatural & Fantasy
  "Dark Fantasy": ["dark fantasy", "grimdark", "dark magic"],
  "High Fantasy": ["high fantasy", "epic fantasy", "sword and sorcery", "elves", "dragons", "fantasy world"],
  "Mythology & Folklore": ["mythology", "greek mythology", "norse mythology", "folklore", "legend", "fairytale"],
  "Superhero": ["superhero", "superheroes", "super power", "masked hero", "comic book hero", "vigilante"],
  "Magic & Sorcery": ["magic", "witch", "wizard", "sorcery", "spell", "alchemist"],
  "Monsters & Kaiju": ["monster", "monsters", "kaiju", "giant monster", "godzilla", "creature"],
  "Vampires": ["vampire", "vampires", "bloodsucker", "dracula"],
  "Werewolves": ["werewolf", "werewolves", "lycanthrope"],
  "Zombies & Undead": ["zombie", "zombies", "undead", "living dead", "zombie apocalypse", "zombie horror"],
  "Paranormal & Ghosts": ["ghost", "ghosts", "haunted house", "haunting", "poltergeist", "supernatural", "spirit", "demon", "exorcism"],
  "Cosmic Horror": ["cosmic horror", "lovecraftian", "eldritch", "madness"],

  // Emotion & Relationships
  "Coming of Age": ["coming of age", "youth", "growing up", "adolescence", "loss of innocence"],
  "Friendship": ["friendship", "buddy", "companionship", "best friends", "bromance"],
  "Family Dynamics": ["family", "parent child relationship", "father son relationship", "mother daughter relationship", "sibling relationship", "dysfunctional family", "parenthood"],
  "Romance & Love": ["love", "romance", "romantic", "soulmates", "star-crossed lovers", "first love", "forbidden love"],
  "Grief & Loss": ["grief", "loss of loved one", "mourning", "bereavement", "coping with death"],
  "Redemption": ["redemption", "second chance", "atonement", "seeking forgiveness"],
  "Identity & Self-Discovery": ["identity", "self-discovery", "finding oneself", "existential journey", "double life"],
  "Loneliness & Isolation": ["loneliness", "isolation", "alienation", "solitude", "outcast"],

  // History & Warfare
  "Warfare & Military": ["warfare", "military", "soldier", "army", "combat", "battlefield", "veteran"],
  "World War II": ["world war ii", "wwii", "ww2", "nazi", "holocaust", "d-day"],
  "Cold War": ["cold war", "soviet union", "ussr", "iron curtain"],
  "Medieval": ["medieval", "middle ages", "knights", "castle", "crusades", "feudal"],
  "Feudal Japan": ["samurai", "ninja", "feudal japan", "shogun", "bushido"],
  "Ancient World": ["ancient rome", "ancient greece", "ancient egypt", "antiquity", "gladiator"],
  "Revolution & Rebellion": ["revolution", "rebellion", "resistance", "insurgency", "freedom fighters"],

  // Society, Culture & Philosophy
  "Existentialism": ["existentialism", "meaning of life", "human condition", "nihilism"],
  "Social Satire": ["satire", "social satire", "black comedy", "dark comedy", "parody"],
  "Class Struggle": ["class struggle", "poverty", "wealth inequality", "social class", "rich vs poor"],
  "Morality & Ethics": ["morality", "moral dilemma", "ethics", "good vs evil", "corruption"],
  "Corporate Greed": ["corporate greed", "mega corporation", "capitalism", "corrupt corporation"],
  "Surveillance State": ["surveillance", "big brother", "surveillance state", "loss of privacy"],
  "Music & Art": ["musical", "musician", "band", "artist", "painting", "art world"],
  "Sports & Competition": ["sports", "tournament", "athlete", "boxing", "racing", "underdog champion"],
  "Martial Arts": ["martial arts", "kung fu", "karate", "mma", "hand to hand combat"],
  "School & University": ["high school", "college", "university", "boarding school", "academia"],
  "Based on True Story": ["based on true story", "biography", "true crime", "biographical"],
  "Based on Novel or Book": ["based on novel or book", "literary adaptation", "novel adaptation"],
  "Comic Book Adaptation": ["based on comic", "comic book adaptation", "graphic novel"],
  "Anime & Manga": ["anime", "manga", "anime style"],
  "Stealth": ["stealth", "sneaking", "assassin", "ninja"],
  "Family & Kids": ["kids", "children", "family friendly"],
  "LGBTQ+": ["lgbt", "lgbtq", "queer", "gay theme", "lesbian", "transgender"],
  "Black & White": ["black and white", "monochrome"],
};

// ─── 3. ESSENTIAL LANGUAGES CATALOG ───────────────────────────
export const ESSENTIAL_LANGUAGES = [
  "Turkish",
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Mandarin",
  "Cantonese",
  "Russian",
  "Arabic",
  "Hindi",
  "Portuguese",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Polish",
  "Greek",
  "Hebrew",
  "Persian",
  "Czech",
  "Hungarian",
  "Romanian",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Tagalog",
  "Ukrainian",
  "Kurdish",
  "Azerbaijani",
  "Serbian",
  "Croatian",
  "Bulgarian",
  "Latin",
  "Irish",
  "Icelandic",
  "Urdu",
  "Bengali",
  "Punjabi",
  "Tamil",
  "Malayalam",
  "No Language",
];

// Helper to normalize strings for comparison
function norm(str: string): string {
  return str.toLowerCase().trim().replace(/[-_]/g, " ").replace(/\s+/g, " ");
}

export async function curateAll(apply: boolean = false) {
  console.log(`\n===============================================================`);
  console.log(`🧹 BLACKBOX DB LOOKUP CATALOG CURATION (apply: ${apply})`);
  console.log(`===============================================================\n`);

  // ─────────────────────────────────────────────────────────────
  // 1. MOODS
  // ─────────────────────────────────────────────────────────────
  console.log(`\n▶ [1/4] CURATING MOODS...`);
  const existingMoods = await prisma.mood.findMany();
  const existingMoodMap = new Map(existingMoods.map((m) => [norm(m.name), m.id]));

  let moodsCreated = 0;
  let mockMoodId = 1000;
  for (const moodName of ESSENTIAL_MOODS) {
    if (!existingMoodMap.has(norm(moodName))) {
      if (apply) {
        const created = await prisma.mood.create({ data: { name: moodName } });
        existingMoodMap.set(norm(moodName), created.id);
      } else {
        existingMoodMap.set(norm(moodName), mockMoodId++);
      }
      moodsCreated++;
    }
  }
  console.log(`  - Essential Moods Target: ${ESSENTIAL_MOODS.length}`);
  console.log(`  - New Moods to create: ${moodsCreated}`);

  // Populate ContentMood from mood-like themes
  let contentMoodsMapped = 0;
  const moodThemeKeys = Object.keys(THEME_TO_MOOD_MAP);
  const matchingThemes = await prisma.theme.findMany({
    where: {
      OR: moodThemeKeys.map((k) => ({ name: { equals: k, mode: "insensitive" } })),
    },
    include: { contentThemes: { select: { contentId: true } } },
  });

  for (const theme of matchingThemes) {
    const targetMoodName = THEME_TO_MOOD_MAP[norm(theme.name)];
    if (!targetMoodName) continue;
    const moodId = existingMoodMap.get(norm(targetMoodName));

    if (moodId && theme.contentThemes.length > 0) {
      contentMoodsMapped += theme.contentThemes.length;
      if (apply) {
        await prisma.contentMood.createMany({
          data: theme.contentThemes.map((ct) => ({
            contentId: ct.contentId,
            moodId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
  console.log(`  - Content-Mood associations mapped from themes: ${contentMoodsMapped}`);

  // ─────────────────────────────────────────────────────────────
  // 2. GENRES
  // ─────────────────────────────────────────────────────────────
  console.log(`\n▶ [2/4] CURATING GENRES (Consolidating duplicates)...`);
  const allGenres = await prisma.genre.findMany({
    include: { _count: { select: { contentGenres: true } } },
  });

  // Consolidate "Adventure" (#36 into #6)
  const adventureGame = allGenres.find((g) => g.id === 36);
  const adventureGeneral = allGenres.find((g) => g.id === 6);
  if (adventureGame && adventureGeneral) {
    console.log(`  - Merging Genre 'Adventure' (#36, ${adventureGame._count.contentGenres} items) into (#6, ${adventureGeneral._count.contentGenres} items)...`);
    if (apply) {
      const rels = await prisma.contentGenre.findMany({
        where: { genreId: adventureGame.id },
        select: { contentId: true },
      });
      if (rels.length > 0) {
        await prisma.contentGenre.createMany({
          data: rels.map((r) => ({ contentId: r.contentId, genreId: adventureGeneral.id })),
          skipDuplicates: true,
        });
        await prisma.contentGenre.deleteMany({ where: { genreId: adventureGame.id } });
      }
      await prisma.genre.delete({ where: { id: adventureGame.id } });
      await prisma.genre.update({ where: { id: adventureGeneral.id }, data: { contentTypeId: null } });
    }
  }

  // Consolidate "Music" (#56 into #15)
  const musicGame = allGenres.find((g) => g.id === 56);
  const musicGeneral = allGenres.find((g) => g.id === 15);
  if (musicGame && musicGeneral) {
    console.log(`  - Merging Genre 'Music' (#56, ${musicGame._count.contentGenres} items) into (#15, ${musicGeneral._count.contentGenres} items)...`);
    if (apply) {
      const rels = await prisma.contentGenre.findMany({
        where: { genreId: musicGame.id },
        select: { contentId: true },
      });
      if (rels.length > 0) {
        await prisma.contentGenre.createMany({
          data: rels.map((r) => ({ contentId: r.contentId, genreId: musicGeneral.id })),
          skipDuplicates: true,
        });
        await prisma.contentGenre.deleteMany({ where: { genreId: musicGame.id } });
      }
      await prisma.genre.delete({ where: { id: musicGame.id } });
      await prisma.genre.update({ where: { id: musicGeneral.id }, data: { contentTypeId: null } });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. THEMES
  // ─────────────────────────────────────────────────────────────
  console.log(`\n▶ [3/4] CURATING THEMES (Mapping 2300+ keywords to ~75 canonical themes)...`);
  const allThemes = await prisma.theme.findMany({
    include: { _count: { select: { contentThemes: true } } },
  });
  console.log(`  - Current raw themes in database: ${allThemes.length}`);

  // Build synonym lookup map: norm(keyword) -> canonicalThemeName
  const keywordToCanonical = new Map<string, string>();
  for (const [canonicalName, synonyms] of Object.entries(CANONICAL_THEMES)) {
    keywordToCanonical.set(norm(canonicalName), canonicalName);
    for (const syn of synonyms) {
      keywordToCanonical.set(norm(syn), canonicalName);
    }
  }

  // Map each existing theme to a canonical theme if matching
  const mappedCanonicalIds = new Map<string, number>(); // canonicalName -> themeId

  // Ensure all canonical themes exist in DB
  const canonicalNames = Object.keys(CANONICAL_THEMES);
  for (const name of canonicalNames) {
    const existing = allThemes.find((t) => norm(t.name) === norm(name));
    if (existing) {
      mappedCanonicalIds.set(name, existing.id);
    } else if (apply) {
      const created = await prisma.theme.create({ data: { name } });
      mappedCanonicalIds.set(name, created.id);
    }
  }

  let mappedRelationsCount = 0;
  const canonicalIdsToKeep = new Set<number>();

  for (const [name, syns] of Object.entries(CANONICAL_THEMES)) {
    const targetId = mappedCanonicalIds.get(name);
    if (targetId) canonicalIdsToKeep.add(targetId);

    // Find all raw themes that match this canonical theme or any of its synonyms
    const matchingRaw = allThemes.filter((t) => {
      const n = norm(t.name);
      return n === norm(name) || syns.some((s) => norm(s) === n);
    });

    for (const raw of matchingRaw) {
      if (raw.id === targetId) continue;
      // Transfer content relations
      if (raw._count.contentThemes > 0) {
        mappedRelationsCount += raw._count.contentThemes;
        if (apply && targetId) {
          const rels = await prisma.contentTheme.findMany({
            where: { themeId: raw.id },
            select: { contentId: true },
          });
          if (rels.length > 0) {
            await prisma.contentTheme.createMany({
              data: rels.map((r) => ({ contentId: r.contentId, themeId: targetId })),
              skipDuplicates: true,
            });
          }
        }
      }
    }
  }

  console.log(`  - Canonical Themes established: ${canonicalNames.length}`);
  console.log(`  - Content-Theme associations transferred to canonical themes: ${mappedRelationsCount}`);

  // Delete non-canonical junk themes (credits, cities, random 1-off words)
  const junkThemes = allThemes.filter((t) => !canonicalIdsToKeep.has(t.id));
  console.log(`  - Non-canonical / Junk themes to prune: ${junkThemes.length}`);

  if (apply) {
    const junkIds = junkThemes.map((t) => t.id);
    if (junkIds.length > 0) {
      // Chunk delete to avoid parameter limit
      const chunkSize = 500;
      for (let i = 0; i < junkIds.length; i += chunkSize) {
        const chunk = junkIds.slice(i, i + chunkSize);
        await prisma.contentTheme.deleteMany({ where: { themeId: { in: chunk } } });
        await prisma.theme.deleteMany({ where: { id: { in: chunk } } });
      }
    }
    console.log(`  - Successfully pruned ${junkThemes.length} junk themes!`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LANGUAGES
  // ─────────────────────────────────────────────────────────────
  console.log(`\n▶ [4/4] CURATING LANGUAGES...`);
  const allDbLanguages = await prisma.language.findMany();
  console.log(`  - Current languages in database: ${allDbLanguages.length}`);

  const essentialSet = new Set(ESSENTIAL_LANGUAGES.map((l) => norm(l)));
  const unusedObscureLanguages = allDbLanguages.filter((l) => !essentialSet.has(norm(l.name)));
  console.log(`  - Essential languages to keep: ${ESSENTIAL_LANGUAGES.length}`);
  console.log(`  - Obscure unused languages to prune: ${unusedObscureLanguages.length}`);

  if (apply) {
    // Ensure all essential languages exist
    const existingDbNormSet = new Set(allDbLanguages.map((l) => norm(l.name)));
    for (const lang of ESSENTIAL_LANGUAGES) {
      if (!existingDbNormSet.has(norm(lang))) {
        await prisma.language.create({ data: { name: lang } });
      }
    }

    // Delete unused obscure language records from lookup table
    if (unusedObscureLanguages.length > 0) {
      await prisma.language.deleteMany({
        where: { id: { in: unusedObscureLanguages.map((l) => l.id) } },
      });
    }
    console.log(`  - Successfully curated language catalog!`);
  }

  console.log(`\n===============================================================`);
  console.log(`✅ CURATION COMPLETED (apply: ${apply})`);
  console.log(`===============================================================\n`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  await curateAll(apply);
}

main()
  .catch((err) => {
    console.error("Curation script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

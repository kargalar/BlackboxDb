import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedData() {
  console.log("🌱 Seeding lookup data...");

  try {
    // 1. Content Types
    console.log("🎬 Seeding content types...");
    const contentTypes: Array<{ id?: number; name: string; slug: string }> = [
      { id: 1, name: "MOVIE", slug: "movie" },
      { id: 2, name: "TV", slug: "tv" },
      { id: 3, name: "GAME", slug: "game" },
      { id: 4, name: "BOOK", slug: "book" },
      { id: 5, name: "MUSIC", slug: "music" },
      { name: "PODCAST", slug: "podcast" },
      { name: "THEATER", slug: "theater" },
      { name: "CONCERT", slug: "concert" },
    ];

    for (const type of contentTypes) {
      const existing = type.id
        ? await prisma.contentTypeLookup.findUnique({ where: { id: type.id } })
        : await prisma.contentTypeLookup.findUnique({ where: { slug: type.slug } });
      if (!existing) {
        await prisma.contentTypeLookup.create({ data: type });
        console.log(`✅ Created content type: ${type.name}`);
      } else {
        await prisma.contentTypeLookup.update({
          where: { id: existing.id },
          data: { name: type.name, slug: type.slug },
        });
        console.log(`✅ Content type already exists: ${existing.name} (id=${existing.id})`);
      }
    }

    await prisma.$queryRaw`
      SELECT setval(
        pg_get_serial_sequence('content_type_lookup', 'id'),
        COALESCE((SELECT MAX(id) FROM content_type_lookup), 1),
        true
      )
    `;

    console.log("✅ Content types seeded!");

    // 2. Company Roles
    // IDs must match frontend buildContentInput.ts:
    //   3=bookpublisher, 4=gamepublisher, 5=gamedeveloper, 6=moviestudio
    console.log("🏢 Seeding company roles...");
    const companyRoles = [
      { id: 1, name: "developer", contentTypeId: null },
      { id: 2, name: "publisher", contentTypeId: null },
      { id: 3, name: "bookpublisher", contentTypeId: 4 },
      { id: 4, name: "gamepublisher", contentTypeId: 3 },
      { id: 5, name: "gamedeveloper", contentTypeId: 3 },
      { id: 6, name: "moviestudio", contentTypeId: null }, // film & dizi
    ];

    for (const role of companyRoles) {
      const existing = await prisma.companyRole.findUnique({
        where: { id: role.id },
      });
      if (!existing) {
        await prisma.companyRole.create({ data: role });
        console.log(`✅ Created company role: ${role.name} (id=${role.id})`);
      } else {
        console.log(
          `✅ Company role already exists: ${existing.name} (id=${existing.id})`,
        );
      }
    }

    console.log("🌱 Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedData();

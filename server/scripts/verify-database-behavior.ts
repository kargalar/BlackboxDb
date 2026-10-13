import "reflect-metadata";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { parse, Kind, type GraphQLResolveInfo, type FieldNode } from "graphql";
import { MediaVoteResolver } from "../src/resolvers/MediaVoteResolver";
import { withSoftDelete } from "../src/lib/softDeleteMiddleware";
import { withTranslations } from "../src/lib/translationMiddleware";
import { contentSelection } from "../src/lib/contentSelection";
import { convertContentForGraphQL } from "../src/resolvers/content/ContentUtils";
import type { GraphQLContext } from "../src/context";
import { getPeopleFilterCounts } from "../src/lib/peopleFilterCounts";

async function main() {
  const manifest = JSON.parse(
    await readFile("inspect-restore-database.json", "utf8"),
  );
  if (
    !manifest.restored ||
    manifest.cleanedUp ||
    !/^blackbox_verify_\d+_[a-f0-9]+$/.test(manifest.databaseName)
  )
    throw new Error("A verified isolated restore is required");
  const connection = new URL(process.env.DATABASE_URL!);
  connection.pathname = `/${manifest.databaseName}`;
  const client = new PrismaClient({
    datasourceUrl: connection.toString(),
    log: [{ emit: "event", level: "query" }],
  });
  let queryCount = 0;
  client.$on("query", () => queryCount++);
  const prisma = withTranslations(
    withSoftDelete(client) as unknown as PrismaClient,
  ) as unknown as PrismaClient;
  const fixtureId = randomUUID();
  const userId = randomUUID();
  try {
    const roleGroups = await client.personRole.findMany({
      where: {
        label: {
          in: ["actor", "voice", "voice_actor", "director"],
          mode: "insensitive",
        },
      },
    });
    const roleNames = new Map(
      roleGroups.map((role) => [role.id, role.label.toLowerCase()]),
    );
    const grouped = await client.contentPerson.groupBy({
      by: ["personId", "personRoleId"],
      where: {
        content: { isDeleted: false, contentTypeId: 1 },
        personRoleId: { in: roleGroups.map((role) => role.id) },
      },
      _count: { id: true },
    });
    const expected: {
      actors: Record<string, number>;
      directors: Record<string, number>;
    } = { actors: {}, directors: {} };
    for (const row of grouped) {
      const target =
        roleNames.get(row.personRoleId!) === "director"
          ? expected.directors
          : expected.actors;
      target[row.personId] = (target[row.personId] ?? 0) + row._count.id;
    }
    assert.deepEqual(await getPeopleFilterCounts(client, 1), expected);
    console.log(JSON.stringify({ peopleCountParity: true }));
    queryCount = 0;
    const baseline = await prisma.content.findMany({
      where: { contentTypeId: 1 },
      take: 20,
      orderBy: { id: "asc" },
      ...contentSelection(),
    });
    const baselineQueries = queryCount;
    const document = parse(
      `{ contents { id title posterUrl contentType { id name } } }`,
    );
    const operation = document.definitions[0];
    assert.equal(operation.kind, Kind.OPERATION_DEFINITION);
    if (operation.kind !== Kind.OPERATION_DEFINITION)
      throw new Error("Missing operation");
    const info = {
      fieldNodes: operation.selectionSet.selections as FieldNode[],
      fragments: {},
    } as unknown as GraphQLResolveInfo;
    queryCount = 0;
    const optimized = await prisma.content.findMany({
      where: { contentTypeId: 1 },
      take: 20,
      orderBy: { id: "asc" },
      ...contentSelection(info),
    });
    const optimizedQueries = queryCount;
    const basic = (record: unknown) => {
      const converted = convertContentForGraphQL(record);
      return {
        id: converted.id,
        title: converted.title,
        posterUrl: converted.posterUrl,
        contentType: converted.contentType,
      };
    };
    assert.deepEqual(optimized.map(basic), baseline.map(basic));
    const bytes = (value: unknown) =>
      Buffer.byteLength(
        JSON.stringify(value, (_, field) =>
          typeof field === "bigint" ? field.toString() : field,
        ),
      );
    console.log(
      JSON.stringify({
        selectionParity: true,
        baselineQueries,
        optimizedQueries,
        baselineBytes: bytes(baseline),
        optimizedBytes: bytes(optimized),
      }),
    );

    await client.appUser.create({
      data: {
        id: userId,
        username: `verify_${userId}`,
        email: `${userId}@example.invalid`,
      },
    });
    await client.content.create({
      data: { id: fixtureId, title: "Verification fixture", contentTypeId: 1 },
    });
    const image = await client.contentImage.create({
      data: {
        contentId: fixtureId,
        type: "poster",
        filePath: "https://example.invalid/fixture.jpg",
      },
    });
    const screenshot = await client.contentScreenshot.create({
      data: {
        contentId: fixtureId,
        imageUrl: "https://example.invalid/fixture.jpg",
      },
    });
    const context = {
      prisma,
      user: {
        id: userId,
        username: "fixture",
        email: "fixture@example.invalid",
        isAdmin: false,
        isModerator: false,
      },
      language: "en",
    } as GraphQLContext;
    const resolver = new MediaVoteResolver();
    await Promise.all(
      Array.from({ length: 8 }, () => resolver.voteImage(image.id, 1, context)),
    );
    await Promise.all(
      Array.from({ length: 8 }, () =>
        resolver.voteScreenshot(screenshot.id, 1, context),
      ),
    );
    assert.equal(
      await client.userImageVote.count({ where: { imageId: image.id } }),
      1,
    );
    assert.equal(
      await client.userScreenshotVote.count({
        where: { screenshotId: screenshot.id },
      }),
      1,
    );
    assert.equal(
      (await client.contentImage.findUniqueOrThrow({ where: { id: image.id } }))
        .upvoteCount,
      1,
    );
    assert.equal(
      (
        await client.contentScreenshot.findUniqueOrThrow({
          where: { id: screenshot.id },
        })
      ).upvoteCount,
      1,
    );
    const failingClient = client.$extends({
      query: {
        contentImage: {
          update: async () => {
            throw new Error("Injected failure");
          },
        },
      },
    }) as unknown as PrismaClient;
    await assert.rejects(
      resolver.voteImage(image.id, -1, { ...context, prisma: failingClient }),
      /Injected failure/,
    );
    assert.equal(
      (
        await client.userImageVote.findUniqueOrThrow({
          where: { imageId_userId: { imageId: image.id, userId } },
        })
      ).voteType,
      1,
    );
    await resolver.voteImage(image.id, 0, context);
    await resolver.voteScreenshot(screenshot.id, 0, context);
    assert.equal(
      await client.userImageVote.count({ where: { imageId: image.id } }),
      0,
    );
    assert.equal(
      await client.userScreenshotVote.count({
        where: { screenshotId: screenshot.id },
      }),
      0,
    );
    await client.content.update({
      where: { id: fixtureId },
      data: { isDeleted: true },
    });
    assert.equal(
      await prisma.content.findUnique({
        where: { id: fixtureId },
        select: { title: true },
      }),
      null,
    );
    assert.ok(
      await prisma.content.findUnique({
        where: { id: fixtureId, isDeleted: true },
        select: { title: true },
      }),
    );
    console.log(
      JSON.stringify({
        concurrentVotes: true,
        transactionRollback: true,
        softDeleteSelection: true,
      }),
    );
  } finally {
    await client.content.deleteMany({ where: { id: fixtureId } });
    await client.appUser.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

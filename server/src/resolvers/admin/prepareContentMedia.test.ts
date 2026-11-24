import "reflect-metadata";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { UpdateContentInput } from "../../types/admin";
import type { GraphQLContext } from "../../context";
import { AdminContentMutationResolver } from "./AdminContentMutationResolver";
import { prepareContentMedia } from "./prepareContentMedia";
import { saveImages, saveScreenshots } from "./AdminContentHelpers";

const CONTENT_ID = "test-content";
const CDN_URL = "https://media.example.test";
const SOURCE_URL = "https://image.tmdb.org/t/p/original/source.png";
const TARGET_URL = `${CDN_URL}/blackbox/screenshots/${CONTENT_ID}/source.png`;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);

function imageResponse() {
  return new Response(new Uint8Array(PNG), { headers: { "content-type": "image/png" } });
}

test("content media preparation", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(path.join(tmpdir(), "blackbox-media-"));
  process.chdir(directory);
  t.after(async () => {
    globalThis.fetch = originalFetch;
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  });

  function database(
    screenshots: Array<{ id: number; imageUrl: string }> = [],
    images: Array<{ type: string; filePath: string }> = [],
  ) {
    return {
      contentScreenshot: { findMany: async () => screenshots },
      contentImage: { findMany: async () => images },
    } as unknown as PrismaClient;
  }

  await t.test("performs no requests for unchanged legacy images", async () => {
    globalThis.fetch = async () => { throw new Error("Unexpected storage request"); };
    const posterUrl = "https://external.test/poster.jpg";
    const prepared = await prepareContentMedia(
      database([{ id: 42, imageUrl: TARGET_URL }], [{ type: "poster", filePath: posterUrl }]), CONTENT_ID,
      { screenshots: [{ id: 42, imageUrl: TARGET_URL }], posterUrl }, true,
    );
    assert.equal(prepared.screenshots[0].imageUrl, TARGET_URL);
    assert.equal(prepared.posterUrl, posterUrl);
  });

  await t.test("uploads shared base64 media once and preserves backdrop focus", async () => {
    globalThis.fetch = async () => { throw new Error("Unexpected storage request"); };
    const image = `data:image/png;base64,${PNG.toString("base64")}`;
    const prepared = await prepareContentMedia(database(), CONTENT_ID, {
      backdropUrl: `${image}#focus=0.5,0.3`,
      images: [{ filePath: `${image}#focus=0.5,0.3`, type: "backdrop" }],
    }, false);
    assert.equal((await readdir(`uploads/content-images/${CONTENT_ID}/backdrop`)).length, 1);
    assert.equal(prepared.backdropUrl, prepared.images[0].filePath);
    assert.ok(prepared.backdropUrl.endsWith("#focus=0.5,0.3"));
  });

  await t.test("retries temporary media and keeps the original when reusing saved media", async () => {
    globalThis.fetch = async () => { throw new Error("Unexpected storage request"); };
    await mkdir("uploads/content-images/temp/poster", { recursive: true });
    await mkdir("uploads/screenshots/temp", { recursive: true });
    await writeFile("uploads/content-images/temp/poster/local.png", PNG);
    await writeFile("uploads/screenshots/temp/local.png", PNG);
    const input = {
      posterUrl: "/uploads/content-images/temp/poster/local.png",
      screenshots: [{ imageUrl: "/uploads/screenshots/temp/local.png" }],
    };
    const prepared = await prepareContentMedia(database(), "first", input, false);
    assert.deepEqual(await prepareContentMedia(database(), "first", input, false), prepared);

    const reused = await prepareContentMedia(database(), "second", prepared, false);
    for (const media of [prepared, reused]) {
      assert.deepEqual(await readFile(media.posterUrl.slice(1)), PNG);
      assert.deepEqual(await readFile(media.screenshots[0].imageUrl.slice(1)), PNG);
    }
    await assert.rejects(
      prepareContentMedia(database(), "third", { screenshots: input.screenshots }, false),
      /Local screenshot is missing/,
    );
  });

  await t.test("alignment changes perform no storage requests", async () => {
    globalThis.fetch = async () => { throw new Error("Unexpected storage request"); };
    const source = `${CDN_URL}/blackbox/backdrops/${CONTENT_ID}/full.png`;
    const prisma = {
      contentImage: { findMany: async () => [{ id: 7, type: "backdrop", filePath: `${source}#focus=50,20` }] },
    } as unknown as PrismaClient;
    const input = { backdropUrl: `${source}#focus=50,90`, images: [{ id: 7, type: "backdrop", filePath: `${source}#focus=50,90` }] };
    const prepared = await prepareContentMedia(prisma, CONTENT_ID, input, true);
    assert.deepEqual(prepared, input);
  });

  await t.test("alignment retains image identity, votes and preferences, including a stale alternative URL", async () => {
    globalThis.fetch = async () => { throw new Error("Unexpected storage request"); };
    const source = `${CDN_URL}/blackbox/backdrops/${CONTENT_ID}/full.png`;
    const image = { id: 7, type: "backdrop", filePath: `${source}#focus=50,20`, upvoteCount: 4, downvoteCount: 1 };
    const oldUrl = image.filePath;
    const updates: unknown[] = [];
    const prisma = {
      content: {
        findUnique: async (): Promise<{ posterImageId: number | null; backdropImageId: number }> => ({
          posterImageId: null,
          backdropImageId: image.id,
        }),
        update: async (args: unknown) => { updates.push(args); },
      },
      contentImage: {
        findFirst: async () => image,
        findMany: async () => [image],
        update: async ({ where, data }: { where: { id: number }; data: { filePath: string } }) => {
          assert.equal(where.id, image.id);
          assert.deepEqual(Object.keys(data), ["filePath"]);
          image.filePath = data.filePath;
        },
        create: async () => { throw new Error("Image must not be duplicated"); },
        delete: async () => { throw new Error("Image must not be deleted"); },
      },
    };
    await saveImages(prisma, CONTENT_ID, undefined, `${source}#focus=50,90`, true, [{ id: image.id, type: "backdrop", filePath: oldUrl }], true);
    assert.equal(image.filePath, `${source}#focus=50,90`);
    assert.equal(image.upvoteCount, 4);
    assert.equal(image.downvoteCount, 1);
    assert.deepEqual(updates, [{ where: { id: CONTENT_ID }, data: { backdropImageId: 7 } }]);
  });

  await t.test("rejects missing storage files before persistence", async () => {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(
      prepareContentMedia(database(), CONTENT_ID, { screenshots: [{ imageUrl: SOURCE_URL }] }, true),
      /Could not download content image \(404\)/,
    );
  });

  await t.test("prepares 125 new screenshots with bounded concurrency and no HEAD requests", async () => {
    let activeRequests = 0;
    let peakRequests = 0;
    let downloads = 0;
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.method ?? "GET", "GET");
      activeRequests++;
      downloads++;
      peakRequests = Math.max(peakRequests, activeRequests);
      await new Promise<void>((resolve) => setImmediate(resolve));
      activeRequests--;
      return imageResponse();
    };
    const screenshots = Array.from({ length: 125 }, (_, index) => ({
      imageUrl: `https://image.tmdb.org/t/p/original/bulk-${index}.png`,
    }));
    const prepared = await prepareContentMedia(database(), CONTENT_ID, { screenshots }, true);
    assert.equal(prepared.screenshots.length, 125);
    for (const screenshot of prepared.screenshots) {
      assert.ok(screenshot.imageUrl.startsWith(`/uploads/content-images/${CONTENT_ID}/screenshot/`));
      assert.deepEqual(await readFile(screenshot.imageUrl.slice(1)), PNG);
    }
    assert.equal(downloads, 125);
    assert.ok(peakRequests <= 5);
  });

  await t.test("opens the update transaction only after storage preparation succeeds", async () => {
    let transactions = 0;
    let inTransaction = false;
    const resolver = new AdminContentMutationResolver();
    const context = {
      user: { isAdmin: true },
      prisma: {
        content: { findUnique: async () => ({ lockedFields: [] as string[] }) },
        contentScreenshot: { findMany: async (): Promise<never[]> => [] },
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
          transactions++;
          inTransaction = true;
          try { return await callback({}); }
          finally { inTransaction = false; }
        },
      },
    } as unknown as GraphQLContext;
    const input: UpdateContentInput = { screenshots: [{ imageUrl: SOURCE_URL }] };
    globalThis.fetch = async () => {
      assert.equal(inTransaction, false);
      return new Response(null, { status: 404 });
    };
    await assert.rejects(resolver.updateContent(CONTENT_ID, input, context), /Could not download content image \(404\)/);
    assert.equal(transactions, 0);

    globalThis.fetch = async () => {
      assert.equal(inTransaction, false);
      return imageResponse();
    };
    Object.assign(resolver, {
      updateContentInTransaction: async (_id: string, prepared: UpdateContentInput) => {
        assert.equal(inTransaction, true);
        assert.deepEqual(await readFile(prepared.screenshots[0].imageUrl.slice(1)), PNG);
        return { id: CONTENT_ID };
      },
    });
    const result = await resolver.updateContent(CONTENT_ID, input, context);
    assert.equal(result.id, CONTENT_ID);
    assert.equal(transactions, 1);
  });

  await t.test("persists prepared screenshots without storage requests and skips unchanged rows", async () => {
    globalThis.fetch = async () => { throw new Error("Storage request inside transaction"); };
    const existing = {
      id: 42, imageUrl: TARGET_URL, difficulty: 1, order: 0, seasonNumber: null as number | null, episodeNumber: null as number | null,
      isEnabledForQuiz: false, isSpoiler: false, isSensitive: false,
    };
    let updates = 0;
    let screenshotIds: number[] = [];
    const prisma = {
      contentScreenshot: {
        findMany: async () => [existing],
        update: async () => { throw new Error("Unchanged row updated"); },
        create: async ({ data }: { data: { imageUrl: string } }) => {
          assert.equal(data.imageUrl, SOURCE_URL);
          return { id: 43 };
        },
      },
      content: {
        update: async ({ data }: { data: { screenshotImageIds: number[] } }) => {
          updates++;
          screenshotIds = data.screenshotImageIds;
        },
        findUnique: async () => ({ isEnabledForQuiz: false }),
      },
    };
    await saveScreenshots(prisma, CONTENT_ID, [existing, { imageUrl: SOURCE_URL }], true, true);
    assert.equal(updates, 1);
    assert.deepEqual(screenshotIds, [42, 43]);
  });
});

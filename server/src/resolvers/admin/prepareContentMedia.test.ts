import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { UpdateContentInput } from "../../types/admin";
import type { GraphQLContext } from "../../context";
import { AdminContentMutationResolver } from "./AdminContentMutationResolver";
import { prepareContentMedia } from "./prepareContentMedia";
import { saveImages, saveScreenshots } from "./AdminContentHelpers";

const CONTENT_ID = "test-content";
const CDN_URL = "https://media.example.test";
const SOURCE_URL = `${CDN_URL}/blackbox/screenshots/source.jpg`;
const TARGET_URL = `${CDN_URL}/blackbox/screenshots/${CONTENT_ID}/source.jpg`;

test("content media preparation", async (t) => {
  const originalFetch = globalThis.fetch;
  const environment = {
    BUNNY_CDN_URL: process.env.BUNNY_CDN_URL,
    BUNNY_STORAGE_ZONE: process.env.BUNNY_STORAGE_ZONE,
    BUNNY_STORAGE_PASSWORD: process.env.BUNNY_STORAGE_PASSWORD,
  };
  process.env.BUNNY_CDN_URL = CDN_URL;
  process.env.BUNNY_STORAGE_ZONE = "test-zone";
  process.env.BUNNY_STORAGE_PASSWORD = "test-password";
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function database(screenshots: Array<{ id: number; imageUrl: string }> = []) {
    return {
      contentScreenshot: { findMany: async () => screenshots },
      contentImage: { findMany: async (): Promise<never[]> => [] },
    } as unknown as PrismaClient;
  }

  await t.test("copies new images without deleting the source and leaves input untouched", async () => {
    const methods: string[] = [];
    globalThis.fetch = async (url, options) => {
      const method = options?.method ?? "GET";
      methods.push(method);
      if (method === "GET" && options?.headers) {
        return new Response(null, { status: String(url).includes(CONTENT_ID) ? 404 : 200 });
      }
      if (method === "GET") {
        return new Response("image", { headers: { "content-type": "image/jpeg" } });
      }
      assert.equal(method, "PUT");
      return new Response(null, { status: 201 });
    };
    const input = { screenshots: [{ imageUrl: SOURCE_URL }] };
    const prepared = await prepareContentMedia(database(), CONTENT_ID, input, true);
    assert.equal(prepared.screenshots[0].imageUrl, TARGET_URL);
    assert.equal(input.screenshots[0].imageUrl, SOURCE_URL);
    assert.deepEqual(methods, ["GET", "GET", "GET", "PUT"]);
  });

  await t.test("recovers a previous copy while retaining the existing screenshot ID", async () => {
    let requests = 0;
    globalThis.fetch = async (_url, options) => {
      requests++;
      assert.equal(options?.method, "GET");
      return new Response(null, { status: 200 });
    };
    const prepared = await prepareContentMedia(
      database([{ id: 42, imageUrl: SOURCE_URL }]), CONTENT_ID,
      { screenshots: [{ imageUrl: SOURCE_URL }] } as UpdateContentInput, true,
    );
    assert.equal(prepared.screenshots[0].imageUrl, TARGET_URL);
    assert.equal(prepared.screenshots[0].id, 42);
    assert.equal(requests, 1);
  });

  await t.test("performs no requests for unchanged images already in the content folder", async () => {
    globalThis.fetch = async () => { throw new Error("Unexpected storage request"); };
    const prepared = await prepareContentMedia(
      database([{ id: 42, imageUrl: TARGET_URL }]), CONTENT_ID,
      { screenshots: [{ id: 42, imageUrl: TARGET_URL }], posterUrl: "https://external.test/poster.jpg" }, true,
    );
    assert.equal(prepared.screenshots[0].imageUrl, TARGET_URL);
    assert.equal(prepared.posterUrl, "https://external.test/poster.jpg");
  });

  await t.test("uploads shared base64 media once and preserves backdrop focus", async () => {
    let uploads = 0;
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.method, "PUT");
      uploads++;
      return new Response(null, { status: 201 });
    };
    const image = "data:image/jpeg;base64,aW1hZ2U=";
    const prepared = await prepareContentMedia(database(), CONTENT_ID, {
      backdropUrl: `${image}#focus=0.5,0.3`,
      images: [{ filePath: `${image}#focus=0.5,0.3`, type: "backdrop" }],
    }, false);
    assert.equal(uploads, 1);
    assert.equal(prepared.backdropUrl, prepared.images[0].filePath);
    assert.ok(prepared.backdropUrl.endsWith("#focus=0.5,0.3"));
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
      /missing from both/,
    );
  });

  await t.test("prepares 125 new screenshots with bounded concurrency and no HEAD requests", async () => {
    let activeRequests = 0;
    let peakRequests = 0;
    let copies = 0;
    let cancelledChecks = 0;
    globalThis.fetch = async (url, options) => {
      const method = options?.method ?? "GET";
      assert.notEqual(method, "HEAD");
      assert.notEqual(method, "DELETE");
      activeRequests++;
      peakRequests = Math.max(peakRequests, activeRequests);
      await new Promise<void>((resolve) => setImmediate(resolve));
      activeRequests--;
      if (method === "PUT") {
        copies++;
        return new Response(null, { status: 201 });
      }
      if (options?.headers) {
        // Existence probes must cancel the body instead of downloading the file.
        const body = new ReadableStream({ cancel: () => { cancelledChecks++; } });
        return new Response(body, { status: String(url).includes(CONTENT_ID) ? 404 : 200 });
      }
      return new Response("image", { headers: { "content-type": "image/png" } });
    };
    const screenshots = Array.from({ length: 125 }, (_, index) => ({
      imageUrl: `${CDN_URL}/blackbox/screenshots/bulk-${index}.png`,
    }));
    const prepared = await prepareContentMedia(database(), CONTENT_ID, { screenshots }, true);
    assert.equal(prepared.screenshots.length, 125);
    prepared.screenshots.forEach((screenshot, index) => {
      assert.equal(screenshot.imageUrl, `${CDN_URL}/blackbox/screenshots/${CONTENT_ID}/bulk-${index}.png`);
    });
    assert.equal(copies, 125);
    assert.equal(cancelledChecks, 250);
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
    await assert.rejects(resolver.updateContent(CONTENT_ID, input, context), /missing from both/);
    assert.equal(transactions, 0);

    globalThis.fetch = async () => {
      assert.equal(inTransaction, false);
      return new Response(null, { status: 200 });
    };
    Object.assign(resolver, {
      updateContentInTransaction: async (_id: string, prepared: UpdateContentInput) => {
        assert.equal(inTransaction, true);
        assert.equal(prepared.screenshots[0].imageUrl, TARGET_URL);
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
      id: 42, imageUrl: TARGET_URL, difficulty: 1, order: 0, seasonNumber: null as number | null,
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

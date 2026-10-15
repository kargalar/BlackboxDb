import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import {
  syncTvShowWatchState,
  syncEpisodesOnTvShowConsumed,
  unsyncEpisodesOnTvShowUnmarked,
} from "../services/UserContentService";

test("tv show watch state synchronization", async (t) => {
  await t.test(
    "preserves isConsumed=true when user watched only partial seasons (e.g. 3 of 4 seasons)",
    async () => {
      const now = new Date("2026-01-01T00:00:00Z");
      const pastDate = new Date("2025-01-01T00:00:00Z");

      const episodes = [
        { id: 1, seasonNumber: 1, airDate: pastDate, season: { airDate: pastDate } },
        { id: 2, seasonNumber: 2, airDate: pastDate, season: { airDate: pastDate } },
        { id: 3, seasonNumber: 3, airDate: pastDate, season: { airDate: pastDate } },
        { id: 4, seasonNumber: 4, airDate: pastDate, season: { airDate: pastDate } },
      ];

      // User has only logged episodes 1, 2, 3 as watched (season 4 is unwatched)
      const userLogs = [{ episodeId: 1 }, { episodeId: 2 }, { episodeId: 3 }];

      let updatedData: any = null;
      let consumeCountIncrement = 0;

      const mockPrisma = {
        tvEpisode: {
          findMany: async () => episodes,
        },
        userEpisodeLog: {
          findMany: async () => userLogs,
        },
        userContentLog: {
          findFirst: async () => ({
            id: "log-1",
            userId: "user-1",
            contentId: "tv-1",
            isConsumed: true,
            isContinuing: true, // legacy corrupted flag
          }),
          update: async ({ data }: any) => {
            updatedData = data;
          },
        },
        content: {
          update: async () => {
            consumeCountIncrement++;
          },
        },
      };

      await syncTvShowWatchState(mockPrisma, "user-1", "tv-1");

      // The show MUST remain consumed and NOT be converted into continuing
      assert.deepEqual(updatedData, { isContinuing: false });
      assert.equal(consumeCountIncrement, 0); // No decrement or change
    },
  );

  await t.test(
    "marks show as continuing when partial episodes watched and not already consumed",
    async () => {
      const pastDate = new Date("2025-01-01T00:00:00Z");
      const episodes = [
        { id: 1, seasonNumber: 1, airDate: pastDate, season: { airDate: pastDate } },
        { id: 2, seasonNumber: 2, airDate: pastDate, season: { airDate: pastDate } },
      ];

      const mockPrisma = {
        tvEpisode: {
          findMany: async () => episodes,
        },
        userEpisodeLog: {
          findMany: async () => [{ episodeId: 1 }],
        },
        userContentLog: {
          findFirst: async () => ({
            id: "log-2",
            isConsumed: false,
            isContinuing: false,
          }),
          update: async ({ data }: any) => {
            assert.equal(data.isConsumed, false);
            assert.equal(data.isContinuing, true);
          },
        },
      };

      await syncTvShowWatchState(mockPrisma, "user-1", "tv-2");
    },
  );

  await t.test(
    "marks show as consumed when all episodes are watched and not already consumed",
    async () => {
      const pastDate = new Date("2025-01-01T00:00:00Z");
      const episodes = [
        { id: 1, seasonNumber: 1, airDate: pastDate, season: { airDate: pastDate } },
        { id: 2, seasonNumber: 1, airDate: pastDate, season: { airDate: pastDate } },
      ];

      let consumeCountIncrement = 0;
      const mockPrisma = {
        tvEpisode: {
          findMany: async () => episodes,
        },
        userEpisodeLog: {
          findMany: async () => [{ episodeId: 1 }, { episodeId: 2 }],
        },
        userContentLog: {
          findFirst: async () => ({
            id: "log-3",
            isConsumed: false,
            isContinuing: true,
          }),
          update: async ({ data }: any) => {
            assert.equal(data.isConsumed, true);
            assert.equal(data.isContinuing, false);
          },
        },
        content: {
          update: async () => {
            consumeCountIncrement++;
          },
        },
      };

      await syncTvShowWatchState(mockPrisma, "user-1", "tv-3");
      assert.equal(consumeCountIncrement, 1);
    },
  );

  await t.test(
    "syncEpisodesOnTvShowConsumed and unsyncEpisodesOnTvShowUnmarked are safe no-ops",
    async () => {
      let queried = false;
      const dummyPrisma = {
        content: {
          findUnique: async () => {
            queried = true;
            return { contentTypeId: 2 };
          },
        },
      };

      await syncEpisodesOnTvShowConsumed(dummyPrisma, "user-1", "tv-1");
      await unsyncEpisodesOnTvShowUnmarked(dummyPrisma, "user-1", "tv-1");

      assert.equal(queried, false);
    },
  );
});

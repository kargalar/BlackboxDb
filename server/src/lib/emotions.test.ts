import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONTENT_EMOTIONS,
  filterValidEmotions,
  isContentEmotion,
} from "./emotions";

test("CONTENT_EMOTIONS includes all 8 supported emotions", () => {
  assert.deepEqual(CONTENT_EMOTIONS, [
    "funny",
    "scary",
    "emotional",
    "exciting",
    "relaxing",
    "thoughtful",
    "romantic",
    "inspiring",
  ]);
  assert.equal(isContentEmotion("romantic"), true);
  assert.equal(isContentEmotion("inspiring"), true);
  assert.equal(isContentEmotion("unknown"), false);
});

test("filterValidEmotions keeps only supported emotions", () => {
  assert.deepEqual(
    filterValidEmotions(["scary", "invalid", "romantic", "inspiring"]),
    ["scary", "romantic", "inspiring"],
  );
  assert.deepEqual(filterValidEmotions(undefined), []);
  assert.deepEqual(filterValidEmotions(["bogus"]), []);
});

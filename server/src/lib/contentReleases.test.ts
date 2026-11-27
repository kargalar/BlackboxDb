import assert from "node:assert/strict";
import test from "node:test";
import { bookReleaseDates, normalizeContentReleases, readContentReleases } from "./contentReleases";

test("regional releases keep different dates for the same country and deduplicate identical rows", () => {
  assert.deepEqual(normalizeContentReleases([
    { date: "2024-02-29", regionCode: "jp" },
    { date: "2024-02-29", regionCode: "JP" },
    { date: "2024-02-29", regionCode: "TR" },
    { date: "2024-Q2", regionCode: "150" },
    { date: "2024-05-01", regionCode: "AU" },
    { date: "2025", regionCode: "JP" },
  ], true), [
    { date: "2024-02-29", regionCode: "JP" },
    { date: "2024-02-29", regionCode: "TR" },
    { date: "2024-Q2", regionCode: "150" },
    { date: "2024-05-01", regionCode: "AU" },
    { date: "2025", regionCode: "JP" },
  ]);
});

test("invalid calendar dates are rejected and a cleared list differs from a legacy row", () => {
  assert.throws(() => normalizeContentReleases([{ date: "2025-02-29" }], true));
  assert.throws(() => normalizeContentReleases([{ date: "2025-13" }], true));
  assert.equal(readContentReleases(null), null);
  assert.deepEqual(readContentReleases([]), []);
});

test("book dates retain the precision of the edition data", () => {
  assert.deepEqual(
    bookReleaseDates(["1997", "March 1997", "1 March 1997", "March 1, 1997", "31 February 1997"]),
    [
      { date: "1997", regionCode: null },
      { date: "1997-03", regionCode: null },
      { date: "1997-03-01", regionCode: null },
    ],
  );
});

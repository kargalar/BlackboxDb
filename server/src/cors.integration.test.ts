import assert from "node:assert/strict";
import test from "node:test";

test("allows the frontend development origin on port 3100", async () => {
  const response = await fetch("http://127.0.0.1:4000/health", {
    headers: {
      Origin: "http://localhost:3100",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://localhost:3100",
  );
});

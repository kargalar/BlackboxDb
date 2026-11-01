import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import express from "express";
import {
  createAdminBackupRouter,
  type BackupDatabase,
} from "../routes/adminBackup";

const DATABASE_BYTES = "PGDMP-test-database";

async function fixture(context: TestContext) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "blackboxdb-backup-http-test-"),
  );
  const uploads = path.join(root, "uploads");
  await mkdir(path.join(uploads, "screenshots"), { recursive: true });
  await writeFile(path.join(uploads, "screenshots/shot.png"), "screenshot");
  let restoreCount = 0;
  let failRestore = false;
  const database: BackupDatabase = {
    dump: (filename) => writeFile(filename, DATABASE_BYTES),
    verify: async (filename) => {
      assert.equal(await readFile(filename, "utf8"), DATABASE_BYTES);
    },
    restore: async (filename) => {
      assert.equal(await readFile(filename, "utf8"), DATABASE_BYTES);
      restoreCount++;
      if (failRestore) throw new Error("Database transaction failed");
    },
  };
  const app = express();
  app.use("/api/admin", createAdminBackupRouter(uploads, database));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  context.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(root, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${address.port}/api/admin`;
  return {
    uploads,
    baseUrl,
    getRestoreCount: () => restoreCount,
    failRestore: () => {
      failRestore = true;
    },
  };
}

test("admin download and restore round-trip screenshots and database together", async (context) => {
  const { uploads, baseUrl, getRestoreCount } = await fixture(context);
  const backup = await fetch(`${baseUrl}/backup`);
  assert.equal(backup.status, 200);
  assert.match(backup.headers.get("content-disposition")!, /\.tar\.gz/);
  assert.equal(backup.headers.get("cache-control"), "no-store");
  const archive = await backup.arrayBuffer();
  await writeFile(
    path.join(uploads, "screenshots/shot.png"),
    "changed-after-backup",
  );
  await writeFile(path.join(uploads, "extra.png"), "extra");
  const response = await fetch(`${baseUrl}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: archive,
  });
  assert.equal(response.status, 200, await response.text());
  assert.equal(getRestoreCount(), 1);
  assert.equal(
    await readFile(path.join(uploads, "screenshots/shot.png"), "utf8"),
    "screenshot",
  );
  await assert.rejects(readFile(path.join(uploads, "extra.png")), {
    code: "ENOENT",
  });
});

test("admin restore still accepts legacy database-only dumps and keeps current uploads", async (context) => {
  const { uploads, baseUrl, getRestoreCount } = await fixture(context);
  const response = await fetch(`${baseUrl}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: DATABASE_BYTES,
  });
  assert.equal(response.status, 200, await response.text());
  assert.equal(getRestoreCount(), 1);
  assert.equal(
    await readFile(path.join(uploads, "screenshots/shot.png"), "utf8"),
    "screenshot",
  );
});

test("admin restore rejects unsupported files without touching database or screenshots", async (context) => {
  context.mock.method(console, "error", () => {});
  const { uploads, baseUrl, getRestoreCount } = await fixture(context);
  const response = await fetch(`${baseUrl}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: "not-a-backup",
  });
  assert.equal(response.status, 500);
  assert.equal(getRestoreCount(), 0);
  assert.equal(
    await readFile(path.join(uploads, "screenshots/shot.png"), "utf8"),
    "screenshot",
  );
});

test("admin restore keeps live screenshots when database restoration fails", async (context) => {
  context.mock.method(console, "error", () => {});
  const { uploads, baseUrl, failRestore } = await fixture(context);
  const backup = await fetch(`${baseUrl}/backup`);
  const archive = await backup.arrayBuffer();
  await writeFile(
    path.join(uploads, "screenshots/shot.png"),
    "current-screenshot",
  );
  failRestore();
  const response = await fetch(`${baseUrl}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: archive,
  });
  assert.equal(response.status, 500);
  assert.equal(
    await readFile(path.join(uploads, "screenshots/shot.png"), "utf8"),
    "current-screenshot",
  );
});

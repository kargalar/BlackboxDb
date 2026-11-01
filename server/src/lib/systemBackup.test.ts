import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import * as tar from "tar";
import { measureBackupProgress } from "./backupProgress";
import {
  createSystemArchive,
  restoreSystemUploads,
  unpackSystemArchive,
} from "./systemBackup";

async function fixture(context: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), "blackboxdb-backup-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, "workspace");
  const uploads = path.join(root, "uploads");
  const destination = path.join(root, "extracted");
  await mkdir(workspace);
  await mkdir(uploads);
  await writeFile(
    path.join(workspace, "database.dump"),
    Buffer.from("PGDMP-test-database"),
  );
  return { root, workspace, uploads, destination };
}

async function putFile(
  root: string,
  filename: string,
  contents: string,
): Promise<void> {
  const target = path.join(root, filename);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function repack(workspace: string, archive: string): Promise<void> {
  await tar.create({ cwd: workspace, file: archive, gzip: true }, [
    "database.dump",
    "manifest.json",
    "uploads",
  ]);
}

test("system backup round-trips the database, screenshots and every upload category", async (context) => {
  const { workspace, uploads, destination } = await fixture(context);
  const media = {
    "screenshots/content-id/shot.png": "screenshot-bytes",
    "screenshots/temp/pending.webp": "temporary-screenshot-bytes",
    "content-images/content-id/poster/poster.jpg": "poster-bytes",
    "content-images/content-id/backdrop/backdrop.jpg": "backdrop-bytes",
    "content-images/user-id/profile/avatar.png": "avatar-bytes",
    "content-images/user-id/cover/cover.jpg": "cover-bytes",
    "future-upload-type/data.bin": "other-upload-bytes",
  };
  for (const [filename, contents] of Object.entries(media))
    await putFile(uploads, filename, contents);
  const archive = await createSystemArchive(workspace, uploads);
  // Ensure the finished archive is independent of the original uploads.
  await rm(uploads, { recursive: true });
  await unpackSystemArchive(archive, destination);
  assert.equal(
    await readFile(path.join(destination, "database.dump"), "utf8"),
    "PGDMP-test-database",
  );
  for (const [filename, contents] of Object.entries(media)) {
    assert.equal(
      await readFile(path.join(destination, "uploads", filename), "utf8"),
      contents,
    );
  }
});

test("system backup supports an empty uploads directory", async (context) => {
  const { workspace, uploads, destination } = await fixture(context);
  const archive = await createSystemArchive(workspace, uploads);
  await unpackSystemArchive(archive, destination);
});

test("archive progress measures every phase and never goes backwards", async (context) => {
  const { workspace, uploads, destination } = await fixture(context);
  await putFile(uploads, "screenshots/shot.png", "screenshot-bytes");
  const updates: ReturnType<typeof measureBackupProgress>[] = [];
  const archive = await createSystemArchive(workspace, uploads, (progress) => {
    updates.push(
      measureBackupProgress(
        progress.phase,
        progress.completedBytes,
        progress.totalBytes,
      ),
    );
  });
  assert.deepEqual(
    [...new Set(updates.map((progress) => progress.phase))],
    ["copying", "checksums", "archiving"],
  );
  for (let index = 1; index < updates.length; index++) {
    assert.ok(updates[index].percent >= updates[index - 1].percent);
  }
  const copying = updates
    .filter((progress) => progress.phase === "copying")
    .at(-1)!;
  assert.equal(copying.completedBytes, Buffer.byteLength("screenshot-bytes"));
  assert.equal(copying.completedBytes, copying.totalBytes);
  assert.equal(updates.at(-1)!.percent, 80);
  assert.equal(measureBackupProgress("downloading", 100, 100).percent, 99);
  await unpackSystemArchive(archive, destination);
});

test("restore rejects changed database bytes before modifying live data", async (context) => {
  const { workspace, uploads, destination } = await fixture(context);
  const archive = await createSystemArchive(workspace, uploads);
  await writeFile(path.join(workspace, "database.dump"), "corrupted-database");
  await repack(workspace, archive);
  await assert.rejects(
    unpackSystemArchive(archive, destination),
    /checksum mismatch/,
  );
});

test("restore rejects a missing screenshot", async (context) => {
  const { workspace, uploads, destination } = await fixture(context);
  await putFile(uploads, "screenshots/shot.png", "screenshot");
  const archive = await createSystemArchive(workspace, uploads);
  await rm(path.join(workspace, "uploads/screenshots/shot.png"));
  await repack(workspace, archive);
  await assert.rejects(
    unpackSystemArchive(archive, destination),
    /file list does not match/,
  );
});

test("restore rejects archive paths outside the extraction directory", async (context) => {
  const { workspace, uploads, destination } = await fixture(context);
  const archive = await createSystemArchive(workspace, uploads);
  await tar.create(
    {
      cwd: workspace,
      file: archive,
      gzip: true,
      prefix: "../",
      preservePaths: true,
    },
    ["database.dump", "manifest.json", "uploads"],
  );
  await assert.rejects(
    unpackSystemArchive(archive, destination),
    /Invalid or incomplete/,
  );
});

test("failed database restore puts the previous uploads back", async (context) => {
  const { root, uploads } = await fixture(context);
  const staged = path.join(root, "staged");
  const previous = path.join(root, "previous");
  await putFile(uploads, "screenshots/original.png", "original");
  await putFile(staged, "screenshots/restored.png", "restored");
  await assert.rejects(
    restoreSystemUploads(staged, uploads, previous, async () => {
      assert.equal(
        await readFile(path.join(uploads, "screenshots/restored.png"), "utf8"),
        "restored",
      );
      throw new Error("Database transaction failed");
    }),
    /Database transaction failed/,
  );
  assert.equal(
    await readFile(path.join(uploads, "screenshots/original.png"), "utf8"),
    "original",
  );
  await assert.rejects(
    readFile(path.join(uploads, "screenshots/restored.png")),
    { code: "ENOENT" },
  );
});

test("successful restore replaces uploads and retains the old copy until cleanup", async (context) => {
  const { root, uploads } = await fixture(context);
  const staged = path.join(root, "staged");
  const previous = path.join(root, "previous");
  await putFile(uploads, "old.png", "old");
  await putFile(staged, "screenshots/restored.png", "restored");
  await restoreSystemUploads(staged, uploads, previous, async () => {});
  assert.equal(
    await readFile(path.join(uploads, "screenshots/restored.png"), "utf8"),
    "restored",
  );
  assert.equal(await readFile(path.join(previous, "old.png"), "utf8"), "old");
  await assert.rejects(readFile(path.join(uploads, "old.png")), {
    code: "ENOENT",
  });
});

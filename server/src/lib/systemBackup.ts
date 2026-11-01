import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";

export const SYSTEM_BACKUP_EXTENSION = ".tar.gz";
const DATABASE_FILE = "database.dump";
const MANIFEST_FILE = "manifest.json";
const UPLOADS_DIRECTORY = "uploads";
const BACKUP_FORMAT = "blackboxdb-system-backup";
const BACKUP_VERSION = 1;
const MAX_ENTRY_BYTES = 64 * 1024 ** 3;
const MAX_EXTRACTED_BYTES = 1024 ** 4;
const MAX_MANIFEST_BYTES = 16 * 1024 ** 2;

interface BackupFile {
  path: string;
  size: number;
  sha256: string;
}

interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  files: BackupFile[];
}

async function describeFile(
  root: string,
  relativePath: string,
): Promise<BackupFile> {
  const filename = path.join(root, relativePath);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return {
    path: relativePath,
    size: (await stat(filename)).size,
    sha256: hash.digest("hex"),
  };
}

async function copyUploads(source: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyUploads(from, to);
    else if (entry.isFile()) await copyFile(from, to);
    else throw new Error("Uploads contain an unsupported link or special file");
  }
}

async function listFiles(
  root: string,
  relativeDirectory: string,
): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path.join(root, relativeDirectory), {
    withFileTypes: true,
  })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory())
      files.push(...(await listFiles(root, relativePath)));
    else if (entry.isFile()) files.push(relativePath);
    else throw new Error("Backup contains an unsupported file");
  }
  return files;
}

/** database.dump must already exist in workspace; all uploaded files are snapshotted alongside it. */
export async function createSystemArchive(
  workspace: string,
  uploadsDirectory: string,
): Promise<string> {
  await copyUploads(uploadsDirectory, path.join(workspace, UPLOADS_DIRECTORY));
  const filenames = [
    DATABASE_FILE,
    ...(await listFiles(workspace, UPLOADS_DIRECTORY)),
  ].sort();
  const files: BackupFile[] = [];
  for (const filename of filenames)
    files.push(await describeFile(workspace, filename));
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    files,
  };
  await writeFile(
    path.join(workspace, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
  );
  const archive = path.join(workspace, `backup${SYSTEM_BACKUP_EXTENSION}`);
  await tar.create(
    { cwd: workspace, file: archive, gzip: true, strict: true },
    [DATABASE_FILE, MANIFEST_FILE, UPLOADS_DIRECTORY],
  );
  return archive;
}

function isSafeArchivePath(filename: string): boolean {
  const segments = filename.replace(/\/$/, "").split("/");
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      !/[\\:\x00-\x1f]/.test(segment) &&
      !/[. ]$/.test(segment) &&
      !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
  );
}

function parseManifest(value: unknown): BackupManifest {
  if (!value || typeof value !== "object")
    throw new Error("Invalid backup manifest");
  const manifest = value as Partial<BackupManifest>;
  if (
    manifest.format !== BACKUP_FORMAT ||
    manifest.version !== BACKUP_VERSION ||
    !Array.isArray(manifest.files)
  )
    throw new Error("Unsupported backup format or version");
  const seen = new Set<string>();
  for (const file of manifest.files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      !isSafeArchivePath(file.path) ||
      (file.path !== DATABASE_FILE &&
        !file.path.startsWith(`${UPLOADS_DIRECTORY}/`)) ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      seen.has(file.path)
    ) {
      throw new Error("Invalid backup file manifest");
    }
    seen.add(file.path);
  }
  if (!seen.has(DATABASE_FILE))
    throw new Error("Backup is missing the database");
  return manifest as BackupManifest;
}

/** Validate paths, entry types and checksums before any live data is changed. */
export async function unpackSystemArchive(
  archive: string,
  destination: string,
): Promise<void> {
  const files = new Set<string>();
  const entries = new Set<string>();
  let invalid = false;
  let totalBytes = 0;
  await tar.list({
    file: archive,
    strict: true,
    onReadEntry(entry) {
      const filename = entry.path.replace(/\/$/, "");
      const isDirectory = entry.type === "Directory";
      const allowed =
        filename === DATABASE_FILE ||
        filename === MANIFEST_FILE ||
        filename === UPLOADS_DIRECTORY ||
        filename.startsWith(`${UPLOADS_DIRECTORY}/`);
      const identity = filename.toLowerCase();
      totalBytes += entry.size;
      if (
        !allowed ||
        !isSafeArchivePath(entry.path) ||
        entries.has(identity) ||
        (!isDirectory && entry.type !== "File") ||
        (isDirectory && !filename.startsWith(UPLOADS_DIRECTORY)) ||
        (!isDirectory && filename === UPLOADS_DIRECTORY) ||
        entry.size > MAX_ENTRY_BYTES ||
        totalBytes > MAX_EXTRACTED_BYTES ||
        (filename === MANIFEST_FILE && entry.size > MAX_MANIFEST_BYTES)
      )
        invalid = true;
      entries.add(identity);
      if (!isDirectory) files.add(filename);
    },
  });
  if (
    invalid ||
    !files.has(DATABASE_FILE) ||
    !files.has(MANIFEST_FILE) ||
    !entries.has(UPLOADS_DIRECTORY)
  )
    throw new Error("Invalid or incomplete system backup archive");
  await mkdir(destination, { recursive: true });
  await tar.extract({
    file: archive,
    cwd: destination,
    strict: true,
    preservePaths: false,
  });
  const manifest = parseManifest(
    JSON.parse(await readFile(path.join(destination, MANIFEST_FILE), "utf8")),
  );
  if (files.size !== manifest.files.length + 1)
    throw new Error("Backup file list does not match manifest");
  for (const expected of manifest.files) {
    if (!files.has(expected.path))
      throw new Error(`Backup is missing file: ${expected.path}`);
    const actual = await describeFile(destination, expected.path);
    if (actual.size !== expected.size || actual.sha256 !== expected.sha256) {
      throw new Error(`Backup checksum mismatch: ${expected.path}`);
    }
  }
}

/** The caller must use a database transaction so a failed restore can also roll back media. */
export async function restoreSystemUploads(
  stagedUploads: string,
  uploadsDirectory: string,
  previousUploads: string,
  restoreDatabase: () => Promise<void>,
): Promise<void> {
  let hadUploads = false;
  try {
    await rename(uploadsDirectory, previousUploads);
    hadUploads = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await rename(stagedUploads, uploadsDirectory);
  } catch (error) {
    if (hadUploads) await rename(previousUploads, uploadsDirectory);
    throw error;
  }
  try {
    await restoreDatabase();
  } catch (error) {
    await rename(uploadsDirectory, stagedUploads);
    if (hadUploads) await rename(previousUploads, uploadsDirectory);
    throw error;
  }
}

import { spawn } from "node:child_process";
import { existsSync, createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, open, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { Router, type Response } from "express";
import {
  createSystemArchive,
  restoreSystemUploads,
  SYSTEM_BACKUP_EXTENSION,
  unpackSystemArchive,
} from "../lib/systemBackup";
import {
  measureBackupProgress,
  type BackupProgress,
} from "../lib/backupProgress";

type PostgresCommand = "pg_dump" | "pg_restore";
const PROGRESS_RETENTION_MS = 10 * 60 * 1000;
const BACKUP_ID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export interface BackupDatabase {
  dump(filename: string): Promise<void>;
  verify(filename: string): Promise<void>;
  restore(filename: string): Promise<void>;
}

function postgresCommand(command: PostgresCommand): string {
  if (process.platform === "win32") {
    for (let version = 18; version >= 10; version--) {
      const candidate = `C:/Program Files/PostgreSQL/${version}/bin/${command}.exe`;
      if (existsSync(candidate)) return candidate;
    }
  }
  return command;
}

function runPostgres(command: PostgresCommand, args: string[]): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  const connection = new URL(url);
  return new Promise((resolve, reject) => {
    const child = spawn(postgresCommand(command), args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        PGHOST: connection.hostname,
        PGPORT: connection.port || "5432",
        PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
        PGUSER: decodeURIComponent(connection.username),
        PGPASSWORD: decodeURIComponent(connection.password),
        PGSSLMODE: connection.searchParams.get("sslmode") ?? "prefer",
      },
    });
    child.stderr.on("data", () => {
      /* Drain output without exposing credentials or personal data. */
    });
    child.once("error", () => reject(new Error(`Failed to start ${command}`)));
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} failed (${code})`)),
    );
  });
}

function sendFailure(response: Response, error: unknown): void {
  console.error("[Admin backup]", error);
  if (!response.headersSent && !response.destroyed) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Backup operation failed",
    });
  }
}

const postgresBackupDatabase: BackupDatabase = {
  dump: (filename) =>
    runPostgres("pg_dump", ["--format=custom", "--file", filename]),
  verify: (filename) => runPostgres("pg_restore", ["--list", filename]),
  restore: (filename) =>
    runPostgres("pg_restore", [
      "--dbname",
      decodeURIComponent(new URL(process.env.DATABASE_URL!).pathname.slice(1)),
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--single-transaction",
      filename,
    ]),
};

export function createAdminBackupRouter(
  uploadsDirectory: string,
  database: BackupDatabase = postgresBackupDatabase,
): Router {
  const router = Router();
  let busy = false;
  const progressRecords = new Map<
    string,
    { progress: BackupProgress; updatedAt: number }
  >();
  const updateProgress = (id: string | undefined, progress: BackupProgress) => {
    if (id) progressRecords.set(id, { progress, updatedAt: Date.now() });
  };
  // Status must remain readable while the backup route owns the operation lock.
  router.get("/backup/progress/:id", (request, response) => {
    const record = progressRecords.get(request.params.id);
    response.setHeader("Cache-Control", "no-store");
    if (!record) {
      response.status(404).json({ error: "Backup progress not found" });
      return;
    }
    response.json(record.progress);
  });
  router.use((_request, response, next) => {
    if (busy) {
      response
        .status(409)
        .json({ error: "Another backup or restore is in progress" });
      return;
    }
    next();
  });

  router.get("/backup", async (request, response) => {
    const id =
      typeof request.query.backupId === "string"
        ? request.query.backupId
        : undefined;
    if (id && (!BACKUP_ID_PATTERN.test(id) || progressRecords.has(id))) {
      response
        .status(400)
        .json({ error: "Invalid or reused backup identifier" });
      return;
    }
    for (const [key, record] of progressRecords) {
      if (Date.now() - record.updatedAt > PROGRESS_RETENTION_MS)
        progressRecords.delete(key);
    }
    busy = true;
    updateProgress(id, measureBackupProgress("database"));
    let workspace: string | undefined;
    try {
      workspace = await mkdtemp(path.join(os.tmpdir(), "blackboxdb-backup-"));
      const databaseFile = path.join(workspace, "database.dump");
      await database.dump(databaseFile);
      await database.verify(databaseFile);
      const archive = await createSystemArchive(
        workspace,
        uploadsDirectory,
        (progress) =>
          updateProgress(
            id,
            measureBackupProgress(
              progress.phase,
              progress.completedBytes,
              progress.totalBytes,
            ),
          ),
      );
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      response.setHeader("Cache-Control", "no-store");
      response.type("application/gzip");
      response.attachment(
        `blackboxdb-backup-${timestamp}${SYSTEM_BACKUP_EXTENSION}`,
      );
      const totalBytes = (await stat(archive)).size;
      response.setHeader("Content-Length", totalBytes);
      let completedBytes = 0;
      updateProgress(id, measureBackupProgress("downloading", 0, totalBytes));
      await pipeline(
        createReadStream(archive),
        new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            completedBytes += chunk.length;
            updateProgress(
              id,
              measureBackupProgress("downloading", completedBytes, totalBytes),
            );
            callback(null, chunk);
          },
        }),
        response,
      );
      updateProgress(id, {
        phase: "completed",
        percent: 100,
        completedBytes,
        totalBytes,
      });
    } catch (error) {
      const previous = id ? progressRecords.get(id)?.progress : undefined;
      updateProgress(id, {
        ...(previous ?? measureBackupProgress("database")),
        phase: "failed",
        error:
          error instanceof Error ? error.message : "Backup operation failed",
      });
      sendFailure(response, error);
    } finally {
      busy = false;
      if (workspace)
        await rm(workspace, {
          recursive: true,
          force: true,
          maxRetries: 3,
        }).catch(console.error);
    }
  });

  router.post("/restore", async (request, response) => {
    busy = true;
    let workspace: string | undefined;
    // Keep the old uploads if a filesystem rollback itself fails.
    let keepWorkspace = false;
    try {
      workspace = await mkdtemp(
        path.join(path.dirname(uploadsDirectory), ".blackboxdb-restore-"),
      );
      const upload = path.join(workspace, "upload.backup");
      await pipeline(request, createWriteStream(upload, { flags: "wx" }));
      const file = await open(upload, "r");
      const magic = Buffer.alloc(5);
      try {
        await file.read(magic, 0, magic.length, 0);
      } finally {
        await file.close();
      }
      let databaseFile = upload;
      const isSystemArchive = magic[0] === 0x1f && magic[1] === 0x8b;
      const extracted = path.join(workspace, "extracted");
      if (isSystemArchive) {
        await unpackSystemArchive(upload, extracted);
        databaseFile = path.join(extracted, "database.dump");
      } else if (magic.toString("ascii") !== "PGDMP") {
        throw new Error(
          "Select a BlackboxDB .tar.gz backup or a legacy .dump file",
        );
      }
      await database.verify(databaseFile);
      const restoreDatabase = () => database.restore(databaseFile);
      if (isSystemArchive) {
        keepWorkspace = true;
        await restoreSystemUploads(
          path.join(extracted, "uploads"),
          uploadsDirectory,
          path.join(workspace, "previous-uploads"),
          restoreDatabase,
        );
        keepWorkspace = false;
      } else {
        await restoreDatabase();
      }
      response.json({ success: true });
    } catch (error) {
      sendFailure(response, error);
    } finally {
      busy = false;
      if (workspace && !keepWorkspace)
        await rm(workspace, {
          recursive: true,
          force: true,
          maxRetries: 3,
        }).catch(console.error);
    }
  });
  return router;
}

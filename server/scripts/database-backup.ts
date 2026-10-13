import "dotenv/config";
import { existsSync, createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

function postgresTool(name: string): string {
  if (process.platform === "win32") {
    for (let version = 18; version >= 10; version--) {
      const candidate = `C:/Program Files/PostgreSQL/${version}/bin/${name}.exe`;
      if (existsSync(candidate)) return candidate;
    }
  }
  return name;
}

function run(
  name: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(postgresTool(name), args, {
      env: environment,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", () => reject(new Error(`${name} could not start`)));
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${name} failed with code ${code}`)),
    );
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const connection = new URL(process.env.DATABASE_URL);
  const databaseName = decodeURIComponent(connection.pathname.slice(1));
  const directory = path.resolve(
    "backups/database",
    new Date().toISOString().replaceAll(/[:.]/g, "-"),
  );
  await mkdir(directory, { recursive: true });
  const archive = path.join(directory, "database.dump");
  const environment = {
    ...process.env,
    PGHOST: connection.hostname,
    PGPORT: connection.port || "5432",
    PGDATABASE: databaseName,
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGSSLMODE: connection.searchParams.get("sslmode") ?? "prefer",
  };
  await run(
    "pg_dump",
    ["--format=custom", "--compress=6", "--file", archive],
    environment,
  );
  await run("pg_restore", ["--list", archive], environment);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  const checksum = hash.digest("hex");
  await writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify(
      {
        archive,
        sha256: checksum,
        createdAt: new Date().toISOString(),
        archiveReadable: true,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { archive, sha256: checksum, archiveReadable: true },
      null,
      2,
    ),
  );
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

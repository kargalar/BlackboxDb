import "dotenv/config";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

async function main() {
  const archive = path.resolve(process.argv[2] ?? "");
  if (
    !process.env.DATABASE_URL ||
    !existsSync(archive) ||
    !archive.endsWith(".dump")
  )
    throw new Error("An existing .dump archive and DATABASE_URL are required");
  const connection = new URL(process.env.DATABASE_URL);
  const databaseName = `blackbox_verify_${Date.now()}_${randomBytes(3).toString("hex")}`;
  const environment = {
    ...process.env,
    PGHOST: connection.hostname,
    PGPORT: connection.port || "5432",
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGDATABASE: "postgres",
    PGSSLMODE: connection.searchParams.get("sslmode") ?? "prefer",
  };
  const run = (tool: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      let executable = tool;
      if (process.platform === "win32")
        for (let version = 18; version >= 10; version--) {
          const candidate = `C:/Program Files/PostgreSQL/${version}/bin/${tool}.exe`;
          if (existsSync(candidate)) {
            executable = candidate;
            break;
          }
        }
      const child = spawn(executable, args, {
        env: environment,
        stdio: "ignore",
        windowsHide: true,
      });
      child.once("error", () => reject(new Error(`${tool} could not start`)));
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`${tool} failed with code ${code}`)),
      );
    });
  await run("createdb", ["--template=template0", databaseName]);
  // Preserve the manifest even if restore fails so the owned database can be inspected safely.
  await writeFile(
    "inspect-restore-database.json",
    JSON.stringify({ databaseName, archive, restored: false }, null, 2),
  );
  await run("pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    "--jobs=4",
    "--dbname",
    databaseName,
    archive,
  ]);
  await writeFile(
    "inspect-restore-database.json",
    JSON.stringify({ databaseName, archive, restored: true }, null, 2),
  );
  console.log(JSON.stringify({ databaseName, restored: true }));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

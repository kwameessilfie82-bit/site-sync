/**
 * Applies supabase/migrations SQL files using DATABASE_URL from .env.
 * Usage: npm run db:migrate
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function parseDatabaseUrl(envPath) {
  if (!existsSync(envPath)) return "";
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return "";
}

let databaseUrl =
  parseDatabaseUrl(resolve(root, ".env")) ||
  parseDatabaseUrl(resolve(root, ".env.local"));

if (!databaseUrl || databaseUrl.includes("[YOUR-PASSWORD]")) {
  console.error(
    "Set DATABASE_URL in .env (Supabase Dashboard → Connect → OR use Session mode / Direct connection).",
  );
  console.error(
    "Tip: Transaction pooler (port 6543) often blocks DDL; use port 5432 URI for migrations.",
  );
  process.exit(1);
}

const migrationsDir = resolve(root, "supabase/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b))
  .map((name) => resolve(migrationsDir, name));

if (migrationFiles.length === 0) {
  console.log("No migration files found.");
  process.exit(0);
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  idle_timeout: 1,
  connect_timeout: 30,
  onnotice: () => {},
});

try {
  for (const migrationFile of migrationFiles) {
    await sql.file(migrationFile);
    console.log(`Applied: ${migrationFile}`);
  }
  console.log("All migrations applied successfully.");
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 10 });
}

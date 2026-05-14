/**
 * Applies supabase/migrations SQL files using DATABASE_URL from .env.
 * Records each applied file in public.schema_migrations so re-runs skip
 * already-applied migrations (the baseline file is not safe to re-execute
 * after later migrations drop columns such as attendance_sessions.site_id).
 *
 * Usage: npm run db:migrate
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
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

async function columnExists(table, column) {
  const [row] = await sql`
    select exists(
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = ${table}
        and c.column_name = ${column}
    ) as e
  `;
  return row?.e === true;
}

try {
  await sql`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const [{ migrationCount }] = await sql`
    select count(*)::int as "migrationCount" from public.schema_migrations
  `;

  /** Existing DBs migrated before this ledger existed: pre-register applied files from schema shape. */
  if (migrationCount === 0) {
    let cutoff = null;
    if (await columnExists("incidents", "photo_storage_path")) {
      cutoff = "\uffff";
    } else if (await columnExists("projects", "site_latitude")) {
      cutoff = "20260518200000_profiles_phone.sql";
    } else if (
      (await columnExists("attendance_sessions", "project_id")) &&
      !(await columnExists("attendance_sessions", "site_id"))
    ) {
      cutoff = "20260516120000_attendance_by_project_drop_sites.sql";
    }

    if (cutoff) {
      for (const migrationFile of migrationFiles) {
        const filename = basename(migrationFile);
        if (filename <= cutoff) {
          await sql`
            insert into public.schema_migrations (filename)
            values (${filename})
            on conflict (filename) do nothing
          `;
        }
      }
      console.log(
        "Bootstrapped schema_migrations (database already matched applied migrations).",
      );
    }
  }

  for (const migrationFile of migrationFiles) {
    const filename = basename(migrationFile);
    const [{ count }] = await sql`
      select count(*)::int as count
      from public.schema_migrations
      where filename = ${filename}
    `;
    if (count > 0) {
      console.log(`Skip (already applied): ${filename}`);
      continue;
    }

    const body = readFileSync(migrationFile, "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into public.schema_migrations (filename) values (${filename})`;
    });
    console.log(`Applied: ${filename}`);
  }
  console.log("All migrations applied successfully.");
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 10 });
}

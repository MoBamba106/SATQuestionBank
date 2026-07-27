import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

/**
 * Local development is zero-config: PGlite stores a real Postgres-compatible
 * database in .sat-nexus-db.
 *
 * Use a real Postgres instance by setting:
 *   DATABASE_MODE=postgres
 *   DATABASE_URL=postgresql://user:pass@host:5432/db
 *
 * SQLite-style URLs like `file:./dev.db` are ignored.
 *
 * If the embedded store is corrupt or locked (common after a hard kill of
 * `next dev`), ensureDatabaseReady() automatically rebuilds it once so you
 * never have to manually delete `.sat-nexus-db`.
 */
const rawUrl = process.env.DATABASE_URL?.trim() || "";
const isPostgresUrl =
  /^(postgres(ql)?:\/\/)/i.test(rawUrl) ||
  (/^[\w.-]+:\d+\//.test(rawUrl) && !rawUrl.startsWith("file:"));

const mode = (process.env.DATABASE_MODE || "").trim().toLowerCase();
const forceEmbedded = mode === "embedded" || mode === "pglite" || mode === "local";
const forcePostgres = mode === "postgres" || mode === "pg";

const shouldUsePostgres =
  !forceEmbedded &&
  isPostgresUrl &&
  (forcePostgres || (process.env.NODE_ENV === "production" && mode !== "embedded"));

const databaseUrl = isPostgresUrl ? rawUrl : undefined;

type DbInstance = ReturnType<typeof drizzlePostgres>;

const globalForDb = globalThis as typeof globalThis & {
  __satNexusPgPool?: Pool;
  __satNexusPGlite?: PGlite;
  __satNexusDb?: DbInstance;
  __satNexusSchemaPromise?: Promise<void>;
};

const embeddedDataDir = process.env.SAT_NEXUS_DATA_DIR?.trim()
  ? path.resolve(process.env.SAT_NEXUS_DATA_DIR)
  : path.resolve(process.cwd(), ".sat-nexus-db");

function rmDirSafe(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 40 });
  } catch (error) {
    console.warn("[db] could not remove embedded data dir:", dir, error);
  }
}

function buildDb(client: Pool | PGlite): DbInstance {
  return (client instanceof Pool ? drizzlePostgres(client) : drizzlePglite(client)) as DbInstance;
}

function openEmbedded(): PGlite {
  return globalForDb.__satNexusPGlite ?? new PGlite(embeddedDataDir);
}

function openPostgres(): Pool {
  return (
    globalForDb.__satNexusPgPool ??
    new Pool({
      connectionString: databaseUrl,
    })
  );
}

function createClient(): Pool | PGlite {
  if (shouldUsePostgres) {
    const pool = openPostgres();
    globalForDb.__satNexusPgPool = pool;
    return pool;
  }
  const embedded = openEmbedded();
  globalForDb.__satNexusPGlite = embedded;
  return embedded;
}

function currentDb(): DbInstance {
  if (!globalForDb.__satNexusDb) {
    globalForDb.__satNexusDb = buildDb(createClient());
  }
  return globalForDb.__satNexusDb;
}

/** Live Drizzle handle — always points at the current client. */
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_t, prop, receiver) {
    const instance = currentDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(instance) : value;
  },
});

export const databaseKind = shouldUsePostgres ? "postgres" : "embedded";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS questions (
    id text PRIMARY KEY,
    question_text text NOT NULL DEFAULT '',
    question_html text,
    passage text,
    passage_html text,
    correct_answer text NOT NULL,
    explanation text,
    difficulty text NOT NULL DEFAULT 'Medium',
    domain text NOT NULL,
    skill text NOT NULL,
    subskill text,
    source text,
    type text NOT NULL DEFAULT 'multiple_choice',
    choices jsonb,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS questions_domain_idx ON questions (domain)`,
  `CREATE INDEX IF NOT EXISTS questions_skill_idx ON questions (skill)`,
  `CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON questions (difficulty)`,
  `CREATE INDEX IF NOT EXISTS questions_subskill_idx ON questions (subskill)`,
  `CREATE TABLE IF NOT EXISTS favorites (
    question_id text PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    question_id text PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    note text NOT NULL DEFAULT '',
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS collections (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    icon text NOT NULL DEFAULT 'folder',
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE collections ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'folder'`,
  `CREATE TABLE IF NOT EXISTS collection_items (
    collection_id text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    added_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS quiz_sessions (
    id text PRIMARY KEY,
    mode text NOT NULL DEFAULT 'practice',
    label text,
    test_id text,
    total_questions integer NOT NULL DEFAULT 0,
    correct_count integer,
    answered_count integer,
    adaptive_path jsonb,
    total_score integer,
    rw_score integer,
    math_score integer,
    skill_bands jsonb,
    started_at timestamp NOT NULL DEFAULT now(),
    finished_at timestamp
  )`,
  `ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS adaptive_path jsonb`,
  `ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS total_score integer`,
  `ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS rw_score integer`,
  `ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS math_score integer`,
  `ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS skill_bands jsonb`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id serial PRIMARY KEY,
    session_id text NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    is_correct boolean NOT NULL,
    answer text,
    mode text NOT NULL DEFAULT 'practice',
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS attempts_session_question_unique ON attempts (session_id, question_id)`,
  `CREATE INDEX IF NOT EXISTS attempts_question_idx ON attempts (question_id)`,
  `CREATE INDEX IF NOT EXISTS attempts_created_idx ON attempts (created_at)`,
  `CREATE TABLE IF NOT EXISTS practice_tests (
    id text PRIMARY KEY,
    test_number integer NOT NULL,
    title text NOT NULL,
    release_label text,
    is_custom boolean NOT NULL DEFAULT false,
    rw_minutes integer NOT NULL DEFAULT 64,
    math_minutes integer NOT NULL DEFAULT 70,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS practice_test_questions (
    test_id text NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
    position integer NOT NULL,
    module text NOT NULL,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    PRIMARY KEY (test_id, position)
  )`,
  `CREATE INDEX IF NOT EXISTS ptq_test_idx ON practice_test_questions (test_id)`,
];

async function applySchema(instance: DbInstance) {
  for (const statement of SCHEMA_STATEMENTS) {
    await instance.execute(sql.raw(statement));
  }
  // Sanity probe — catches half-open / locked stores that accepted DDL no-ops.
  await instance.execute(sql`select 1`);
}

async function closeEmbedded() {
  const existing = globalForDb.__satNexusPGlite;
  if (!existing) return;
  try {
    await existing.close?.();
  } catch {
    /* ignore close races */
  }
  globalForDb.__satNexusPGlite = undefined;
  globalForDb.__satNexusDb = undefined;
}

async function rebuildEmbeddedStore(reason: unknown) {
  console.warn(
    "[db] embedded PGlite store unusable — auto-rebuilding",
    embeddedDataDir,
    reason instanceof Error ? reason.message : reason,
  );
  await closeEmbedded();
  rmDirSafe(embeddedDataDir);
  // Recreate empty dir so PGlite doesn't trip over a half-deleted path.
  try {
    fs.mkdirSync(embeddedDataDir, { recursive: true });
  } catch {
    /* PGlite will create it */
  }
  const fresh = new PGlite(embeddedDataDir);
  globalForDb.__satNexusPGlite = fresh;
  globalForDb.__satNexusDb = buildDb(fresh);
  await applySchema(globalForDb.__satNexusDb);
}

async function runSchema() {
  try {
    await applySchema(currentDb());
  } catch (error) {
    if (shouldUsePostgres) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Database schema setup failed (postgres): ${message}\n` +
          "Check DATABASE_URL points at a reachable Postgres instance, or set DATABASE_MODE=embedded.",
      );
    }
    // Auto-heal corrupt/locked embedded stores. Seed reloads questions after.
    try {
      await rebuildEmbeddedStore(error);
    } catch (rebuildError) {
      const message = rebuildError instanceof Error ? rebuildError.message : String(rebuildError);
      throw new Error(
        `Database schema setup failed (embedded): ${message}\n` +
          "Automatic repair did not succeed. Stop every running dev server, then restart once.",
      );
    }
  }
}

export function ensureDatabaseReady(): Promise<void> {
  if (!globalForDb.__satNexusSchemaPromise) {
    globalForDb.__satNexusSchemaPromise = runSchema().catch((error) => {
      globalForDb.__satNexusSchemaPromise = undefined;
      throw error;
    });
  }
  return globalForDb.__satNexusSchemaPromise;
}

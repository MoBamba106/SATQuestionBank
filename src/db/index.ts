import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

/**
 * Database access for SAT Nexus (web).
 *
 * Production / Vercel:
 *   Set DATABASE_URL to a Postgres connection string.
 *   CloudBase Relational DB, Neon, Supabase, RDS, etc. all work.
 *
 * Local development (zero-config):
 *   Embedded PGlite in .sat-nexus-db when DATABASE_URL is unset.
 */
const rawUrl = process.env.DATABASE_URL?.trim() || "";
const isPostgresUrl =
  /^(postgres(ql)?:\/\/)/i.test(rawUrl) ||
  (/^[\w.-]+:\d+\//.test(rawUrl) && !rawUrl.startsWith("file:"));

const mode = (process.env.DATABASE_MODE || "").trim().toLowerCase();
const forceEmbedded = mode === "embedded" || mode === "pglite" || mode === "local";
const forcePostgres = mode === "postgres" || mode === "pg";

const onVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
const shouldUsePostgres =
  !forceEmbedded &&
  isPostgresUrl &&
  (forcePostgres || onVercel || process.env.NODE_ENV === "production" || Boolean(rawUrl));

if ((onVercel || process.env.NODE_ENV === "production") && !isPostgresUrl && !forceEmbedded) {
  console.warn(
    "[db] DATABASE_URL is missing or not a postgres:// URL. " +
      "Vercel production requires Postgres (CloudBase RDB / Neon / etc.).",
  );
}

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

function buildDb(client: Pool | PGlite): DbInstance {
  return (client instanceof Pool ? drizzlePostgres(client) : drizzlePglite(client)) as DbInstance;
}

function createClient(): Pool | PGlite {
  if (shouldUsePostgres) {
    const pool =
      globalForDb.__satNexusPgPool ??
      new Pool({
        connectionString: databaseUrl,
        // Vercel serverless: small pool, SSL when required by host.
        max: onVercel ? 3 : 10,
        ssl:
          process.env.DATABASE_SSL === "false"
            ? undefined
            : databaseUrl && !/localhost|127\.0\.0\.1/.test(databaseUrl)
              ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
              : undefined,
      });
    globalForDb.__satNexusPgPool = pool;
    return pool;
  }
  const embedded = globalForDb.__satNexusPGlite ?? new PGlite(embeddedDataDir);
  globalForDb.__satNexusPGlite = embedded;
  return embedded;
}

function currentDb(): DbInstance {
  if (!globalForDb.__satNexusDb) {
    globalForDb.__satNexusDb = buildDb(createClient());
  }
  return globalForDb.__satNexusDb;
}

export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_t, prop, receiver) {
    const instance = currentDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(instance) : value;
  },
});

export const databaseKind = shouldUsePostgres ? "postgres" : "embedded";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text,
    display_name text,
    avatar_url text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  // Ensure a guest row always exists for unauthenticated local/demo use.
  `INSERT INTO users (id, email, display_name) VALUES ('guest', null, 'Guest')
   ON CONFLICT (id) DO NOTHING`,
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
  // Multi-user favorites (new shape). Migrate legacy single-column table if present.
  `CREATE TABLE IF NOT EXISTS favorites (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
  )`,
  `CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites (user_id)`,
  `CREATE TABLE IF NOT EXISTS notes (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    note text NOT NULL DEFAULT '',
    updated_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS collections (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    icon text NOT NULL DEFAULT 'folder',
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS collections_user_idx ON collections (user_id)`,
  `ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id text`,
  `ALTER TABLE collections ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'folder'`,
  `CREATE TABLE IF NOT EXISTS collection_items (
    collection_id text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    added_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS quiz_sessions (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON quiz_sessions (user_id)`,
  `ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS user_id text`,
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
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    test_number integer NOT NULL,
    title text NOT NULL,
    release_label text,
    is_custom boolean NOT NULL DEFAULT false,
    rw_minutes integer NOT NULL DEFAULT 64,
    math_minutes integer NOT NULL DEFAULT 70,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false`,
  `ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS user_id text`,
  `CREATE TABLE IF NOT EXISTS practice_test_questions (
    test_id text NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
    position integer NOT NULL,
    module text NOT NULL,
    question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    PRIMARY KEY (test_id, position)
  )`,
  `CREATE INDEX IF NOT EXISTS ptq_test_idx ON practice_test_questions (test_id)`,
  // Backfill null user_id rows to guest (legacy single-user DBs).
  `UPDATE collections SET user_id = 'guest' WHERE user_id IS NULL`,
  `UPDATE quiz_sessions SET user_id = 'guest' WHERE user_id IS NULL`,
];

async function applySchema(instance: DbInstance) {
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await instance.execute(sql.raw(statement));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Ignore benign migration noise (e.g. legacy PK shape differences).
      if (/already exists|duplicate/i.test(message)) continue;
      throw error;
    }
  }
  await instance.execute(sql`select 1`);
}

async function runSchema() {
  try {
    await applySchema(currentDb());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Database schema setup failed (${databaseKind}): ${message}\n` +
        (shouldUsePostgres
          ? "Check DATABASE_URL (CloudBase RDB / Neon / Postgres) is reachable from this environment."
          : "Embedded PGlite failed. Delete .sat-nexus-db and restart, or set DATABASE_URL."),
    );
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

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
 * SQLite-style URLs like `file:./dev.db` are ignored — this app never uses
 * SQLite, and treating them as Postgres produced the CREATE TABLE failures.
 */
const rawUrl = process.env.DATABASE_URL?.trim() || "";
const isPostgresUrl =
  /^(postgres(ql)?:\/\/)/i.test(rawUrl) ||
  (/^[\w.-]+:\d+\//.test(rawUrl) && !rawUrl.startsWith("file:"));

const mode = (process.env.DATABASE_MODE || "").trim().toLowerCase();
const forceEmbedded = mode === "embedded" || mode === "pglite" || mode === "local";
const forcePostgres = mode === "postgres" || mode === "pg";

// Default: embedded. Only talk to external Postgres when explicitly asked, or
// when production has a real postgres:// URL.
const shouldUsePostgres =
  !forceEmbedded &&
  isPostgresUrl &&
  (forcePostgres || (process.env.NODE_ENV === "production" && mode !== "embedded"));

const databaseUrl = isPostgresUrl ? rawUrl : undefined;

const globalForDb = globalThis as typeof globalThis & {
  __satNexusPgPool?: Pool;
  __satNexusPGlite?: PGlite;
  __satNexusSchemaPromise?: Promise<void>;
};

const embeddedDataDir = process.env.SAT_NEXUS_DATA_DIR?.trim()
  ? path.resolve(process.env.SAT_NEXUS_DATA_DIR)
  : path.resolve(process.cwd(), ".sat-nexus-db");

const client = shouldUsePostgres
  ? globalForDb.__satNexusPgPool ??
    new Pool({
      connectionString: databaseUrl,
    })
  : globalForDb.__satNexusPGlite ?? new PGlite(embeddedDataDir);

if (client instanceof Pool) globalForDb.__satNexusPgPool = client;
else globalForDb.__satNexusPGlite = client;

// Both drivers implement Drizzle's PostgreSQL API. Keeping one exported type
// avoids spreading a driver union through every API route.
export const db = (
  client instanceof Pool ? drizzlePostgres(client) : drizzlePglite(client)
) as ReturnType<typeof drizzlePostgres>;

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

async function runSchema() {
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Database schema setup failed (${databaseKind}): ${message}\n` +
          `Statement: ${statement.replace(/\s+/g, " ").slice(0, 140)}…\n` +
          (shouldUsePostgres
            ? "Check DATABASE_URL points at a reachable Postgres instance, or set DATABASE_MODE=embedded."
            : "The embedded PGlite database could not initialize. Delete .sat-nexus-db and restart if it is corrupt."),
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

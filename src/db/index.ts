import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePostgres } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool, type PoolConfig } from "pg";

/**
 * Database access for SAT Nexus (web).
 *
 * Production / Vercel:
 *   - DATABASE_URL: runtime query traffic
 *   - DATABASE_MIGRATION_URL (recommended): schema migrations
 *
 * Local development (zero-config):
 *   Embedded PGlite in .sat-nexus-db when DATABASE_URL is unset.
 */
const rawDatabaseUrl = process.env.DATABASE_URL?.trim() || "";

function isPostgresConnectionString(value: string) {
  return (
    /^(postgres(ql)?:\/\/)/i.test(value) ||
    (/^[\w.-]+:\d+\//.test(value) && !value.startsWith("file:"))
  );
}

function deriveSupabaseSessionPoolerUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (!/pooler\.supabase\.com$/i.test(parsed.hostname) || parsed.port !== "6543") {
      return value;
    }
    parsed.port = "5432";
    return parsed.toString();
  } catch {
    return value;
  }
}

const derivedMigrationUrl = isPostgresConnectionString(rawDatabaseUrl)
  ? deriveSupabaseSessionPoolerUrl(rawDatabaseUrl)
  : "";

const rawMigrationUrl =
  process.env.DATABASE_MIGRATION_URL?.trim() ||
  derivedMigrationUrl ||
  process.env.DATABASE_DIRECT_URL?.trim() ||
  process.env.DIRECT_DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  rawDatabaseUrl;

const mode = (process.env.DATABASE_MODE || "").trim().toLowerCase();
const forceEmbedded = mode === "embedded" || mode === "pglite" || mode === "local";
const forcePostgres = mode === "postgres" || mode === "pg";

const onVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
const hasRuntimePostgresUrl = isPostgresConnectionString(rawDatabaseUrl);
const shouldUsePostgres =
  !forceEmbedded &&
  hasRuntimePostgresUrl &&
  (forcePostgres || onVercel || process.env.NODE_ENV === "production" || Boolean(rawDatabaseUrl));

if ((onVercel || process.env.NODE_ENV === "production") && !hasRuntimePostgresUrl && !forceEmbedded) {
  console.warn(
    "[db] DATABASE_URL is missing or not a postgres:// URL. " +
      "Vercel production requires Postgres (CloudBase RDB / Neon / Supabase / etc.).",
  );
}

const databaseUrl = hasRuntimePostgresUrl ? rawDatabaseUrl : undefined;
const migrationUrl = isPostgresConnectionString(rawMigrationUrl) ? rawMigrationUrl : databaseUrl;

export type DatabaseConnectionInfo = {
  configured: boolean;
  provider: "supabase" | "neon" | "cloudbase" | "postgres" | "unknown";
  connectionMode: "transaction-pooler" | "session-pooler" | "direct" | "standard" | "unknown";
  host: string | null;
  port: string | null;
};

function parseDatabaseUrl(value: string): URL | null {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

function redactHost(host: string | null): string | null {
  if (!host) return null;
  if (/pooler\.supabase\.com$/i.test(host)) return "*.pooler.supabase.com";
  if (/supabase\.co$/i.test(host)) return "*.supabase.co";
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  return `*.${parts.slice(-2).join(".")}`;
}

function getDatabaseConnectionInfo(url: string | undefined): DatabaseConnectionInfo {
  if (!url) {
    return {
      configured: false,
      provider: "unknown",
      connectionMode: "unknown",
      host: null,
      port: null,
    };
  }

  const parsed = parseDatabaseUrl(url);
  const host = parsed?.hostname?.toLowerCase() || null;
  const port = parsed?.port || null;

  const provider: DatabaseConnectionInfo["provider"] = host?.includes("supabase")
    ? "supabase"
    : host?.includes("neon.tech")
      ? "neon"
      : host?.includes("tencentdb") || host?.includes("cloudbase")
        ? "cloudbase"
        : host
          ? "postgres"
          : "unknown";

  const connectionMode: DatabaseConnectionInfo["connectionMode"] = /pooler\.supabase\.com$/i.test(host || "")
    ? port === "6543"
      ? "transaction-pooler"
      : port === "5432"
        ? "session-pooler"
        : "standard"
    : provider === "supabase"
      ? "direct"
      : url
        ? "standard"
        : "unknown";

  return {
    configured: true,
    provider,
    connectionMode,
    host: redactHost(host),
    port,
  };
}

function describeDatabaseTarget(info: DatabaseConnectionInfo): string {
  if (!info.configured) return "not configured";
  const parts = [`provider=${info.provider}`];
  if (info.connectionMode !== "unknown") parts.push(`mode=${info.connectionMode}`);
  if (info.host) parts.push(`host=${info.host}`);
  if (info.port) parts.push(`port=${info.port}`);
  return parts.join(", ");
}

function extractErrorDetails(error: unknown): string {
  const seen = new Set<unknown>();
  const messages: string[] = [];
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error && current.message) messages.push(current.message.trim());
    if (typeof current === "object" && current) {
      const fields = current as Record<string, unknown>;
      for (const key of ["code", "detail", "hint", "severity"]) {
        const value = fields[key];
        if (typeof value === "string" && value.trim()) messages.push(`${key}: ${value.trim()}`);
      }
      current = fields.cause;
    } else {
      break;
    }
  }

  return [...new Set(messages)].join(" | ");
}

function errorChainHasCode(error: unknown, code: string): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current === "object" && current) {
      const fields = current as Record<string, unknown>;
      if (fields.code === code) return true;
      current = fields.cause;
    } else {
      break;
    }
  }

  return false;
}

function shouldTrySupabaseSessionFallback(error: unknown): boolean {
  return errorChainHasCode(error, "ENETUNREACH") || /ENETUNREACH|network is unreachable/i.test(extractErrorDetails(error));
}

function shouldTryRelaxedSsl(error: unknown): boolean {
  return (
    errorChainHasCode(error, "SELF_SIGNED_CERT_IN_CHAIN") ||
    errorChainHasCode(error, "DEPTH_ZERO_SELF_SIGNED_CERT") ||
    errorChainHasCode(error, "UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
    /self-signed certificate|unable to verify the first certificate|unable to verify leaf signature/i.test(
      extractErrorDetails(error),
    )
  );
}

export const databaseConnectionInfo = getDatabaseConnectionInfo(databaseUrl);
export const databaseMigrationConnectionInfo = getDatabaseConnectionInfo(migrationUrl);
export const databaseKind = shouldUsePostgres ? "postgres" : "embedded";

const embeddedDataDir = process.env.SAT_NEXUS_DATA_DIR?.trim()
  ? path.resolve(process.env.SAT_NEXUS_DATA_DIR)
  : path.resolve(process.cwd(), ".sat-nexus-db");
const migrationConfig = {
  migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  migrationsSchema: "public",
  migrationsTable: "__drizzle_migrations",
} as const;

type DbInstance = ReturnType<typeof drizzlePostgres>;

const globalForDb = globalThis as typeof globalThis & {
  __satNexusPgPool?: Pool;
  __satNexusPGlite?: PGlite;
  __satNexusDb?: DbInstance;
  __satNexusSchemaPromise?: Promise<void>;
};

function buildPoolOptions(
  connectionString: string,
  max: number,
  options?: { rejectUnauthorized?: boolean },
): PoolConfig {
  const rejectUnauthorized =
    options?.rejectUnauthorized ?? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";

  return {
    connectionString,
    max,
    allowExitOnIdle: true,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? undefined
        : !/localhost|127\.0\.0\.1/.test(connectionString)
          ? { rejectUnauthorized }
          : undefined,
  };
}

function buildDb(client: Pool | PGlite): DbInstance {
  return (client instanceof Pool ? drizzlePostgres(client) : drizzlePglite(client)) as DbInstance;
}

function createRuntimeClient(): Pool | PGlite {
  if (shouldUsePostgres && databaseUrl) {
    const pool = globalForDb.__satNexusPgPool ?? new Pool(buildPoolOptions(databaseUrl, onVercel ? 3 : 10));
    globalForDb.__satNexusPgPool = pool;
    return pool;
  }

  const embedded = globalForDb.__satNexusPGlite ?? new PGlite(embeddedDataDir);
  globalForDb.__satNexusPGlite = embedded;
  return embedded;
}

function currentDb(): DbInstance {
  if (!globalForDb.__satNexusDb) {
    globalForDb.__satNexusDb = buildDb(createRuntimeClient());
  }
  return globalForDb.__satNexusDb;
}

export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    const instance = currentDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

async function runRuntimeHealthcheck() {
  await currentDb().execute(sql`select 1`);
}

async function ensureGuestUser() {
  await db.execute(sql`
    INSERT INTO users (id, email, display_name)
    VALUES ('guest', null, 'Guest')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function migrateRuntimeConnection() {
  if (shouldUsePostgres) {
    await migrateNodePostgres(currentDb() as never, migrationConfig);
  } else {
    await migratePglite(currentDb() as never, migrationConfig);
  }
}

async function migrateWithDedicatedConnection(
  connectionString: string,
  options?: { rejectUnauthorized?: boolean },
) {
  const pool = new Pool(buildPoolOptions(connectionString, 1, options));
  try {
    const migrationDb = drizzlePostgres(pool);
    await migrateNodePostgres(migrationDb, migrationConfig);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function migrateDatabase(): Promise<void> {
  if (!shouldUsePostgres) {
    await migrateRuntimeConnection();
    return;
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (migrationUrl && migrationUrl !== databaseUrl) {
    const attempted = new Set<string>();
    const queue: string[] = [migrationUrl];
    const supabaseSessionFallback = deriveSupabaseSessionPoolerUrl(databaseUrl);

    while (queue.length > 0) {
      const candidate = queue.shift();
      if (!candidate || attempted.has(candidate)) continue;
      attempted.add(candidate);

      try {
        await migrateWithDedicatedConnection(candidate);
        return;
      } catch (error) {
        if (
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" &&
          shouldTryRelaxedSsl(error)
        ) {
          console.warn(
            "[db] migration connection hit a certificate-chain validation error; retrying with rejectUnauthorized=false.",
          );
          await migrateWithDedicatedConnection(candidate, { rejectUnauthorized: false });
          return;
        }

        const canFallback =
          databaseConnectionInfo.provider === "supabase" &&
          supabaseSessionFallback !== candidate &&
          shouldTrySupabaseSessionFallback(error);

        if (canFallback) {
          console.warn(
            "[db] migration connection failed; retrying with derived Supabase session pooler URL (port 5432).",
          );
          queue.push(supabaseSessionFallback);
          continue;
        }

        throw error;
      }
    }
  }

  try {
    await migrateRuntimeConnection();
  } catch (error) {
    if (
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" &&
      shouldTryRelaxedSsl(error) &&
      databaseUrl
    ) {
      console.warn(
        "[db] runtime migration connection hit a certificate-chain validation error; retrying with rejectUnauthorized=false.",
      );
      await migrateWithDedicatedConnection(databaseUrl, { rejectUnauthorized: false });
      return;
    }
    throw error;
  }
}

async function runSchema() {
  try {
    await migrateDatabase();
    await ensureGuestUser();
    await runRuntimeHealthcheck();
  } catch (error) {
    const message = extractErrorDetails(error) || (error instanceof Error ? error.message : String(error));
    const runtimeTarget = describeDatabaseTarget(databaseConnectionInfo);
    const migrationTarget = describeDatabaseTarget(databaseMigrationConnectionInfo);
    const providerHint =
      databaseConnectionInfo.provider === "supabase" &&
      databaseConnectionInfo.connectionMode === "transaction-pooler"
        ? " Supabase transaction pooler URLs (port 6543) are best for app queries. Use DATABASE_MIGRATION_URL with a direct or session-mode connection for Drizzle migrations."
        : "";

    throw new Error(
      `Database schema setup failed (${databaseKind}): ${message}\n` +
        `Runtime target: ${runtimeTarget}. Migration target: ${migrationTarget}.` +
        (shouldUsePostgres
          ? ` Check DATABASE_URL, DATABASE_MIGRATION_URL, and database credentials.${providerHint}`
          : " Embedded PGlite failed. Delete .sat-nexus-db and restart, or set DATABASE_URL."),
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

export async function closeDatabaseConnections(): Promise<void> {
  const closeCalls: Promise<unknown>[] = [];

  if (globalForDb.__satNexusPgPool) {
    closeCalls.push(globalForDb.__satNexusPgPool.end().catch(() => undefined));
    globalForDb.__satNexusPgPool = undefined;
  }

  if (globalForDb.__satNexusPGlite && typeof globalForDb.__satNexusPGlite.close === "function") {
    closeCalls.push(globalForDb.__satNexusPGlite.close().catch(() => undefined));
    globalForDb.__satNexusPGlite = undefined;
  }

  globalForDb.__satNexusDb = undefined;
  globalForDb.__satNexusSchemaPromise = undefined;

  await Promise.all(closeCalls);
}

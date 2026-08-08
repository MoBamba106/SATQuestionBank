import {
  databaseConnectionInfo,
  databaseKind,
  databaseMigrationConnectionInfo,
  db,
  ensureDatabaseReady,
} from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseReady();
    await db.execute(sql`select 1`);
    const dbEnvStatus: Record<string, string> = {};
    for (const key of [
      "POSTGRES_URL",
      "POSTGRES_PRISMA_URL",
      "DATABASE_URL",
      "POSTGRES_URL_NON_POOLING",
      "DATABASE_MIGRATION_URL",
      "DATABASE_MODE",
    ]) {
      const raw = process.env[key];
      if (raw == null || !String(raw).trim()) {
        dbEnvStatus[key] = "unset";
        continue;
      }
      if (key === "DATABASE_MODE") {
        dbEnvStatus[key] = String(raw).trim();
        continue;
      }
      // Never echo secrets — only whether the value looks like a postgres URL.
      let cleaned = String(raw).trim();
      if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      cleaned = cleaned
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "$1")
        .replace(/\s*\((https?:\/\/[^)]+)\)\s*$/i, "")
        .replace(/\s+/g, "");
      const ok = /^(postgres(ql)?:\/\/)/i.test(cleaned);
      if (!ok) {
        dbEnvStatus[key] = cleaned.includes("](") || /https?:\/\//i.test(String(raw))
          ? "invalid (markdown/link junk — paste plain postgresql:// string)"
          : "invalid (must start with postgresql://)";
        continue;
      }
      try {
        const u = new URL(cleaned);
        dbEnvStatus[key] = `ok host=${u.hostname} port=${u.port || "?"}`;
      } catch {
        dbEnvStatus[key] = "invalid (unparseable URL)";
      }
    }
    return Response.json({
      ok: true,
      database: databaseKind,
      databaseConnection: databaseConnectionInfo,
      migrationConnection: databaseMigrationConnectionInfo,
      databaseEnvStatus: dbEnvStatus,
      supabaseAuth: Boolean(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
          (
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY
          ),
      ),
      runtime: process.env.VERCEL ? "vercel" : "node",
    });
  } catch (error) {
    console.error("[api/health] database check failed:", error);
    return Response.json(
      {
        ok: false,
        database: databaseKind,
        databaseConnection: databaseConnectionInfo,
        migrationConnection: databaseMigrationConnectionInfo,
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 500 },
    );
  }
}

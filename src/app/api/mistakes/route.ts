import { NextResponse } from "next/server";
import { sql, SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { QUESTION_SELECT, QUESTION_JOINS, mapRow } from "@/lib/server-questions";

export const dynamic = "force-dynamic";

/**
 * Mistake bank = questions whose MOST RECENT graded attempt is incorrect.
 * When the user answers it correctly later, it automatically drops out of
 * the mistake bank — no manual bookkeeping, and it survives refreshes.
 */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const sp = new URL(req.url).searchParams;
    const domain = sp.get("domain");
    const daysBack = Number(sp.get("daysBack") ?? 0) || 0;
    const neverCorrected = sp.get("neverCorrected") === "1";

    const conds: SQL[] = [sql`l.is_correct = false`];
    if (domain && domain !== "All") conds.push(sql`q.domain = ${domain}`);
    if (daysBack > 0) conds.push(sql`l.created_at >= now() - (${daysBack} || ' days')::interval`);
    if (neverCorrected)
      conds.push(sql`NOT EXISTS (SELECT 1 FROM attempts a2 WHERE a2.question_id = q.id AND a2.is_correct)`);

    const res = await db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (question_id) question_id, is_correct, created_at
        FROM attempts
        ORDER BY question_id, created_at DESC, id DESC
      )
      SELECT ${QUESTION_SELECT}, l.created_at AS mistake_at
      FROM latest l
      JOIN questions q ON q.id = l.question_id
      ${QUESTION_JOINS}
      WHERE ${sql.join(conds, sql` AND `)}
      ORDER BY l.created_at DESC
      LIMIT 500
    `);
    const rows = (res as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
    const questions = rows.map((r) => ({ ...mapRow(r), mistakeAt: r.mistake_at ? new Date(r.mistake_at as string).toISOString() : null }));
    return NextResponse.json({ count: questions.length, questions });
  } catch (e) {
    console.error("[api/mistakes] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load mistakes" }, { status: 500 });
  }
}

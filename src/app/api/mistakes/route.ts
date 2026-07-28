import { NextResponse } from "next/server";
import { sql, SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { questionSelect, questionJoins, mapRow } from "@/lib/server-questions";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const sp = new URL(req.url).searchParams;
    const domain = sp.get("domain");
    const daysBack = Number(sp.get("daysBack") ?? 0) || 0;
    const neverCorrected = sp.get("neverCorrected") === "1";

    const conds: SQL[] = [sql`l.is_correct = false`];
    if (domain && domain !== "All") conds.push(sql`q.domain = ${domain}`);
    if (daysBack > 0) conds.push(sql`l.created_at >= now() - (${daysBack} || ' days')::interval`);
    if (neverCorrected) {
      conds.push(sql`
        NOT EXISTS (
          SELECT 1 FROM attempts a2
          INNER JOIN quiz_sessions qs2 ON qs2.id = a2.session_id AND qs2.user_id = ${user.id}
          WHERE a2.question_id = q.id AND a2.is_correct
        )
      `);
    }

    const res = await db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (a.question_id) a.question_id, a.is_correct, a.created_at
        FROM attempts a
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${user.id}
        ORDER BY a.question_id, a.created_at DESC, a.id DESC
      )
      SELECT ${questionSelect(user.id)}, l.created_at AS mistake_at
      FROM latest l
      JOIN questions q ON q.id = l.question_id
      ${questionJoins(user.id)}
      WHERE ${sql.join(conds, sql` AND `)}
      ORDER BY l.created_at DESC
      LIMIT 500
    `);
    const rows = (res as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
    const questions = rows.map((r) => ({
      ...mapRow(r),
      mistakeAt: r.mistake_at ? new Date(r.mistake_at as string).toISOString() : null,
    }));
    return NextResponse.json({ count: questions.length, questions });
  } catch (e) {
    console.error("[api/mistakes] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load mistakes" }, { status: 500 });
  }
}

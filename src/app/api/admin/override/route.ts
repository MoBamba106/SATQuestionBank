import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { AdminAuthError, requireAdmin } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const overrideSchema = z.object({
  /** The account whose mistake bank / accuracy should be corrected. */
  userId: z.string().min(1, "userId is required"),
  /** The question to mark as correct for that user. */
  questionId: z.string().min(1, "questionId is required"),
});

/**
 * Admin manual override: mark a question as correct for a given user.
 *
 * Every attempt for (userId, questionId) is flipped to correct, which:
 *  - removes the question from that user's mistake bank (latest attempt is
 *    now correct), and
 *  - restores their global accuracy stats (correct count rises, total stays
 *    the same — no duplicate rows are created).
 *
 * Requires a real admin session (impersonation is NOT accepted for this).
 */
export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const admin = await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const parsed = overrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { userId, questionId } = parsed.data;

    const exists = await db.execute(sql`
      SELECT 1 FROM users WHERE id = ${userId} LIMIT 1
    `);
    if (((exists as unknown as { rows: unknown[] }).rows ?? []).length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const qExists = await db.execute(sql`
      SELECT 1 FROM questions WHERE id = ${questionId} LIMIT 1
    `);
    if (((qExists as unknown as { rows: unknown[] }).rows ?? []).length === 0) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const res = await db.execute(sql`
      UPDATE attempts a
      SET is_correct = true
      FROM quiz_sessions qs
      WHERE qs.id = a.session_id
        AND qs.user_id = ${userId}
        AND a.question_id = ${questionId}
    `);

    const updated = Number((res as unknown as { rowCount?: number | bigint }).rowCount ?? 0);
    return NextResponse.json({ ok: true, updated, adminId: admin.id });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[api/admin/override] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to apply override" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { fetchQuestionsByIds } from "@/lib/server-questions";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as unknown as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * GET /api/shared-quizzes/:token
 * Public (auth optional) lookup of a shared quiz snapshot + its questions.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const { token: rawToken } = await ctx.params;
    const token = decodeURIComponent(rawToken || "").trim();
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    await db.execute(sql`DELETE FROM shared_quizzes WHERE expires_at < now()`);

    const metaRes = await db.execute(sql`
      SELECT id, token, label, mode, question_ids AS "questionIds",
             created_at AS "createdAt", expires_at AS "expiresAt",
             from_user_id AS "fromUserId"
      FROM shared_quizzes
      WHERE token = ${token}
      LIMIT 1
    `);
    const meta = rows<Record<string, unknown>>(metaRes)[0];
    if (!meta) {
      return NextResponse.json({ error: "This shared quiz link is invalid or has expired." }, { status: 404 });
    }

    let ids: string[] = [];
    if (Array.isArray(meta.questionIds)) {
      ids = (meta.questionIds as unknown[]).map((id) => String(id));
    } else if (typeof meta.questionIds === "string") {
      try {
        ids = (JSON.parse(meta.questionIds) as unknown[]).map((id) => String(id));
      } catch {
        ids = [];
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "This shared quiz has no questions." }, { status: 404 });
    }

    const questions = await fetchQuestionsByIds(ids, user.id);

    return NextResponse.json({
      id: meta.id,
      token: meta.token,
      label: meta.label,
      mode: meta.mode,
      createdAt: meta.createdAt,
      expiresAt: meta.expiresAt,
      questionCount: questions.length,
      questions,
    });
  } catch (e) {
    console.error("[api/shared-quizzes/token] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

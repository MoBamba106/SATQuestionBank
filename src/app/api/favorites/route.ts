import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const res = await db.execute(
      sql`SELECT question_id AS id, created_at AS "createdAt"
          FROM favorites WHERE user_id = ${user.id}
          ORDER BY created_at DESC`,
    );
    const rows = (res as unknown as { rows: { id: string; createdAt: string }[] }).rows ?? [];
    return NextResponse.json({ ids: rows.map((r) => r.id), count: rows.length });
  } catch (e) {
    console.error("[api/favorites] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load favorites" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const body = await req.json();
    const questionId = String(body?.questionId ?? "");
    const favorite = Boolean(body?.favorite);
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });

    const exists = await db.execute(sql`SELECT 1 FROM questions WHERE id = ${questionId} LIMIT 1`);
    if (((exists as unknown as { rows: unknown[] }).rows ?? []).length === 0)
      return NextResponse.json({ error: "Question not found" }, { status: 404 });

    if (favorite) {
      await db.execute(
        sql`INSERT INTO favorites (user_id, question_id) VALUES (${user.id}, ${questionId})
            ON CONFLICT (user_id, question_id) DO NOTHING`,
      );
    } else {
      await db.execute(sql`DELETE FROM favorites WHERE user_id = ${user.id} AND question_id = ${questionId}`);
    }
    return NextResponse.json({ questionId, favorite });
  } catch (e) {
    console.error("[api/favorites] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update favorite" }, { status: 500 });
  }
}

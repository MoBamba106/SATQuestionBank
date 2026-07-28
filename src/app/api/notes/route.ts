import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const body = await req.json();
    const questionId = String(body?.questionId ?? "");
    const note = String(body?.note ?? "");
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });

    if (!note.trim()) {
      await db.execute(sql`DELETE FROM notes WHERE user_id = ${user.id} AND question_id = ${questionId}`);
      return NextResponse.json({ questionId, note: "" });
    }

    await db.execute(sql`
      INSERT INTO notes (user_id, question_id, note, updated_at)
      VALUES (${user.id}, ${questionId}, ${note}, now())
      ON CONFLICT (user_id, question_id) DO UPDATE
      SET note = EXCLUDED.note, updated_at = now()
    `);
    return NextResponse.json({ questionId, note });
  } catch (e) {
    console.error("[api/notes] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to save note" }, { status: 500 });
  }
}

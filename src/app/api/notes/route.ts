import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const questionId = String(body?.questionId ?? "");
    const note = String(body?.note ?? "");
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    await db.execute(sql`
      INSERT INTO notes (question_id, note, updated_at)
      VALUES (${questionId}, ${note}, now())
      ON CONFLICT (question_id)
      DO UPDATE SET note = EXCLUDED.note, updated_at = now()
    `);
    return NextResponse.json({ questionId, note });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to save note" }, { status: 500 });
  }
}

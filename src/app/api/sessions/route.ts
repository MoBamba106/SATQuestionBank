import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { uid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const id = uid("quiz");
    const mode = String(body?.mode ?? "practice");
    const label = body?.label ? String(body.label) : null;
    const testId = body?.testId ? String(body.testId) : null;
    const totalQuestions = Math.max(0, Number(body?.totalQuestions ?? 0) || 0);
    await db.execute(sql`
      INSERT INTO quiz_sessions (id, mode, label, test_id, total_questions)
      VALUES (${id}, ${mode}, ${label}, ${testId}, ${totalQuestions})
    `);
    return NextResponse.json({ id, mode, label, testId, totalQuestions });
  } catch (e) {
    console.error("[api/sessions] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to start session" }, { status: 500 });
  }
}

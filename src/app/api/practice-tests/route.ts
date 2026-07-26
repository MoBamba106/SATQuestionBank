import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const res = await db.execute(sql`
      SELECT t.id, t.test_number AS "testNumber", t.title,
             t.release_label AS "releaseLabel",
             t.rw_minutes AS "rwMinutes", t.math_minutes AS "mathMinutes",
             COUNT(*) FILTER (WHERE p.module IN ('rw1', 'rw2_hard', 'math1', 'math2_hard'))::int AS "totalQuestions",
             COUNT(*) FILTER (WHERE p.module IN ('rw1', 'rw2_hard'))::int AS "rwQuestions",
             COUNT(*) FILTER (WHERE p.module IN ('math1', 'math2_hard'))::int AS "mathQuestions"
      FROM practice_tests t
      LEFT JOIN practice_test_questions p ON p.test_id = t.id
      GROUP BY t.id
      ORDER BY t.test_number
    `);
    return NextResponse.json({ tests: (res as unknown as { rows: unknown[] }).rows ?? [] });
  } catch (e) {
    console.error("[api/practice-tests] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load practice tests" }, { status: 500 });
  }
}

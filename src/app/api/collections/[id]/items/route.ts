import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const { id } = await ctx.params;
    const body = await req.json();
    const questionId = String(body?.questionId ?? "");
    if (!questionId) return NextResponse.json({ error: "questionId is required" }, { status: 400 });

    const col = await db.execute(sql`SELECT 1 FROM collections WHERE id = ${id} LIMIT 1`);
    if (((col as unknown as { rows: unknown[] }).rows ?? []).length === 0)
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });

    const q = await db.execute(sql`SELECT 1 FROM questions WHERE id = ${questionId} LIMIT 1`);
    if (((q as unknown as { rows: unknown[] }).rows ?? []).length === 0)
      return NextResponse.json({ error: "Question not found" }, { status: 404 });

    if (body?.remove) {
      await db.execute(sql`DELETE FROM collection_items WHERE collection_id = ${id} AND question_id = ${questionId}`);
      return NextResponse.json({ collectionId: id, questionId, inCollection: false });
    }

    await db.execute(sql`
      INSERT INTO collection_items (collection_id, question_id) VALUES (${id}, ${questionId})
      ON CONFLICT (collection_id, question_id) DO NOTHING
    `);
    await db.execute(sql`UPDATE collections SET updated_at = now() WHERE id = ${id}`);
    return NextResponse.json({ collectionId: id, questionId, inCollection: true });
  } catch (e) {
    console.error("[api/collections/items] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update collection" }, { status: 500 });
  }
}

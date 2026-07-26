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
    const questionIds = Array.from(
      new Set(
        (Array.isArray(body?.questionIds) ? body.questionIds : [body?.questionId])
          .slice(0, 500)
          .map(String)
          .filter(Boolean),
      ),
    );
    if (questionIds.length === 0) {
      return NextResponse.json({ error: "At least one question ID is required" }, { status: 400 });
    }

    const collectionResult = await db.execute(sql`SELECT 1 FROM collections WHERE id = ${id} LIMIT 1`);
    if (((collectionResult as unknown as { rows: unknown[] }).rows ?? []).length === 0) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const idParams = sql.join(questionIds.map((questionId) => sql`${questionId}`), sql`, `);

    if (body?.remove) {
      await db.execute(sql`
        DELETE FROM collection_items
        WHERE collection_id = ${id} AND question_id IN (${idParams})
      `);
      await db.execute(sql`UPDATE collections SET updated_at = now() WHERE id = ${id}`);
      return NextResponse.json({ collectionId: id, questionIds, updated: questionIds.length, inCollection: false });
    }

    const insertResult = await db.execute(sql`
      INSERT INTO collection_items (collection_id, question_id)
      SELECT ${id}, q.id
      FROM questions q
      WHERE q.id IN (${idParams})
      ON CONFLICT (collection_id, question_id) DO NOTHING
      RETURNING question_id
    `);
    const inserted = ((insertResult as unknown as { rows?: unknown[] }).rows ?? []).length;
    await db.execute(sql`UPDATE collections SET updated_at = now() WHERE id = ${id}`);
    return NextResponse.json({
      collectionId: id,
      questionIds,
      inserted,
      updated: questionIds.length,
      inCollection: true,
    });
  } catch (error) {
    console.error("[api/collections/items] POST failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update collection" },
      { status: 500 },
    );
  }
}

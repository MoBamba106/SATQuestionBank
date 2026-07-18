import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { uid } from "@/lib/utils";
import type { StudyCollection } from "@/lib/types";

export const dynamic = "force-dynamic";

type RawRow = {
  id: string; name: string; description: string | null;
  createdAt: string; updatedAt: string; ids: unknown;
};

function mapCollection(r: RawRow): StudyCollection {
  const ids = Array.isArray(r.ids) ? (r.ids as string[]) : [];
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    questionIds: ids,
    questionCount: ids.length,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export async function GET() {
  try {
    await ensureSeeded();
    const res = await db.execute(sql`
      SELECT c.id, c.name, c.description,
             c.created_at AS "createdAt", c.updated_at AS "updatedAt",
             COALESCE(json_agg(ci.question_id ORDER BY ci.added_at)
               FILTER (WHERE ci.question_id IS NOT NULL), '[]') AS ids
      FROM collections c
      LEFT JOIN collection_items ci ON ci.collection_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `);
    const rows = (res as unknown as { rows: RawRow[] }).rows ?? [];
    return NextResponse.json({ collections: rows.map(mapCollection) });
  } catch (e) {
    console.error("[api/collections] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load collections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const description = body?.description ? String(body.description).trim() : null;
    if (!name) return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    const id = uid("col");
    await db.execute(sql`
      INSERT INTO collections (id, name, description) VALUES (${id}, ${name}, ${description})
    `);
    return NextResponse.json({
      collection: { id, name, description, questionIds: [], questionCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
  } catch (e) {
    console.error("[api/collections] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create collection" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const { id } = await ctx.params;
    const body = await req.json();
    const name = body?.name != null ? String(body.name).trim() : null;
    const description = body?.description != null ? String(body.description).trim() : null;
    if (name) await db.execute(sql`UPDATE collections SET name = ${name}, updated_at = now() WHERE id = ${id}`);
    if (description != null) await db.execute(sql`UPDATE collections SET description = ${description}, updated_at = now() WHERE id = ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update collection" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const { id } = await ctx.params;
    await db.execute(sql`DELETE FROM collections WHERE id = ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to delete collection" }, { status: 500 });
  }
}

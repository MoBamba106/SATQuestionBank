import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const name = body?.name != null ? String(body.name).trim() : null;
    const description = body?.description != null ? String(body.description).trim() : null;
    const icon = body?.icon != null ? String(body.icon).trim() : null;
    if (name) {
      await db.execute(sql`UPDATE collections SET name = ${name}, updated_at = now() WHERE id = ${id} AND user_id = ${user.id}`);
    }
    if (description != null) {
      await db.execute(sql`UPDATE collections SET description = ${description}, updated_at = now() WHERE id = ${id} AND user_id = ${user.id}`);
    }
    if (icon) {
      await db.execute(sql`UPDATE collections SET icon = ${icon}, updated_at = now() WHERE id = ${id} AND user_id = ${user.id}`);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update collection" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const { id } = await ctx.params;
    await db.execute(sql`DELETE FROM collections WHERE id = ${id} AND user_id = ${user.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to delete collection" }, { status: 500 });
  }
}

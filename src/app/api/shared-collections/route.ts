import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { isLocalGuestId } from "@/lib/auth/types";
import { uid } from "@/lib/utils";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as unknown as { rows?: T[] }).rows ?? []) as T[];
}

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) return NextResponse.json({ received: [], sent: [] });

    const received = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT sc.id, sc.collection_id as "collectionId", sc.created_at as "createdAt",
               fu.id as "fromId", fu.email as "fromEmail", fu.display_name as "fromDisplayName",
               c.name, c.description, c.icon,
               (SELECT COUNT(*)::int FROM collection_items ci WHERE ci.collection_id = c.id) as "questionCount",
               COALESCE((SELECT json_agg(ci.question_id) FROM collection_items ci WHERE ci.collection_id = c.id), '[]'::json) as "questionIds"
        FROM shared_collections sc
        JOIN users fu ON fu.id = sc.from_user_id
        JOIN collections c ON c.id = sc.collection_id
        WHERE sc.to_user_id = ${user.id}
        ORDER BY sc.created_at DESC
        LIMIT 100
      `),
    );

    const sent = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT sc.id, sc.collection_id as "collectionId", sc.created_at as "createdAt",
               tu.id as "toId", tu.email as "toEmail", tu.display_name as "toDisplayName",
               c.name
        FROM shared_collections sc
        JOIN users tu ON tu.id = sc.to_user_id
        JOIN collections c ON c.id = sc.collection_id
        WHERE sc.from_user_id = ${user.id}
        ORDER BY sc.created_at DESC
        LIMIT 100
      `),
    );

    return NextResponse.json({ received, sent });
  } catch (e) {
    console.error("[api/shared-collections] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    if (user.isGuest || isLocalGuestId(user.id)) return NextResponse.json({ error: "Sign in to share collections" }, { status: 401 });

    const body = await req.json();
    const collectionId = String(body?.collectionId || "").trim();
    let toUserId = String(body?.toUserId || "").trim();
    const toEmail = String(body?.toEmail || "").trim().toLowerCase();

    if (!collectionId) return NextResponse.json({ error: "collectionId required" }, { status: 400 });
    if (!toUserId && !toEmail) return NextResponse.json({ error: "Recipient required" }, { status: 400 });

    // Verify collection belongs to sender
    const check = await db.execute(sql`SELECT id FROM collections WHERE id = ${collectionId} AND user_id = ${user.id} LIMIT 1`);
    if (rows<Record<string, unknown>>(check).length === 0) {
      return NextResponse.json({ error: "Collection not found or not yours" }, { status: 404 });
    }

    if (!toUserId && toEmail) {
      const found = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${toEmail} LIMIT 1`);
      const foundRows = rows<{ id: string }>(found);
      const row = foundRows[0];
      if (!row) return NextResponse.json({ error: "No user with that email" }, { status: 404 });
      toUserId = row.id;
    }

    if (toUserId === user.id) return NextResponse.json({ error: "Cannot share to yourself" }, { status: 400 });

    // Prevent duplicate
    const existing = await db.execute(sql`
      SELECT id FROM shared_collections
      WHERE collection_id = ${collectionId} AND from_user_id = ${user.id} AND to_user_id = ${toUserId}
      LIMIT 1
    `);
    if (rows<Record<string, unknown>>(existing).length) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const id = `${Date.now()}-${uid("sc")}`;

    await db.execute(sql`
      INSERT INTO shared_collections (id, collection_id, from_user_id, to_user_id)
      VALUES (${id}, ${collectionId}, ${user.id}, ${toUserId})
    `);

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[api/shared-collections] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const sp = new URL(req.url).searchParams;
    const id = sp.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.execute(sql`
      DELETE FROM shared_collections
      WHERE id = ${id} AND (from_user_id = ${user.id} OR to_user_id = ${user.id})
    `);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

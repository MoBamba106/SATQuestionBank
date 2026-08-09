import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { AdminAuthError, requireAdmin } from "@/lib/auth/server";
import { GUEST_USER_ID } from "@/lib/auth/types";
import { resolveSupabaseUrl } from "@/lib/supabase";
import { resolveSupabaseServiceRoleKey } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getSupabaseAdminClient() {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const admin = await requireAdmin(req);
    const { id } = await context.params;
    const targetId = decodeURIComponent(id || "").trim();

    if (!targetId || targetId === GUEST_USER_ID) {
      return NextResponse.json({ error: "That account cannot be deleted." }, { status: 400 });
    }
    if (targetId === admin.id) {
      return NextResponse.json({ error: "You cannot delete your own admin account here." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "Deletion must be confirmed." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    let authDeleted = false;
    if (supabase) {
      const { error } = await supabase.auth.admin.deleteUser(targetId);
      if (error) throw error;
      authDeleted = true;
    }

    await db.execute(sql`DELETE FROM users WHERE id = ${targetId}`);
    return NextResponse.json({ ok: true, authDeleted });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to delete account" }, { status: 500 });
  }
}

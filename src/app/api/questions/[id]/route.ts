import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { queryQuestions } from "@/lib/server-questions";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(req);
    const { id } = await ctx.params;
    const [q] = await queryQuestions({ userId: user.id, where: sql`q.id = ${id}`, limit: 1 });
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    return NextResponse.json(q);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

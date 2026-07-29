import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/** Current identity as seen by the server (guest or Supabase user). */
export async function GET(req: Request) {
  try {
    const user = await getRequestUser(req);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth check failed" },
      { status: 500 },
    );
  }
}

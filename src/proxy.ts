import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limit for demo/local usage.
// (In production edge, this state resets per isolate. For persistent rate limiting, use Upstash.)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function proxy(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const now = Date.now();
  const path = req.nextUrl.pathname;

  // Only rate limit API routes
  if (!path.startsWith("/api/")) return NextResponse.next();

  const key = `${ip}:${path}`;
  const record = rateLimits.get(key) || { count: 0, resetAt: now + 60000 };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + 60000;
  } else {
    record.count++;
  }

  rateLimits.set(key, record);

  // Different limits for different paths
  let maxRequests = 200; // default for API
  if (path.startsWith("/api/auth") || path.startsWith("/api/feedback")) {
    maxRequests = 20; // stricter for auth/email
  }

  if (record.count > maxRequests) {
    return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

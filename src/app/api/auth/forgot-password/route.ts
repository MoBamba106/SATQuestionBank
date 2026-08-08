import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import {
  resolveSupabaseAnonKey,
  resolveSupabaseServiceRoleKey,
  resolveSupabaseUrl,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Mints a Supabase recovery link (service role) and, when RESEND_API_KEY is set,
 * delivers a branded reset email through Resend. Always returns a generic success
 * payload so callers cannot enumerate accounts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabaseUrl = resolveSupabaseUrl();
    const serviceKey = resolveSupabaseServiceRoleKey();
    const anonKey = resolveSupabaseAnonKey();
    const resendKey = process.env.RESEND_API_KEY?.trim();

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return NextResponse.json(
        { error: "Auth is not configured on this deployment." },
        { status: 501 },
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "http://localhost:3000";
    const redirectTo = `${origin.replace(/\/$/, "")}/`;

    // Prefer service-role generateLink so we can email via Resend ourselves.
    if (serviceKey && resendKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      // Don't leak whether the email exists — treat "user not found" as success.
      if (error && !/not\s*found|user.*exist/i.test(error.message)) {
        console.error("[api/auth/forgot-password] generateLink failed:", error.message);
        return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
      }

      const actionLink =
        data?.properties?.action_link ||
        (data?.properties as { hashed_token?: string } | undefined)?.hashed_token;

      if (actionLink && typeof actionLink === "string" && actionLink.startsWith("http")) {
        const html = buildResetEmailHtml(actionLink);
        const text = buildResetEmailText(actionLink);
        const emailResult = await sendEmail({
          to: email,
          subject: "Reset your SAT Nexus password",
          html,
          text,
        });
        if (emailResult.ok) {
          return NextResponse.json({ ok: true });
        }
        // Fall through to Supabase mailer below rather than failing hard.
      }
    }

    // Fallback: let Supabase send its own recovery email (works with anon key).
    const client = createClient(supabaseUrl, serviceKey || anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError && !/not\s*found|user.*exist|rate/i.test(resetError.message)) {
      console.error("[api/auth/forgot-password] resetPasswordForEmail failed:", resetError.message);
      return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/auth/forgot-password] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start password reset." },
      { status: 500 },
    );
  }
}

function buildResetEmailHtml(actionLink: string): string {
  const safe = actionLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f8fc;font-family:IBM Plex Sans,Segoe UI,sans-serif;color:#182437;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8fc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #cdd9e5;border-radius:10px;padding:28px 24px;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#718096;">SAT Nexus</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">Reset your password</h1>
              <p style="margin:0 0 18px;font-size:14.5px;line-height:1.55;color:#46566c;">
                We received a request to reset the password for your SAT Nexus account. Click the button below to choose a new one. This link expires soon.
              </p>
              <p style="margin:0 0 22px;">
                <a href="${safe}" style="display:inline-block;background:#2352b8;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:6px;">
                  Choose a new password
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:12.5px;line-height:1.5;color:#718096;">
                If the button doesn&rsquo;t work, paste this link into your browser:
              </p>
              <p style="margin:0 0 18px;font-size:12px;line-height:1.45;word-break:break-all;color:#2352b8;">${safe}</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a96a8;">
                If you didn&rsquo;t ask for a reset, you can ignore this email — your password will stay the same.
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildResetEmailText(actionLink: string): string {
  return [
    "SAT Nexus — Reset your password",
    "",
    "We received a request to reset the password for your SAT Nexus account.",
    "Open the link below to choose a new password (it expires soon):",
    "",
    actionLink,
    "",
    "If you didn't ask for a reset, you can ignore this email.",
  ].join("\n");
}
/**
 * Shared email delivery for SAT Nexus — plain Resend HTTP API (no SDK).
 *
 * Used by:
 *  - /api/auth/forgot-password  (password-reset emails)
 *  - /api/duels                 (duel challenge invites)
 *
 * NEVER throws: every outcome (sent / skipped / failed) is logged as an
 * `[email]` line and returned, so callers can degrade gracefully.
 */

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional explicit from address; falls back to RESEND_FROM_EMAIL, then the Resend test sender. */
  from?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; status: number; reason: string };

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "SAT Nexus <onboarding@resend.dev>";

/** HTML-escape a string for safe interpolation into email markup. */
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const reason = "RESEND_API_KEY is not set — email skipped.";
    console.log(
      `[email] skipped to=${options.to} subject=${JSON.stringify(options.subject)} reason=${reason}`,
    );
    return { ok: false, skipped: true, reason };
  }

  const from = options.from?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const raw = await res.text().catch(() => "");
    if (res.ok) {
      let id = "";
      try {
        const parsed = JSON.parse(raw) as { id?: unknown };
        id = typeof parsed?.id === "string" ? parsed.id : "";
      } catch {
        id = "";
      }
      console.log(
        `[email] sent id=${id || "n/a"} to=${options.to} subject=${JSON.stringify(options.subject)}`,
      );
      return { ok: true, id };
    }

    let reason = raw || `Resend returned HTTP ${res.status}`;
    if (res.status === 403) {
      reason =
        `${reason} Note: Resend's default test sender (onboarding@resend.dev) can only email ` +
        "your own account address — verify a domain in Resend (SPF/DKIM) and set " +
        "RESEND_FROM_EMAIL to email real users.";
    }
    console.log(
      `[email] failed status=${res.status} to=${options.to} subject=${JSON.stringify(options.subject)} reason=${reason}`,
    );
    return { ok: false, status: res.status, reason };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(
      `[email] failed to=${options.to} subject=${JSON.stringify(options.subject)} reason=${reason}`,
    );
    return { ok: false, status: 0, reason };
  }
}

"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Bug, CheckCircle2, Lightbulb, Loader2, MessageSquarePlus, Pin, Send, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { apiPost } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "improvement", label: "Improvement idea", icon: Lightbulb, tone: "soft-tone-teal" },
  { id: "complaint", label: "Complaint", icon: ThumbsDown, tone: "soft-tone-rose" },
  { id: "bug", label: "Bug report", icon: Bug, tone: "soft-tone-yellow" },
  { id: "other", label: "Something else", icon: MessageSquarePlus, tone: "soft-tone-lavender" },
] as const;

function FeedbackPage() {
  const auth = useAuth();
  const sp = useSearchParams();
  const [category, setCategory] = React.useState<string>("improvement");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  // Context captured from a quiz / practice test / flashcard the user was in.
  // Built from URL params so it survives navigating here from anywhere.
  const context = React.useMemo(() => {
    const mode = sp.get("mode");
    const label = sp.get("label");
    const questionId = sp.get("questionId");
    const skill = sp.get("skill");
    const domain = sp.get("domain");
    const parts: string[] = [];
    if (mode && label) {
      const kind = mode === "test" ? "Practice test" : mode === "flashcard" ? "Flashcard deck" : mode === "quiz" ? "Quiz" : "Activity";
      parts.push(`${kind}: ${label}`);
    }
    if (questionId) parts.push(`Question ${questionId}`);
    if (domain) parts.push(domain);
    if (skill) parts.push(skill);
    return parts.join(" · ");
  }, [sp]);

  const submit = async () => {
    if (!title.trim() || !message.trim() || busy) return;
    setBusy(true);
    try {
      await apiPost("/api/feedback", {
        category,
        title: title.trim(),
        message: message.trim(),
        email: email.trim() || undefined,
        context: context || undefined,
      });
      setSent(true);
    } catch (error) {
      toast.error("Couldn't submit feedback", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--good)]" />
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Thanks — got it!</h1>
        <p className="text-[14px] leading-relaxed text-[var(--ink-faint)]">
          Your {category === "complaint" ? "complaint" : "request"} was saved and forwarded to the developer.
          It shows up on the admin review board and, when configured, is filed automatically on GitHub.
        </p>
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => {
            setSent(false);
            setTitle("");
            setMessage("");
          }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Help us improve</p>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Feedback</h1>
        <p className="mt-1 text-[14px] text-[var(--ink-faint)]">
          Found something broken? Have an idea? Complaints and improvements land straight on the developer&apos;s desk.
        </p>
      </div>

      {context && (
        <div className="flex items-start gap-2.5 rounded-[7px] border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3">
          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-dark)]" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-dark)]">
              Reporting about what you were just doing
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">{context}</p>
          </div>
        </div>
      )}

      <GlassCard hover={false} className="space-y-4 p-5 sm:p-6">
        <div>
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            What kind of feedback?
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map(({ id, label, icon: Icon, tone }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={cn(
                  "soft-tone flex items-center gap-2.5 px-4 py-3 text-left text-[13.5px] font-bold transition-opacity",
                  tone,
                  category === id ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]" : "opacity-65 hover:opacity-100",
                )}
                aria-pressed={category === id}
              >
                <Icon className="h-4 w-4 shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            Short summary
          </label>
          <input
            className="input w-full"
            placeholder='e.g. "Add a dark red theme" or "Timer froze mid-test"'
            value={title}
            maxLength={180}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            Details
          </label>
          <textarea
            className="input min-h-[140px] w-full resize-y"
            placeholder="Tell us what happened, or how your idea would work…"
            value={message}
            maxLength={5000}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        {auth.user.isGuest && (
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Email <span className="font-medium normal-case">(optional — so we can follow up)</span>
            </label>
            <input
              className="input w-full"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => void submit()}
          disabled={!title.trim() || !message.trim() || busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit feedback
        </button>
        <p className="text-center text-[11px] leading-relaxed text-[var(--ink-faint)]">
          Submissions are stored for review and may be filed automatically as GitHub issues on the project repository.
        </p>
      </GlassCard>
    </div>
  );
}

export default function FeedbackPageWrapper() {
  return (
    <React.Suspense fallback={<div className="py-24 text-center text-[var(--ink-faint)]">Loading…</div>}>
      <FeedbackPage />
    </React.Suspense>
  );
}

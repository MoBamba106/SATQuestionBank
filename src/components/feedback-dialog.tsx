"use client";

import * as React from "react";
import { Bug, Lightbulb, Loader2, MessageSquarePlus, Send, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiPost } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "improvement", label: "Improvement", icon: Lightbulb },
  { id: "complaint", label: "Complaint", icon: ThumbsDown },
  { id: "bug", label: "Bug", icon: Bug },
  { id: "other", label: "Other", icon: MessageSquarePlus },
] as const;

export type FeedbackContext = {
  mode?: string;
  label?: string;
  questionId?: string;
  domain?: string;
  skill?: string;
};

function buildContextString(ctx?: FeedbackContext | null): string | undefined {
  if (!ctx) return undefined;
  const parts: string[] = [];
  if (ctx.mode && ctx.label) {
    const kind =
      ctx.mode === "test"
        ? "Practice test"
        : ctx.mode === "flashcard"
          ? "Flashcard deck"
          : ctx.mode === "quiz"
            ? "Quiz"
            : "Activity";
    parts.push(`${kind}: ${ctx.label}`);
  }
  if (ctx.questionId) parts.push(`Question ${ctx.questionId}`);
  if (ctx.domain) parts.push(ctx.domain);
  if (ctx.skill) parts.push(ctx.skill);
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * In-place feedback overlay — does not navigate away from the current quiz/test.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: FeedbackContext | null;
}) {
  const auth = useAuth();
  const [category, setCategory] = React.useState<string>("improvement");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setCategory("improvement");
      setTitle("");
      setMessage("");
      setEmail(auth.user.email ?? "");
      setBusy(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, auth.user.email]);

  const contextLine = buildContextString(context);

  const submit = async () => {
    if (!title.trim() || !message.trim() || busy) return;
    setBusy(true);
    try {
      await apiPost("/api/feedback", {
        category,
        title: title.trim(),
        message: message.trim(),
        email: email.trim() || undefined,
        context: contextLine,
      });
      toast.success("Feedback sent", {
        description: "Thanks — it was saved without leaving your session.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't submit feedback", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PaperDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send feedback"
      description="Report a bug or idea without leaving this screen."
      wide
    >
      <div className="mt-4 space-y-4">
        {contextLine && (
          <p className="rounded-[6px] border border-[var(--line-soft)] bg-[var(--paper-soft)] px-3 py-2 text-[12px] text-[var(--ink-soft)]">
            <span className="font-bold uppercase tracking-wide text-[var(--ink-faint)]">Context · </span>
            {contextLine}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                "btn !min-h-8 !px-3 !py-1.5 !text-[12px]",
                category === id ? "btn-primary" : "btn-soft",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
            Short title
          </label>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What’s going on?"
            maxLength={180}
            disabled={busy}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
            Details
          </label>
          <textarea
            className="input min-h-[110px] w-full resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue or idea…"
            maxLength={5000}
            disabled={busy}
          />
        </div>

        {auth.user.isGuest && (
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
              Email (optional)
            </label>
            <input
              className="input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy}
            />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className="btn btn-soft" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !title.trim() || !message.trim()}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send feedback
          </button>
        </div>
      </div>
    </PaperDialog>
  );
}

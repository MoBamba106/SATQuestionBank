"use client";

import * as React from "react";
import { Loader2, Share2, Search, UserRound, Send } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiPost } from "@/lib/api-client";

type UserResult = { id: string; email: string | null; displayName: string | null };

export function ShareQuestionDialog({
  open,
  onOpenChange,
  questionId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  questionId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [sending, setSending] = React.useState<string | null>(null);
  const [emailMode, setEmailMode] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setEmailMode("");
  }, [open]);

  const search = React.useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.users ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => void search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const shareTo = async (toUserId?: string, toEmail?: string) => {
    const key = toUserId || toEmail || "";
    setSending(key);
    try {
      await apiPost("/api/shared-questions", { questionId, toUserId, toEmail });
      toast.success(`Question shared${toEmail ? ` to ${toEmail}` : ""}! It will expire in 3 days.`);
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't share question", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(null);
    }
  };

  return (
    <PaperDialog open={open} onOpenChange={onOpenChange} title="Share this question" description="Send this question to another student. It will disappear after 3 days for them.">
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Search by name or email</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input className="input w-full !pl-9" placeholder="Type name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--ink-faint)]" />}
          </div>
        </div>

        {results.length > 0 && (
          <ul className="max-h-56 overflow-y-auto rounded-[6px] border border-[var(--line)] bg-[var(--paper-raised)]">
            {results.map((u) => (
              <li key={u.id} className="flex items-center gap-3 border-b border-[var(--line-soft)] px-3 py-2 last:border-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <UserRound className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 grow">
                  <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{u.displayName || u.email || u.id.slice(0, 8)}</div>
                  <div className="truncate text-[11px] text-[var(--ink-faint)]">{u.email ?? "no email"}</div>
                </div>
                <button className="btn btn-primary !min-h-8 !px-3 !text-[12px]" disabled={sending === u.id} onClick={() => void shareTo(u.id)}>
                  {sending === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Share
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <div className="h-px grow bg-[var(--line-soft)]" />
          <span className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">or</span>
          <div className="h-px grow bg-[var(--line-soft)]" />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Share via email</label>
          <div className="flex gap-2">
            <input className="input grow" placeholder="student@example.com" value={emailMode} onChange={(e) => setEmailMode(e.target.value)} />
            <button className="btn btn-soft !min-h-9" disabled={!emailMode.trim() || !!sending} onClick={() => void shareTo(undefined, emailMode.trim())}>
              {sending === emailMode.trim() ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Send
            </button>
          </div>
        </div>
      </div>
    </PaperDialog>
  );
}

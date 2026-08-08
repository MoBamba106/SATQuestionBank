"use client";

import * as React from "react";
import { Check, Copy, Link2, Loader2, Search, Send, Share2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiPost } from "@/lib/api-client";

type UserResult = { id: string; email: string | null; displayName: string | null };

type ShareQuizResponse = {
  id: string;
  token: string;
  shareUrl: string;
  label: string;
  mode: string;
  questionCount: number;
  expiresInDays: number;
};

export function ShareQuizDialog({
  open,
  onOpenChange,
  label,
  mode = "practice",
  questionIds,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  label: string;
  mode?: string;
  questionIds: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [sending, setSending] = React.useState<string | null>(null);
  const [emailMode, setEmailMode] = React.useState("");
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const linkCache = React.useRef<ShareQuizResponse | null>(null);

  const questionKey = questionIds.join("|");
  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setQuery("");
      setResults([]);
      setEmailMode("");
      setShareUrl(null);
      setCopied(false);
      linkCache.current = null;
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, questionKey, label, mode]);

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

  const createShare = async (toUserId?: string, toEmail?: string) => {
    return apiPost<ShareQuizResponse>("/api/shared-quizzes", {
      label,
      mode,
      questionIds,
      toUserId,
      toEmail,
    });
  };

  const ensureLink = async () => {
    if (linkCache.current?.shareUrl) {
      setShareUrl(linkCache.current.shareUrl);
      return linkCache.current;
    }
    setLinkBusy(true);
    try {
      const res = await createShare();
      linkCache.current = res;
      setShareUrl(res.shareUrl);
      return res;
    } catch (e) {
      toast.error("Couldn't create share link", {
        description: e instanceof Error ? e.message : undefined,
      });
      return null;
    } finally {
      setLinkBusy(false);
    }
  };

  const copyLink = async () => {
    const res = await ensureLink();
    if (!res?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(res.shareUrl);
      setCopied(true);
      toast.success("Quiz link copied", {
        description: `Anyone with the link can open these ${res.questionCount} questions for ${res.expiresInDays} days.`,
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message("Copy this link", { description: res.shareUrl });
    }
  };

  const shareTo = async (toUserId?: string, toEmail?: string) => {
    const key = toUserId || toEmail || "";
    setSending(key);
    try {
      const res = await createShare(toUserId, toEmail);
      toast.success(`Quiz shared${toEmail ? ` to ${toEmail}` : ""}!`, {
        description: `They’ll see ${res.questionCount} questions. Link expires in ${res.expiresInDays} days.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't share quiz", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(null);
    }
  };

  return (
    <PaperDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share this quiz"
      description={`Send “${label}” (${questionIds.length} question${questionIds.length === 1 ? "" : "s"}) as a link or to another student. Links expire after 7 days.`}
    >
      <div className="mt-4 space-y-4">
        <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper-soft)]/70 p-3">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
            Shareable link
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary grow sm:grow-0" disabled={linkBusy || questionIds.length === 0} onClick={() => void copyLink()}>
              {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy quiz link"}
            </button>
            <button type="button" className="btn btn-soft" disabled={linkBusy || questionIds.length === 0} onClick={() => void ensureLink()}>
              <Link2 className="h-4 w-4" /> Generate link
            </button>
          </div>
          {shareUrl && (
            <p className="mt-2 break-all rounded-[6px] border border-[var(--line-soft)] bg-[var(--paper-raised)] px-2.5 py-2 font-mono text-[11.5px] text-[var(--ink-soft)]">
              {shareUrl}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px grow bg-[var(--line-soft)]" />
          <span className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">or send to a student</span>
          <div className="h-px grow bg-[var(--line-soft)]" />
        </div>

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

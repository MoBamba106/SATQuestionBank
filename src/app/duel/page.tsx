"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Swords, Send, Search, UserRound, Play, X, Check, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import { PaperSlider } from "@/components/ui/paper-slider";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { RequireAccount } from "@/components/require-account";
import { useApi, apiPost, apiPatch, mutateKey } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { cn, formatDetroitDateTime } from "@/lib/utils";

type UserResult = { id: string; email: string | null; displayName: string | null };

type DuelList = {
  inbox: Array<{
    id: string;
    label: string;
    hostName?: string;
    hostEmail?: string;
    questionCount: number;
    domain?: string | null;
    difficulty?: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  active: Array<{
    id: string;
    label: string;
    hostScore: number;
    guestScore: number;
    questionCount: number;
    hostUserId: string;
    guestUserId: string;
  }>;
  recent: Array<{
    id: string;
    label: string;
    status: string;
    hostScore: number;
    guestScore: number;
    winnerUserId?: string | null;
    finishedAt?: string | null;
  }>;
};

function DuelInner() {
  const auth = useAuth();
  const router = useRouter();
  const { data, loading, reload } = useApi<DuelList>("/api/duels", "duels");

  const [domain, setDomain] = React.useState("All");
  const [difficulty, setDifficulty] = React.useState("All");
  const [count, setCount] = React.useState(10);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setResults((json.users ?? []).filter((u: UserResult) => u.id !== auth.user.id));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, auth.user.id]);

  // Poll inbox so challenges appear quickly.
  React.useEffect(() => {
    const t = window.setInterval(() => {
      mutateKey("duels");
      void reload();
    }, 8000);
    return () => window.clearInterval(t);
  }, [reload]);

  const challenge = async (toUserId?: string, toEmail?: string) => {
    const key = toUserId || toEmail || "";
    setBusy(key);
    try {
      const res = await apiPost<{ id: string }>("/api/duels", {
        toUserId,
        toEmail,
        count,
        domain,
        difficulty,
        label: "Quiz duel",
      });
      toast.success("Challenge sent!");
      mutateKey("duels");
      await reload();
      router.push(`/duel/${res.id}`);
    } catch (e) {
      toast.error("Couldn't start duel", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const respond = async (id: string, action: "accept" | "decline") => {
    setBusy(id + action);
    try {
      await apiPatch(`/api/duels/${id}`, { action });
      toast.success(action === "accept" ? "Duel accepted — good luck!" : "Challenge declined");
      mutateKey("duels");
      await reload();
      if (action === "accept") router.push(`/duel/${id}`);
    } catch (e) {
      toast.error("Couldn't update duel", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Head to head</p>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
          Quiz <span className="hl-blue px-1">Duels</span>
        </h1>
        <p className="mt-1 text-[14px] text-[var(--ink-faint)]">
          Challenge an online student. First correct lock on each question scores the point.
        </p>
      </div>

      {(data?.inbox?.length ?? 0) > 0 && (
        <GlassCard hover={false} className="space-y-3 border-[var(--accent)] p-5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
            Incoming challenges
          </h2>
          {data!.inbox.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3"
            >
              <Swords className="h-5 w-5 text-[var(--accent)]" />
              <div className="min-w-0 grow">
                <div className="truncate text-[14px] font-bold text-[var(--ink)]">
                  {d.hostName || d.hostEmail || "Someone"} challenged you
                </div>
                <div className="text-[12px] text-[var(--ink-faint)]">
                  {d.questionCount} questions
                  {d.domain ? ` · ${d.domain}` : ""}
                  {d.difficulty ? ` · ${d.difficulty}` : ""}
                  {" · expires "}
                  {formatDetroitDateTime(d.expiresAt)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary !min-h-8 !px-3 !text-[12px]"
                disabled={!!busy}
                onClick={() => void respond(d.id, "accept")}
              >
                {busy === d.id + "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Accept
              </button>
              <button
                type="button"
                className="btn btn-soft !min-h-8 !px-3 !text-[12px]"
                disabled={!!busy}
                onClick={() => void respond(d.id, "decline")}
              >
                <X className="h-3.5 w-3.5" /> Decline
              </button>
            </div>
          ))}
        </GlassCard>
      )}

      {(data?.active?.length ?? 0) > 0 && (
        <GlassCard hover={false} className="space-y-2 p-5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Active duels</h2>
          {data!.active.map((d) => (
            <Link
              key={d.id}
              href={`/duel/${d.id}`}
              className="flex items-center gap-3 rounded-[7px] border border-[var(--line-soft)] bg-[var(--paper-raised)] px-4 py-3 hover:border-[var(--accent)]"
            >
              <Play className="h-4 w-4 text-[var(--accent)]" />
              <span className="grow truncate font-semibold text-[var(--ink)]">{d.label}</span>
              <span className="font-mono text-[13px] font-bold text-[var(--ink)]">
                {d.hostScore} – {d.guestScore}
              </span>
            </Link>
          ))}
        </GlassCard>
      )}

      <GlassCard hover={false} className="space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">Start a challenge</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Section
            </label>
            <PaperSelect
              tone="lavender"
              value={domain}
              onValueChange={setDomain}
              options={[
                { value: "All", label: "All sections" },
                { value: "Math", label: "Math" },
                { value: "Reading & Writing", label: "Reading & Writing" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Difficulty
            </label>
            <PaperSelect
              tone="yellow"
              value={difficulty}
              onValueChange={setDifficulty}
              options={[
                { value: "All", label: "All difficulties" },
                { value: "Easy", label: "Easy" },
                { value: "Medium", label: "Medium" },
                { value: "Hard", label: "Hard" },
              ]}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Questions</label>
            <span className="font-display text-2xl font-bold text-[var(--accent)]">{count}</span>
          </div>
          <PaperSlider value={count} onValueChange={setCount} min={5} max={20} step={1} ariaLabel="Duel length" />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
            Find opponent
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              className="input w-full !pl-9"
              placeholder="Search name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--ink-faint)]" />
            )}
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
                  <div className="truncate text-[13px] font-semibold text-[var(--ink)]">
                    {u.displayName || u.email || u.id.slice(0, 8)}
                  </div>
                  <div className="truncate text-[11px] text-[var(--ink-faint)]">{u.email ?? "no email"}</div>
                </div>
                <button
                  className="btn btn-primary !min-h-8 !px-3 !text-[12px]"
                  disabled={!!busy}
                  onClick={() => void challenge(u.id)}
                >
                  {busy === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
                  Challenge
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <div className="h-px grow bg-[var(--line-soft)]" />
          <span className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">or email</span>
          <div className="h-px grow bg-[var(--line-soft)]" />
        </div>

        <div className="flex gap-2">
          <input
            className="input grow"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="btn btn-soft !min-h-9"
            disabled={!email.trim() || !!busy}
            onClick={() => void challenge(undefined, email.trim())}
          >
            {busy === email.trim() ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </GlassCard>

      {(data?.recent?.length ?? 0) > 0 && (
        <GlassCard hover={false} className="p-5">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Recent</h2>
          <ul className="space-y-1.5">
            {data!.recent.map((d) => {
              const won = d.winnerUserId === auth.user.id;
              return (
                <li
                  key={d.id}
                  className={cn(
                    "flex items-center gap-3 rounded-[7px] border px-3.5 py-2.5",
                    "border-[var(--line-soft)] bg-[var(--paper-raised)]",
                  )}
                >
                  <Trophy className={cn("h-4 w-4", won ? "text-[#d7a13c]" : "text-[var(--ink-faint)]")} />
                  <div className="min-w-0 grow">
                    <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{d.label}</div>
                    <div className="text-[11px] capitalize text-[var(--ink-faint)]">{d.status}</div>
                  </div>
                  <span className="font-mono text-[13px] font-bold">
                    {d.hostScore}–{d.guestScore}
                  </span>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}

      {loading && !data && <PageSkeleton cards={2} />}
    </div>
  );
}

export default function DuelPage() {
  return (
    <RequireAccount feature="quiz duels">
      <DuelInner />
    </RequireAccount>
  );
}

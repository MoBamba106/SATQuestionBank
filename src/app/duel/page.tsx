"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Swords, Send, Search, UserRound, Play, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import { PaperSlider } from "@/components/ui/paper-slider";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { RequireAccount } from "@/components/require-account";
import { useApi, apiPost, apiPatch, mutateKey } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { skillsForDomain, subskillsFor } from "@/lib/sat-categories";
import { formatDetroitDateTime, skillTone } from "@/lib/utils";

import posthog from "posthog-js";

type UserResult = { id: string; email: string | null; displayName: string | null };

type DuelList = {
  inbox: Array<{
    id: string;
    label: string;
    hostName?: string;
    hostEmail?: string;
    questionCount: number;
    domain?: string | null;
    skill?: string | null;
    category?: string | null;
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
};

function DuelInner() {
  const auth = useAuth();
  const router = useRouter();
  const { data, loading, reload } = useApi<DuelList>("/api/duels", "duels");

  const [domain, setDomain] = React.useState("All");
  const [skill, setSkill] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [difficulty, setDifficulty] = React.useState("All");
  const [count, setCount] = React.useState(10);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  const skillOpts = React.useMemo(
    () => [
      { value: "All", label: "All categories", tone: "blue" as const },
      ...skillsForDomain(domain).map((item) => ({
        value: item,
        label: item,
        tone: skillTone(item),
      })),
    ],
    [domain],
  );
  const categoryOpts = React.useMemo(
    () => [
      { value: "All", label: "All skills", tone: "green" as const },
      ...subskillsFor(domain, skill).map((item) => ({
        value: item,
        label: item,
        tone: "green" as const,
      })),
    ],
    [domain, skill],
  );

  React.useEffect(() => {
    const t = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
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
      const res = await apiPost<{ id: string; inviteEmail?: { sent: boolean; reason?: string } }>("/api/duels", {
        toUserId,
        toEmail,
        count,
        domain,
        skill,
        category,
        difficulty,
        label: "Quiz duel",
      });
      if (res.inviteEmail?.sent) {
        toast.success("Challenge sent — invite emailed!");
      } else {
        toast.success("Challenge sent!", {
          description: "They'll also see it in their Duels inbox.",
        });
      }
      posthog.capture("duel_started", { domain, count });
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
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--accent-soft)]">
          <Swords className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Head to head</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
            Quiz <span className="hl-blue px-1">Duels</span>
          </h1>
          <p className="mt-1 text-[14px] text-[var(--ink-faint)]">
            Challenge an online student. First correct lock on each question scores the point.
          </p>
        </div>
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
                  {d.skill ? ` · ${d.skill}` : ""}
                  {d.category ? ` · ${d.category}` : ""}
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
              onValueChange={(v) => {
                setDomain(v);
                setSkill("All");
                setCategory("All");
              }}
              options={[
                { value: "All", label: "All sections" },
                { value: "Math", label: "Math" },
                { value: "Reading & Writing", label: "Reading & Writing" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Category
            </label>
            <PaperSelect
              tone="blue"
              value={skill}
              onValueChange={(v) => {
                setSkill(v);
                setCategory("All");
              }}
              options={skillOpts}
              disabled={domain === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Skill
            </label>
            <PaperSelect
              tone="green"
              value={category}
              onValueChange={setCategory}
              options={categoryOpts}
              disabled={skill === "All"}
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

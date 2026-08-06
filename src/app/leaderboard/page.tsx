"use client";

import * as React from "react";
import { BookOpenText, Calculator, Crown, Medal, Target, Trophy } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useApi } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { RequireAccount } from "@/components/require-account";
import { cn } from "@/lib/utils";

type Entry = { userId: string; name: string; value: number; detail: string };
type Payload = {
  boards: {
    mostQuestions: Entry[];
    mostAccurate: Entry[];
    mostMath: Entry[];
    mostEnglish: Entry[];
  };
  totalRankedUsers: number;
};

const BOARDS: { key: keyof Payload["boards"]; title: string; unit: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { key: "mostAccurate", title: "Most accurate", unit: "%", icon: Target, tone: "soft-tone-teal" },
  { key: "mostQuestions", title: "Most questions completed", unit: "", icon: Trophy, tone: "soft-tone-yellow" },
  { key: "mostMath", title: "Most Math completed", unit: "", icon: Calculator, tone: "soft-tone-lavender" },
  { key: "mostEnglish", title: "Most English completed", unit: "", icon: BookOpenText, tone: "soft-tone-rose" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-[#d7a13c]" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-[#9aa2ad]" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-[#b9793e]" />;
  return <span className="w-5 text-center font-mono text-[12.5px] font-bold text-[var(--ink-faint)]">{rank}</span>;
}

export default function LeaderboardPage() {
  return (
    <RequireAccount feature="the leaderboard">
      <LeaderboardInner />
    </RequireAccount>
  );
}

function LeaderboardInner() {
  const auth = useAuth();
  const { data, loading, error } = useApi<Payload>("/api/leaderboard", "leaderboard");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Community rankings</p>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Leaderboard</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[var(--ink-faint)]">
          See how students with accounts stack up. Accuracy requires at least 20 answered questions.
          You can hide yourself from these boards in Settings.
        </p>
      </div>

      {error && (
        <div className="rounded-[6px] border border-[#e9c6cc] bg-[#fff7f7] px-4 py-3 text-[13.5px] font-semibold text-[#ae3d51]">
          {error}
        </div>
      )}

      {loading && !data ? (
        <PageSkeleton cards={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {BOARDS.map(({ key, title, unit, icon: Icon, tone }) => {
            const entries = data?.boards[key] ?? [];
            return (
              <GlassCard key={key} hover={false} className="p-5">
                <div className={cn("soft-tone mb-4 inline-flex items-center gap-2 px-3 py-1.5 text-[13px] font-bold", tone)}>
                  <Icon className="h-4 w-4" /> {title}
                </div>
                {entries.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-[var(--ink-faint)]">
                    No qualifying students yet — be the first!
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {entries.map((entry, index) => {
                      const isMe = !auth.user.isGuest && entry.userId === auth.user.id;
                      return (
                        <li
                          key={entry.userId}
                          className={cn(
                            "flex items-center gap-3 rounded-[7px] border px-3.5 py-2.5",
                            isMe
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                              : "border-[var(--line-soft)] bg-[var(--paper-raised)]",
                          )}
                        >
                          <RankBadge rank={index + 1} />
                          <div className="min-w-0 grow">
                            <span className="block truncate text-[13.5px] font-bold text-[var(--ink)]">
                              {entry.name}
                              {isMe && <span className="ml-1.5 text-[10.5px] font-bold uppercase text-[var(--accent)]">You</span>}
                            </span>
                            <span className="block truncate text-[11px] text-[var(--ink-faint)]">{entry.detail}</span>
                          </div>
                          <span className="shrink-0 font-mono text-[15px] font-bold text-[var(--ink)]">
                            {entry.value.toLocaleString("en-US", { timeZone: "America/Detroit" })}{unit}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {data && (
        <p className="text-center text-[11.5px] text-[var(--ink-faint)]">
          {data.totalRankedUsers} student{data.totalRankedUsers === 1 ? "" : "s"} ranked · updates as attempts are recorded
        </p>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Trophy, Footprints, Flame, Target, Star, Folders, Crown, Sparkles, Loader2, Lock, Medal,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { StatsPayload } from "@/lib/types";

type Ach = {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  unlocked: (s: StatsPayload) => boolean;
  progress: (s: StatsPayload) => { cur: number; goal: number };
};

const ACHIEVEMENTS: Ach[] = [
  {
    id: "first", title: "First Steps", desc: "Grade your first answer",
    icon: Footprints,
    unlocked: (s) => s.totalAttempts >= 1,
    progress: (s) => ({ cur: s.totalAttempts, goal: 1 }),
  },
  {
    id: "warm", title: "Warming Up", desc: "Grade 25 answers",
    icon: Sparkles,
    unlocked: (s) => s.totalAttempts >= 25,
    progress: (s) => ({ cur: s.totalAttempts, goal: 25 }),
  },
  {
    id: "century", title: "Century Club", desc: "Grade 100 answers",
    icon: Medal,
    unlocked: (s) => s.totalAttempts >= 100,
    progress: (s) => ({ cur: s.totalAttempts, goal: 100 }),
  },
  {
    id: "fivehundred", title: "Relentless", desc: "Grade 500 answers",
    icon: Crown,
    unlocked: (s) => s.totalAttempts >= 500,
    progress: (s) => ({ cur: s.totalAttempts, goal: 500 }),
  },
  {
    id: "sharp", title: "Sharp Shooter", desc: "Reach 70% accuracy (20+ checks)",
    icon: Target,
    unlocked: (s) => s.totalAttempts >= 20 && s.accuracy >= 70,
    progress: (s) => ({ cur: s.totalAttempts >= 20 ? s.accuracy : 0, goal: 70 }),
  },
  {
    id: "elite", title: "Elite Precision", desc: "Reach 85% accuracy (50+ checks)",
    icon: Trophy,
    unlocked: (s) => s.totalAttempts >= 50 && s.accuracy >= 85,
    progress: (s) => ({ cur: s.totalAttempts >= 50 ? s.accuracy : 0, goal: 85 }),
  },
  {
    id: "clean", title: "Mistake Slayer", desc: "Clear your mistake bank completely (with 10+ mistakes fixed)",
    icon: Medal,
    unlocked: (s) => s.totalCorrect >= 10 && s.mistakesCount === 0,
    progress: (s) => ({ cur: Math.max(0, 10 - s.mistakesCount), goal: 10 }),
  },
  {
    id: "streak3", title: "Habit Forming", desc: "Study 3 days in a row",
    icon: Flame,
    unlocked: (s) => s.streak.current >= 3 || s.streak.longest >= 3,
    progress: (s) => ({ cur: Math.max(s.streak.current, s.streak.longest), goal: 3 }),
  },
  {
    id: "streak7", title: "Unstoppable", desc: "Study 7 days in a row",
    icon: Flame,
    unlocked: (s) => s.streak.current >= 7 || s.streak.longest >= 7,
    progress: (s) => ({ cur: Math.max(s.streak.current, s.streak.longest), goal: 7 }),
  },
  {
    id: "stargazer", title: "Curator", desc: "Favorite 10 questions",
    icon: Star,
    unlocked: (s) => s.favoritesCount >= 10,
    progress: (s) => ({ cur: s.favoritesCount, goal: 10 }),
  },
  {
    id: "organizer", title: "Librarian", desc: "Create 3 collections",
    icon: Folders,
    unlocked: (s) => s.collectionsCount >= 3,
    progress: (s) => ({ cur: s.collectionsCount, goal: 3 }),
  },
  {
    id: "testday", title: "Dress Rehearsal", desc: "Finish a full quiz session",
    icon: Trophy,
    unlocked: (s) => s.sessionsCount >= 1,
    progress: (s) => ({ cur: s.sessionsCount, goal: 1 }),
  },
];

export default function AchievementsPage() {
  const { data: s, loading } = useApi<StatsPayload>("/api/stats", "stats");

  const unlockedCount = s ? ACHIEVEMENTS.filter((a) => a.unlocked(s)).length : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
          <span className="hl-yellow px-1">Achievements</span>
        </h1>
        <p className="mt-1 text-[15px] text-[#8a8680]">
          {loading ? "…" : `${unlockedCount} of ${ACHIEVEMENTS.length} unlocked — all earned from real activity.`}
        </p>
      </div>

      {loading || !s ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const un = a.unlocked(s);
            const p = a.progress(s);
            const pct = Math.min(100, Math.round((p.cur / p.goal) * 100));
            return (
              <GlassCard
                key={a.id}
                hover={un}
                className={cn("p-5 transition-opacity", !un && "opacity-70")}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md",
                      un ? "bg-gradient-to-br from-[#ffd27a] to-[#d9922e]" : "bg-[#ece5d4] shadow-none",
                    )}
                  >
                    {un ? <a.icon className="h-5 w-5 text-white" /> : <Lock className="h-4.5 w-4.5 text-[#b0aa98]" />}
                  </div>
                  <div className="min-w-0 grow">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-[16px] font-bold text-[#2b2b2a]">{a.title}</h2>
                      {un && <span className="badge bg-[#fff8e6] text-[#8a6100] border-[#f0dcae]">Unlocked</span>}
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[#8a8680]">{a.desc}</p>
                    {!un && (
                      <div className="mt-2.5">
                        <div className="h-2 overflow-hidden rounded-full bg-[#efe9db]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#ffd27a] to-[#d9922e]" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 font-mono text-[11px] font-bold text-[#a8a294]">{p.cur}/{p.goal}</p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

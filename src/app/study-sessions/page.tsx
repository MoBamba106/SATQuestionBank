"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Calculator, Flame, Shuffle, BookOpen, RotateCcw, Loader2, CalendarClock, History,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { apiGet, useApi } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import type { QuestionSummary, SATQuestion, StatsPayload } from "@/lib/types";

type Drill = {
  id: string;
  name: string;
  desc: string;
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  build: () => Promise<{ label: string; ids: string[] }>;
};

export default function StudySessionsPage() {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const { data: stats } = useApi<StatsPayload>("/api/stats", "stats");

  const drills: Drill[] = [
    {
      id: "quick-10",
      name: "Quick 10",
      desc: "Ten random questions from the whole bank.",
      duration: "~10 min",
      icon: Zap,
      tint: "from-[#ffd27a] to-[#d9922e]",
      build: async () => {
        const d = await apiGet<QuestionSummary>("/api/questions?random=1&limit=10");
        return { label: "Quick 10", ids: d.questions.map((q) => q.id) };
      },
    },
    {
      id: "math-warmup",
      name: "Math Warmup",
      desc: "Ten random Math questions to get the gears turning.",
      duration: "~12 min",
      icon: Calculator,
      tint: "from-[#5fce9b] to-[#2ca974]",
      build: async () => {
        const d = await apiGet<QuestionSummary>("/api/questions?domain=Math&random=1&limit=10");
        return { label: "Math Warmup", ids: d.questions.map((q) => q.id) };
      },
    },
    {
      id: "hard-practice",
      name: "Hard Practice",
      desc: "Fifteen Hard-difficulty questions. No mercy.",
      duration: "~25 min",
      icon: Flame,
      tint: "from-[#f2a5b6] to-[#d95670]",
      build: async () => {
        const d = await apiGet<QuestionSummary>("/api/questions?difficulty=Hard&random=1&limit=15");
        return { label: "Hard Practice", ids: d.questions.map((q) => q.id) };
      },
    },
    {
      id: "mixed-review",
      name: "Mixed Review",
      desc: "Twenty questions across every domain and category.",
      duration: "~25 min",
      icon: Shuffle,
      tint: "from-[#b8a7ee] to-[#7c5cd6]",
      build: async () => {
        const d = await apiGet<QuestionSummary>("/api/questions?random=1&limit=20");
        return { label: "Mixed Review", ids: d.questions.map((q) => q.id) };
      },
    },
    {
      id: "reading-sprint",
      name: "Reading Sprint",
      desc: "Twelve Reading & Writing questions, back to back.",
      duration: "~15 min",
      icon: BookOpen,
      tint: "from-[#7aa5f2] to-[#3a5fc8]",
      build: async () => {
        const d = await apiGet<QuestionSummary>("/api/questions?domain=Reading%20%26%20Writing&random=1&limit=12");
        return { label: "Reading Sprint", ids: d.questions.map((q) => q.id) };
      },
    },
    {
      id: "review-mistakes",
      name: "Review Mistakes",
      desc: "Every question currently sitting in your mistake bank.",
      duration: "varies",
      icon: RotateCcw,
      tint: "from-[#f7c873] to-[#e07b39]",
      build: async () => {
        const d = await apiGet<{ questions: SATQuestion[] }>("/api/mistakes");
        if (d.questions.length === 0) throw new Error("Your mistake bank is empty — nice work!");
        return { label: "Review Mistakes", ids: d.questions.map((q) => q.id) };
      },
    },
  ];

  const start = async (drill: Drill) => {
    if (busy) return;
    setBusy(drill.id);
    try {
      const pool = await drill.build();
      launchPoolQuiz(router, { label: drill.name, ids: pool.ids, mode: "session" });
    } catch (e) {
      toast.error("Couldn't build that session", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
          Study <span className="hl-mint px-1">Sessions</span>
        </h1>
        <p className="mt-1 text-[15px] text-[#8a8680]">
          One-tap drills built from the live bank. Pick a card and go.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {drills.map((d) => (
          <GlassCard key={d.id} className="flex flex-col p-6">
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${d.tint} shadow-md`}>
                <d.icon className="h-5 w-5 text-white" />
              </div>
              <span className="badge">{d.duration}</span>
            </div>
            <h2 className="font-display mt-4 text-xl font-bold text-[#2b2b2a]">{d.name}</h2>
            <p className="mt-1 grow text-[13.5px] leading-relaxed text-[#8a8680]">{d.desc}</p>
            <button className="btn btn-primary mt-4 w-full" onClick={() => start(d)} disabled={busy !== null}>
              {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Start
            </button>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="p-6">
        <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-bold text-[#2b2b2a]">
          <History className="h-5 w-5 text-[#8a8680]" /> Session history
        </h2>
        {stats && stats.recentSessions.length > 0 ? (
          <ul className="space-y-2">
            {stats.recentSessions.map((s) => (
              <li key={s.id} className="glass-subtle flex items-center gap-3 px-4 py-3">
                <CalendarClock className="h-4 w-4 shrink-0 text-[#8a8680]" />
                <div className="min-w-0 grow">
                  <div className="truncate text-[13.5px] font-semibold text-[#2b2b2a]">{s.label ?? s.mode}</div>
                  <div className="text-[11.5px] text-[#8a8680]">
                    {s.finishedAt ? new Date(s.finishedAt).toLocaleString() : ""}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-[#55524a]">
                  {s.correctCount ?? 0}/{s.totalQuestions} correct
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-[#f6f2e8] px-4 py-3 text-[13px] text-[#8a8680]">
            Finished quizzes will land here with their scores.
          </p>
        )}
      </GlassCard>
    </div>
  );
}

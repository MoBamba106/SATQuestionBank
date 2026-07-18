"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flame, Target, RotateCcw, Star, Folders, PenSquare, MonitorSmartphone,
  Library, TrendingUp, ChevronRight, BookOpenCheck,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/lib/api-client";
import type { PracticeTestInfo, StatsPayload } from "@/lib/types";

export default function DashboardPage() {
  const { data: stats, loading } = useApi<StatsPayload>("/api/stats", "stats");
  const { data: tests } = useApi<{ tests: PracticeTestInfo[] }>("/api/practice-tests", "tests");

  const cards = [
    {
      label: "Questions practiced",
      value: stats?.uniqueQuestions ?? 0,
      sub: `${stats?.totalAttempts ?? 0} total graded checks`,
      icon: Target,
      tint: "from-[#7aa5f2] to-[#3a5fc8]",
      href: "/bank",
    },
    {
      label: "Accuracy",
      value: `${stats?.accuracy ?? 0}%`,
      sub: `${stats?.totalCorrect ?? 0} correct so far`,
      icon: TrendingUp,
      tint: "from-[#5fce9b] to-[#2ca974]",
      href: "/analytics",
    },
    {
      label: "Open mistakes",
      value: stats?.mistakesCount ?? 0,
      sub: "waiting to be corrected",
      icon: RotateCcw,
      tint: "from-[#f2a5b6] to-[#d95670]",
      href: "/mistakes",
    },
    {
      label: "Study streak",
      value: stats?.streak.current ?? 0,
      sub: `best ${stats?.streak.longest ?? 0} days`,
      icon: Flame,
      tint: "from-[#ffd27a] to-[#d9922e]",
      href: "/achievements",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass relative overflow-hidden rounded-[24px] p-7 sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(122,165,242,0.28),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,227,138,0.35),transparent_65%)]" />
        <div className="relative">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#8a8680]">Soft Paper · Official content</p>
          <h1 className="font-display mt-2 max-w-xl text-[clamp(1.9rem,4.5vw,2.9rem)] font-bold leading-[1.08] text-[#2b2b2a]">
            Every official SAT question.{" "}
            <span className="hl-yellow whitespace-nowrap px-1">Zero fluff.</span>
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#55524a]">
            3,444 real College Board questions, full-length Bluebook practice tests 3–11, a mistake
            bank that tracks what you miss, and collections that actually remember everything.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/quiz" className="btn btn-primary !px-5 !py-3">
              <PenSquare className="h-4 w-4" /> Start a quiz
            </Link>
            <Link href="/bluebook" className="btn btn-soft !px-5 !py-3">
              <MonitorSmartphone className="h-4 w-4" /> Bluebook tests 3–11
            </Link>
            <Link href="/bank" className="btn btn-ghost !px-4 !py-3">
              <Library className="h-4 w-4" /> Browse bank
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <GlassCard className="h-full p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.tint} shadow-md`}>
                <c.icon className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="font-display text-[27px] font-bold leading-none text-[#2b2b2a]">
                {loading ? "…" : c.value}
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-[#55524a]">{c.label}</div>
              <div className="text-[11.5px] text-[#8a8680]">{c.sub}</div>
            </GlassCard>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity chart */}
        <GlassCard hover={false} className="p-5 sm:p-6 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#2b2b2a]">Last 14 days</h2>
            <Link href="/analytics" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3a5fc8] hover:underline">
              Full analytics <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stats && stats.activity.length > 0 ? (
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.activity} margin={{ left: -24, right: 4, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece5d4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a8680" }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10.5, fill: "#8a8680" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#fffdf8", border: "1px solid #e2dbc9", borderRadius: 12, fontSize: 13 }}
                  />
                  <Bar dataKey="attempts" fill="#5b8def" radius={[5, 5, 0, 0]} maxBarSize={26} name="Checked" />
                  <Bar dataKey="correct" fill="#2ca974" radius={[5, 5, 0, 0]} maxBarSize={26} name="Correct" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[210px] flex-col items-center justify-center text-center">
              <BookOpenCheck className="mb-2 h-8 w-8 text-[#d5cfc0]" />
              <p className="text-[13.5px] font-semibold text-[#55524a]">No activity yet</p>
              <p className="text-[12px] text-[#8a8680]">Finish your first quiz and this chart comes alive.</p>
            </div>
          )}
        </GlassCard>

        {/* Recent sessions + quick links */}
        <GlassCard hover={false} className="p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-display mb-3 text-lg font-bold text-[#2b2b2a]">Recent sessions</h2>
          {stats && stats.recentSessions.length > 0 ? (
            <ul className="space-y-2">
              {stats.recentSessions.map((s) => (
                <li key={s.id} className="glass-subtle flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 grow">
                    <div className="truncate text-[13px] font-semibold text-[#2b2b2a]">{s.label ?? s.mode}</div>
                    <div className="text-[11px] text-[#8a8680]">
                      {s.finishedAt ? new Date(s.finishedAt).toLocaleDateString() : ""} · {s.answeredCount ?? 0}/{s.totalQuestions} answered
                    </div>
                  </div>
                  <span className="font-display text-lg font-bold text-[#3a5fc8]">
                    {s.totalQuestions ? Math.round(((s.correctCount ?? 0) / s.totalQuestions) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-[#f6f2e8] px-4 py-3 text-[13px] text-[#8a8680]">
              Nothing here yet — your finished quizzes will show up with scores.
            </p>
          )}
          <div className="mt-4 flex gap-2 border-t border-[#f0ead9] pt-4 text-[12.5px] font-semibold">
            <Link href="/collections" className="inline-flex items-center gap-1.5 text-[#3a5fc8] hover:underline">
              <Star className="h-3.5 w-3.5" /> {stats?.favoritesCount ?? 0} favorites
            </Link>
            <span className="text-[#d5cfc0]">·</span>
            <Link href="/collections" className="inline-flex items-center gap-1.5 text-[#3a5fc8] hover:underline">
              <Folders className="h-3.5 w-3.5" /> {stats?.collectionsCount ?? 0} collections
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Practice tests preview */}
      <GlassCard hover={false} className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[#2b2b2a]">Bluebook practice tests</h2>
          <Link href="/bluebook" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3a5fc8] hover:underline">
            All tests <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {(tests?.tests ?? []).map((t) => (
            <Link
              key={t.id}
              href="/bluebook"
              className="glass-subtle group flex flex-col items-center px-2 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:border-[#b9c9f2] hover:bg-[#f7f9fe]"
            >
              <span className="font-display text-2xl font-bold text-[#3a5fc8]">{t.testNumber}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a8680]">
                {t.totalQuestions} Q
              </span>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  Flame,
  Library,
  MonitorSmartphone,
  PenSquare,
  RotateCcw,
  Target,
  TrendingUp,
  TimerReset,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/lib/api-client";
import type { PracticeTestInfo, StatsPayload } from "@/lib/types";
import { openStudyTimer } from "@/lib/study-timer";

export default function DashboardPage() {
  const { data: stats, loading, error } = useApi<StatsPayload>("/api/stats", "stats");
  const { data: tests } = useApi<{ tests: PracticeTestInfo[] }>("/api/practice-tests", "tests");

  const metrics = [
    {
      label: "Practiced",
      value: stats?.uniqueQuestions ?? 0,
      detail: `${stats?.totalAttempts ?? 0} graded answers`,
      icon: Target,
      color: "text-[var(--accent)]",
    },
    {
      label: "Accuracy",
      value: `${stats?.accuracy ?? 0}%`,
      detail: `${stats?.totalCorrect ?? 0} correct`,
      icon: TrendingUp,
      color: "text-[var(--good)]",
    },
    {
      label: "Open mistakes",
      value: stats?.mistakesCount ?? 0,
      detail: "ready to review",
      icon: RotateCcw,
      color: "text-[var(--bad)]",
    },
    {
      label: "Study streak",
      value: stats?.streak.current ?? 0,
      detail: `best: ${stats?.streak.longest ?? 0} days`,
      icon: Flame,
      color: "text-[var(--warn)]",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="glass border-l-[4px] border-l-[var(--accent)] p-6 sm:p-8">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.17em] text-[var(--accent)]">
          SAT study workspace
        </p>
        <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-none text-[var(--ink)]">
              Study desk
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[var(--ink-soft)]">
              Build a focused quiz, work through the official question bank, or return to the
              questions that need another attempt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/quiz" className="btn btn-primary">
              <PenSquare className="h-4 w-4" /> Start a quiz
            </Link>
            <Link href="/bank" className="btn btn-soft">
              <Library className="h-4 w-4" /> Question bank
            </Link>
            <button type="button" className="btn btn-soft" onClick={openStudyTimer}>
              <TimerReset className="h-4 w-4" /> Study timer
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[6px] border border-[#e9c6cc] bg-[#fff7f7] px-4 py-3 text-[13px] font-semibold text-[var(--bad)]">
          Progress data could not be loaded: {error}
        </div>
      )}

      <GlassCard hover={false} className="grid grid-cols-2 divide-x divide-y divide-[#e6e1d7] lg:grid-cols-4 lg:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
              {metric.label}
            </div>
            <div className="font-display mt-2 text-[28px] font-bold leading-none text-[var(--ink)]">
              {loading ? "…" : metric.value}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--ink-faint)]">{metric.detail}</div>
          </div>
        ))}
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-5">
        <GlassCard hover={false} className="p-5 sm:p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">Activity</p>
              <h2 className="font-display text-xl font-bold text-[var(--ink)]">Last 14 days</h2>
            </div>
            <Link href="/analytics" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
              View analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stats && stats.activity.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.activity} margin={{ left: -24, right: 4, top: 4 }}>
                  <CartesianGrid stroke="#e6e1d7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#7b8085" }} tickFormatter={(date: string) => date.slice(5)} />
                  <YAxis tick={{ fontSize: 10.5, fill: "#7b8085" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#fffdfa", border: "1px solid #d4cfc3", borderRadius: 6, fontSize: 13 }} />
                  <Bar dataKey="attempts" fill="var(--accent)" maxBarSize={24} name="Checked" />
                  <Bar dataKey="correct" fill="var(--good)" maxBarSize={24} name="Correct" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center border border-dashed border-[var(--line)] bg-[var(--paper-soft)] text-center">
              <BookOpenCheck className="mb-2 h-7 w-7 text-[#a9a398]" />
              <p className="text-[13.5px] font-semibold text-[var(--ink-soft)]">No activity recorded yet</p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">Your graded quiz answers will appear here.</p>
            </div>
          )}
        </GlassCard>

        <GlassCard hover={false} className="p-5 sm:p-6 lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">Quick start</p>
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">Choose a session</h2>
          <div className="mt-4 divide-y divide-[#e6e1d7] border-y border-[var(--line-soft)]">
            {[
              { href: "/study-sessions", label: "Quick 10", detail: "10 random questions", icon: CalendarClock },
              { href: "/mistakes", label: "Mistake review", detail: `${stats?.mistakesCount ?? 0} open`, icon: RotateCcw },
              { href: "/bluebook", label: "Timed practice test", detail: "full digital SAT format", icon: MonitorSmartphone },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 py-3.5 text-[var(--ink)] hover:text-[var(--accent)]">
                <item.icon className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
                <div className="min-w-0 grow">
                  <div className="text-[13.5px] font-semibold">{item.label}</div>
                  <div className="text-[11.5px] text-[var(--ink-faint)]">{item.detail}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard hover={false} className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">Recent sessions</h2>
            <BarChart3 className="h-4 w-4 text-[var(--ink-faint)]" />
          </div>
          {stats && stats.recentSessions.length > 0 ? (
            <ul className="divide-y divide-[#e6e1d7] border-t border-[var(--line-soft)]">
              {stats.recentSessions.slice(0, 5).map((session) => (
                <li key={session.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 grow">
                    <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{session.label ?? session.mode}</div>
                    <div className="text-[11px] text-[var(--ink-faint)]">
                      {session.finishedAt ? new Date(session.finishedAt).toLocaleDateString("en-US", { timeZone: "America/Detroit" }) : "In progress"} · {session.answeredCount ?? 0}/{session.totalQuestions} answered
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                    {session.totalScore ?? `${session.totalQuestions ? Math.round(((session.correctCount ?? 0) / session.totalQuestions) * 100) : 0}%`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border border-dashed border-[var(--line)] bg-[var(--paper-soft)] px-4 py-5 text-[13px] text-[var(--ink-faint)]">
              Completed quizzes will be listed here with their scores.
            </p>
          )}
        </GlassCard>

        <GlassCard hover={false} className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">Practice tests</h2>
            <Link href="/bluebook" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-3 border-l border-t border-[var(--line-soft)] sm:grid-cols-5">
            {(tests?.tests ?? []).slice(0, 10).map((test) => (
              <Link key={test.id} href="/bluebook" className="border-b border-r border-[var(--line-soft)] bg-[var(--paper-soft)] px-2 py-3 text-center hover:bg-[var(--accent-soft)]">
                <span className="font-display block text-xl font-bold text-[var(--accent)]">{test.testNumber}</span>
                <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{test.totalQuestions} Q</span>
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

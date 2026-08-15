"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  Calculator,
  Filter,
  Highlighter,
  Layers,
  Library,
  LayoutDashboard,
  MonitorSmartphone,
  PencilRuler,
  PenSquare,
  RotateCcw,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { MagicGlow } from "@/components/magic-glow";
import { useAuth } from "@/components/auth-provider";
import { useAccountGate } from "@/components/account-gate";
import catalog from "@/data/catalog-stats.json";

/**
 * Product landing page (root route).
 *
 * The root used to render the Study Desk, which meant a first-time visitor's
 * first impression was an analytics dashboard full of zeros. The Study Desk
 * still exists untouched at `/desk`; this page explains the product and routes
 * people into it. Signed-in users get a prominent "Open your study desk" CTA.
 *
 * Every number shown here is a real catalog count generated from the shipped
 * data by `scripts/build-catalog-stats.py` — no invented usage statistics.
 */

const numberFormat = new Intl.NumberFormat("en-US");

const FEATURES: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    icon: Library,
    title: "Official SAT question bank",
    body: `Browse all ${numberFormat.format(catalog.totalQuestions)} questions from the College Board question bank, with the original passages, answer choices, and rationales.`,
  },
  {
    icon: Filter,
    title: "Filter down to the exact skill",
    body: `Narrow by section, domain, skill, and difficulty — ${catalog.skillCount} SAT domains across Math and Reading & Writing — then practise only what you're working on.`,
  },
  {
    icon: PenSquare,
    title: "Build a quiz in seconds",
    body: "Choose practice mode for instant feedback and explanations, or exam mode to hold the answers until the end. Flag, eliminate choices, and take per-question notes.",
  },
  {
    icon: MonitorSmartphone,
    title: "Full-length adaptive practice tests",
    body: `${catalog.practiceTests} timed tests that follow the digital SAT's two-module adaptive format, with section timers, a review page, and a scaled score.`,
  },
  {
    icon: BookMarked,
    title: "SAT vocabulary that actually appears",
    body: `${numberFormat.format(catalog.vocabularyTerms)} words pulled straight from the College Board's Words-in-Context questions — plus grammar rules, math formulas, flashcards, and games.`,
  },
  {
    icon: Calculator,
    title: "Desmos, built in",
    body: "The same graphing calculator you get on test day, in a floating window you can move, resize, and open only when you want it.",
  },
  {
    icon: PencilRuler,
    title: "Digital scratch canvas",
    body: "Sketch algebra and geometry with a pen, shape presets, and keyboard-driven labels. Optional smart-shape recognition cleans up rough strokes.",
  },
  {
    icon: Highlighter,
    title: "Highlight as you read",
    body: "Three highlighter colours for marking up passages, exactly like annotating on paper — with a colour picker that appears right next to your selection.",
  },
  {
    icon: RotateCcw,
    title: "A mistake bank that remembers",
    body: "Every question you miss is collected automatically so you can come back and retry it until it sticks.",
  },
  {
    icon: BarChart3,
    title: "Analytics that show the gaps",
    body: "Accuracy by domain, skill, and difficulty, a daily activity chart, and study streaks — so you know what to work on next.",
  },
  {
    icon: Layers,
    title: "Collections and sharing",
    body: "Group questions into custom collections, favourite the tricky ones, and share a question, collection, or whole quiz with a friend.",
  },
  {
    icon: Swords,
    title: "Quiz duels",
    body: "Challenge another student to a head-to-head round on the domain and difficulty of your choice.",
  },
];

const WORKFLOW: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "Find your weak spots",
    body: "Start with a mixed quiz or a full practice test. Your results break down by domain, skill, and difficulty so the gaps are obvious.",
  },
  {
    step: "02",
    title: "Drill the specific skill",
    body: "Filter the bank to that one skill — linear equations, transitions, command of evidence — and work a focused set with explanations on.",
  },
  {
    step: "03",
    title: "Clear your mistake bank",
    body: "Missed questions collect automatically. Retry them until they're gone, and keep notes on what tripped you up.",
  },
  {
    step: "04",
    title: "Rehearse test day",
    body: "Run a timed, adaptive full-length test with Desmos and the scratch canvas, in the same two-module format as the real thing.",
  },
];

export default function HomePage() {
  const auth = useAuth();
  const gate = useAccountGate();
  const signedIn = auth.ready && !auth.user.isGuest;

  return (
    <div className="space-y-10 pb-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "SAT Nexus",
            url: "https://satnexus.com",
            description:
              "Practice official SAT questions in the browser. Build quizzes, review mistakes, track progress, and sync with your account.",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="glass border-l-[4px] border-l-[var(--accent)] p-6 sm:p-10">
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.17em] text-[var(--accent)]">
          <Sparkles className="h-3.5 w-3.5" /> Free SAT practice, in your browser
        </p>
        <h1 className="font-display mt-3 max-w-4xl text-[clamp(2.1rem,5.5vw,3.4rem)] font-bold leading-[1.05] text-[var(--ink)]">
          A smarter way to practise for the SAT.
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[var(--ink-soft)]">
          SAT Nexus puts the entire official College Board question bank —{" "}
          <strong className="font-semibold text-[var(--ink)]">
            {numberFormat.format(catalog.totalQuestions)} real SAT questions
          </strong>{" "}
          — behind filters, quizzes, and full-length adaptive practice tests. Work the exact skill you&rsquo;re stuck
          on, see every explanation, and track what&rsquo;s actually improving.
        </p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {signedIn ? (
            <Link href="/desk" className="btn btn-primary !py-3 !text-[15px]">
              <LayoutDashboard className="h-4 w-4" /> Open your study desk
            </Link>
          ) : (
            <button type="button" className="btn btn-primary !py-3 !text-[15px]" onClick={() => gate.requireAccount("your study desk")}>
              <Target className="h-4 w-4" /> Get started free
            </button>
          )}
          <Link href="/quiz" className="btn btn-soft !py-3 !text-[15px]">
            <PenSquare className="h-4 w-4" /> Start practising
          </Link>
          <Link href="/bank" className="btn btn-soft !py-3 !text-[15px]">
            <Library className="h-4 w-4" /> Explore the question bank
          </Link>
        </div>

        <p className="mt-4 text-[12.5px] text-[var(--ink-faint)]">
          No sign-up needed to browse and practise. Create an account to sync progress, analytics, and collections
          across devices.
        </p>
      </section>

      {/* ------------------------------------------------------ Catalog counts */}
      <section aria-label="What's in the question bank">
        <GlassCard hover={false} className="grid grid-cols-2 divide-x divide-y divide-[var(--line-soft)] lg:grid-cols-4 lg:divide-y-0">
          {[
            { label: "Official questions", value: numberFormat.format(catalog.totalQuestions) },
            { label: "Math questions", value: numberFormat.format(catalog.mathQuestions) },
            { label: "Reading & Writing", value: numberFormat.format(catalog.readingWritingQuestions) },
            { label: "Full-length tests", value: String(catalog.practiceTests) },
          ].map((item) => (
            <div key={item.label} className="p-4 text-center sm:p-5">
              <div className="font-display text-[26px] font-bold leading-none text-[var(--ink)] sm:text-[30px]">
                {item.value}
              </div>
              <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                {item.label}
              </div>
            </div>
          ))}
        </GlassCard>
        <p className="mt-2 text-center text-[11.5px] text-[var(--ink-faint)]">
          Counts reflect the question bank shipped with the app — not usage claims.
        </p>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section>
        <div className="mb-5 max-w-2xl">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--sp-lavender,var(--accent))]">
            Everything in one place
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold text-[var(--ink)]">
            What you can do here
          </h2>
          <p className="mt-1.5 text-[14.5px] leading-6 text-[var(--ink-soft)]">
            Every tool below is built in — no extensions, no separate tabs, nothing to install.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature) => (
            <MagicGlow key={feature.title}>
              <GlassCard hover={false} className="flex h-full flex-col p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[var(--accent-soft)]">
                  <feature.icon className="h-[18px] w-[18px] text-[var(--accent)]" />
                </div>
                <h3 className="font-display mt-3 text-[16.5px] font-bold text-[var(--ink)]">{feature.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{feature.body}</p>
              </GlassCard>
            </MagicGlow>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Workflow */}
      <section>
        <div className="mb-5 max-w-2xl">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--sp-teal,var(--accent))]">
            How students use it
          </p>
          <h2 className="font-display text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold text-[var(--ink)]">
            A study loop that actually closes
          </h2>
          <p className="mt-1.5 text-[14.5px] leading-6 text-[var(--ink-soft)]">
            Practising more questions only helps if you know which ones to practise. SAT Nexus is built around finding
            the gap, drilling it, and proving it&rsquo;s fixed.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map((item) => (
            <GlassCard key={item.step} hover={false} className="flex h-full flex-col p-5">
              <span className="font-mono text-[12px] font-bold text-[var(--accent)]">{item.step}</span>
              <h3 className="font-display mt-1.5 text-[16px] font-bold text-[var(--ink)]">{item.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- Final CTA */}
      <section className="glass flex flex-col items-start gap-5 p-6 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-[clamp(1.4rem,3.2vw,2rem)] font-bold text-[var(--ink)]">
            {signedIn ? "Pick up where you left off." : "Start with one quiz."}
          </h2>
          <p className="mt-2 text-[14.5px] leading-6 text-[var(--ink-soft)]">
            {signedIn
              ? "Your study desk has your streak, recent sessions, open mistakes, and what to work on next."
              : "Twelve questions is enough to see where you stand. Everything is free, and your progress syncs the moment you make an account."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {signedIn ? (
            <>
              <Link href="/desk" className="btn btn-primary !py-3 !text-[15px]">
                <LayoutDashboard className="h-4 w-4" /> Study desk
              </Link>
              <Link href="/analytics" className="btn btn-soft !py-3 !text-[15px]">
                <BarChart3 className="h-4 w-4" /> Your analytics
              </Link>
            </>
          ) : (
            <>
              <Link href="/quiz" className="btn btn-primary !py-3 !text-[15px]">
                <PenSquare className="h-4 w-4" /> Start a quiz <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/study" className="btn btn-soft !py-3 !text-[15px]">
                <BookMarked className="h-4 w-4" /> Study library
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import { BookMarked, Check, ChevronLeft, ChevronRight, Search, Shuffle } from "lucide-react";
import { STUDY_ITEMS, type StudyTopic } from "@/lib/study-content";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

const TOPICS: { topic: StudyTopic; tone: string }[] = [
  { topic: "Vocabulary", tone: "soft-tone-rose" },
  { topic: "Grammar", tone: "soft-tone-lavender" },
  { topic: "Math formulas", tone: "soft-tone-teal" },
  { topic: "Test strategy", tone: "soft-tone-yellow" },
];
const STORAGE_KEY = "sat-nexus-study-mastered";

export default function StudyLibraryPage() {
  const [topic, setTopic] = React.useState<StudyTopic>("Vocabulary");
  const [search, setSearch] = React.useState("");
  const [cardIndex, setCardIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [mastered, setMastered] = React.useState<string[]>([]);
  const [flashcardMode, setFlashcardMode] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setMastered(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { /* use empty */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return STUDY_ITEMS.filter((item) => item.topic === topic && (!needle || `${item.term} ${item.definition}`.toLowerCase().includes(needle)));
  }, [search, topic]);
  const current = filtered[Math.min(cardIndex, Math.max(0, filtered.length - 1))];

  const saveMastered = (next: string[]) => {
    setMastered(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const toggleMastered = (id: string) => {
    saveMastered(mastered.includes(id) ? mastered.filter((item) => item !== id) : [...mastered, id]);
  };
  const move = (direction: number) => {
    if (!filtered.length) return;
    setCardIndex((index) => (index + direction + filtered.length) % filtered.length);
    setRevealed(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--sp-lavender)]">Learn before you drill</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Study library</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[var(--ink-faint)]">Review vocabulary, grammar rules, formulas, and test-day strategy before opening a question set.</p>
        </div>
        <button type="button" className={flashcardMode ? "btn btn-primary" : "btn btn-soft"} onClick={() => setFlashcardMode((value) => !value)}>
          <BookMarked className="h-4 w-4" /> {flashcardMode ? "Browse all" : "Flashcard mode"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {TOPICS.map((item) => (
          <button
            key={item.topic}
            type="button"
            onClick={() => { setTopic(item.topic); setCardIndex(0); setRevealed(false); }}
            className={cn("soft-tone px-4 py-3 text-left text-[13.5px] font-bold transition-opacity", item.tone, topic === item.topic ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]" : "opacity-70 hover:opacity-100")}
          >
            {item.topic}
            <span className="mt-0.5 block text-[10.5px] font-medium opacity-75">{STUDY_ITEMS.filter((entry) => entry.topic === item.topic).length} notes</span>
          </button>
        ))}
      </div>

      {flashcardMode ? (
        <GlassCard hover={false} className="mx-auto max-w-3xl p-5 sm:p-8">
          {current ? (
            <>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
                <span>{topic}</span><span>{cardIndex + 1}/{filtered.length}</span>
              </div>
              <button type="button" onClick={() => setRevealed((value) => !value)} className="mt-5 flex min-h-[260px] w-full flex-col items-center justify-center rounded-[9px] border border-[var(--line)] bg-[var(--paper-soft)] p-8 text-center">
                <span className="font-display text-4xl font-bold text-[var(--ink)]">{current.term}</span>
                {revealed ? (
                  <span className="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--ink-soft)]">
                    {current.definition}
                    {current.example && <span className="mt-3 block text-[13px] italic text-[var(--ink-faint)]">{current.example}</span>}
                  </span>
                ) : <span className="mt-4 text-[12px] text-[var(--ink-faint)]">Tap to reveal</span>}
              </button>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button className="btn btn-soft" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
                <button className={mastered.includes(current.id) ? "btn btn-good" : "btn btn-soft"} onClick={() => toggleMastered(current.id)}>
                  <Check className="h-4 w-4" /> {mastered.includes(current.id) ? "Mastered" : "Mark mastered"}
                </button>
                <button className="btn btn-soft" onClick={() => move(1)}>Next <ChevronRight className="h-4 w-4" /></button>
              </div>
            </>
          ) : <p className="py-20 text-center text-[var(--ink-faint)]">No matching study cards.</p>}
        </GlassCard>
      ) : (
        <>
          <GlassCard hover={false} className="p-4">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input className="input !pl-9" placeholder={`Search ${topic.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </GlassCard>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <GlassCard key={item.id} hover={false} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-[var(--ink)]">{item.term}</h2>
                  <button type="button" onClick={() => toggleMastered(item.id)} className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", mastered.includes(item.id) ? "border-[var(--good)] bg-[var(--good)] text-white" : "border-[var(--line)] text-transparent")} aria-label={mastered.includes(item.id) ? "Mark not mastered" : "Mark mastered"}>
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 grow text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{item.definition}</p>
                {item.example && <p className="mt-3 border-t border-[var(--line-soft)] pt-3 text-[12px] italic text-[var(--ink-faint)]">{item.example}</p>}
              </GlassCard>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-2 text-[11.5px] text-[var(--ink-faint)]">
        <Shuffle className="h-3.5 w-3.5" /> {mastered.length} study notes marked mastered on this device.
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { BookMarked, Check, Gamepad2, LayoutGrid, Search, Shuffle } from "lucide-react";
import { STUDY_ITEMS, type StudyTopic } from "@/lib/study-content";
import { cn, difficultyColor } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperMultiSelect } from "@/components/ui/paper-multi-select";
import { MagicGlow } from "@/components/magic-glow";
import { FlashcardDeck } from "@/components/study/flashcard-deck";
import { StudyGames } from "@/components/study/games";

const TOPICS: { topic: StudyTopic; tone: string }[] = [
  { topic: "Vocabulary", tone: "soft-tone-rose" },
  { topic: "Grammar", tone: "soft-tone-lavender" },
  { topic: "Math formulas", tone: "soft-tone-teal" },
  { topic: "Test strategy", tone: "soft-tone-yellow" },
];
const STORAGE_KEY = "sat-nexus-study-mastered";

type ViewMode = "browse" | "flashcards" | "games";

export default function StudyLibraryPage() {
  const [topic, setTopic] = React.useState<StudyTopic>("Vocabulary");
  const [search, setSearch] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<string[]>([]);
  const [mastered, setMastered] = React.useState<string[]>([]);
  const [view, setView] = React.useState<ViewMode>("browse");

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setMastered(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { /* use empty */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [seed] = React.useState(() => Math.random());

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    let res = STUDY_ITEMS.filter((item) =>
      item.topic === topic
      && (difficulty.length === 0 || (item.difficulty != null && difficulty.includes(item.difficulty)))
      && (!needle || `${item.term} ${(item.definitions ?? [item.definition]).join(" ")} ${item.phonetic ?? ""}`.toLowerCase().includes(needle)),
    );
    if (topic === "Vocabulary") {
      res = [...res].sort((a, b) => {
        const hA = Array.from(a.id).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
        const hB = Array.from(b.id).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
        return (hA * seed) % 100 - (hB * seed) % 100;
      });
    }
    return res;
  }, [difficulty, search, topic, seed]);

  const saveMastered = (next: string[]) => {
    setMastered(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const toggleMastered = (id: string) => {
    saveMastered(mastered.includes(id) ? mastered.filter((item) => item !== id) : [...mastered, id]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--sp-lavender)]">Learn before you drill</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Study library</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[var(--ink-faint)]">Review vocabulary, grammar rules, formulas, and test-day strategy before opening a question set.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={view === "browse" ? "btn btn-primary" : "btn btn-soft"} onClick={() => setView("browse")}>
            <LayoutGrid className="h-4 w-4" /> Browse
          </button>
          <button type="button" className={view === "flashcards" ? "btn btn-primary" : "btn btn-soft"} onClick={() => setView("flashcards")}>
            <BookMarked className="h-4 w-4" /> Flashcards
          </button>
          <button type="button" className={view === "games" ? "btn btn-primary" : "btn btn-soft"} onClick={() => setView("games")}>
            <Gamepad2 className="h-4 w-4" /> Games
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {TOPICS.map((item) => (
          <button
            key={item.topic}
            type="button"
            onClick={() => { setTopic(item.topic); setDifficulty([]); }}
            className={cn("soft-tone px-4 py-3 text-left text-[13.5px] font-bold transition-opacity", item.tone, topic === item.topic ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]" : "opacity-70 hover:opacity-100")}
          >
            {item.topic}
            <span className="mt-0.5 block text-[10.5px] font-medium opacity-75">{STUDY_ITEMS.filter((entry) => entry.topic === item.topic).length} notes</span>
          </button>
        ))}
      </div>

      {(view === "browse" || topic === "Vocabulary") && (
        <GlassCard hover={false} className="p-4">
          <div className="grid max-w-3xl gap-3 sm:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input className="input !pl-9" placeholder={`Search ${topic.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {topic === "Vocabulary" && (
              <PaperMultiSelect
                values={difficulty}
                onValuesChange={setDifficulty}
                placeholder="All levels"
                allLabel="All levels"
                options={[
                  { value: "Easy", label: "Easy" },
                  { value: "Medium", label: "Medium" },
                  { value: "Hard", label: "Hard" },
                ]}
              />
            )}
          </div>
        </GlassCard>
      )}

      {view === "flashcards" ? (
        <FlashcardDeck items={filtered} mastered={mastered} onToggleMastered={toggleMastered} />
      ) : view === "games" ? (
        <StudyGames items={filtered} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <MagicGlow key={item.id}>
              <GlassCard hover={false} className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[var(--ink)]">{item.term}</h2>
                    {item.phonetic && <span className="font-mono text-[11.5px] text-[var(--ink-faint)]">{item.phonetic}</span>}
                  </div>
                  <button type="button" onClick={() => toggleMastered(item.id)} className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", mastered.includes(item.id) ? "border-[var(--good)] bg-[var(--good)] text-white" : "border-[var(--line)] text-transparent")} aria-label={mastered.includes(item.id) ? "Mark not mastered" : "Mark mastered"}>
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                {item.difficulty && <span className={cn("badge mt-3 w-fit", difficultyColor(item.difficulty))}>{item.difficulty}</span>}
                {item.definitions && item.definitions.length > 1 ? (
                  <ol className="mt-2 grow list-none space-y-1.5">
                    {item.definitions.map((definition, index) => (
                      <li key={index} className="flex gap-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
                        <span className="shrink-0 font-mono text-[11.5px] font-bold text-[var(--ink-faint)]">{index + 1}.</span>
                        <span>{definition}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 grow text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{item.definition}</p>
                )}
                {item.example && <p className="mt-3 border-t border-[var(--line-soft)] pt-3 text-[12px] italic text-[var(--ink-faint)]">{item.example}</p>}
              </GlassCard>
            </MagicGlow>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-faint)]">
        <span className="inline-flex items-center gap-2"><Shuffle className="h-3.5 w-3.5" /> {mastered.length} study notes marked mastered on this device.</span>
        {topic === "Vocabulary" && <span>600 academic words · definitions aligned with Merriam-Webster · difficulty is relative frequency · see VOCABULARY_ATTRIBUTION.md</span>}
      </div>
    </div>
  );
}

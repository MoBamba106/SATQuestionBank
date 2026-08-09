"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  RotateCcw,
  Cog,
  Shuffle,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import type { StudyItem } from "@/lib/study-content";
import { cn } from "@/lib/utils";

export type DeckSettings = {
  inverted: boolean;
  shuffle: boolean;
  roundSize: number; // 0 = all cards
  cardFilter: "all" | "unmastered" | "mastered";
  swipeMode: boolean;
};

const DEFAULT_DECK_SETTINGS: DeckSettings = {
  inverted: false,
  shuffle: true,
  roundSize: 0,
  cardFilter: "all",
  swipeMode: true,
};

function shuffleArray<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Quizlet-style flashcard deck:
 * - tap/space to flip, arrows to move
 * - swipe (or drag) left = still learning, right = know it
 * - invert term/definition, shuffle, rounds, filters, restart
 */
export function FlashcardDeck({
  items,
  mastered,
  onToggleMastered,
}: {
  items: StudyItem[];
  mastered: string[];
  onToggleMastered: (id: string) => void;
}) {
  const router = useRouter();
  const [settings, setSettings] = React.useState<DeckSettings>(DEFAULT_DECK_SETTINGS);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [deck, setDeck] = React.useState<StudyItem[]>([]);
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [known, setKnown] = React.useState<string[]>([]);
  const [learning, setLearning] = React.useState<string[]>([]);
  const [roundDone, setRoundDone] = React.useState(false);
  // swipe state
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef<number | null>(null);
  const [leaving, setLeaving] = React.useState<"left" | "right" | null>(null);

  const masteredSet = React.useMemo(() => new Set(mastered), [mastered]);

  const buildDeck = React.useCallback(() => {
    let pool = items;
    if (settings.cardFilter === "unmastered") pool = pool.filter((item) => !masteredSet.has(item.id));
    if (settings.cardFilter === "mastered") pool = pool.filter((item) => masteredSet.has(item.id));
    if (settings.shuffle) pool = shuffleArray(pool);
    if (settings.roundSize > 0) pool = pool.slice(0, settings.roundSize);
    setDeck(pool);
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setLearning([]);
    setRoundDone(false);
    setDragX(0);
    setLeaving(null);
  }, [items, masteredSet, settings.cardFilter, settings.roundSize, settings.shuffle]);

  // Rebuild when inputs change (but not when mastered changes mid-round).
  React.useEffect(() => {
    const timer = window.setTimeout(() => buildDeck(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, settings.cardFilter, settings.roundSize, settings.shuffle]);

  const current = deck[index];

  const advance = React.useCallback((direction: 1 | -1) => {
    setFlipped(false);
    setDragX(0);
    setIndex((i) => {
      const next = i + direction;
      if (next >= deck.length) {
        setRoundDone(true);
        return i;
      }
      return Math.max(0, next);
    });
  }, [deck.length]);

  const mark = React.useCallback(
    (know: boolean) => {
      if (!current || leaving) return;
      setLeaving(know ? "right" : "left");
      window.setTimeout(() => {
        setKnown((list) => (know ? [...list, current.id] : list.filter((id) => id !== current.id)));
        setLearning((list) => (!know ? [...list, current.id] : list.filter((id) => id !== current.id)));
        setLeaving(null);
        if (index + 1 >= deck.length) {
          setRoundDone(true);
          setFlipped(false);
          setDragX(0);
        } else {
          advance(1);
        }
      }, 220);
    },
    [advance, current, deck.length, index, leaving],
  );

  // Keyboard shortcuts: ← previous / don't know, → next / know, space flip.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag || "")) return;
      if (roundDone) return;
      if (event.code === "Space" || event.key === "Enter") {
        event.preventDefault();
        setFlipped((f) => !f);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (settings.swipeMode) mark(true);
        else advance(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (settings.swipeMode) mark(false);
        else advance(-1);
      } else if (event.key.toLowerCase() === "m" && current) {
        event.preventDefault();
        onToggleMastered(current.id);
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        buildDeck();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, buildDeck, current, mark, onToggleMastered, roundDone, settings.swipeMode]);

  // Pointer-based swiping.
  const onPointerDown = (event: React.PointerEvent) => {
    if (!settings.swipeMode) return;
    dragStart.current = event.clientX;
    setDragging(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (dragStart.current == null) return;
    setDragX(event.clientX - dragStart.current);
  };
  const onPointerUp = () => {
    if (dragStart.current == null) return;
    const delta = dragX;
    dragStart.current = null;
    setDragging(false);
    if (Math.abs(delta) > 110) mark(delta > 0);
    else setDragX(0);
  };

  const frontLabel = settings.inverted ? "Definition" : "Term";
  const backLabel = settings.inverted ? "Term" : "Definition";

  if (deck.length === 0) {
    return (
      <GlassCard hover={false} className="mx-auto max-w-3xl p-10 text-center">
        <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No cards match these settings</p>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">Try switching the card filter back to “All cards”.</p>
        <button type="button" className="btn btn-soft mt-4" onClick={() => setSettings((s) => ({ ...s, cardFilter: "all" }))}>
          Show all cards
        </button>
      </GlassCard>
    );
  }

  if (roundDone) {
    const knownCount = known.length;
    const total = deck.length;
    return (
      <GlassCard hover={false} className="mx-auto max-w-3xl p-8 text-center">
        <p className="font-display text-3xl font-bold text-[var(--ink)]">Round complete!</p>
        <p className="mt-2 text-[14px] text-[var(--ink-faint)]">
          {settings.swipeMode
            ? `You knew ${knownCount} of ${total} card${total === 1 ? "" : "s"}.`
            : `You reviewed ${total} card${total === 1 ? "" : "s"}.`}
        </p>
        {settings.swipeMode && total > 0 && (
          <div className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full bg-[var(--paper-deep)]">
            <div className="h-full rounded-full bg-[var(--good)]" style={{ width: `${(knownCount / total) * 100}%` }} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button type="button" className="btn btn-primary" onClick={buildDeck}>
            <RotateCcw className="h-4 w-4" /> Restart round
          </button>
          {learning.length > 0 && (
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                const keep = new Set(learning);
                setDeck((d) => d.filter((item) => keep.has(item.id)));
                setIndex(0);
                setFlipped(false);
                setKnown([]);
                setLearning([]);
                setRoundDone(false);
              }}
            >
              Practice the {learning.length} you missed
            </button>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover={false} className="mx-auto max-w-3xl p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
        <span>{current?.topic}</span>
        <div className="flex items-center gap-2">
          {settings.swipeMode && (
            <>
              <span className="inline-flex items-center gap-1 text-[#c05f74]"><ThumbsDown className="h-3 w-3" /> {learning.length}</span>
              <span className="inline-flex items-center gap-1 text-[#2ca974]"><ThumbsUp className="h-3 w-3" /> {known.length}</span>
            </>
          )}
          <span>{index + 1}/{deck.length}</span>
          {current && (
            <button
              type="button"
              className="rounded-[5px] p-1.5 transition-colors hover:bg-[var(--paper-soft)]"
              onClick={() => router.push(`/feedback?mode=flashcard&label=${encodeURIComponent(current.topic)}&questionId=${encodeURIComponent(current.id)}`)}
              title="Report feedback about this card"
              aria-label="Report feedback about this card"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className={cn("rounded-[5px] p-1.5 transition-colors hover:bg-[var(--paper-soft)]", settingsOpen && "bg-[var(--accent-soft)] text-[var(--accent)]")}
            onClick={() => setSettingsOpen((o) => !o)}
            title="Flashcard settings"
            aria-expanded={settingsOpen}
          >
            <Cog className="h-4 w-4" />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="mt-3 grid gap-2.5 rounded-[8px] border border-[var(--line)] bg-[var(--paper-soft)] p-4 sm:grid-cols-2">
          <button
            type="button"
            className={settings.inverted ? "btn btn-primary !justify-start" : "btn btn-soft !justify-start"}
            onClick={() => setSettings((s) => ({ ...s, inverted: !s.inverted }))}
          >
            <ArrowLeftRight className="h-4 w-4" /> Inverted · answer with the {settings.inverted ? "definition" : "term"}
          </button>
          <button
            type="button"
            className={settings.shuffle ? "btn btn-primary !justify-start" : "btn btn-soft !justify-start"}
            onClick={() => setSettings((s) => ({ ...s, shuffle: !s.shuffle }))}
          >
            <Shuffle className="h-4 w-4" /> Shuffle {settings.shuffle ? "on" : "off"}
          </button>
          <div>
            <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Round size</label>
            <PaperSelect
              value={String(settings.roundSize)}
              onValueChange={(value) => setSettings((s) => ({ ...s, roundSize: Number(value) }))}
              options={[
                { value: "0", label: "All cards" },
                { value: "10", label: "10 cards" },
                { value: "20", label: "20 cards" },
                { value: "50", label: "50 cards" },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Which cards</label>
            <PaperSelect
              value={settings.cardFilter}
              onValueChange={(value) => setSettings((s) => ({ ...s, cardFilter: value as DeckSettings["cardFilter"] }))}
              options={[
                { value: "all", label: "All cards" },
                { value: "unmastered", label: "Not mastered yet" },
                { value: "mastered", label: "Mastered only" },
              ]}
            />
          </div>
          <button
            type="button"
            className={settings.swipeMode ? "btn btn-primary !justify-start" : "btn btn-soft !justify-start"}
            onClick={() => setSettings((s) => ({ ...s, swipeMode: !s.swipeMode }))}
          >
            <ThumbsUp className="h-4 w-4" /> Swipe sorting {settings.swipeMode ? "on" : "off"}
          </button>
          <button type="button" className="btn btn-soft !justify-start" onClick={buildDeck}>
            <RotateCcw className="h-4 w-4" /> Restart deck
          </button>
        </div>
      )}

      {/* progress bar */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--paper-deep)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${((index + 1) / deck.length) * 100}%` }} />
      </div>

      {current && (
        <div
          className="flashcard-3d relative mt-5 h-[300px] w-full touch-pan-y select-none sm:h-[330px]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: leaving
              ? `translateX(${leaving === "right" ? 620 : -620}px) rotate(${leaving === "right" ? 14 : -14}deg)`
              : `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
            opacity: leaving ? 0 : 1,
            transition: dragging ? "none" : "transform 0.22s ease, opacity 0.22s ease",
            cursor: settings.swipeMode ? "grab" : "pointer",
          }}
        >
          {settings.swipeMode && dragX !== 0 && (
            <div
              className={cn(
                "pointer-events-none absolute top-4 z-10 rounded-[8px] border-2 px-3 py-1 font-display text-lg font-bold",
                dragX > 0 ? "right-4 rotate-6 border-[#2ca974] text-[#2ca974]" : "left-4 -rotate-6 border-[#d95670] text-[#d95670]",
              )}
              style={{ opacity: Math.min(1, Math.abs(dragX) / 110) }}
            >
              {dragX > 0 ? "KNOW IT" : "STILL LEARNING"}
            </div>
          )}
          <button
            type="button"
            className={cn("flashcard-flip", flipped && "is-flipped")}
            onClick={() => {
              if (Math.abs(dragX) < 6) setFlipped((f) => !f);
            }}
            aria-label="Flip card"
          >
            <span className="flashcard-face">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{frontLabel}</span>
              <span className="mt-3 font-display text-3xl font-bold text-[var(--ink)] sm:text-4xl">
                {settings.inverted ? current.definition : current.term}
              </span>
              {!settings.inverted && current.phonetic && (
                <span className="mt-2 font-mono text-[13px] text-[var(--ink-faint)]">{current.phonetic}</span>
              )}
              <span className="mt-5 text-[11.5px] text-[var(--ink-faint)]">Space or tap to flip</span>
            </span>
            <span className="flashcard-face flashcard-face-back">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{backLabel}</span>
              <span className={cn("mt-3 leading-relaxed text-[var(--ink)]", settings.inverted ? "font-display text-3xl font-bold" : "max-w-xl text-[17px]")}>
                {settings.inverted ? current.term : current.definition}
              </span>
              {current.example && !settings.inverted && (
                <span className="mt-3 max-w-lg text-[12.5px] italic text-[var(--ink-faint)]">{current.example}</span>
              )}
            </span>
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        {settings.swipeMode ? (
          <>
            <button type="button" className="btn btn-soft !border-[#e0b4bf] !text-[#c05f74]" onClick={() => mark(false)}>
              <X className="h-4 w-4" /> Still learning
            </button>
            <button
              type="button"
              className={current && masteredSet.has(current.id) ? "btn btn-good" : "btn btn-ghost"}
              onClick={() => current && onToggleMastered(current.id)}
            >
              <Check className="h-4 w-4" /> {current && masteredSet.has(current.id) ? "Mastered" : "Mark mastered"}
            </button>
            <button type="button" className="btn btn-soft !border-[#a9d3bd] !text-[#238a5e]" onClick={() => mark(true)}>
              Know it <Check className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-soft" onClick={() => advance(-1)} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              className={current && masteredSet.has(current.id) ? "btn btn-good" : "btn btn-soft"}
              onClick={() => current && onToggleMastered(current.id)}
            >
              <Check className="h-4 w-4" /> {current && masteredSet.has(current.id) ? "Mastered" : "Mark mastered"}
            </button>
            <button type="button" className="btn btn-soft" onClick={() => advance(1)}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--ink-faint)]">
        Shortcuts: Space flip · ← {settings.swipeMode ? "still learning" : "previous"} · → {settings.swipeMode ? "know it" : "next"} · M master · R restart
        {settings.swipeMode && " · drag the card left or right"}
      </p>
    </GlassCard>
  );
}

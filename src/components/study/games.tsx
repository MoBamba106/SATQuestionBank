"use client";

import * as React from "react";
import { Bomb, Boxes, Gem, Heart, LayoutGrid, Play, RotateCcw, Timer, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { StudyItem } from "@/lib/study-content";
import { cn } from "@/lib/utils";

export type GameId = "match" | "blast" | "charms" | "blocks";

function sample<T>(list: T[], n: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Build a multiple-choice round: 1 correct definition + 3 decoys. */
function buildChoices(items: StudyItem[], target: StudyItem): StudyItem[] {
  const decoys = sample(items.filter((item) => item.id !== target.id), 3);
  return sample([target, ...decoys], 4);
}

/* ── MATCH ──────────────────────────────────────────────────────────────── */

function MatchGame({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  type Tile = { id: string; pairId: string; text: string; kind: "term" | "def" };
  const [tiles, setTiles] = React.useState<Tile[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [matched, setMatched] = React.useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = React.useState<string[]>([]);
  const [startedAt, setStartedAt] = React.useState<number>(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [penalty, setPenalty] = React.useState(0);
  const done = tiles.length > 0 && matched.size === tiles.length;

  const start = React.useCallback(() => {
    const pairs = sample(items, Math.min(6, items.length));
    const next: Tile[] = [];
    for (const item of pairs) {
      next.push({ id: `${item.id}-t`, pairId: item.id, text: item.term, kind: "term" });
      next.push({ id: `${item.id}-d`, pairId: item.id, text: truncate(item.definition, 90), kind: "def" });
    }
    setTiles(sample(next, next.length));
    setMatched(new Set());
    setSelected(null);
    setPenalty(0);
    setStartedAt(Date.now());
    setElapsed(0);
  }, [items]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => start(), 0);
    return () => window.clearTimeout(timer);
  }, [start]);

  React.useEffect(() => {
    if (done || !startedAt) return;
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100);
    return () => clearInterval(timer);
  }, [done, startedAt]);

  const clickTile = (tile: Tile) => {
    if (matched.has(tile.id) || wrongPair.length > 0) return;
    if (!selected) {
      setSelected(tile.id);
      return;
    }
    if (selected === tile.id) {
      setSelected(null);
      return;
    }
    const first = tiles.find((t) => t.id === selected);
    if (!first) return;
    if (first.pairId === tile.pairId && first.kind !== tile.kind) {
      setMatched((set) => new Set([...set, first.id, tile.id]));
      setSelected(null);
    } else {
      setWrongPair([first.id, tile.id]);
      setPenalty((p) => p + 1);
      window.setTimeout(() => {
        setWrongPair([]);
        setSelected(null);
      }, 500);
    }
  };

  const finalTime = (elapsed + penalty).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[15px] font-bold text-[var(--ink)]">
          <Timer className="h-4 w-4 text-[var(--accent)]" /> {(elapsed + penalty).toFixed(1)}s
          {penalty > 0 && <span className="text-[11px] font-semibold text-[#c05f74]">+{penalty}s penalties</span>}
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={start}>
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={onExit}>Exit</button>
        </div>
      </div>
      {done ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-3xl font-bold text-[var(--ink)]">Cleared in {finalTime}s! 🏁</p>
          <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">Mismatches add a 1-second penalty. Can you beat it?</p>
          <button type="button" className="btn btn-primary mt-4" onClick={start}><Play className="h-4 w-4" /> Play again</button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.id);
            const isSelected = selected === tile.id;
            const isWrong = wrongPair.includes(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => clickTile(tile)}
                disabled={isMatched}
                className={cn(
                  "min-h-[92px] rounded-[8px] border p-3 text-center transition-all duration-200",
                  isMatched && "scale-90 opacity-0",
                  isWrong && "border-[#d95670] bg-[color-mix(in_srgb,#d95670_12%,var(--paper-raised))]",
                  isSelected && !isWrong && "border-[var(--accent)] bg-[var(--accent-soft)] shadow-md",
                  !isSelected && !isWrong && !isMatched && "border-[var(--line)] bg-[var(--paper-raised)] hover:border-[var(--accent)]",
                )}
              >
                <span className={cn("text-[12.5px] leading-snug", tile.kind === "term" ? "font-display text-[15px] font-bold text-[var(--ink)]" : "text-[var(--ink-soft)]")}>
                  {tile.text}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── BLAST ──────────────────────────────────────────────────────────────── */

function BlastGame({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  const [target, setTarget] = React.useState<StudyItem | null>(null);
  const [choices, setChoices] = React.useState<StudyItem[]>([]);
  const [fall, setFall] = React.useState(0); // 0..100
  const [lives, setLives] = React.useState(3);
  const [score, setScore] = React.useState(0);
  const [round, setRound] = React.useState(0);
  const [over, setOver] = React.useState(false);
  const [flash, setFlash] = React.useState<"good" | "bad" | null>(null);

  const nextRound = React.useCallback(() => {
    const t = sample(items, 1)[0];
    setTarget(t);
    setChoices(buildChoices(items, t));
    setFall(0);
    setRound((r) => r + 1);
  }, [items]);

  const start = React.useCallback(() => {
    setLives(3);
    setScore(0);
    setOver(false);
    setRound(0);
    nextRound();
  }, [nextRound]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => start(), 0);
    return () => window.clearTimeout(timer);
  }, [start]);

  // The word falls; speed rises with score.
  React.useEffect(() => {
    if (over || !target) return;
    const speed = 0.55 + Math.min(1.6, score * 0.06);
    const timer = setInterval(() => {
      setFall((f) => {
        if (f >= 100) return f;
        return f + speed;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [over, target, score, round]);

  // Landed without an answer → lose a life.
  React.useEffect(() => {
    if (fall < 100 || over) return;
    const timer = window.setTimeout(() => {
      setFlash("bad");
      window.setTimeout(() => setFlash(null), 350);
      setLives((l) => {
        const next = l - 1;
        if (next <= 0) setOver(true);
        else nextRound();
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fall, nextRound, over]);

  const answer = (choice: StudyItem) => {
    if (over || !target || fall >= 100) return;
    if (choice.id === target.id) {
      setScore((s) => s + 1);
      setFlash("good");
      window.setTimeout(() => setFlash(null), 250);
      nextRound();
    } else {
      setFlash("bad");
      window.setTimeout(() => setFlash(null), 350);
      setLives((l) => {
        const next = l - 1;
        if (next <= 0) setOver(true);
        else nextRound();
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[15px] font-bold text-[var(--ink)]">
            <Bomb className="h-4 w-4 text-[var(--accent)]" /> {score}
          </span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <Heart key={i} className={cn("h-4 w-4", i < lives ? "fill-[#d95670] text-[#d95670]" : "text-[var(--line)]")} />
            ))}
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={start}>
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={onExit}>Exit</button>
        </div>
      </div>

      {over ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-3xl font-bold text-[var(--ink)]">Blast over — {score} points! 💥</p>
          <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">Pick the right definition before the word hits the ground.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={start}><Play className="h-4 w-4" /> Play again</button>
        </GlassCard>
      ) : (
        <>
          <div
            className={cn(
              "relative h-[240px] overflow-hidden rounded-[10px] border transition-colors",
              flash === "good" ? "border-[#2ca974] bg-[color-mix(in_srgb,#2ca974_8%,var(--paper-soft))]"
                : flash === "bad" ? "border-[#d95670] bg-[color-mix(in_srgb,#d95670_8%,var(--paper-soft))]"
                : "border-[var(--line)] bg-[var(--paper-soft)]",
            )}
          >
            {target && (
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-[8px] border border-[var(--accent)] bg-[var(--paper-raised)] px-5 py-2.5 font-display text-2xl font-bold text-[var(--ink)] shadow-md"
                style={{ top: `${(fall / 100) * 82}%`, transition: "top 50ms linear" }}
              >
                {target.term}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-2 bg-[color-mix(in_srgb,var(--bad)_45%,var(--paper-deep))]" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => answer(choice)}
                className="rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-left text-[13px] leading-snug text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--paper-soft)]"
              >
                {truncate(choice.definition, 120)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── CHARMS ─────────────────────────────────────────────────────────────── */

function CharmsGame({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  const ROUND_SECONDS = 60;
  const [target, setTarget] = React.useState<StudyItem | null>(null);
  const [choices, setChoices] = React.useState<StudyItem[]>([]);
  const [streak, setStreak] = React.useState(0);
  const [best, setBest] = React.useState(0);
  const [charms, setCharms] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(ROUND_SECONDS);
  const [over, setOver] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  const nextRound = React.useCallback(() => {
    const t = sample(items, 1)[0];
    setTarget(t);
    setChoices(buildChoices(items, t));
  }, [items]);

  const start = React.useCallback(() => {
    setStreak(0);
    setBest(0);
    setCharms(0);
    setTimeLeft(ROUND_SECONDS);
    setOver(false);
    nextRound();
  }, [nextRound]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => start(), 0);
    return () => window.clearTimeout(timer);
  }, [start]);

  React.useEffect(() => {
    if (over) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [over]);

  const answer = (choice: StudyItem) => {
    if (over || !target) return;
    if (choice.id === target.id) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBest((b) => Math.max(b, nextStreak));
      // Every 3 in a row earns a charm and bonus time.
      if (nextStreak % 3 === 0) {
        setCharms((c) => c + 1);
        setTimeLeft((t) => Math.min(ROUND_SECONDS, t + 4));
      }
    } else {
      setStreak(0);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
    }
    nextRound();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 font-mono text-[14px] font-bold text-[var(--ink)]">
          <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#d7a13c]" /> streak {streak}</span>
          <span className="inline-flex items-center gap-1.5"><Gem className="h-4 w-4 text-[var(--accent)]" /> {charms}</span>
          <span className={cn("inline-flex items-center gap-1.5", timeLeft <= 10 && "text-[#d95670]")}><Timer className="h-4 w-4" /> {timeLeft}s</span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={start}>
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={onExit}>Exit</button>
        </div>
      </div>

      {over ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-3xl font-bold text-[var(--ink)]">
            {charms} charm{charms === 1 ? "" : "s"} collected! ✨
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">Best streak: {best}. Three correct in a row earns a charm and bonus time.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={start}><Play className="h-4 w-4" /> Play again</button>
        </GlassCard>
      ) : (
        target && (
          <GlassCard hover={false} className={cn("p-6 text-center", shake && "animate-[shake_0.3s_ease]")}>
            <div className="mb-1 flex justify-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Gem key={i} className={cn("h-4 w-4", i < streak % 3 ? "text-[var(--accent)]" : "text-[var(--line)]")} />
              ))}
            </div>
            <p className="font-display text-3xl font-bold text-[var(--ink)]">{target.term}</p>
            {target.phonetic && <p className="mt-1 font-mono text-[12px] text-[var(--ink-faint)]">{target.phonetic}</p>}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => answer(choice)}
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-left text-[13px] leading-snug text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--paper-soft)]"
                >
                  {truncate(choice.definition, 120)}
                </button>
              ))}
            </div>
          </GlassCard>
        )
      )}
    </div>
  );
}

/* ── BLOCKS ─────────────────────────────────────────────────────────────── */

function BlocksGame({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  const GOAL = 12;
  const [target, setTarget] = React.useState<StudyItem | null>(null);
  const [choices, setChoices] = React.useState<StudyItem[]>([]);
  const [tower, setTower] = React.useState<string[]>([]);
  const [misses, setMisses] = React.useState(0);
  const [won, setWon] = React.useState(false);
  const [lost, setLost] = React.useState(false);
  const [wobble, setWobble] = React.useState(false);

  const nextRound = React.useCallback(() => {
    const t = sample(items, 1)[0];
    setTarget(t);
    setChoices(buildChoices(items, t));
  }, [items]);

  const start = React.useCallback(() => {
    setTower([]);
    setMisses(0);
    setWon(false);
    setLost(false);
    nextRound();
  }, [nextRound]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => start(), 0);
    return () => window.clearTimeout(timer);
  }, [start]);

  const answer = (choice: StudyItem) => {
    if (won || lost || !target) return;
    if (choice.id === target.id) {
      setTower((t) => {
        const next = [...t, target.term];
        if (next.length >= GOAL) setWon(true);
        return next;
      });
      nextRound();
    } else {
      setWobble(true);
      window.setTimeout(() => setWobble(false), 400);
      // A wrong answer knocks two blocks off the tower.
      setTower((t) => t.slice(0, Math.max(0, t.length - 2)));
      setMisses((m) => {
        const next = m + 1;
        if (next >= 3) setLost(true);
        return next;
      });
      nextRound();
    }
  };

  const COLORS = ["#5a8bd6", "#4fc4b8", "#d7a13c", "#c987c9", "#7fbf7f", "#d98a70"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[14px] font-bold text-[var(--ink)]">
          <Boxes className="h-4 w-4 text-[var(--accent)]" /> {tower.length}/{GOAL} blocks
          <span className="text-[11.5px] font-semibold text-[#c05f74]">{3 - misses} wrong answers left</span>
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={start}>
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
          <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={onExit}>Exit</button>
        </div>
      </div>

      {(won || lost) ? (
        <GlassCard hover={false} className="p-10 text-center">
          <p className="font-display text-3xl font-bold text-[var(--ink)]">
            {won ? "Tower complete! 🏗️" : "The tower fell! 🧱"}
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">
            {won ? `You stacked all ${GOAL} blocks.` : `You reached ${tower.length} block${tower.length === 1 ? "" : "s"}. Wrong answers knock two blocks off.`}
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={start}><Play className="h-4 w-4" /> Play again</button>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="flex h-[300px] flex-col-reverse items-center gap-1 overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--paper-soft)] p-3">
            <div className="h-2 w-full rounded bg-[var(--paper-deep)]" />
            {tower.map((term, index) => (
              <div
                key={`${term}-${index}`}
                className={cn("flex h-[18px] w-[80%] items-center justify-center truncate rounded-[4px] px-2 text-[9px] font-bold text-white shadow-sm", wobble && "animate-[shake_0.3s_ease]")}
                style={{ background: COLORS[index % COLORS.length], width: `${82 - index * 1.5}%` }}
              >
                {truncate(term, 16)}
              </div>
            ))}
          </div>
          {target && (
            <div>
              <p className="font-display text-2xl font-bold text-[var(--ink)]">{target.term}</p>
              {target.phonetic && <p className="mt-0.5 font-mono text-[12px] text-[var(--ink-faint)]">{target.phonetic}</p>}
              <p className="mt-1 text-[12.5px] text-[var(--ink-faint)]">Pick the correct definition to add a block.</p>
              <div className="mt-4 grid gap-2">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => answer(choice)}
                    className="rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-3 text-left text-[13px] leading-snug text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--paper-soft)]"
                  >
                    {truncate(choice.definition, 140)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── HUB ────────────────────────────────────────────────────────────────── */

const GAMES: { id: GameId; name: string; description: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { id: "match", name: "Match", description: "Pair every term with its definition as fast as you can.", icon: LayoutGrid, tone: "soft-tone-teal" },
  { id: "blast", name: "Blast", description: "Words fall from the sky — pick the definition before they land.", icon: Bomb, tone: "soft-tone-rose" },
  { id: "charms", name: "Charms", description: "60-second streak run. Three in a row earns a charm and bonus time.", icon: Gem, tone: "soft-tone-lavender" },
  { id: "blocks", name: "Blocks", description: "Stack a 12-block tower. Wrong answers knock blocks off!", icon: Boxes, tone: "soft-tone-yellow" },
];

export function StudyGames({ items }: { items: StudyItem[] }) {
  const [active, setActive] = React.useState<GameId | null>(null);

  if (items.length < 4) {
    return (
      <GlassCard hover={false} className="p-10 text-center">
        <p className="font-display text-xl font-bold text-[var(--ink-soft)]">Not enough cards for games</p>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">Pick a topic or filter with at least 4 study cards.</p>
      </GlassCard>
    );
  }

  if (active === "match") return <MatchGame items={items} onExit={() => setActive(null)} />;
  if (active === "blast") return <BlastGame items={items} onExit={() => setActive(null)} />;
  if (active === "charms") return <CharmsGame items={items} onExit={() => setActive(null)} />;
  if (active === "blocks") return <BlocksGame items={items} onExit={() => setActive(null)} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {GAMES.map(({ id, name, description, icon: Icon, tone }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActive(id)}
          className={cn("soft-tone flex flex-col items-start gap-2 p-5 text-left transition-transform hover:-translate-y-0.5", tone)}
        >
          <span className="flex items-center gap-2 font-display text-xl font-bold">
            <Icon className="h-5 w-5" /> {name}
          </span>
          <span className="text-[12.5px] leading-relaxed opacity-80">{description}</span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-bold">
            <Play className="h-3.5 w-3.5" /> Play
          </span>
        </button>
      ))}
    </div>
  );
}

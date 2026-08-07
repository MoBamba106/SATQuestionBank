"use client";
import { formatDetroitDateTime } from "@/lib/utils";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, ChevronDown, ChevronUp, Maximize2, X, Eye } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionView } from "@/components/quiz/question-view";
import { SkillBands } from "@/components/quiz/skill-bands";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn, difficultyColor, skillColor, stripHtml } from "@/lib/utils";
import type { PracticeTestDetail, SessionSummary, SATQuestion } from "@/lib/types";
import { toast } from "sonner";

type FlatItem = { q: SATQuestion; moduleLabel: string; section: "rw" | "math"; module: 1 | 2 };
type ReviewTab = "all" | "rw" | "math";

function ImageLightbox({ content, onClose }: { content: { type: "img"; src: string } | { type: "svg"; html: string } | null; onClose: () => void }) {
  if (!content) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose} aria-label="Close">
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-[90vh] max-w-[95vw] overflow-auto rounded-[8px] bg-[var(--paper-raised)] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {content.type === "img" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.src} alt="Enlarged graph" className="h-auto max-h-[85vh] w-auto max-w-[90vw] object-contain" />
        ) : (
          <div className="flex items-center justify-center bg-[#f7f6f2] p-6 rounded-[6px] min-w-[320px] min-h-[320px]" dangerouslySetInnerHTML={{ __html: content.html }} />
        )}
      </div>
    </div>
  );
}

function ModuleSection({
  title,
  items,
  attemptMap,
  startIndex,
  expanded,
  onToggle,
  onLightbox,
}: {
  title: string;
  items: FlatItem[];
  attemptMap: Map<string, SessionSummary["attempts"][number]>;
  startIndex: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onLightbox: (c: { type: "img"; src: string } | { type: "svg"; html: string }) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px grow bg-[var(--line)]" />
        <h2 className="shrink-0 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{title}</h2>
        <div className="h-px grow bg-[var(--line)]" />
      </div>

      {items.map(({ q }, i) => {
        const a = attemptMap.get(q.id);
        const isExpanded = expanded.has(q.id);
        const preview = stripHtml(q.questionHtml || q.questionText).slice(0, 120);
        const isCorrect = a?.isCorrect;

        return (
          <GlassCard key={q.id} hover={false} className="overflow-hidden p-0">
            {/* Minimized header - click whole row to expand */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-soft)] bg-[var(--paper-soft)] px-4 py-3 cursor-pointer hover:bg-[var(--paper-deep)] transition-colors" onClick={() => onToggle(q.id)}>
              <span className="font-mono text-[12px] font-bold text-[var(--ink-faint)]">Q{startIndex + i + 1}</span>
              <span className={cn("badge", skillColor(q.skill))}>{q.skill}</span>
              <span className={cn("badge border", difficultyColor(q.difficulty))}>{q.difficulty}</span>

              <span
                className={cn(
                  "badge ml-auto",
                  !a || !a.answer ? "bg-[var(--paper-soft)] text-[var(--ink-faint)]" : a.isCorrect ? "bg-[#ecf8f1] text-[#238a5e] border-[#bde5cf]" : "bg-[#fdf0f2] text-[#a33046] border-[#f3ccd4]",
                )}
              >
                {!a || !a.answer ? "Unanswered" : a.isCorrect ? `Correct: ${a.answer}` : `You: ${a.answer}`}
              </span>

              {!isExpanded && preview && (
                <span className="hidden w-full truncate text-[12px] text-[var(--ink-faint)] sm:block sm:w-auto sm:max-w-[280px]">· {preview}…</span>
              )}

              <button
                type="button"
                className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px] ml-auto sm:ml-2"
                onClick={(e) => { e.stopPropagation(); onToggle(q.id); }}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> Expand
                  </>
                )}
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Full question view</span>
                    {a?.answer && (
                      <span className={cn("badge", isCorrect ? "bg-[#ecf8f1] text-[#238a5e]" : "bg-[#fdf0f2] text-[#a33046]")}>
                        Your answer: {a.answer} {isCorrect ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                  <button type="button" className="btn btn-ghost !min-h-8 !px-2.5" onClick={() => onToggle(q.id)} title="Close question">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Wrapper that handles image clicks for lightbox */}
                <div
                  className="review-question-wrapper [&_img]:cursor-zoom-in [&_img]:transition-transform [&_img:hover]:scale-[1.02] [&_svg]:cursor-zoom-in"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const img = target.closest("img");
                    if (img) {
                      const src = (img as HTMLImageElement).src || (img as HTMLImageElement).getAttribute("src");
                      if (src) {
                        e.preventDefault();
                        onLightbox({ type: "img", src });
                        return;
                      }
                    }
                    // SVG graph handling
                    const svg = target.closest("svg");
                    if (svg) {
                      e.preventDefault();
                      onLightbox({ type: "svg", html: svg.outerHTML });
                    }
                  }}
                >
                  {/* Allow graphs to be bigger in review mode */}
                  <div className="[&_.sat-content_img]:!max-h-none [&_.sat-content_img]:!max-w-full [&_.sat-content_img]:!min-h-0 [&_img]:!max-h-none [&_img]:!max-width-full [&_img.math-img]:!max-h-none review-graphs">
                    <QuestionView question={q} selected={a?.answer || undefined} onSelect={() => {}} graded lockSelection showExplanation />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button type="button" className="btn btn-soft !min-h-8" onClick={() => onToggle(q.id)}>
                    <ChevronUp className="h-4 w-4" /> Close
                  </button>
                </div>

                <style jsx>{`
                  .review-graphs :global(.sat-content img) {
                    max-height: none !important;
                    min-height: 0 !important;
                    max-width: 100% !important;
                    cursor: zoom-in;
                  }
                  .review-graphs :global(.sat-content .math_expression img),
                  .review-graphs :global(.sat-content img.math-img) {
                    max-height: none !important;
                    min-height: 0 !important;
                    max-width: 100% !important;
                  }
                  .review-graphs :global(.sat-content img:not(.math-img)) {
                    border: 1px solid var(--line-soft);
                    background: #f7f6f2;
                    padding: 8px;
                    border-radius: 6px;
                  }
                  .review-graphs :global(.sat-content svg) {
                    max-width: 100%;
                    height: auto;
                    cursor: zoom-in;
                  }
                `}</style>
              </div>
            )}
          </GlassCard>
        );
      })}
    </section>
  );
}

function ReviewInner() {
  const sp = useSearchParams();
  const sessionId = sp.get("session");
  const [session, setSession] = React.useState<SessionSummary | null>(null);
  const [items, setItems] = React.useState<FlatItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<ReviewTab>("all");
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [lightbox, setLightbox] = React.useState<{ type: "img"; src: string } | { type: "svg"; html: string } | null>(null);

  React.useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const s = await apiGet<SessionSummary>(`/api/sessions/${sessionId}`);
        setSession(s);
        if (s.testId) {
          const t = await apiGet<PracticeTestDetail>(`/api/practice-tests/${s.testId}`);
          const attemptedIds = new Set(s.attempts.map((attempt) => attempt.questionId));
          const path = s.adaptivePath ?? {
            rw: t.modules.rw2Easy.some((question) => attemptedIds.has(question.id)) ? "easier" : "harder",
            math: t.modules.math2Easy.some((question) => attemptedIds.has(question.id)) ? "easier" : "harder",
          };
          const rw2 = path.rw === "harder" ? t.modules.rw2Hard : t.modules.rw2Easy;
          const math2 = path.math === "harder" ? t.modules.math2Hard : t.modules.math2Easy;
          const flat: FlatItem[] = [
            ...t.modules.rw1.map((q) => ({ q, moduleLabel: "R&W · Module 1", section: "rw" as const, module: 1 as const })),
            ...rw2.map((q) => ({ q, moduleLabel: `R&W · Module 2 (${path.rw})`, section: "rw" as const, module: 2 as const })),
            ...t.modules.math1.map((q) => ({ q, moduleLabel: "Math · Module 1", section: "math" as const, module: 1 as const })),
            ...math2.map((q) => ({ q, moduleLabel: `Math · Module 2 (${path.math})`, section: "math" as const, module: 2 as const })),
          ];
          setItems(flat);
        } else {
          const ids = s.attempts.map((a) => a.questionId);
          if (ids.length) {
            const d = await apiPost<{ questions: SATQuestion[] }>("/api/questions", { ids });
            setItems(d.questions.map((q) => ({ q, moduleLabel: "", section: q.domain === "Math" ? "math" : "rw", module: 1 })));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Couldn't load review";
        setError(msg);
        toast.error("Couldn't load review", { description: msg });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const toggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!sessionId)
    return (
      <GlassCard hover={false} className="p-10 text-center">
        <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No review session was specified.</p>
        <Link href="/bluebook" className="btn btn-primary mt-4">Back to tests</Link>
      </GlassCard>
    );

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[var(--ink-faint)]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading review…
      </div>
    );
  if (error)
    return (
      <GlassCard hover={false} className="p-10 text-center">
        <p className="font-display text-xl font-bold text-[var(--ink-soft)]">{error}</p>
        <Link href="/bluebook" className="btn btn-primary mt-4">Back to tests</Link>
      </GlassCard>
    );

  const attemptMap = new Map(session?.attempts.map((a) => [a.questionId, a]) ?? []);
  const correct = session?.attempts.filter((a) => a.isCorrect).length ?? 0;

  const visible = items.filter((item) => {
    if (tab === "all") return true;
    if (tab === "rw") return item.section === "rw";
    return item.section === "math";
  });

  const groups: { key: string; title: string; items: FlatItem[] }[] = [];
  if (tab === "all" || tab === "rw") {
    groups.push({ key: "rw1", title: "Reading & Writing · Module 1", items: visible.filter((i) => i.section === "rw" && i.module === 1) });
    groups.push({ key: "rw2", title: "Reading & Writing · Module 2", items: visible.filter((i) => i.section === "rw" && i.module === 2) });
  }
  if (tab === "all" || tab === "math") {
    groups.push({ key: "m1", title: "Math · Module 1", items: visible.filter((i) => i.section === "math" && i.module === 1) });
    groups.push({ key: "m2", title: "Math · Module 2", items: visible.filter((i) => i.section === "math" && i.module === 2) });
  }

  let running = 0;
  const allExpanded = expanded.size > 0 && expanded.size === visible.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/bluebook" className="btn btn-ghost !px-2.5"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 grow">
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">{session?.label ?? "Test"}: Review</h1>
          <p className="mt-1 text-[15px] text-[var(--ink-faint)]">
            Score: <span className="font-bold text-[var(--ink)]">{correct} / {items.length}</span> correct
            {session?.finishedAt && <> · finished {formatDetroitDateTime(session.finishedAt)}</>} · Graphs are clickable to enlarge
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-soft !min-h-9" onClick={() => setExpanded(new Set(visible.map((v) => v.q.id)))} disabled={visible.length===0}>
            <Eye className="h-4 w-4" /> Expand all
          </button>
          <button type="button" className="btn btn-ghost !min-h-9" onClick={() => setExpanded(new Set())} disabled={expanded.size===0}>
            <ChevronUp className="h-4 w-4" /> Collapse all
          </button>
        </div>
      </div>

      {session?.totalScore && (
        <GlassCard hover={false} className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Estimated total</div>
              <div className="font-display text-4xl font-bold text-[var(--ink)]">{session.totalScore}</div>
            </div>
            <div className="soft-tone soft-tone-lavender p-3">
              <div className="text-[10px] font-bold uppercase">Reading & Writing</div>
              <div className="font-display text-2xl font-bold">{session.rwScore}</div>
            </div>
            <div className="soft-tone soft-tone-teal p-3">
              <div className="text-[10px] font-bold uppercase">Math</div>
              <div className="font-display text-2xl font-bold">{session.mathScore}</div>
            </div>
          </div>
          {session.skillBands && <div className="mt-5"><SkillBands bands={session.skillBands} /></div>}
        </GlassCard>
      )}

      <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-soft)] p-1.5">
        {([
          ["all", "All questions"],
          ["rw", "Reading & Writing"],
          ["math", "Math"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "min-h-10 grow rounded-[7px] px-4 text-[13.5px] font-bold transition-colors sm:grow-0",
              tab === id ? "bg-[var(--paper-raised)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--line)]" : "text-[var(--ink-faint)] hover:text-[var(--ink)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {groups.map((group) => {
          const start = running;
          running += group.items.length;
          return (
            <ModuleSection
              key={group.key}
              title={group.title}
              items={group.items}
              attemptMap={attemptMap}
              startIndex={start}
              expanded={expanded}
              onToggle={toggleExpand}
              onLightbox={setLightbox}
            />
          );
        })}
        {visible.length === 0 && <p className="py-10 text-center text-[14px] text-[var(--ink-faint)]">No questions in this tab.</p>}
      </div>

      <ImageLightbox content={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

export default function BluebookReviewPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center gap-2 py-24 text-[var(--ink-faint)]"><Loader2 className="h-5 w-5 animate-spin" /> Loading review…</div>}>
      <ReviewInner />
    </React.Suspense>
  );
}

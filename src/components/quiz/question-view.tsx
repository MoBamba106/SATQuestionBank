"use client";

import * as React from "react";
import { Ban, CheckCircle2, Highlighter, MousePointer2, XCircle } from "lucide-react";
import { SafeHtml } from "@/components/ui/safe-html";
import { useSettings } from "@/components/settings-provider";
import { answersMatch, cn, resolveCorrectAnswer } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

type HighlightColor = "yellow" | "red" | "blue";

/** Pretty-print accepted keys like "0|3" → "0 or 3". */
function formatAcceptedAnswer(answer: string): string {
  const parts = String(answer || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return answer || "—";
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, or ${parts.at(-1)}`;
}

function asElement(node: Node | null | undefined): Element | null {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

/** Math / KaTeX / MathJax containers must be highlighted as one unit. */
const MATH_ATOMIC_SELECTOR = [
  "math",
  ".katex",
  ".katex-display",
  "mjx-container",
  ".MathJax",
  ".MathJax_Display",
  ".math_expression",
  ".math-container",
  "img.math-img",
].join(", ");

function closestMathAtomic(node: Node | null): Element | null {
  const el = asElement(node);
  return el?.closest(MATH_ATOMIC_SELECTOR) ?? null;
}

/**
 * Expand a DOM Range so any partial selection inside MathML/KaTeX/MathJax
 * covers the entire math container instead of individual letter/digit nodes.
 */
function expandRangeAroundMath(range: Range, root: Element): Range {
  const next = range.cloneRange();
  const startMath = closestMathAtomic(range.startContainer);
  if (startMath && root.contains(startMath)) {
    next.setStartBefore(startMath);
  }
  const endMath = closestMathAtomic(range.endContainer);
  if (endMath && root.contains(endMath)) {
    next.setEndAfter(endMath);
  }
  return next;
}

/**
 * Collect highlightable units inside `range`:
 * - ordinary text node slices
 * - whole math atoms (never split character-by-character)
 */
function collectHighlightTargets(root: Element, range: Range): Array<
  | { kind: "text"; node: Text; start: number; end: number }
  | { kind: "atom"; element: Element }
> {
  const targets: Array<
    | { kind: "text"; node: Text; start: number; end: number }
    | { kind: "atom"; element: Element }
  > = [];
  const seenAtoms = new Set<Element>();

  // 1) Whole math containers that intersect the selection.
  root.querySelectorAll(MATH_ATOMIC_SELECTOR).forEach((el) => {
    if (!range.intersectsNode(el)) return;
    // Prefer the outermost atom when nested (e.g. katex inside math-container).
    const outer = el.parentElement?.closest(MATH_ATOMIC_SELECTOR);
    if (outer && root.contains(outer) && range.intersectsNode(outer)) return;
    if (seenAtoms.has(el)) return;
    seenAtoms.add(el);
    targets.push({ kind: "atom", element: el });
  });

  // 2) Text nodes outside math atoms.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node as Text;
    if (text.data.trim() && range.intersectsNode(text) && !closestMathAtomic(text)) {
      const start = text === range.startContainer ? range.startOffset : 0;
      const end = text === range.endContainer ? range.endOffset : text.data.length;
      if (end > start) targets.push({ kind: "text", node: text, start, end });
    }
    node = walker.nextNode();
  }

  return targets;
}

function unwrapMark(mark: Element) {
  const fragment = document.createDocumentFragment();
  while (mark.firstChild) fragment.appendChild(mark.firstChild);
  mark.replaceWith(fragment);
}

function wrapNodeWithMark(node: Node, color: HighlightColor) {
  if (asElement(node)?.closest(".sat-highlight")) return;
  const mark = document.createElement("mark");
  mark.className = `sat-highlight sat-highlight-${color}`;
  node.parentNode?.insertBefore(mark, node);
  mark.appendChild(node);
}

function applyHighlightToRange(root: Element, rawRange: Range, color: HighlightColor) {
  const range = expandRangeAroundMath(rawRange, root);
  if (!root.contains(asElement(range.commonAncestorContainer))) return;

  // Selecting text already contained in one highlight toggles that highlight off.
  const startMark = asElement(range.startContainer)?.closest(".sat-highlight");
  const endMark = asElement(range.endContainer)?.closest(".sat-highlight");
  if (startMark && startMark === endMark && root.contains(startMark)) {
    unwrapMark(startMark);
    return;
  }

  const targets = collectHighlightTargets(root, range);
  // Apply from the end so text.splitText offsets stay valid.
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i]!;
    if (target.kind === "atom") {
      if (target.element.closest(".sat-highlight")) continue;
      wrapNodeWithMark(target.element, color);
      continue;
    }
    if (target.node.parentElement?.closest(".sat-highlight")) continue;
    const { node, start, end } = target;
    if (end <= start || start >= node.data.length) continue;
    const selectedText = start > 0 ? node.splitText(start) : node;
    const splitEnd = end - start;
    if (splitEnd < selectedText.data.length) selectedText.splitText(splitEnd);
    wrapNodeWithMark(selectedText, color);
  }
}

/**
 * Shared question renderer used by practice, exam and Bluebook modes.
 * `graded` (true once "Check Answer" has run) reveals correct/incorrect
 * styling plus the explanation panel.
 *
 * Choices support:
 *  - unclick: selecting the current answer again clears it
 *  - eliminate: the strike-through button crosses out a choice and locks it
 *    until it is un-eliminated
 */
export function QuestionView({
  question,
  selected,
  onSelect,
  graded,
  lockSelection,
  showExplanation = true,
}: {
  question: SATQuestion;
  selected: string | undefined;
  onSelect: (answer: string) => void;
  graded: boolean;
  lockSelection?: boolean;
  showExplanation?: boolean;
}) {
  const { settings } = useSettings();
  const correctKey = resolveCorrectAnswer(question.correctAnswer, question.explanation);
  const expandPassages = settings.expandPassages;
  const [eliminated, setEliminated] = React.useState<Record<string, boolean>>({});
  const [prevQuestionId, setPrevQuestionId] = React.useState(question.id);
  const [highlightColor, setHighlightColor] = React.useState<HighlightColor | null>(null);
  const highlightRootRef = React.useRef<HTMLDivElement>(null);
  const [floatingMenu, setFloatingMenu] = React.useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const floatingRef = React.useRef<HTMLDivElement>(null);

  // Reset eliminations when the question changes.
  if (prevQuestionId !== question.id) {
    setPrevQuestionId(question.id);
    setEliminated({});
    setHighlightColor(null);
    setFloatingMenu({ x: 0, y: 0, visible: false });
  }

  const hideFloating = React.useCallback(() => {
    setFloatingMenu((m) => (m.visible ? { ...m, visible: false } : m));
  }, []);

  const toggleEliminate = (key: string) => {
    if (lockSelection || graded) return;
    setEliminated((current) => {
      const next = { ...current, [key]: !current[key] };
      // Eliminating a selected answer also unselects it.
      if (next[key] && selected === key) onSelect("");
      return next;
    });
  };

  const pick = (key: string) => {
    if (eliminated[key]) return;
    // Clicking the already-selected choice unclicks it.
    onSelect(selected === key ? "" : key);
  };

  const getValidSelectionRange = React.useCallback((): Range | null => {
    const root = highlightRootRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!root.contains(asElement(range.commonAncestorContainer))) return null;
    // Ignore selections that live entirely inside form controls.
    const anchorEl = asElement(selection.anchorNode);
    if (anchorEl?.closest("input, textarea, button, select")) return null;
    return range;
  }, []);

  const applyColorToCurrentSelection = React.useCallback(
    (color: HighlightColor) => {
      const root = highlightRootRef.current;
      const range = getValidSelectionRange();
      if (!root || !range) return;
      applyHighlightToRange(root, range, color);
      window.getSelection()?.removeAllRanges();
      hideFloating();
    },
    [getValidSelectionRange, hideFloating],
  );

  /** Explicit highlighter mode: paint on mouse-up with the active swatch. */
  const applyHighlight = () => {
    if (!highlightColor) return;
    applyColorToCurrentSelection(highlightColor);
  };

  /** Position the floating color tooltip above the live selection. */
  const showFloatingForSelection = React.useCallback(() => {
    if (highlightColor) {
      hideFloating();
      return;
    }
    const range = getValidSelectionRange();
    if (!range || !range.toString().trim()) {
      hideFloating();
      return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideFloating();
      return;
    }
    const pad = 8;
    const menuW = 168;
    const x = Math.min(
      Math.max(pad + menuW / 2, rect.left + rect.width / 2),
      window.innerWidth - pad - menuW / 2,
    );
    const y = Math.max(pad + 40, rect.top - 10);
    setFloatingMenu({ x, y, visible: true });
  }, [getValidSelectionRange, hideFloating, highlightColor]);

  // Suppress the browser context menu inside question content so the custom
  // highlight tooltip is the primary selection affordance.
  React.useEffect(() => {
    const root = highlightRootRef.current;
    if (!root) return;
    const onContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && root.contains(asElement(selection.anchorNode))) {
        e.preventDefault();
        if (!highlightColor) showFloatingForSelection();
      }
    };
    root.addEventListener("contextmenu", onContextMenu);
    return () => root.removeEventListener("contextmenu", onContextMenu);
  }, [highlightColor, question.id, showFloatingForSelection]);

  // Hide floating menu on outside click / scroll / escape.
  React.useEffect(() => {
    if (!floatingMenu.visible) return;
    const onPointerDown = (e: PointerEvent) => {
      if (floatingRef.current?.contains(e.target as Node)) return;
      hideFloating();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideFloating();
    };
    const onScroll = () => hideFloating();
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [floatingMenu.visible, hideFloating]);

  /**
   * Triple-click normally selects a whole paragraph/block. Block that on
   * mousedown (before the browser expands the selection) and again on mouseup
   * as a safety net. Double-click (word) selection is preserved.
   */
  const suppressTripleClick = (e: React.MouseEvent) => {
    if (e.detail < 3) return false;
    e.preventDefault();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    hideFloating();
    return true;
  };

  const onRootMouseDown = (e: React.MouseEvent) => {
    suppressTripleClick(e);
  };

  const onRootMouseUp = (e: React.MouseEvent) => {
    if (suppressTripleClick(e)) return;
    // Don't steal mouseup from answer buttons / eliminate controls.
    if ((e.target as HTMLElement | null)?.closest("button, input, textarea, select, a")) {
      return;
    }
    if (highlightColor) {
      applyHighlight();
      return;
    }
    // Defer so the browser finishes updating the selection.
    window.requestAnimationFrame(() => showFloatingForSelection());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[7px] border border-[var(--line-soft)] bg-[var(--paper-soft)]/60 p-2">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
          <Highlighter className="h-3.5 w-3.5" /> Highlighter
        </span>
        {(["yellow", "red", "blue"] as const).map((color) => (
          <button
            key={color}
            type="button"
            className={cn("highlight-swatch", `highlight-swatch-${color}`, highlightColor === color && "is-active")}
            onClick={() => {
              setHighlightColor((current) => (current === color ? null : color));
              hideFloating();
            }}
            aria-pressed={highlightColor === color}
          >
            {color}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-ghost !min-h-7 !px-2.5 !py-1 !text-[11.5px]"
          onClick={() => {
            setHighlightColor(null);
            hideFloating();
          }}
        >
          <MousePointer2 className="h-3.5 w-3.5" /> Cursor
        </button>
      </div>

      <div
        key={question.id}
        ref={highlightRootRef}
        onMouseDown={onRootMouseDown}
        onMouseUp={onRootMouseUp}
        className={cn("space-y-4", highlightColor && "highlight-tool-active")}
      >
        {question.passageHtml && (
          <div
            className={cn(
              "glass-subtle p-4 sm:p-5 scrollbar-thin",
              expandPassages ? "overflow-visible" : "max-h-[380px] overflow-y-auto",
            )}
          >
            <SafeHtml html={question.passageHtml} className="sat-content text-[14.5px] text-[var(--ink-soft)]" />
          </div>
        )}

        <SafeHtml html={question.questionHtml || question.questionText} className="sat-content" />

        {question.type === "multiple_choice" && question.choices ? (
          <div className="space-y-2.5 pt-1">
            {question.choices.map((c) => {
              const isSel = selected === c.key;
              const isAnswer = c.key.toUpperCase() === correctKey.toUpperCase();
              const wasCheckedWrong = graded && isSel && !isAnswer;
              const isEliminated = !graded && !!eliminated[c.key];
              const answerState = graded
                ? isAnswer
                  ? "correct"
                  : wasCheckedWrong
                    ? "wrong"
                    : "muted"
                : isSel
                  ? "selected"
                  : "idle";
              return (
                <div key={c.key} className="flex items-start gap-1.5">
                  <button
                    disabled={lockSelection || isEliminated}
                    onClick={() => pick(c.key)}
                    data-answer-state={answerState}
                    aria-pressed={isSel}
                    className={cn(
                      "answer-choice flex w-full items-start gap-3.5 rounded-[6px] border px-4 py-3 text-left transition-colors duration-150",
                      lockSelection && "cursor-default",
                      isEliminated && "answer-eliminated cursor-not-allowed",
                    )}
                  >
                    <span
                      data-answer-state={answerState}
                      className="answer-letter mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px] font-bold transition-colors"
                    >
                      {c.key}
                    </span>
                    <div className="answer-choice-body grow">
                      <SafeHtml html={c.html || c.text} className="sat-content text-[15px]" />
                    </div>
                    {graded && isAnswer && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#2ca974]" />}
                    {wasCheckedWrong && <XCircle className="mt-1 h-5 w-5 shrink-0 text-[#d95670]" />}
                  </button>
                  {!graded && !lockSelection && (
                    <button
                      type="button"
                      onClick={() => toggleEliminate(c.key)}
                      title={isEliminated ? `Undo eliminate ${c.key}` : `Eliminate choice ${c.key}`}
                      aria-label={isEliminated ? `Undo eliminate choice ${c.key}` : `Eliminate choice ${c.key}`}
                      aria-pressed={isEliminated}
                      className={cn(
                        "mt-2 shrink-0 rounded-[5px] p-1.5 transition-colors",
                        isEliminated
                          ? "bg-[color-mix(in_srgb,var(--bad)_14%,var(--paper-raised))] text-[var(--bad)]"
                          : "text-[var(--ink-faint)] hover:bg-[var(--paper-soft)] hover:text-[var(--bad)]",
                      )}
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pt-1">
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
              Your answer
            </label>
            <div className="flex max-w-sm items-center gap-3">
              <input
                className={cn(
                  "input grow font-mono text-[15px]",
                  graded && selected && answersMatch(selected, correctKey)
                    ? "answer-input-correct"
                    : graded
                      ? "answer-input-wrong"
                      : "",
                )}
                value={selected ?? ""}
                disabled={lockSelection}
                placeholder="Type your answer…"
                onChange={(e) => onSelect(e.target.value)}
              />
              {graded && (
                <span className="text-[13px] font-semibold text-[#238a5e]">
                  Answer: {formatAcceptedAnswer(correctKey)}
                </span>
              )}
            </div>
          </div>
        )}

        {graded && showExplanation && question.explanation && (
          <div className="answer-explanation rounded-[6px] border p-4 sm:p-5">
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#238a5e]">Explanation</p>
            <SafeHtml html={question.explanation} className="sat-content text-[14px]" />
          </div>
        )}
      </div>

      {/* Floating highlight color tooltip for selections outside explicit highlight mode */}
      {floatingMenu.visible && (
        <div
          ref={floatingRef}
          role="toolbar"
          aria-label="Highlight selection"
          className="highlight-floating-menu"
          style={{
            position: "fixed",
            left: floatingMenu.x,
            top: floatingMenu.y,
            transform: "translate(-50%, -100%)",
            zIndex: 80,
          }}
        >
          <span className="highlight-floating-label">
            <Highlighter className="h-3 w-3" /> Highlight
          </span>
          {(["yellow", "red", "blue"] as const).map((color) => (
            <button
              key={color}
              type="button"
              className={cn("highlight-swatch", `highlight-swatch-${color}`, "!min-h-7 !px-2.5 !py-1 !text-[11px]")}
              onMouseDown={(e) => {
                // Keep the selection alive through the click.
                e.preventDefault();
              }}
              onClick={() => applyColorToCurrentSelection(color)}
            >
              {color}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

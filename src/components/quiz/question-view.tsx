"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Ban, CheckCircle2, Highlighter, MousePointer2, XCircle } from "lucide-react";
import { SafeHtml } from "@/components/ui/safe-html";
import { AiDisclosure } from "@/components/ai-disclosure";
import { useSettings } from "@/components/settings-provider";
import { answersMatch, cn, resolveCorrectAnswer } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

type HighlightColor = "yellow" | "red" | "blue";

/**
 * Name of the CSS Custom Highlight used to keep the user's selection visible
 * after we clear the native selection. Clearing the native selection is what
 * suppresses built-in browser popups (Opera GX's copy/search overlay,
 * Chrome/Edge touch bubbles, …) — the browser has nothing selected anymore,
 * while our ::highlight() rule keeps the text visually selected.
 */
const PENDING_HIGHLIGHT_NAME = "sat-pending-selection";

type HighlightRegistryLike = { set: (name: string, h: unknown) => void; delete: (name: string) => void };

function getHighlightRegistry(): HighlightRegistryLike | null {
  if (typeof window === "undefined") return null;
  const css = window.CSS as unknown as { highlights?: HighlightRegistryLike };
  const HighlightCtor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!css?.highlights || !HighlightCtor) return null;
  return css.highlights;
}

function setPendingSelectionHighlight(range: Range): boolean {
  const registry = getHighlightRegistry();
  const HighlightCtor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!registry || !HighlightCtor) return false;
  try {
    registry.set(PENDING_HIGHLIGHT_NAME, new HighlightCtor(range.cloneRange()));
    return true;
  } catch {
    return false;
  }
}

function clearPendingSelectionHighlight() {
  try {
    getHighlightRegistry()?.delete(PENDING_HIGHLIGHT_NAME);
  } catch {
    /* no-op */
  }
}

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
  onOverrideCorrect,
  highlighterSlot,
}: {
  question: SATQuestion;
  selected: string | undefined;
  onSelect: (answer: string) => void;
  graded: boolean;
  lockSelection?: boolean;
  showExplanation?: boolean;
  onOverrideCorrect?: () => void;
  /**
   * Optional element to render the highlighter controls into.
   *
   * When the runner hides the difficulty / category badges there is room in
   * the existing quiz control group, so it passes that node here and the
   * highlighter becomes just another tool in the shared toolbar instead of
   * getting a bar of its own. When the badges are visible the slot is omitted
   * and the highlighter keeps its own row so the controls don't crowd.
   */
  highlighterSlot?: HTMLElement | null;
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
    place: "above" | "below";
  }>({ x: 0, y: 0, visible: false, place: "above" });
  const floatingRef = React.useRef<HTMLDivElement>(null);
  /** Selection kept alive after the native selection is cleared (popup override). */
  const pendingRangeRef = React.useRef<Range | null>(null);

  // Reset eliminations when the question changes.
  if (prevQuestionId !== question.id) {
    setPrevQuestionId(question.id);
    setEliminated({});
    setHighlightColor(null);
    setFloatingMenu({ x: 0, y: 0, visible: false, place: "above" });
  }

  const hideFloating = React.useCallback(() => {
    pendingRangeRef.current = null;
    clearPendingSelectionHighlight();
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
      // The live selection may already be gone (we clear it to suppress the
      // browser's own selection popup) — fall back to the preserved range.
      const range = getValidSelectionRange() ?? pendingRangeRef.current;
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

  /**
   * Compute and apply the menu position for a range.
   *
   * Positions against the *actual selection geometry* in viewport coordinates
   * (the menu is `position: fixed`). Multi-line selections report one rect per
   * line, so we anchor on the first line when placing above and the last line
   * when placing below — the menu then hugs the text edge it points at instead
   * of drifting to the bounding box of the whole paragraph.
   *
   * Shared by the initial show and by scroll/resize repositioning.
   */
  const repositionFloatingForRange = React.useCallback((range: Range) => {
    const clientRects = Array.from(range.getClientRects()).filter((r) => r.width > 0 || r.height > 0);
    const firstRect = clientRects[0] ?? range.getBoundingClientRect();
    const lastRect = clientRects[clientRects.length - 1] ?? firstRect;
    if (!firstRect || (firstRect.width === 0 && firstRect.height === 0)) return false;

    const pad = 8;
    const gap = 8;
    const menuW = floatingRef.current?.offsetWidth || 220;
    const menuH = floatingRef.current?.offsetHeight || 44;
    const viewportW = document.documentElement.clientWidth || window.innerWidth;
    const viewportH = document.documentElement.clientHeight || window.innerHeight;

    const roomAbove = firstRect.top;
    const roomBelow = viewportH - lastRect.bottom;
    // Prefer above; flip below when the selection is near the top. If neither
    // side fits (short viewports / mobile keyboards) use the roomier one.
    let placeAbove = roomAbove >= menuH + gap + pad;
    if (!placeAbove && roomBelow < menuH + gap + pad) placeAbove = roomAbove >= roomBelow;

    const anchor = placeAbove ? firstRect : lastRect;
    // Center on the anchored line, then clamp so the menu can never be clipped
    // by either viewport edge — including narrow phones where the menu is
    // wider than the selection itself.
    const centerX = anchor.left + anchor.width / 2;
    const halfW = Math.min(menuW, viewportW - pad * 2) / 2;
    const x = Math.min(Math.max(pad + halfW, centerX), viewportW - pad - halfW);
    // `y` is the menu's bottom edge when above, top edge when below.
    const y = placeAbove
      ? Math.max(menuH + pad, anchor.top - gap)
      : Math.min(viewportH - menuH - pad, anchor.bottom + gap);

    setFloatingMenu({ x, y, visible: true, place: placeAbove ? "above" : "below" });
    return true;
  }, []);

  /** Show the 3-color menu for the current selection. */
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
    if (!repositionFloatingForRange(range)) {
      hideFloating();
      return;
    }

    // Preserve the range, then clear the native selection so the browser's
    // built-in selection popup (Opera GX copy/search overlay, etc.) never
    // appears. A CSS custom highlight keeps the text visually selected.
    pendingRangeRef.current = range.cloneRange();
    if (setPendingSelectionHighlight(range)) {
      window.getSelection()?.removeAllRanges();
    }
  }, [getValidSelectionRange, hideFloating, highlightColor, repositionFloatingForRange]);

  // Suppress browser context menu + Chrome/Edge "Search / Copy / Translate"
  // selection toolbar while selecting inside question content.
  React.useEffect(() => {
    const root = highlightRootRef.current;
    if (!root) return;
    const onContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && root.contains(asElement(selection.anchorNode))) {
        e.preventDefault();
        e.stopPropagation();
        if (!highlightColor) showFloatingForSelection();
      }
    };
    // pointerup capture helps beat the browser's delayed selection UI.
    const onSelectStart = () => {
      // no-op; marks the region as handled for some engines
    };
    root.addEventListener("contextmenu", onContextMenu);
    root.addEventListener("selectstart", onSelectStart);
    return () => {
      root.removeEventListener("contextmenu", onContextMenu);
      root.removeEventListener("selectstart", onSelectStart);
    };
  }, [highlightColor, question.id, showFloatingForSelection]);

  // Hide native selection bubbles on the document while our menu is up.
  React.useEffect(() => {
    if (!floatingMenu.visible) return;
    const block = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", block, true);
    return () => document.removeEventListener("contextmenu", block, true);
  }, [floatingMenu.visible]);

  // Never leave a stale custom highlight behind (question change / unmount).
  React.useEffect(() => {
    return () => clearPendingSelectionHighlight();
  }, [question.id]);

  // Dismiss on outside click / Escape; follow the selection on scroll & resize.
  React.useEffect(() => {
    if (!floatingMenu.visible) return;
    const onPointerDown = (e: PointerEvent) => {
      if (floatingRef.current?.contains(e.target as Node)) return;
      hideFloating();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideFloating();
    };
    /**
     * Scrolling used to dismiss the menu. Because the range is preserved
     * (`pendingRangeRef`), we can simply re-measure and keep the menu glued to
     * the text instead — and only give up if the selection scrolls out of view.
     */
    const reposition = () => {
      const range = pendingRangeRef.current;
      if (!range) {
        hideFloating();
        return;
      }
      const rect = range.getBoundingClientRect();
      const viewportH = document.documentElement.clientHeight || window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewportH) {
        hideFloating();
        return;
      }
      repositionFloatingForRange(range);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [floatingMenu.visible, hideFloating, repositionFloatingForRange]);

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

  /**
   * Touch devices do not fire a usable mouseup for selection handles, so mirror
   * the mouseup behaviour on touchend. Deferred twice (rAF + timeout) because
   * mobile engines finalise the selection after the touch sequence ends.
   */
  const onRootTouchEnd = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement | null)?.closest("button, input, textarea, select, a")) return;
    if (highlightColor) {
      window.requestAnimationFrame(() => applyHighlight());
      return;
    }
    window.setTimeout(() => showFloatingForSelection(), 60);
  };

  const pickHighlightColor = (color: HighlightColor) => {
    setHighlightColor((current) => (current === color ? null : color));
    hideFloating();
  };
  const clearHighlightTool = () => {
    setHighlightColor(null);
    hideFloating();
  };

  /**
   * Highlighter controls. `inline` is the compact form used when they are
   * portaled into the shared quiz toolbar; otherwise they render in their own
   * bar above the question. Both forms expose the same three colors and the
   * cursor (off) toggle.
   */
  const highlighterControls = (inline: boolean) => (
    <div
      role="group"
      aria-label="Highlighter"
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        inline
          ? "rounded-[6px] border border-[var(--line-soft)] bg-[var(--paper-soft)]/70 px-1.5 py-1"
          : "gap-2 rounded-[7px] border border-[var(--line-soft)] bg-[var(--paper-soft)]/60 p-2",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--ink-faint)]",
          inline ? "text-[10.5px]" : "text-[11.5px]",
        )}
      >
        <Highlighter className="h-3.5 w-3.5" />
        {/* Label collapses on narrow screens so the shared toolbar stays usable. */}
        <span className={inline ? "hidden lg:inline" : undefined}>Highlighter</span>
      </span>
      {(["yellow", "red", "blue"] as const).map((color) => (
        <button
          key={color}
          type="button"
          title={`Highlight ${color}`}
          aria-label={`Highlight ${color}`}
          aria-pressed={highlightColor === color}
          onClick={() => pickHighlightColor(color)}
          className={cn(
            "highlight-swatch",
            `highlight-swatch-${color}`,
            highlightColor === color && "is-active",
            // Inline: color chips only — the word would make the bar too wide.
            inline && "!min-h-6 !w-6 !p-0 !text-[0px]",
          )}
        >
          {color}
        </button>
      ))}
      <button
        type="button"
        title="Turn the highlighter off"
        onClick={clearHighlightTool}
        className={cn(
          "btn btn-ghost",
          inline ? "!min-h-6 !px-1.5 !py-0.5 !text-[11px]" : "!min-h-7 !px-2.5 !py-1 !text-[11.5px]",
        )}
      >
        <MousePointer2 className="h-3.5 w-3.5" />
        <span className={inline ? "hidden xl:inline" : undefined}>Cursor</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Merged into the quiz control group when a slot is provided (badges
          hidden), otherwise shown as its own bar. */}
      {highlighterSlot
        ? ReactDOM.createPortal(highlighterControls(true), highlighterSlot)
        : highlighterControls(false)}

      <div
        key={question.id}
        ref={highlightRootRef}
        onMouseDown={onRootMouseDown}
        onMouseUp={onRootMouseUp}
        onTouchEnd={onRootTouchEnd}
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
                <span className="text-[13px] font-semibold text-[var(--good)]">
                  Answer: {formatAcceptedAnswer(correctKey)}
                </span>
              )}
            </div>
          </div>
        )}

        {graded && showExplanation && question.explanation && (
          <div className="answer-explanation rounded-[6px] border p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--good)]">Explanation</p>
              {onOverrideCorrect && selected && !answersMatch(selected, correctKey) && (
                <button
                  type="button"
                  onClick={onOverrideCorrect}
                  className="btn btn-soft !min-h-7 !px-2.5 !py-1 !text-[11px]"
                >
                  I was actually right
                </button>
              )}
            </div>
            <SafeHtml html={question.explanation} className="sat-content text-[14px]" />
            <AiDisclosure compact className="mt-3 border-t border-[color-mix(in_srgb,var(--good)_25%,var(--line-soft))] pt-2.5" />
          </div>
        )}
      </div>

      {/* Floating highlight color tooltip — portaled coords are viewport-fixed */}
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
            // Above the selection: y is the menu's bottom edge.
            // Below the selection: y is the menu's top edge.
            transform: floatingMenu.place === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            zIndex: 9990,
            pointerEvents: "auto",
          }}
        >
          <span className="highlight-floating-label">
            <Highlighter className="h-3 w-3" /> <span>Highlight</span>
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

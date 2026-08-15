"use client";

import * as React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";

/**
 * Marks that the tour has been completed. The tour no longer auto-opens on a
 * first visit, so this is only used to keep the "Replay the intro tutorial"
 * action in Settings honest (it clears the flag before re-opening).
 */
const STORAGE_KEY = "sat-nexus-tutorial-done-v1";

type Step = {
  /** CSS selector to spotlight. Falls back to centered bubble when missing. */
  selector?: string;
  title: string;
  body: string;
  /** Where the bubble sits relative to the target. */
  placement?: "right" | "left" | "top" | "bottom" | "center";
};

const STEPS: Step[] = [
  {
    title: "Welcome to SAT Nexus!",
    body: "This quick tour shows you around. You can skip it at any time — restart it later from Settings.",
    placement: "center",
  },
  {
    selector: "[data-tour='sidebar']",
    title: "Navigation",
    body: "Everything lives here: the study desk, question bank, quizzes, practice tests, collections, and analytics. Hover to expand it.",
    placement: "right",
  },
  {
    selector: "[data-tour='palette']",
    title: "Jump anywhere",
    body: "Press Ctrl+K (or /) at any time to open the command palette and fly to any page.",
    placement: "right",
  },
  {
    selector: "[data-tour='account']",
    title: "Your account",
    body: "Sign in to sync favorites, collections, analytics, and leaderboard placement across devices.",
    placement: "right",
  },
  {
    selector: "[data-tour='settings']",
    title: "Make it yours",
    body: "Themes, text size, passage layout, focus mode, and the math canvas options all live in Settings.",
    placement: "right",
  },
  {
    title: "That's it — good luck!",
    body: "Start with a practice quiz or browse the question bank. You've got this.",
    placement: "center",
  },
];

export function markTutorialSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch { /* ignore */ }
}

export function resetTutorial() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function IntroTutorial({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  /**
   * The tour is **opt-in only**.
   *
   * It used to auto-open on a first visit to "/", which interrupted people
   * before they had seen the product. It now opens solely when something asks
   * for it — Settings → "Replay the intro tutorial" dispatches
   * `sat-start-tutorial`, which sets `forceOpen`. The tour itself is unchanged.
   */
  React.useEffect(() => {
    if (!forceOpen) return;
    // The spotlight positions against desktop chrome (sidebar, palette), so
    // keep it off narrow viewports.
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    const timer = window.setTimeout(() => {
      setStep(0);
      setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [forceOpen]);

  const current = STEPS[step];

  // Track the highlighted element's position.
  React.useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (!current?.selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(current.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, current?.selector]);

  const finish = React.useCallback(() => {
    markTutorialSeen();
    setOpen(false);
    setStep(0);
    onClose?.();
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight" || event.key === "Enter") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (event.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !current) return null;

  const pad = 8;
  const hole = rect
    ? {
        left: Math.max(0, rect.left - pad),
        top: Math.max(0, rect.top - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const placement = hole ? current.placement ?? "right" : "center";

  let bubbleStyle: React.CSSProperties = {};
  let arrowStyle: React.CSSProperties | null = null;
  let ArrowIcon = ArrowLeft;

  if (!hole || placement === "center") {
    bubbleStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  } else if (placement === "right") {
    bubbleStyle = { left: hole.left + hole.width + 22, top: Math.min(Math.max(16, hole.top), window.innerHeight - 220) };
    arrowStyle = { left: hole.left + hole.width + 16, top: hole.top + Math.min(hole.height / 2, 40), transform: "rotate(-45deg)" };
    ArrowIcon = ArrowLeft;
  } else if (placement === "left") {
    bubbleStyle = { right: window.innerWidth - hole.left + 22, top: Math.max(16, hole.top) };
    arrowStyle = { left: hole.left - 22, top: hole.top + Math.min(hole.height / 2, 40), transform: "rotate(135deg)" };
    ArrowIcon = ArrowRight;
  } else if (placement === "bottom") {
    bubbleStyle = { left: Math.min(Math.max(16, hole.left), window.innerWidth - 340), top: hole.top + hole.height + 22 };
    arrowStyle = { left: hole.left + hole.width / 2, top: hole.top + hole.height + 14, transform: "rotate(45deg)" };
    ArrowIcon = ArrowUp;
  } else {
    bubbleStyle = { left: Math.min(Math.max(16, hole.left), window.innerWidth - 340), bottom: window.innerHeight - hole.top + 22 };
    arrowStyle = { left: hole.left + hole.width / 2, top: hole.top - 22, transform: "rotate(-135deg)" };
    ArrowIcon = ArrowDown;
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="Website tutorial">
      {hole ? (
        <div className="tutorial-hole" style={hole} />
      ) : (
        <div className="tutorial-shade" style={{ background: "rgba(10, 12, 18, 0.72)" }} onClick={finish} />
      )}

      {arrowStyle && <div className="tutorial-arrow" style={arrowStyle} aria-hidden />}

      <div className="tutorial-bubble" style={bubbleStyle}>
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-[17px] font-bold text-[var(--ink)]">
            {hole && <ArrowIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
            {current.title}
          </p>
          <button type="button" onClick={finish} aria-label="Skip tutorial" className="rounded p-1 text-[var(--ink-faint)] hover:bg-[var(--paper-soft)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[var(--ink-faint)]">
            {step + 1} / {STEPS.length}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={finish}>
              Skip
            </button>
            {step > 0 && (
              <button type="button" className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={() => setStep((s) => s + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="btn btn-primary !min-h-8 !px-3 !py-1.5 !text-[12px]" onClick={finish}>
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

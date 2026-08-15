"use client";

import * as React from "react";

/**
 * Open/close state for the Math-only floating tools (Desmos, Math Canvas).
 *
 * The bug this fixes: both runners used to keep `desmosOpen === true` while
 * merely *gating the render* with `open={desmosOpen && domain === "Math"}`.
 * Navigating to an English question hid the calculator but left the state set,
 * so the next Math question silently re-opened it. The user never asked for
 * that — the app was treating "Desmos was open before" as "open Desmos now".
 *
 * Here, leaving a Math question actually **closes** the tools. Re-opening is
 * only ever the result of the user clicking the control, which calls
 * `openDesmos()` / `openCanvas()`.
 */
export function useMathTools(domain: string | undefined) {
  const isMath = domain === "Math";

  const [desmosOpen, setDesmosOpen] = React.useState(false);
  const [canvasOpen, setCanvasOpen] = React.useState(false);
  /** Bumped on each explicit open so the calculator re-centers itself. */
  const [desmosRestoreRequest, setDesmosRestoreRequest] = React.useState(0);

  // Landing on a non-Math question discards any previous open state, so it can
  // never be replayed when the student returns to Math. Deferred to a timeout
  // (repo convention) so the reset doesn't cascade renders inside the effect.
  React.useEffect(() => {
    if (isMath) return;
    const reset = window.setTimeout(() => {
      setDesmosOpen(false);
      setCanvasOpen(false);
    }, 0);
    return () => window.clearTimeout(reset);
  }, [isMath]);

  const openDesmos = React.useCallback(() => {
    setDesmosOpen(true);
    setDesmosRestoreRequest((n) => n + 1);
  }, []);
  const closeDesmos = React.useCallback(() => setDesmosOpen(false), []);
  const openCanvas = React.useCallback(() => setCanvasOpen(true), []);
  const closeCanvas = React.useCallback(() => setCanvasOpen(false), []);

  return {
    isMath,
    /** True only while the user has intentionally opened it on a Math question. */
    desmosOpen: desmosOpen && isMath,
    canvasOpen: canvasOpen && isMath,
    desmosRestoreRequest,
    openDesmos,
    closeDesmos,
    openCanvas,
    closeCanvas,
  };
}

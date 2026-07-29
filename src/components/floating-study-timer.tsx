"use client";

import * as React from "react";
import { GripHorizontal, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import Counter from "@/components/react-bits/Counter";
import { STUDY_TIMER_OPEN_EVENT } from "@/lib/study-timer";

const PRESETS = [15, 25, 45, 60];

function placeValuesForLength(length: number) {
  return Array.from({ length }, (_, index) => 10 ** (length - index - 1));
}

function RollingClock({ totalSeconds, fontSize, textClassName }: { totalSeconds: number; fontSize: number; textClassName?: string }) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  const minutePlaces = placeValuesForLength(Math.max(2, String(minutes).length));

  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${textClassName ?? ""}`}>
      <Counter
        value={minutes}
        fontSize={fontSize}
        padding={0}
        gap={0}
        horizontalPadding={0}
        places={minutePlaces}
        gradientHeight={0}
        gradientFrom="transparent"
        gradientTo="transparent"
      />
      <span>:</span>
      <Counter
        value={seconds}
        fontSize={fontSize}
        padding={0}
        gap={0}
        horizontalPadding={0}
        places={[10, 1]}
        gradientHeight={0}
        gradientFrom="transparent"
        gradientTo="transparent"
      />
    </span>
  );
}

/**
 * Deadline-based countdown: one timeout per second boundary instead of a
 * busy setInterval + SVG repaint loop. When the tab is hidden we pause the
 * visual updates and recompute remaining time from the deadline on resume,
 * so a background tab does not keep a stopwatch timer awake.
 */
export function FloatingStudyTimer() {
  const { settings } = useSettings();
  const [open, setOpen] = React.useState(false);
  // Minimized by default — just the ticking digits. Expand for presets/controls.
  const [expanded, setExpanded] = React.useState(false);
  const [durationMinutes, setDurationMinutes] = React.useState(25);
  const [remaining, setRemaining] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 24, y: 90 });
  const drag = React.useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const queuedPositionRef = React.useRef(position);
  const dragFrameRef = React.useRef<number | null>(null);
  // Absolute end timestamp (ms) while running; null when paused/stopped.
  const deadlineRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const remainingRef = React.useRef(remaining);

  React.useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  React.useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(STUDY_TIMER_OPEN_EVENT, show);
    return () => window.removeEventListener(STUDY_TIMER_OPEN_EVENT, show);
  }, []);

  React.useEffect(
    () => () => {
      if (dragFrameRef.current != null) window.cancelAnimationFrame(dragFrameRef.current);
    },
    [],
  );

  const clearTick = React.useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finish = React.useCallback(() => {
    clearTick();
    deadlineRef.current = null;
    setRunning(false);
    setRemaining(0);
    if (!settings.soundEffects) return;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      oscillator.frequency.setValueAtTime(880, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.36);
      oscillator.onended = () => void context.close();
    } catch {
      // Audio may be blocked; timer still reaches zero.
    }
  }, [clearTick, settings.soundEffects]);

  const scheduleTick = React.useCallback(() => {
    clearTick();
    const deadline = deadlineRef.current;
    if (deadline == null) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) {
        // Tab is backgrounded — do not keep firing. visibilitychange will resync.
        timerRef.current = null;
        return;
      }
      const msLeft = deadlineRef.current! - Date.now();
      if (msLeft <= 0) {
        finish();
        return;
      }
      const secondsLeft = Math.ceil(msLeft / 1000);
      setRemaining(secondsLeft);
      // Align the next wake-up to the following whole-second boundary.
      const delay = Math.max(50, msLeft - (secondsLeft - 1) * 1000);
      timerRef.current = window.setTimeout(tick, delay);
    };
    tick();
  }, [clearTick, finish]);

  React.useEffect(() => {
    if (!running) {
      clearTick();
      return;
    }
    // Establish / keep deadline from the current remaining value.
    if (deadlineRef.current == null) {
      deadlineRef.current = Date.now() + remainingRef.current * 1000;
    }
    scheduleTick();
    return clearTick;
  }, [running, scheduleTick, clearTick]);

  React.useEffect(() => {
    const onVisibility = () => {
      if (!running || deadlineRef.current == null) return;
      if (document.hidden) {
        clearTick();
        return;
      }
      const msLeft = deadlineRef.current - Date.now();
      if (msLeft <= 0) {
        finish();
        return;
      }
      setRemaining(Math.ceil(msLeft / 1000));
      scheduleTick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [running, clearTick, finish, scheduleTick]);

  const queuePosition = React.useCallback((next: { x: number; y: number }) => {
    queuedPositionRef.current = next;
    if (dragFrameRef.current != null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setPosition(queuedPositionRef.current);
    });
  }, []);

  if (!open) return null;

  const chooseDuration = (minutes: number) => {
    clearTick();
    deadlineRef.current = null;
    setDurationMinutes(minutes);
    setRemaining(minutes * 60);
    setRunning(false);
  };
  const reset = () => {
    clearTick();
    deadlineRef.current = null;
    setRemaining(durationMinutes * 60);
    setRunning(false);
  };
  const toggleRun = () => {
    if (remaining === 0) return;
    if (running) {
      // Pause: freeze remaining from deadline, drop deadline.
      if (deadlineRef.current != null) {
        const msLeft = Math.max(0, deadlineRef.current - Date.now());
        setRemaining(Math.ceil(msLeft / 1000));
      }
      deadlineRef.current = null;
      clearTick();
      setRunning(false);
    } else {
      deadlineRef.current = Date.now() + remainingRef.current * 1000;
      setRunning(true);
    }
  };

  const totalSeconds = durationMinutes * 60;
  const ratio = totalSeconds ? remaining / totalSeconds : 0;
  const circumference = 2 * Math.PI * 76;
  const width = expanded ? 480 : 220;

  return (
    <div
      className="fixed z-[940] overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.28)]"
      style={{ left: position.x, top: position.y, width: `min(${width}px, calc(100vw - 24px))` }}
      role="dialog"
      aria-label="Study countdown timer"
    >
      <div
        className="flex h-11 cursor-move touch-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerId: event.pointerId, x: event.clientX - position.x, y: event.clientY - position.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return;
          queuePosition({
            x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.current.x)),
            y: Math.max(8, Math.min(window.innerHeight - 80, event.clientY - drag.current.y)),
          });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow text-[13px] font-bold text-[var(--ink)]">
          {expanded ? "Study timer" : <RollingClock totalSeconds={remaining} fontSize={16} />}
        </span>
        {!expanded && (
          <button
            type="button"
            className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleRun}
            aria-label={running ? "Pause timer" : "Start timer"}
            disabled={remaining === 0}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? "Minimize timer" : "Expand timer"}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            clearTick();
            deadlineRef.current = null;
            setRunning(false);
            setOpen(false);
          }}
          aria-label="Close timer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Compact strip: progress bar only — no clock face, cheap to paint. */}
      {!expanded && (
        <div className="px-3 pb-3 pt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--paper-deep)]" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{
                width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
                // Only transition while running so pause/reset snaps instantly.
                transition: running ? "width 1s linear" : "none",
              }}
            />
          </div>
          <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-[.14em] text-[var(--ink-faint)]">
            {running ? "focus" : remaining === 0 ? "done" : "paused"}
          </p>
        </div>
      )}

      {expanded && (
        <div className="grid grid-cols-[220px_1fr] gap-4 p-5">
          <div className="relative mx-auto h-[210px] w-[210px]">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="100" cy="100" r="76" fill="none" stroke="var(--paper-deep)" strokeWidth="12" />
              <circle
                cx="100"
                cy="100"
                r="76"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - ratio)}
                style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <RollingClock
                totalSeconds={remaining}
                fontSize={38}
                textClassName="font-display font-bold text-[var(--ink)]"
              />
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--ink-faint)]">
                focus time
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => chooseDuration(minutes)}
                  className={
                    durationMinutes === minutes
                      ? "btn btn-primary !min-h-8 !px-2 !py-1.5 !text-[11px]"
                      : "btn btn-soft !min-h-8 !px-2 !py-1.5 !text-[11px]"
                  }
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary" onClick={toggleRun} disabled={remaining === 0}>
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {running ? "Pause" : "Start"}
              </button>
              <button type="button" className="btn btn-soft" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn btn-ghost !min-h-8 !text-[11px]"
                onClick={() => chooseDuration(Math.max(5, durationMinutes - 5))}
              >
                − 5 min
              </button>
              <button
                type="button"
                className="btn btn-ghost !min-h-8 !text-[11px]"
                onClick={() => chooseDuration(Math.min(180, durationMinutes + 5))}
              >
                + 5 min
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

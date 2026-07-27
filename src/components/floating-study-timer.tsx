"use client";

import * as React from "react";
import { GripHorizontal, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { STUDY_TIMER_OPEN_EVENT } from "@/lib/study-timer";

const PRESETS = [15, 25, 45, 60];

export function FloatingStudyTimer() {
  const { settings } = useSettings();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [durationMinutes, setDurationMinutes] = React.useState(25);
  const [remaining, setRemaining] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 24, y: 90 });
  const drag = React.useRef<{ pointerId: number; x: number; y: number } | null>(null);

  React.useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(STUDY_TIMER_OPEN_EVENT, show);
    return () => window.removeEventListener(STUDY_TIMER_OPEN_EVENT, show);
  }, []);

  React.useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((seconds) => {
        if (seconds > 1) return seconds - 1;
        window.clearInterval(interval);
        setRunning(false);
        if (settings.soundEffects) {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.setValueAtTime(660, context.currentTime);
          oscillator.frequency.setValueAtTime(880, context.currentTime + .12);
          gain.gain.setValueAtTime(.035, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .35);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + .36);
          oscillator.onended = () => void context.close();
        }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, settings.soundEffects]);

  if (!open) return null;

  const chooseDuration = (minutes: number) => {
    setDurationMinutes(minutes);
    setRemaining(minutes * 60);
    setRunning(false);
  };
  const reset = () => {
    setRemaining(durationMinutes * 60);
    setRunning(false);
  };
  const totalSeconds = durationMinutes * 60;
  const ratio = totalSeconds ? remaining / totalSeconds : 0;
  const circumference = 2 * Math.PI * 76;
  const width = expanded ? 480 : 360;

  return (
    <div
      className="fixed z-[940] overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.28)]"
      style={{ left: position.x, top: position.y, width: `min(${width}px, calc(100vw - 24px))` }}
      role="dialog"
      aria-label="Study countdown timer"
    >
      <div
        className="flex h-12 cursor-move touch-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerId: event.pointerId, x: event.clientX - position.x, y: event.clientY - position.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return;
          setPosition({
            x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.current.x)),
            y: Math.max(8, Math.min(window.innerHeight - 280, event.clientY - drag.current.y)),
          });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow text-[13px] font-bold text-[var(--ink)]">Study timer</span>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(event) => event.stopPropagation()} onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Make timer smaller" : "Make timer larger"}>
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]" onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)} aria-label="Close timer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={expanded ? "grid grid-cols-[220px_1fr] gap-4 p-5" : "p-5"}>
        <div className="relative mx-auto h-[210px] w-[210px]">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="100" cy="100" r="76" fill="none" stroke="var(--paper-deep)" strokeWidth="12" />
            <circle cx="100" cy="100" r="76" fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} className="transition-[stroke-dashoffset] duration-300" />
            <line x1="100" y1="100" x2="100" y2="43" stroke="var(--warn)" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: "100px 100px", transform: `rotate(${(60 - (remaining % 60)) * 6}deg)`, transition: "transform .25s linear" }} />
            <circle cx="100" cy="100" r="6" fill="var(--warn)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-4xl font-bold tabular-nums text-[var(--ink)]">
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--ink-faint)]">focus time</span>
          </div>
        </div>

        <div className={expanded ? "flex flex-col justify-center" : "mt-3"}>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((minutes) => (
              <button key={minutes} type="button" onClick={() => chooseDuration(minutes)} className={durationMinutes === minutes ? "btn btn-primary !min-h-8 !px-2 !py-1.5 !text-[11px]" : "btn btn-soft !min-h-8 !px-2 !py-1.5 !text-[11px]"}>{minutes}m</button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setRunning((value) => !value)} disabled={remaining === 0}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {running ? "Pause" : "Start"}
            </button>
            <button type="button" className="btn btn-soft" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-ghost !min-h-8 !text-[11px]" onClick={() => chooseDuration(Math.max(5, durationMinutes - 5))}>− 5 min</button>
            <button type="button" className="btn btn-ghost !min-h-8 !text-[11px]" onClick={() => chooseDuration(Math.min(180, durationMinutes + 5))}>+ 5 min</button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { ExternalLink, GripHorizontal, Loader2, Minus, X } from "lucide-react";

type DesmosCalculator = {
  resize: () => void;
  destroy: () => void;
};

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (element: HTMLElement, options: Record<string, unknown>) => DesmosCalculator;
    };
  }
}

let desmosLoader: Promise<void> | null = null;
function loadDesmosApi() {
  if (window.Desmos) return Promise.resolve();
  if (desmosLoader) return desmosLoader;
  desmosLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-sat-desmos]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Desmos could not be loaded")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.satDesmos = "true";
    script.src = "https://www.desmos.com/api/v1.11/calculator.js?apiKey=desmos";
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Desmos could not be loaded")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    desmosLoader = null;
    throw error;
  });
  return desmosLoader;
}

export function FloatingDesmos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [position, setPosition] = React.useState({ x: 0, y: 80 });
  const [minimized, setMinimized] = React.useState(false);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const drag = React.useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const calculatorRef = React.useRef<DesmosCalculator | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setPosition({ x: Math.max(16, window.innerWidth - 690), y: 76 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!open) {
      calculatorRef.current?.destroy();
      calculatorRef.current = null;
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStatus("loading");
      void loadDesmosApi()
        .then(() => {
          if (cancelled || !containerRef.current || !window.Desmos) return;
          calculatorRef.current?.destroy();
          calculatorRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
            expressions: true,
            expressionsCollapsed: false,
            expressionsTopbar: true,
            keypad: true,
            settingsMenu: true,
            zoomButtons: true,
            pointsOfInterest: true,
            trace: true,
            border: false,
          });
          calculatorRef.current.resize();
          setStatus("ready");
        })
        .catch(() => !cancelled && setStatus("error"));
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open]);

  React.useEffect(() => {
    if (!open || minimized) return;
    const timer = window.setTimeout(() => calculatorRef.current?.resize(), 80);
    return () => window.clearTimeout(timer);
  }, [minimized, open, position]);

  if (!open) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - position.x, offsetY: event.clientY - position.y };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const width = minimized ? 320 : Math.min(660, window.innerWidth - 32);
    const height = minimized ? 48 : Math.min(650, window.innerHeight - 32);
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.current.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - drag.current.offsetY)),
    });
  };

  return (
    <div
      className="fixed z-[950] flex resize flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.32)]"
      style={{ left: position.x, top: position.y, width: minimized ? 320 : "min(660px, calc(100vw - 32px))", height: minimized ? 48 : "min(650px, calc(100vh - 32px))", minWidth: minimized ? 320 : 480, minHeight: minimized ? 48 : 420 }}
      role="dialog"
      aria-label="Desmos graphing calculator"
    >
      <div
        className="flex h-12 shrink-0 cursor-move touch-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow text-[13px] font-bold text-[var(--ink)]">Desmos Graphing Calculator</span>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(event) => event.stopPropagation()} onClick={() => setMinimized((value) => !value)} aria-label={minimized ? "Restore Desmos" : "Minimize Desmos"}>
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]" onPointerDown={(event) => event.stopPropagation()} onClick={onClose} aria-label="Close Desmos">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={minimized ? "invisible h-0 min-h-0" : "relative min-h-0 grow bg-white"}>
        <div ref={containerRef} className="absolute inset-0" />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading calculator…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-8 text-center text-slate-700">
            <p className="text-sm font-semibold">Desmos needs an internet connection to load.</p>
            <a className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 underline" href="https://www.desmos.com/calculator" target="_blank" rel="noreferrer">
              Open Desmos <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

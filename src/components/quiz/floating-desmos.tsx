"use client";

import * as React from "react";
import { ExternalLink, GripHorizontal, Loader2, Maximize2, Minus, RotateCcw, X } from "lucide-react";

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

const DESMOS_API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
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
    // Desmos' documented demonstration key enables the full expression panel.
    // The previous placeholder key was rejected even when desmos.com itself worked.
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(DESMOS_API_KEY)}`;
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

type ResizeDir =
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

const MIN_W = 420;
const MIN_H = 320;

export function FloatingDesmos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [size, setSize] = React.useState({ w: 680, h: 620 });
  const [maximized, setMaximized] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const drag = React.useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const resize = React.useRef<{ pointerId: number; dir: ResizeDir; startX: number; startY: number; startPos: { x: number; y: number }; startSize: { w: number; h: number } } | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const calculatorRef = React.useRef<DesmosCalculator | null>(null);

  // Spawn centered in the viewport.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const w = Math.min(680, Math.max(420, window.innerWidth - 48));
      const h = Math.min(620, Math.max(360, window.innerHeight - 96));
      setSize({ w, h });
      setPosition({ x: Math.max(12, Math.round((window.innerWidth - w) / 2)), y: Math.max(12, Math.round((window.innerHeight - h) / 2)) });
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
  }, [minimized, open, position, size, maximized]);

  if (!open) return null;

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY - position.y };
  };
  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId || maximized) return;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - size.w - 8, event.clientX - drag.current.dx)),
      y: Math.max(8, Math.min(window.innerHeight - size.h - 8, event.clientY - drag.current.dy)),
    });
  };

  const onResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const dir = (event.currentTarget.dataset.dir ?? "se") as ResizeDir;
    event.currentTarget.setPointerCapture(event.pointerId);
    resize.current = { pointerId: event.pointerId, dir, startX: event.clientX, startY: event.clientY, startPos: { ...position }, startSize: { ...size } };
  };
  const onResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const r = resize.current;
    if (!r || r.pointerId !== event.pointerId || maximized) return;
    const dx = event.clientX - r.startX;
    const dy = event.clientY - r.startY;
    let { x, y } = r.startPos;
    let { w, h } = r.startSize;

    if (r.dir.includes("e")) w = Math.max(MIN_W, r.startSize.w + dx);
    if (r.dir.includes("s")) h = Math.max(MIN_H, r.startSize.h + dy);
    if (r.dir.includes("w")) {
      w = Math.max(MIN_W, r.startSize.w - dx);
      x = r.startPos.x + (r.startSize.w - w);
    }
    if (r.dir.includes("n")) {
      h = Math.max(MIN_H, r.startSize.h - dy);
      y = r.startPos.y + (r.startSize.h - h);
    }

    // Clamp within the window.
    const maxW = window.innerWidth - 8;
    const maxH = window.innerHeight - 8;
    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
    if (r.dir.includes("w")) x = Math.max(8, window.innerWidth - w - 8);
    if (r.dir.includes("n")) y = Math.max(8, window.innerHeight - h - 8);
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));

    setSize({ w, h });
    setPosition({ x, y });
  };
  const stopGesture = () => {
    drag.current = null;
    resize.current = null;
  };

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const boxW = maximized ? winW : minimized ? 320 : size.w;
  const boxH = maximized ? winH : minimized ? 48 : size.h;
  const boxX = maximized ? 0 : minimized ? Math.max(8, winW - 336) : position.x;
  const boxY = maximized ? 0 : minimized ? winH - 56 : position.y;

  const resizeHandles: { dir: ResizeDir; className: string }[] = [
    { dir: "e", className: "right-0 top-0 h-full w-2 cursor-ew-resize" },
    { dir: "w", className: "left-0 top-0 h-full w-2 cursor-ew-resize" },
    { dir: "s", className: "bottom-0 left-0 h-2 w-full cursor-ns-resize" },
    { dir: "n", className: "top-0 left-0 h-2 w-full cursor-ns-resize" },
    { dir: "se", className: "right-0 bottom-0 h-5 w-5 cursor-nwse-resize" },
    { dir: "sw", className: "left-0 bottom-0 h-5 w-5 cursor-nesw-resize" },
    { dir: "ne", className: "right-0 top-0 h-5 w-5 cursor-nesw-resize" },
    { dir: "nw", className: "left-0 top-0 h-5 w-5 cursor-nwse-resize" },
  ];

  return (
    <div
      className="fixed z-[950] flex flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.32)]"
      style={{ left: boxX, top: boxY, width: boxW, height: boxH, minWidth: minimized ? 320 : MIN_W, minHeight: minimized ? 48 : MIN_H }}
      role="dialog"
      aria-label="Desmos graphing calculator"
    >
      <div
        className="flex h-12 shrink-0 cursor-move touch-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 select-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={stopGesture}
        onPointerCancel={stopGesture}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow text-[13px] font-bold text-[var(--ink)]">Desmos Graphing Calculator</span>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(event) => event.stopPropagation()} onClick={() => setMaximized((value) => !value)} aria-label={maximized ? "Exit fullscreen" : "Expand to fullscreen"} title={maximized ? "Exit fullscreen" : "Expand to fullscreen"}>
          {maximized ? <RotateCcw className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(event) => event.stopPropagation()} onClick={() => { setMinimized((value) => !value); }} aria-label={minimized ? "Restore Desmos" : "Minimize Desmos"}>
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

      {/* Resize handles — active when not maximized or minimized. */}
      {!maximized && !minimized &&
        resizeHandles.map(({ dir, className }) => (
          <div
            key={dir}
            data-dir={dir}
            className={`absolute z-10 ${className}`}
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={stopGesture}
            onPointerCancel={stopGesture}
          />
        ))}
    </div>
  );
}

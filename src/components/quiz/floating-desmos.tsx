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
  if (typeof window !== "undefined" && window.Desmos) return Promise.resolve();
  if (desmosLoader) return desmosLoader;
  desmosLoader = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("No document"));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-sat-desmos]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Desmos could not be loaded")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.satDesmos = "true";
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

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_W = 380;
const MIN_H = 320;
const MINIMIZED_W = 320;
const MINIMIZED_H = 48;

export function FloatingDesmos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [position, setPosition] = React.useState({ x: 80, y: 80 });
  const [size, setSize] = React.useState({ w: 680, h: 560 });
  const [maximized, setMaximized] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const savedState = React.useRef<{ pos: { x: number; y: number }; size: { w: number; h: number } } | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const calculatorRef = React.useRef<DesmosCalculator | null>(null);

  const dragState = React.useRef<{ pointerId: number; startX: number; startY: number; origPos: { x: number; y: number } } | null>(null);
  const resizeState = React.useRef<{
    pointerId: number;
    dir: ResizeDir;
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
    startSize: { w: number; h: number };
  } | null>(null);

  // Initial centering
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const w = Math.min(720, Math.max(MIN_W, window.innerWidth - 48));
    const h = Math.min(640, Math.max(MIN_H, window.innerHeight - 120));
    setSize({ w, h });
    setPosition({
      x: Math.max(8, Math.round((window.innerWidth - w) / 2)),
      y: Math.max(8, Math.round((window.innerHeight - h) / 2)),
    });
  }, []);

  // Load Desmos when open and not minimized
  React.useEffect(() => {
    if (!open) {
      calculatorRef.current?.destroy();
      calculatorRef.current = null;
      return;
    }
    if (minimized) return; // don't init when minimized
    let cancelled = false;
    setStatus("loading");
    const timer = window.setTimeout(() => {
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
          requestAnimationFrame(() => {
            calculatorRef.current?.resize();
            setStatus("ready");
          });
        })
        .catch(() => !cancelled && setStatus("error"));
    }, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, minimized]);

  // Resize calculator on size/pos changes
  React.useEffect(() => {
    if (!open || minimized) return;
    const t = window.setTimeout(() => calculatorRef.current?.resize(), 80);
    return () => window.clearTimeout(t);
  }, [open, minimized, position, size, maximized]);

  // Handle resize when exiting minimized
  React.useEffect(() => {
    if (!open || minimized) return;
    const t = window.setTimeout(() => calculatorRef.current?.resize(), 120);
    return () => window.clearTimeout(t);
  }, [minimized, open]);

  // Global drag handling
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Dragging window?
      if (dragState.current && dragState.current.pointerId === e.pointerId) {
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        let nx = dragState.current.origPos.x + dx;
        let ny = dragState.current.origPos.y + dy;

        // Allow moving anywhere, but keep header somewhat visible (don't let it go completely off-screen)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const curW = minimized ? MINIMIZED_W : maximized ? vw : size.w;
        const curH = minimized ? MINIMIZED_H : maximized ? vh : size.h;

        // Keep at least 80px of bar visible
        const visibleGuard = 80;
        nx = Math.max(-curW + visibleGuard, Math.min(vw - visibleGuard, nx));
        ny = Math.max(0, Math.min(vh - 40, ny));

        setPosition({ x: nx, y: ny });
      }

      // Resizing?
      if (resizeState.current && resizeState.current.pointerId === e.pointerId && !maximized && !minimized) {
        const r = resizeState.current;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
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

        const maxW = window.innerWidth - 16;
        const maxH = window.innerHeight - 16;
        w = Math.min(w, maxW);
        h = Math.min(h, maxH);
        x = Math.max(-w + 100, Math.min(window.innerWidth - 100, x));
        y = Math.max(0, Math.min(window.innerHeight - 60, y));

        setSize({ w, h });
        setPosition({ x, y });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (dragState.current && dragState.current.pointerId === e.pointerId) dragState.current = null;
      if (resizeState.current && resizeState.current.pointerId === e.pointerId) resizeState.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [maximized, minimized, size.w, size.h]);

  if (!open) return null;

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    // Allow dragging even when minimized, block when maximized
    if (maximized) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origPos: { ...position },
    };
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (maximized || minimized) return;
    e.preventDefault();
    e.stopPropagation();
    const dir = (e.currentTarget.dataset.dir ?? "se") as ResizeDir;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeState.current = {
      pointerId: e.pointerId,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...position },
      startSize: { ...size },
    };
  };

  const toggleMaximize = () => {
    if (maximized) {
      // Restore
      setMaximized(false);
      if (savedState.current) {
        setPosition(savedState.current.pos);
        setSize(savedState.current.size);
        savedState.current = null;
      }
    } else {
      // Save and maximize
      if (minimized) {
        setMinimized(false);
      }
      savedState.current = { pos: { ...position }, size: { ...size } };
      setMaximized(true);
      setPosition({ x: 0, y: 0 });
    }
  };

  const toggleMinimize = () => {
    if (minimized) {
      // Restore
      setMinimized(false);
      if (savedState.current) {
        setPosition(savedState.current.pos);
        setSize(savedState.current.size);
        savedState.current = null;
      } else {
        // Fallback center
        const w = 680;
        const h = 560;
        setPosition({
          x: Math.max(8, Math.round((window.innerWidth - w) / 2)),
          y: Math.max(8, Math.round((window.innerHeight - h) / 2)),
        });
      }
    } else {
      // If maximized, first exit maximized, then minimize
      if (maximized) {
        setMaximized(false);
        if (savedState.current) {
          // Use saved as before maximize, then minimize from there
          const toSave = savedState.current;
          savedState.current = { pos: { ...toSave.pos }, size: { ...toSave.size } };
          setPosition(toSave.pos);
          setSize(toSave.size);
        }
      } else {
        savedState.current = { pos: { ...position }, size: { ...size } };
      }

      // Move to bottom-right but not off-screen requiring scroll
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPosition({
        x: Math.max(8, vw - MINIMIZED_W - 16),
        y: Math.max(8, vh - MINIMIZED_H - 16),
      });
      setMinimized(true);
    }
  };

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const boxW = maximized ? vw : minimized ? MINIMIZED_W : size.w;
  const boxH = maximized ? vh : minimized ? MINIMIZED_H : size.h;
  const boxX = maximized ? 0 : position.x;
  const boxY = maximized ? 0 : position.y;

  const resizeHandles: { dir: ResizeDir; className: string }[] = [
    { dir: "e", className: "right-0 top-0 h-full w-1.5 cursor-ew-resize" },
    { dir: "w", className: "left-0 top-0 h-full w-1.5 cursor-ew-resize" },
    { dir: "s", className: "bottom-0 left-0 h-1.5 w-full cursor-ns-resize" },
    { dir: "n", className: "top-0 left-0 h-1.5 w-full cursor-ns-resize" },
    { dir: "se", className: "right-0 bottom-0 h-4 w-4 cursor-nwse-resize" },
    { dir: "sw", className: "left-0 bottom-0 h-4 w-4 cursor-nesw-resize" },
    { dir: "ne", className: "right-0 top-0 h-4 w-4 cursor-nesw-resize" },
    { dir: "nw", className: "left-0 top-0 h-4 w-4 cursor-nwse-resize" },
  ];

  return (
    <div
      className={`fixed z-[950] flex flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.32)] ${maximized ? "rounded-none" : ""}`}
      style={{
        left: boxX,
        top: boxY,
        width: boxW,
        height: boxH,
        // Ensure minimized can be dragged anywhere
        ...(maximized ? { inset: 0, width: "100vw", height: "100vh" } : {}),
      }}
      role="dialog"
      aria-label="Desmos graphing calculator"
    >
      <div
        className={`flex h-12 shrink-0 touch-none select-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 ${maximized ? "cursor-default" : "cursor-move"}`}
        onPointerDown={handleDragStart}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow truncate text-[13px] font-bold text-[var(--ink)]">Desmos Graphing Calculator</span>
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleMaximize}
          aria-label={maximized ? "Exit fullscreen" : "Expand to fullscreen"}
          title={maximized ? "Exit fullscreen" : "Expand to fullscreen"}
        >
          {maximized ? <RotateCcw className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleMinimize}
          aria-label={minimized ? "Restore Desmos" : "Minimize Desmos"}
          title={minimized ? "Restore" : "Minimize"}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          aria-label="Close Desmos"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!minimized && (
        <div className="relative min-h-0 grow bg-white">
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
      )}

      {/* Minimized chip content */}
      {minimized && (
        <div className="flex h-[48px] items-center gap-2 px-3 text-[12px] text-[var(--ink-faint)]">
          <span className="truncate">Minimized – drag to move, click expand to restore</span>
        </div>
      )}

      {/* Resize handles — only when not maximized or minimized */}
      {!maximized && !minimized &&
        resizeHandles.map(({ dir, className }) => (
          <div
            key={dir}
            data-dir={dir}
            className={`absolute z-10 ${className}`}
            onPointerDown={handleResizeStart}
          />
        ))}
    </div>
  );
}

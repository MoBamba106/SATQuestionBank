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
const MINIMIZED_W = 300;
const MINIMIZED_H = 44;

function getCentered(width: number, height: number) {
  if (typeof window === "undefined") return { x: 80, y: 80, w: width, h: height };
  const w = Math.min(width, Math.max(MIN_W, window.innerWidth - 32));
  const h = Math.min(height, Math.max(MIN_H, window.innerHeight - 32));
  return {
    x: Math.max(4, Math.round((window.innerWidth - w) / 2)),
    y: Math.max(4, Math.round((window.innerHeight - h) / 2)),
    w,
    h,
  };
}

export function FloatingDesmos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [position, setPosition] = React.useState(() => {
    const c = getCentered(680, 560);
    return { x: c.x, y: c.y };
  });
  const [size, setSize] = React.useState(() => {
    const c = getCentered(680, 560);
    return { w: c.w, h: c.h };
  });
  const [maximized, setMaximized] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const saved = React.useRef<{ pos: { x: number; y: number }; size: { w: number; h: number } } | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const calcRef = React.useRef<DesmosCalculator | null>(null);

  const dragRef = React.useRef<{ pid: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = React.useRef<{ pid: number; dir: ResizeDir; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

  // Ensure centered on first client mount (useLayoutEffect avoids flicker)
  React.useLayoutEffect(() => {
    const c = getCentered(680, 560);
    setPosition({ x: c.x, y: c.y });
    setSize({ w: c.w, h: c.h });
  }, []);

  // Load / recreate calculator
  React.useEffect(() => {
    if (!open) {
      calcRef.current?.destroy();
      calcRef.current = null;
      return;
    }
    if (minimized) {
      // When going minimized, destroy to avoid gray artifact on restore
      calcRef.current?.destroy();
      calcRef.current = null;
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const t = window.setTimeout(() => {
      void loadDesmosApi()
        .then(() => {
          if (cancelled || !containerRef.current || !window.Desmos) return;
          calcRef.current?.destroy();
          calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
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
            if (cancelled) return;
            calcRef.current?.resize();
            setStatus("ready");
          });
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, minimized]);

  // Resize on size change
  React.useEffect(() => {
    if (!open || minimized || maximized) return;
    const t = window.setTimeout(() => calcRef.current?.resize(), 60);
    return () => window.clearTimeout(t);
  }, [open, minimized, maximized, size]);

  // When exiting maximized or minimized, force resize
  React.useEffect(() => {
    if (!open || minimized) return;
    const t = window.setTimeout(() => calcRef.current?.resize(), 120);
    return () => window.clearTimeout(t);
  }, [maximized, minimized, open]);

  // Global pointer handlers
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragRef.current && dragRef.current.pid === e.pointerId) {
        const dx = e.clientX - dragRef.current.sx;
        const dy = e.clientY - dragRef.current.sy;
        let nx = dragRef.current.ox + dx;
        let ny = dragRef.current.oy + dy;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Allow anywhere, keep header visible
        nx = Math.max(-MINIMIZED_W + 60, Math.min(vw - 60, nx));
        ny = Math.max(0, Math.min(vh - 36, ny));
        setPosition({ x: nx, y: ny });
      }
      if (resizeRef.current && resizeRef.current.pid === e.pointerId && !maximized && !minimized) {
        const r = resizeRef.current;
        const dx = e.clientX - r.sx;
        const dy = e.clientY - r.sy;
        let x = r.ox;
        let y = r.oy;
        let w = r.ow;
        let h = r.oh;
        if (r.dir.includes("e")) w = Math.max(MIN_W, r.ow + dx);
        if (r.dir.includes("s")) h = Math.max(MIN_H, r.oh + dy);
        if (r.dir.includes("w")) {
          w = Math.max(MIN_W, r.ow - dx);
          x = r.ox + (r.ow - w);
        }
        if (r.dir.includes("n")) {
          h = Math.max(MIN_H, r.oh - dy);
          y = r.oy + (r.oh - h);
        }
        w = Math.min(w, window.innerWidth - 8);
        h = Math.min(h, window.innerHeight - 8);
        x = Math.max(-w + 80, Math.min(window.innerWidth - 80, x));
        y = Math.max(0, Math.min(window.innerHeight - 40, y));
        setSize({ w, h });
        setPosition({ x, y });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragRef.current?.pid === e.pointerId) dragRef.current = null;
      if (resizeRef.current?.pid === e.pointerId) resizeRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [maximized, minimized]);

  if (!open) return null;

  const onDragStart = (e: React.PointerEvent) => {
    if (maximized) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: position.x, oy: position.y };
  };

  const onResizeStart = (e: React.PointerEvent) => {
    if (maximized || minimized) return;
    e.preventDefault();
    e.stopPropagation();
    const dir = ((e.currentTarget as HTMLElement).dataset.dir ?? "se") as ResizeDir;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { pid: e.pointerId, dir, sx: e.clientX, sy: e.clientY, ox: position.x, oy: position.y, ow: size.w, oh: size.h };
  };

  const toggleMax = () => {
    if (maximized) {
      setMaximized(false);
      if (saved.current) {
        setPosition(saved.current.pos);
        setSize(saved.current.size);
        saved.current = null;
      }
    } else {
      // If minimized, first restore
      if (minimized) {
        setMinimized(false);
        // saved will be restored by minimized toggle, but ensure we clear maximized flag after
      }
      saved.current = { pos: { ...position }, size: { ...size } };
      setMaximized(true);
      // Position will be overridden by fullscreen style
    }
  };

  const toggleMin = () => {
    if (minimized) {
      setMinimized(false);
      if (saved.current) {
        setPosition(saved.current.pos);
        setSize(saved.current.size);
        saved.current = null;
      } else {
        const c = getCentered(680, 560);
        setPosition({ x: c.x, y: c.y });
        setSize({ w: c.w, h: c.h });
      }
    } else {
      if (maximized) {
        // Exit maximized first, but keep saved for restore later
        setMaximized(false);
        // saved already holds pre-max size; keep it
        // Move to visible bottom area (fixed)
        setPosition({ x: Math.max(8, window.innerWidth - MINIMIZED_W - 20), y: Math.max(8, window.innerHeight - MINIMIZED_H - 20) });
      } else {
        saved.current = { pos: { ...position }, size: { ...size } };
        setPosition({ x: Math.max(8, window.innerWidth - MINIMIZED_W - 20), y: Math.max(8, window.innerHeight - MINIMIZED_H - 20) });
      }
      setMinimized(true);
    }
  };

  // Compute box style
  let style: React.CSSProperties;
  if (maximized) {
    style = { left: 0, top: 0, width: "100vw", height: "100vh", inset: 0 };
  } else if (minimized) {
    // Fixed bottom-right but still draggable via left/top we maintain
    style = { left: position.x, top: position.y, width: MINIMIZED_W, height: MINIMIZED_H };
  } else {
    style = { left: position.x, top: position.y, width: size.w, height: size.h };
  }

  const resizeHandles: { dir: ResizeDir; cn: string }[] = [
    { dir: "e", cn: "right-0 top-0 h-full w-2 cursor-ew-resize" },
    { dir: "w", cn: "left-0 top-0 h-full w-2 cursor-ew-resize" },
    { dir: "s", cn: "bottom-0 left-0 h-2 w-full cursor-ns-resize" },
    { dir: "n", cn: "top-0 left-0 h-2 w-full cursor-ns-resize" },
    { dir: "se", cn: "right-0 bottom-0 h-5 w-5 cursor-nwse-resize" },
    { dir: "sw", cn: "left-0 bottom-0 h-5 w-5 cursor-nesw-resize" },
    { dir: "ne", cn: "right-0 top-0 h-5 w-5 cursor-nesw-resize" },
    { dir: "nw", cn: "left-0 top-0 h-5 w-5 cursor-nwse-resize" },
  ];

  return (
    <div
      className={`fixed z-[950] flex flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.36)] ${maximized ? "rounded-none" : ""}`}
      style={style}
      role="dialog"
      aria-label="Desmos graphing calculator"
    >
      <div
        className={`flex h-11 shrink-0 select-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 ${maximized ? "cursor-default" : "cursor-move touch-none"}`}
        onPointerDown={onDragStart}
      >
        <GripHorizontal className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
        <span className="grow truncate text-[13px] font-bold text-[var(--ink)]">Desmos</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(e) => e.stopPropagation()} onClick={toggleMax} title={maximized ? "Restore" : "Maximize"}>
            {maximized ? <RotateCcw className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(e) => e.stopPropagation()} onClick={toggleMin} title={minimized ? "Restore" : "Minimize"}>
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="relative min-h-0 flex-1 bg-white">
          <div ref={containerRef} className="absolute inset-0" />
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading calculator…
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-8 text-center text-slate-700">
              <p className="text-sm font-semibold">Desmos needs internet.</p>
              <a className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 underline" href="https://www.desmos.com/calculator" target="_blank" rel="noreferrer">
                Open Desmos <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      )}

      {minimized && (
        <div className="flex h-full items-center justify-between gap-2 px-3">
          <span className="truncate text-[12px] font-semibold text-[var(--ink-faint)]">Desmos minimized – drag me anywhere</span>
          <button type="button" className="btn btn-soft !min-h-7 !px-2.5 !text-[11px]" onPointerDown={(e) => e.stopPropagation()} onClick={toggleMin}>
            Restore
          </button>
        </div>
      )}

      {!maximized && !minimized &&
        resizeHandles.map(({ dir, cn }) => (
          <div key={dir} data-dir={dir} className={`absolute z-10 ${cn}`} onPointerDown={onResizeStart} />
        ))}
    </div>
  );
}

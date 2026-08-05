"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
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

const MIN_W = 420;
const MIN_H = 320;
const MINIMIZED_W = 320;
const MINIMIZED_H = 48;

function centered(w = 680, h = 600) {
  if (typeof window === "undefined") return { x: 80, y: 80, w, h };
  const cw = Math.min(w, Math.max(MIN_W, window.innerWidth - 24));
  const ch = Math.min(h, Math.max(MIN_H, window.innerHeight - 24));
  return {
    x: Math.round((window.innerWidth - cw) / 2),
    y: Math.round((window.innerHeight - ch) / 2),
    w: cw,
    h: ch,
  };
}

export function FloatingDesmos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{ x: number; y: number }>(() => {
    const c = centered();
    return { x: c.x, y: c.y };
  });
  const [size, setSize] = React.useState<{ w: number; h: number }>(() => {
    const c = centered();
    return { w: c.w, h: c.h };
  });
  const [maxed, setMaxed] = React.useState(false);
  const [mined, setMined] = React.useState(false);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const saved = React.useRef<{ pos: { x: number; y: number }; size: { w: number; h: number } } | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const calcRef = React.useRef<DesmosCalculator | null>(null);
  const dragRef = React.useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = React.useRef<{ id: number; dir: ResizeDir; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useLayoutEffect(() => {
    if (!open) return;
    const c = centered(680, 600);
    setPos({ x: c.x, y: c.y });
    setSize({ w: c.w, h: c.h });
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      calcRef.current?.destroy();
      calcRef.current = null;
      return;
    }
    if (mined) {
      calcRef.current?.destroy();
      calcRef.current = null;
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const t = setTimeout(() => {
      loadDesmosApi()
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
            if (!cancelled) {
              calcRef.current?.resize();
              setStatus("ready");
            }
          });
        })
        .catch(() => !cancelled && setStatus("error"));
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, mined, maxed]);

  React.useEffect(() => {
    if (!open || mined) return;
    const t = setTimeout(() => calcRef.current?.resize(), 80);
    return () => clearTimeout(t);
  }, [open, mined, maxed, pos, size]);

  React.useEffect(() => {
    const move = (e: PointerEvent) => {
      if (dragRef.current && dragRef.current.id === e.pointerId) {
        const dx = e.clientX - dragRef.current.sx;
        const dy = e.clientY - dragRef.current.sy;
        let nx = dragRef.current.ox + dx;
        let ny = dragRef.current.oy + dy;
        // keep header visible, allow anywhere including left past question
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        nx = Math.max(-MINIMIZED_W + 80, Math.min(vw - 80, nx));
        ny = Math.max(0, Math.min(vh - 40, ny));
        setPos((p) => ({ ...p, x: nx, y: ny }));
      }
      if (resizeRef.current && resizeRef.current.id === e.pointerId && !maxed && !mined) {
        const r = resizeRef.current;
        const dx = e.clientX - r.sx;
        const dy = e.clientY - r.sy;
        let x = r.ox, y = r.oy, w = r.ow, h = r.oh;
        if (r.dir.includes("e")) w = Math.max(MIN_W, r.ow + dx);
        if (r.dir.includes("s")) h = Math.max(MIN_H, r.oh + dy);
        if (r.dir.includes("w")) { w = Math.max(MIN_W, r.ow - dx); x = r.ox + (r.ow - w); }
        if (r.dir.includes("n")) { h = Math.max(MIN_H, r.oh - dy); y = r.oy + (r.oh - h); }
        w = Math.min(w, window.innerWidth - 8);
        h = Math.min(h, window.innerHeight - 8);
        x = Math.max(-w + 80, Math.min(window.innerWidth - 80, x));
        y = Math.max(0, Math.min(window.innerHeight - 40, y));
        setSize({ w, h });
        setPos({ x, y });
      }
    };
    const up = (e: PointerEvent) => {
      if (dragRef.current?.id === e.pointerId) dragRef.current = null;
      if (resizeRef.current?.id === e.pointerId) resizeRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [maxed, mined]);

  if (!open || !mounted) return null;

  const onDrag = (e: React.PointerEvent) => {
    if (maxed) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onResize = (e: React.PointerEvent) => {
    if (maxed || mined) return;
    e.preventDefault(); e.stopPropagation();
    const dir = ((e.currentTarget as HTMLElement).dataset.dir ?? "se") as ResizeDir;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { id: e.pointerId, dir, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, ow: size.w, oh: size.h };
  };

  const doMax = () => {
    if (maxed) {
      setMaxed(false);
      if (saved.current) {
        setPos(saved.current.pos);
        setSize(saved.current.size);
        saved.current = null;
      }
    } else {
      if (mined) setMined(false);
      saved.current = { pos: { ...pos }, size: { ...size } };
      setMaxed(true);
    }
  };
  const doMin = () => {
    if (mined) {
      setMined(false);
      if (saved.current) {
        setPos(saved.current.pos);
        setSize(saved.current.size);
        saved.current = null;
      } else {
        const c = centered(680, 600);
        setPos({ x: c.x, y: c.y });
        setSize({ w: c.w, h: c.h });
      }
    } else {
      if (maxed) {
        setMaxed(false);
      } else {
        saved.current = { pos: { ...pos }, size: { ...size } };
      }
      // place at bottom-right visible without scroll
      setPos({ x: Math.max(8, window.innerWidth - MINIMIZED_W - 12), y: Math.max(8, window.innerHeight - MINIMIZED_H - 12) });
      setMined(true);
    }
  };

  const style: React.CSSProperties = maxed
    ? { left: 0, top: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }
    : mined
    ? { left: pos.x, top: pos.y, width: MINIMIZED_W, height: MINIMIZED_H }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  const handles: { dir: ResizeDir; cn: string }[] = [
    { dir: "e", cn: "right-0 top-0 h-full w-2 cursor-ew-resize" },
    { dir: "w", cn: "left-0 top-0 h-full w-2 cursor-ew-resize" },
    { dir: "s", cn: "bottom-0 left-0 h-2 w-full cursor-ns-resize" },
    { dir: "n", cn: "top-0 left-0 h-2 w-full cursor-ns-resize" },
    { dir: "se", cn: "right-0 bottom-0 h-5 w-5 cursor-nwse-resize" },
    { dir: "sw", cn: "left-0 bottom-0 h-5 w-5 cursor-nesw-resize" },
    { dir: "ne", cn: "right-0 top-0 h-5 w-5 cursor-nesw-resize" },
    { dir: "nw", cn: "left-0 top-0 h-5 w-5 cursor-nwse-resize" },
  ];

  const node = (
    <div
      className={`fixed z-[9999] flex flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_80px_rgba(0,0,0,.45)] ${maxed ? "rounded-none border-0" : ""}`}
      style={style}
      role="dialog"
      aria-label="Desmos"
    >
      <div className={`flex h-11 shrink-0 select-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 ${maxed ? "cursor-default" : "cursor-move touch-none"}`} onPointerDown={onDrag}>
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow truncate text-[13px] font-bold text-[var(--ink)]">Desmos Graphing Calculator</span>
        <button type="button" className="rounded p-1.5 hover:bg-[var(--paper-deep)]" onPointerDown={(e)=>e.stopPropagation()} onClick={doMax} title={maxed?"Restore":"Maximize"}>
          {maxed ? <RotateCcw className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-[var(--paper-deep)]" onPointerDown={(e)=>e.stopPropagation()} onClick={doMin} title={mined?"Restore":"Minimize"}>
          <Minus className="h-4 w-4"/>
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]" onPointerDown={(e)=>e.stopPropagation()} onClick={onClose} title="Close">
          <X className="h-4 w-4"/>
        </button>
      </div>

      {!mined && (
        <div className="relative min-h-0 flex-1 bg-white">
          <div ref={containerRef} className="absolute inset-0" />
          {status==="loading" && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/> Loading…</div>}
          {status==="error" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-8 text-center"><p className="text-sm font-semibold">Needs internet</p><a className="text-sm font-bold text-blue-600 underline inline-flex items-center gap-2" href="https://www.desmos.com/calculator" target="_blank" rel="noreferrer">Open Desmos <ExternalLink className="h-4 w-4"/></a></div>}
        </div>
      )}
      {mined && (
        <div className="flex h-full items-center justify-between px-3 text-[12px] text-[var(--ink-faint)]">
          <span className="truncate font-semibold">Desmos — drag me anywhere</span>
          <button className="btn btn-soft !min-h-6 !px-2 !text-[11px]" onPointerDown={(e)=>e.stopPropagation()} onClick={doMin}>Restore</button>
        </div>
      )}
      {!maxed && !mined && handles.map(({dir,cn})=> <div key={dir} data-dir={dir} className={`absolute z-10 ${cn}`} onPointerDown={onResize}/>) }
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}

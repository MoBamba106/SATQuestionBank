"use client";

import * as React from "react";
import { GripHorizontal, Minus, X } from "lucide-react";

export function FloatingDesmos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [position, setPosition] = React.useState({ x: 0, y: 80 });
  const [minimized, setMinimized] = React.useState(false);
  const drag = React.useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setPosition({ x: Math.max(16, window.innerWidth - 590), y: 76 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - position.x, offsetY: event.clientY - position.y };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const width = minimized ? 300 : Math.min(560, window.innerWidth - 32);
    const height = minimized ? 48 : Math.min(620, window.innerHeight - 32);
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.current.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - drag.current.offsetY)),
    });
  };
  const endDrag = () => { drag.current = null; };

  return (
    <div
      className="fixed z-[950] flex resize flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.32)]"
      style={{ left: position.x, top: position.y, width: minimized ? 300 : "min(560px, calc(100vw - 32px))", height: minimized ? 48 : "min(620px, calc(100vh - 32px))", minWidth: minimized ? 300 : 360, minHeight: minimized ? 48 : 360 }}
      role="dialog"
      aria-label="Desmos graphing calculator"
    >
      <div
        className="flex h-12 shrink-0 cursor-move touch-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
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
      {!minimized && (
        <iframe
          src="https://www.desmos.com/calculator?embed"
          title="Desmos graphing calculator"
          className="min-h-0 grow border-0 bg-white"
          allow="clipboard-read; clipboard-write"
        />
      )}
    </div>
  );
}

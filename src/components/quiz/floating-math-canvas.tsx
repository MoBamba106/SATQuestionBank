"use client";

import * as React from "react";
import {
  Circle,
  Eraser,
  GripHorizontal,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Slash,
  Square,
  Trash2,
  Triangle,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Tool = "select" | "pen" | "line" | "rect" | "ellipse" | "triangle" | "text" | "eraser";
type DrawItem =
  | { id: string; type: "path"; points: Point[]; color: string; width: number }
  | { id: string; type: "line" | "rect" | "ellipse" | "triangle"; start: Point; end: Point; color: string; width: number }
  | { id: string; type: "text"; point: Point; text: string; color: string; size: number };

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "select", label: "Move", icon: MousePointer2 },
  { id: "pen", label: "Pen", icon: Pencil },
  { id: "line", label: "Line", icon: Slash },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Circle", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "text", label: "Text", icon: Type },
  { id: "eraser", label: "Eraser", icon: Eraser },
];
const QUICK_LETTERS = ["A", "B", "C", "D", "x", "y", "m", "n", "θ", "π"];
const uid = () => `draw-${crypto.randomUUID()}`;

function moveItem(item: DrawItem, dx: number, dy: number): DrawItem {
  if (item.type === "path") return { ...item, points: item.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
  if (item.type === "text") return { ...item, point: { x: item.point.x + dx, y: item.point.y + dy } };
  return { ...item, start: { x: item.start.x + dx, y: item.start.y + dy }, end: { x: item.end.x + dx, y: item.end.y + dy } };
}

export function FloatingMathCanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [position, setPosition] = React.useState({ x: 40, y: 70 });
  const [minimized, setMinimized] = React.useState(false);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [color, setColor] = React.useState("#263238");
  const [strokeWidth, setStrokeWidth] = React.useState(3);
  const [textValue, setTextValue] = React.useState("x");
  const [items, setItems] = React.useState<DrawItem[]>([]);
  const [redo, setRedo] = React.useState<DrawItem[]>([]);
  const [draft, setDraft] = React.useState<DrawItem | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const windowDrag = React.useRef<{ id: number; x: number; y: number } | null>(null);
  const drawDrag = React.useRef<{ id: number; start: Point; original?: DrawItem } | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const addText = React.useCallback((text: string, point = { x: 360, y: 240 }) => {
    setItems((current) => [...current, { id: uid(), type: "text", point, text, color, size: 24 }]);
    setRedo([]);
  }, [color]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || !/^[a-z]$/i.test(event.key)) return;
      event.preventDefault();
      addText(event.key);
      setTool("select");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addText, open]);

  if (!open) return null;

  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * 720, y: ((event.clientY - box.top) / box.height) * 480 };
  };

  const startDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    const element = (event.target as Element).closest<SVGElement>("[data-draw-id]");
    const itemId = element?.dataset.drawId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "eraser") {
      if (itemId) setItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }
    if (tool === "select") {
      setSelected(itemId ?? null);
      const original = items.find((item) => item.id === itemId);
      drawDrag.current = { id: event.pointerId, start: point, original };
      return;
    }
    if (tool === "text") {
      addText(textValue || "x", point);
      setSelected(null);
      return;
    }

    drawDrag.current = { id: event.pointerId, start: point };
    if (tool === "pen") setDraft({ id: uid(), type: "path", points: [point], color, width: strokeWidth });
    else setDraft({ id: uid(), type: tool, start: point, end: point, color, width: strokeWidth });
  };

  const continueDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawDrag.current || drawDrag.current.id !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (tool === "select" && drawDrag.current.original) {
      const dx = point.x - drawDrag.current.start.x;
      const dy = point.y - drawDrag.current.start.y;
      const moved = moveItem(drawDrag.current.original, dx, dy);
      setItems((current) => current.map((item) => item.id === moved.id ? moved : item));
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      if (current.type === "path") return { ...current, points: [...current.points, point] };
      if (current.type === "text") return current;
      return { ...current, end: point };
    });
  };

  const finishDrawing = () => {
    if (draft) {
      setItems((current) => [...current, draft]);
      setRedo([]);
    }
    setDraft(null);
    drawDrag.current = null;
  };

  const renderItem = (item: DrawItem) => {
    if (item.type === "text") return <text key={item.id} data-draw-id={item.id} x={item.point.x} y={item.point.y} fill={item.color} fontSize={item.size} fontFamily="IBM Plex Sans, sans-serif" fontWeight="600">{item.text}</text>;
    const common = {
      "data-draw-id": item.id,
      stroke: item.color,
      strokeWidth: item.width,
      fill: "none",
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      className: selected === item.id ? "drop-shadow-[0_0_3px_var(--accent)]" : "",
    };
    if (item.type === "path") return <path key={item.id} {...common} d={item.points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")} />;
    const x = Math.min(item.start.x, item.end.x), y = Math.min(item.start.y, item.end.y);
    const width = Math.abs(item.end.x - item.start.x), height = Math.abs(item.end.y - item.start.y);
    if (item.type === "line") return <line key={item.id} {...common} x1={item.start.x} y1={item.start.y} x2={item.end.x} y2={item.end.y} />;
    if (item.type === "rect") return <rect key={item.id} {...common} x={x} y={y} width={width} height={height} />;
    if (item.type === "ellipse") return <ellipse key={item.id} {...common} cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} />;
    return <polygon key={item.id} {...common} points={`${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`} />;
  };

  return (
    <div
      className="fixed z-[945] flex resize flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.32)]"
      style={{ left: position.x, top: position.y, width: minimized ? 340 : "min(790px, calc(100vw - 24px))", height: minimized ? 48 : "min(720px, calc(100vh - 24px))", minWidth: minimized ? 340 : 580, minHeight: minimized ? 48 : 520 }}
      role="dialog"
      aria-label="Math drawing canvas"
    >
      <div
        className="flex h-12 shrink-0 cursor-move touch-none items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-soft)] px-3 select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          windowDrag.current = { id: event.pointerId, x: event.clientX - position.x, y: event.clientY - position.y };
        }}
        onPointerMove={(event) => {
          if (!windowDrag.current || windowDrag.current.id !== event.pointerId) return;
          setPosition({ x: Math.max(6, event.clientX - windowDrag.current.x), y: Math.max(6, event.clientY - windowDrag.current.y) });
        }}
        onPointerUp={() => { windowDrag.current = null; }}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow text-[13px] font-bold text-[var(--ink)]">Math Canvas</span>
        <span className="hidden text-[10.5px] text-[var(--ink-faint)] sm:inline">Alt + letter adds a label</span>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]" onPointerDown={(event) => event.stopPropagation()} onClick={() => setMinimized((value) => !value)} aria-label={minimized ? "Restore canvas" : "Minimize canvas"}><Minus className="h-4 w-4" /></button>
        <button type="button" className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]" onPointerDown={(event) => event.stopPropagation()} onClick={onClose} aria-label="Close canvas"><X className="h-4 w-4" /></button>
      </div>

      {!minimized && (
        <>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] bg-[var(--paper-raised)] p-2">
            {TOOLS.map((entry) => (
              <button key={entry.id} type="button" title={entry.label} aria-label={entry.label} onClick={() => setTool(entry.id)} className={tool === entry.id ? "btn btn-primary !min-h-8 !px-2.5 !py-1.5" : "btn btn-ghost !min-h-8 !px-2.5 !py-1.5"}><entry.icon className="h-4 w-4" /></button>
            ))}
            <span className="mx-1 h-6 w-px bg-[var(--line)]" />
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-9 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0.5" aria-label="Drawing color" />
            <input type="range" min="1" max="8" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} className="w-20" aria-label="Line width" />
            <button type="button" className="btn btn-ghost !min-h-8 !px-2.5" disabled={!items.length} onClick={() => { const last = items.at(-1); if (last) { setItems(items.slice(0, -1)); setRedo((current) => [...current, last]); } }}><Undo2 className="h-4 w-4" /></button>
            <button type="button" className="btn btn-ghost !min-h-8 !px-2.5" disabled={!redo.length} onClick={() => { const last = redo.at(-1); if (last) { setRedo(redo.slice(0, -1)); setItems((current) => [...current, last]); } }}><Redo2 className="h-4 w-4" /></button>
            <button type="button" className="btn btn-ghost !min-h-8 !px-2.5 text-[var(--bad)]" onClick={() => { setItems([]); setRedo([]); }}><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] bg-[var(--paper-soft)] px-2 py-1.5">
            <input value={textValue} onChange={(event) => setTextValue(event.target.value)} className="input !h-8 !w-24 !px-2 !py-1 text-sm" aria-label="Text to add" />
            <button type="button" className="btn btn-soft !min-h-8 !px-2.5 !py-1.5 !text-[11px]" onClick={() => addText(textValue || "x")}>Add text</button>
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Quick</span>
            {QUICK_LETTERS.map((letter) => <button key={letter} type="button" className="flex h-7 min-w-7 items-center justify-center rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 font-mono text-xs font-bold text-[var(--ink)] hover:border-[var(--accent)]" onClick={() => addText(letter)}>{letter}</button>)}
          </div>
          <div className="min-h-0 grow bg-[#f8f7f2] p-2">
            <svg
              ref={svgRef}
              viewBox="0 0 720 480"
              className={cn("h-full w-full touch-none rounded-[6px] border border-[#cbc8bf] bg-white", tool === "select" ? "cursor-move" : "cursor-crosshair")}
              style={{ backgroundImage: "linear-gradient(#e8e6df 1px, transparent 1px), linear-gradient(90deg, #e8e6df 1px, transparent 1px)", backgroundSize: "24px 24px" }}
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            >
              {items.map(renderItem)}
              {draft && renderItem(draft)}
            </svg>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-[10.5px] text-[var(--ink-faint)]">
            <span>Pen for algebra work · presets for geometry · Move tool repositions objects</span>
            <span>{items.length} objects</span>
          </div>
        </>
      )}
    </div>
  );
}

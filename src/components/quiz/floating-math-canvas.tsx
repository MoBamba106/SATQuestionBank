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
  TriangleRight,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/settings-provider";

type Point = { x: number; y: number };
type Tool = "select" | "pen" | "line" | "rect" | "ellipse" | "triangle" | "right-triangle" | "text" | "eraser";
type DrawItem =
  | { id: string; type: "path"; points: Point[]; color: string; width: number }
  | {
      id: string;
      type: "line" | "rect" | "ellipse" | "triangle" | "right-triangle";
      start: Point;
      end: Point;
      color: string;
      width: number;
    }
  | { id: string; type: "text"; point: Point; text: string; color: string; size: number };

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "select", label: "Move", icon: MousePointer2 },
  { id: "pen", label: "Pen", icon: Pencil },
  { id: "line", label: "Line", icon: Slash },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Circle", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "right-triangle", label: "Right triangle", icon: TriangleRight },
  { id: "text", label: "Text", icon: Type },
  { id: "eraser", label: "Eraser", icon: Eraser },
];
const QUICK_LETTERS = ["A", "B", "C", "D", "x", "y", "m", "n", "θ", "π"];
const uid = () => `draw-${crypto.randomUUID()}`;

/** Theme-aware default pen colors — ink on light paper, soft chalk on dark. */
function defaultPenForTheme(theme: string): string {
  if (theme === "dark") return "#e8eef7";
  if (theme === "obsidian") return "#e4dfd4";
  if (theme === "maroon") return "#4a1522";
  if (theme === "cardboard") return "#2c1c12";
  if (theme === "highlighter") return "#292b2f";
  if (theme === "liquid-glass") return "#172742";
  if (theme === "light") return "#182437";
  // soft-paper / paper
  return "#4e3f4f";
}

function isDarkTheme(theme: string): boolean {
  return theme === "dark" || theme === "obsidian";
}

/** Whether a keyboard event targets an editable control, where the browser's
 *  native undo/redo should win and our canvas shortcuts must not interfere. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function moveItem(item: DrawItem, dx: number, dy: number): DrawItem {
  if (item.type === "path") return { ...item, points: item.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
  if (item.type === "text") return { ...item, point: { x: item.point.x + dx, y: item.point.y + dy } };
  return { ...item, start: { x: item.start.x + dx, y: item.start.y + dy }, end: { x: item.end.x + dx, y: item.end.y + dy } };
}

/* ------------------------------------------------------------------ */
/* Smart shape recognition (auto-correct strokes)                      */
/*                                                                     */
/* Converts rough pen scribbles into crisp geometry: lines, circles,   */
/* rectangles, triangles / right triangles, and a handful of common    */
/* single-stroke glyphs (1 2 5 7 v c u n). Controlled by the           */
/* "Enable Canvas Smart Shape Recognition" toggle in Settings.         */
/* ------------------------------------------------------------------ */

export type RecognizedShape =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "ellipse" | "rect" | "triangle" | "right-triangle"; x: number; y: number; width: number; height: number }
  | { kind: "text"; text: string; x: number; y: number; size: number };

function bboxOf(points: Point[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ramer–Douglas–Peucker polyline simplification. */
function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return [...points];
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

/** Angle (degrees) between two segments a→b and b→c. */
function turnAngle(a: Point, b: Point, c: Point): number {
  const v1 = { x: b.x - a.x, y: b.y - a.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const len = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (len === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / len));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Quantize a segment direction into one of 8 compass directions (screen coords, y grows down). */
function directionOf(a: Point, b: Point): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = E, 45 = SE, 90 = S, …
  const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  const idx = ((Math.round(ang / 45) % 8) + 8) % 8;
  return dirs[idx]!;
}

export function recognizeStroke(points: Point[]): RecognizedShape | null {
  if (points.length < 4) return null;
  const bbox = bboxOf(points);
  const diag = Math.hypot(bbox.width, bbox.height);
  // Too small to be meaningful — leave the scribble as-is.
  if (diag < 14) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const closedDist = Math.hypot(end.x - start.x, end.y - start.y);
  const closed = closedDist < Math.max(22, diag * 0.18);

  const simplified = rdp(points, Math.max(4, diag * 0.045));

  if (closed) return recognizeClosed(simplified, points, bbox, diag);
  return recognizeOpen(simplified, bbox, diag);
}

function recognizeClosed(simplified: Point[], _points: Point[], bbox: { minX: number; minY: number; width: number; height: number }, _diag: number): RecognizedShape | null {
  const { minX, minY, width, height } = bbox;
  if (width < 12 || height < 12) return null;

  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  const closesOnStart = Math.hypot(last.x - first.x, last.y - first.y) < 12;

  // Distinct corners = points where the closed loop turns sharply. When the
  // stroke closes on its start point, evaluate the seam corner (formed by the
  // last and first segments) explicitly — RDP leaves near-duplicate closing
  // points that otherwise produce a degenerate 0° angle at the seam.
  const raw: { p: Point; angle: number }[] = [];
  for (let i = 1; i < simplified.length - 1; i++) {
    const angle = turnAngle(simplified[i - 1], simplified[i], simplified[i + 1]);
    if (angle > 30) raw.push({ p: simplified[i], angle });
  }
  if (closesOnStart && simplified.length >= 3) {
    const angle = turnAngle(simplified[simplified.length - 2], first, simplified[1]);
    if (angle > 30) raw.push({ p: first, angle });
  }
  // Merge near-duplicate corners (e.g. the closing point ≈ the start point),
  // keeping the strongest turn angle for each cluster.
  const corners: { p: Point; angle: number }[] = [];
  for (const c of raw) {
    const existing = corners.find((d) => Math.hypot(d.p.x - c.p.x, d.p.y - c.p.y) < 10);
    if (existing) existing.angle = Math.max(existing.angle, c.angle);
    else corners.push({ p: c.p, angle: c.angle });
  }

  const bboxCorners = [
    { x: minX, y: minY },
    { x: minX + width, y: minY },
    { x: minX + width, y: minY + height },
    { x: minX, y: minY + height },
  ];
  const cornerTolerance = Math.max(10, Math.max(width, height) * 0.26);
  const nearBboxCorner = (p: Point) =>
    bboxCorners.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < cornerTolerance);

  // Rectangle: 4+ (deduped) corners, every corner on a bbox corner, and every
  // bbox corner actually visited by the stroke.
  if (
    corners.length >= 4 &&
    corners.length <= 6 &&
    corners.every((c) => c.angle > 45 && nearBboxCorner(c.p)) &&
    bboxCorners.every((bc) => corners.some((c) => Math.hypot(c.p.x - bc.x, c.p.y - bc.y) < cornerTolerance))
  ) {
    return { kind: "rect", x: minX, y: minY, width, height };
  }

  // Triangle: take the 3 sharpest corners (a scribbled loop can produce one
  // spurious low-angle corner along a long edge) and require a chunky area
  // relative to the bbox.
  if (corners.length >= 3) {
    const top = [...corners].sort((x, y) => y.angle - x.angle).slice(0, 3);
    if (top.every((c) => c.angle > 45)) {
      const [a, b, c] = [top[0].p, top[1].p, top[2].p];
      const area = Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2);
      const bboxArea = Math.max(1, width * height);
      if (area > bboxArea * 0.32) {
        // Right triangle check: two sides nearly perpendicular (dot ≈ 0).
        const sides = [
          [a, b],
          [b, c],
          [c, a],
        ];
        for (let i = 0; i < 3; i++) {
          const p = sides[i]![0];
          const q = sides[i]![1];
          const other = sides[(i + 1) % 3]!.find((s) => s !== p && s !== q) ?? sides[(i + 1) % 3]![1];
          const v1 = { x: q.x - p.x, y: q.y - p.y };
          const v2 = { x: other.x - p.x, y: other.y - p.y };
          const dot = v1.x * v2.x + v1.y * v2.y;
          const len = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
          if (len > 0 && Math.abs(dot / len) < 0.18) {
            return { kind: "right-triangle", x: minX, y: minY, width, height };
          }
        }
        return { kind: "triangle", x: minX, y: minY, width, height };
      }
    }
  }

  // Everything else that closes on itself becomes a crisp circle/ellipse.
  return { kind: "ellipse", x: minX, y: minY, width, height };
}

function recognizeOpen(simplified: Point[], bbox: { minX: number; minY: number; width: number; height: number }, diag: number): RecognizedShape | null {
  const { minX, minY, width, height } = bbox;
  const first = simplified[0];
  const last = simplified[simplified.length - 1];

  // Straight stroke → crisp line. RDP only collapses to two points when the
  // whole scribble stays within epsilon of the start→end chord, so no extra
  // deviation check is needed here.
  if (simplified.length === 2 && diag > 16) {
    return { kind: "line", x1: first.x, y1: first.y, x2: last.x, y2: last.y };
  }

  const midX = minX + width / 2;
  const midY = minY + height / 2;

  // "v": two long segments meeting at a bottom apex.
  if (simplified.length === 3) {
    const d1 = directionOf(simplified[0], simplified[1]);
    const d2 = directionOf(simplified[1], simplified[2]);
    const isDown = d1.startsWith("S");
    const isUp = d2.startsWith("N");
    const apexLow = simplified[1].y > first.y + height * 0.4 && simplified[1].y > last.y + height * 0.4;
    if (isDown && isUp && apexLow && turnAngle(simplified[0], simplified[1], simplified[2]) > 40) {
      return { kind: "text", text: "v", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
    }
  }

  // Segments as compass directions, plus whole-stroke verticality.
  const dirs: string[] = [];
  for (let i = 0; i < simplified.length - 1; i++) dirs.push(directionOf(simplified[i], simplified[i + 1]));

  const dxTotal = last.x - first.x;
  const dyTotal = last.y - first.y;
  const horizontal = (d: string) => d === "E" || d === "W";

  // "1" / "l": near-vertical single stroke with a SHORT top serif hook.
  if (Math.abs(dyTotal) > Math.abs(dxTotal) * 2.2 && height > 22) {
    const firstSeg = dirs[0];
    const hookLen = Math.hypot(simplified[1].x - simplified[0].x, simplified[1].y - simplified[0].y);
    if ((firstSeg === "E" || firstSeg === "SE" || firstSeg === "NE") && hookLen < diag * 0.28) {
      return { kind: "text", text: "1", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
    }
  }

  // "7": short top horizontal then a single long down diagonal (only fires
  // when the whole stroke collapses to the top + one dominant tail).
  if (simplified.length === 3) {
    const topDir = dirs[0] ?? "";
    const topLen = Math.hypot(simplified[1].x - simplified[0].x, simplified[1].y - simplified[0].y);
    const tailDir = dirs[1] ?? "";
    const tailLen = Math.hypot(last.x - simplified[1].x, last.y - simplified[1].y);
    if (
      horizontal(topDir) &&
      topLen > diag * 0.18 &&
      tailLen > height * 0.55 &&
      (tailDir === "SW" || tailDir === "SE" || tailDir === "S")
    ) {
      return { kind: "text", text: "7", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
    }
  }

  // "2" / "5": top horizontal, a descent on the left, and a bottom sweep to
  // the bottom-right. 2 drops diagonally late; 5 reaches the left edge early.
  if (simplified.length >= 4 && Math.abs(dxTotal) > height * 0.35) {
    const firstDir = dirs[0] ?? "";
    const lastDir = dirs[dirs.length - 1] ?? "";
    const endsBottomRight = last.x > minX + width * 0.5 && last.y > minY + height * 0.6;
    if (horizontal(firstDir) && (horizontal(lastDir) || lastDir === "SE" || lastDir === "SW") && endsBottomRight) {
      // Find the first point after the top stroke that reaches the left edge.
      const leftThreshold = minX + width * 0.35;
      let firstLeftReach: Point | null = null;
      for (let i = 2; i < simplified.length; i++) {
        if (simplified[i].x < leftThreshold) {
          firstLeftReach = simplified[i];
          break;
        }
      }
      const five = firstLeftReach !== null && firstLeftReach.y < minY + height * 0.5;
      return { kind: "text", text: five ? "5" : "2", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
    }
  }

  // "c": open curve, both ends on the right, middle swings left.
  const startRight = first.x > midX;
  const endRight = last.x > midX;
  const midLeft = simplified.length >= 3 && simplified[Math.floor(simplified.length / 2)].x < midX;
  if (startRight && endRight && midLeft) {
    return { kind: "text", text: "c", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
  }

  // "u" / "n": ends level at the top (u) or bottom (n), middle bulges away.
  const levelness = Math.abs(first.y - last.y);
  if (simplified.length >= 4 && levelness < height * 0.35) {
    const mid = simplified[Math.floor(simplified.length / 2)];
    const bulgeUp = mid.y < midY - height * 0.15;
    const bulgeDown = mid.y > midY + height * 0.15;
    if (bulgeDown) return { kind: "text", text: "u", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
    if (bulgeUp) return { kind: "text", text: "n", x: midX, y: midY, size: Math.round(Math.max(18, height * 0.9)) };
  }

  return null;
}

function itemFromRecognized(shape: RecognizedShape, color: string, width: number): DrawItem {
  const common = { id: uid(), color, width };
  switch (shape.kind) {
    case "line":
      return {
        ...common,
        type: "line",
        start: { x: shape.x1, y: shape.y1 },
        end: { x: shape.x2, y: shape.y2 },
      };
    case "ellipse":
    case "rect":
    case "triangle":
    case "right-triangle":
      return {
        ...common,
        type: shape.kind,
        start: { x: shape.x, y: shape.y },
        end: { x: shape.x + shape.width, y: shape.y + shape.height },
      };
    case "text":
      return {
        ...common,
        type: "text",
        point: { x: shape.x - (shape.size * 0.3), y: shape.y + shape.size * 0.4 },
        text: shape.text,
        size: shape.size,
      };
  }
}

export function FloatingMathCanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useSettings();
  const theme = settings.theme;
  const dark = isDarkTheme(theme);
  const smartShapes = settings.canvasSmartShapes;

  const [position, setPosition] = React.useState({ x: 40, y: 70 });
  const [minimized, setMinimized] = React.useState(false);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [color, setColor] = React.useState(() => defaultPenForTheme(theme));
  const [strokeWidth, setStrokeWidth] = React.useState(3);
  const [textValue, setTextValue] = React.useState("x");
  const [items, setItems] = React.useState<DrawItem[]>([]);
  // Snapshot history: `past` holds up to HISTORY_LIMIT previous item states and
  // `future` holds undone states for redo. A new action clears `future`.
  const [past, setPast] = React.useState<DrawItem[][]>([]);
  const [future, setFuture] = React.useState<DrawItem[][]>([]);
  const [draft, setDraft] = React.useState<DrawItem | null>(null);
  const HISTORY_LIMIT = 10;
  const [selected, setSelected] = React.useState<string | null>(null);
  /** Digits typed so far while Alt is held (committed on Alt release). */
  const [pendingNumber, setPendingNumber] = React.useState("");
  const windowDrag = React.useRef<{ id: number; x: number; y: number } | null>(null);
  const drawDrag = React.useRef<{ id: number; start: Point; original?: DrawItem } | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  // Track whether the user has manually picked a color so theme changes
  // only override the automatic default, not a deliberate choice.
  const userPickedColor = React.useRef(false);
  const lastAutoColor = React.useRef(color);

  // --- Undo/redo history --------------------------------------------------
  // These refs mirror `items`/`past`/`future` so callbacks (undo/redo/commit)
  // can read the *latest* values synchronously instead of a possibly-stale
  // closure. They are synced in effects (updating a ref during render is
  // disallowed) — which is fine because effects run before the next user event.
  const itemsRef = React.useRef<DrawItem[]>(items);
  const pastRef = React.useRef<DrawItem[][]>(past);
  const futureRef = React.useRef<DrawItem[][]>(future);
  React.useEffect(() => { itemsRef.current = items; }, [items]);
  React.useEffect(() => { pastRef.current = past; }, [past]);
  React.useEffect(() => { futureRef.current = future; }, [future]);
  /** Snapshot taken just before a select-tool move drag begins. */
  const moveSnapshotRef = React.useRef<DrawItem[]>([]);

  /** Apply `next` as a new committed action: record the current state in the
   *  undo stack (capped at HISTORY_LIMIT) and drop the redo stack. */
  const commitItems = React.useCallback((next: DrawItem[]) => {
    setPast((p) => [...p, itemsRef.current].slice(-HISTORY_LIMIT));
    setFuture([]);
    itemsRef.current = next;
    setItems(next);
  }, []);

  /** Live update used mid-drag (e.g. moving an object) — does NOT create a new
   *  history entry; the pre-drag snapshot is committed once on pointer-up. */
  const setItemsLive = React.useCallback((updater: (cur: DrawItem[]) => DrawItem[]) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const undo = React.useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const prev = p[p.length - 1];
    setFuture((f) => [...f, itemsRef.current].slice(-HISTORY_LIMIT));
    itemsRef.current = prev;
    setItems(prev);
    setPast((cur) => cur.slice(0, -1));
  }, []);

  const redo = React.useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const next = f[f.length - 1];
    setPast((cur) => [...cur, itemsRef.current].slice(-HISTORY_LIMIT));
    itemsRef.current = next;
    setItems(next);
    setFuture((cur) => cur.slice(0, -1));
  }, []);

  React.useEffect(() => {
    const next = defaultPenForTheme(theme);
    // Update default when theme changes, unless the user overrode it with a
    // color that no longer matches the previous auto default.
    if (!userPickedColor.current || color === lastAutoColor.current) {
      setColor(next);
      userPickedColor.current = false;
    }
    lastAutoColor.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to theme
  }, [theme]);

  const addText = React.useCallback((text: string, point = { x: 360, y: 240 }) => {
    commitItems([...itemsRef.current, { id: uid(), type: "text", point, text, color, size: 24 }]);
  }, [color, commitItems]);

  /**
   * Alt + letter/digit inserts a quick label onto the canvas.
   *
   * Digits are **buffered until Alt is released**, so holding Alt and typing
   * `2` then `5` produces a single "25" text object rather than two separate
   * "2" and "5" objects the user then has to drag together. `Alt+1,2,5` →
   * "125". Letters are still committed immediately (one glyph is the whole
   * point of a label like "A" or "θ"), and a letter pressed mid-number flushes
   * the pending digits first so nothing is silently dropped.
   */
  const pendingDigits = React.useRef("");

  const flushPendingDigits = React.useCallback(() => {
    const digits = pendingDigits.current;
    pendingDigits.current = "";
    if (!digits) return;
    setPendingNumber("");
    addText(digits);
    setTool("select");
  }, [addText]);

  React.useEffect(() => {
    if (!open) {
      pendingDigits.current = "";
      // Deferred so clearing the indicator can't cascade renders in the effect.
      const clear = window.setTimeout(() => setPendingNumber(""), 0);
      return () => window.clearTimeout(clear);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (!/^[a-z0-9]$/i.test(event.key)) return;
      event.preventDefault();
      if (event.repeat) return;

      if (/^[0-9]$/.test(event.key)) {
        // Cap the buffer so a stuck key can't build an absurd string.
        if (pendingDigits.current.length >= 6) return;
        pendingDigits.current += event.key;
        setPendingNumber(pendingDigits.current);
        return;
      }

      flushPendingDigits();
      addText(event.key);
      setTool("select");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      // Releasing Alt commits whatever number was typed while it was held.
      if (event.key === "Alt" || !event.altKey) flushPendingDigits();
    };

    // Alt+Tab / focus loss must not strand a half-typed number.
    const onBlur = () => flushPendingDigits();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [addText, flushPendingDigits, open]);

  // History keyboard shortcuts: Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or
  // Ctrl/Cmd+Y to redo. Skipped inside editable fields so the browser's native
  // text-undo keeps working, and never fires when the canvas is closed.
  React.useEffect(() => {
    if (!open) return;
    const onHistoryKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onHistoryKey);
    return () => window.removeEventListener("keydown", onHistoryKey);
  }, [open, undo, redo]);

  if (!open) return null;

  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * 720, y: ((event.clientY - box.top) / box.height) * 480 };
  };

  const startDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    const element = (event.target as Element).closest<SVGElement>("[data-draw-id]");
    const itemId = element?.dataset.drawId;
    // Dragging the pen across SVG <text> objects otherwise starts a native
    // browser text selection, which leaves stray highlighted glyphs behind and
    // can hijack the drag. Suppressing the default here (canvas only — see the
    // `select-none` class on the surface) keeps drawing clean without touching
    // text selection anywhere else in the app.
    event.preventDefault();
    // A live selection from before the drag would still render; clear it.
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) selection.removeAllRanges();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "eraser") {
      if (itemId) commitItems(itemsRef.current.filter((item) => item.id !== itemId));
      return;
    }
    if (tool === "select") {
      setSelected(itemId ?? null);
      const original = items.find((item) => item.id === itemId);
      drawDrag.current = { id: event.pointerId, start: point, original };
      // Snapshot the pre-move state so one undo restores the original position.
      if (original) moveSnapshotRef.current = itemsRef.current;
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
      setItemsLive((current) => current.map((item) => (item.id === moved.id ? moved : item)));
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
    // A select-tool drag (moving an object) just ended — commit the pre-move
    // snapshot so undo restores the object's original position.
    if (tool === "select" && drawDrag.current?.original) {
      if (moveSnapshotRef.current.length > 0) {
        setPast((p) => [...p, moveSnapshotRef.current].slice(-HISTORY_LIMIT));
        setFuture([]);
        moveSnapshotRef.current = [];
      }
    }

    if (draft) {
      // Smart shape recognition: convert rough pen scribbles into crisp
      // shapes / legible glyphs when the setting is enabled.
      if (draft.type === "path" && smartShapes && draft.points.length > 2) {
        const recognized = recognizeStroke(draft.points);
        if (recognized) {
          commitItems([...itemsRef.current, itemFromRecognized(recognized, draft.color, draft.width)]);
          setDraft(null);
          drawDrag.current = null;
          return;
        }
      }
      commitItems([...itemsRef.current, draft]);
    }
    setDraft(null);
    drawDrag.current = null;
  };

  const renderItem = (item: DrawItem) => {
    if (item.type === "text") {
      return (
        <text
          key={item.id}
          data-draw-id={item.id}
          x={item.point.x}
          y={item.point.y}
          fill={item.color}
          fontSize={item.size}
          fontFamily="IBM Plex Sans, sans-serif"
          fontWeight="600"
          // Belt-and-braces with the surface's `select-none`: pen strokes that
          // pass over a label must never start a text selection.
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
          {item.text}
        </text>
      );
    }
    const common = {
      "data-draw-id": item.id,
      stroke: item.color,
      strokeWidth: item.width,
      fill: "none" as const,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      className: selected === item.id ? "drop-shadow-[0_0_3px_var(--accent)]" : "",
    };
    if (item.type === "path") {
      return (
        <path
          key={item.id}
          {...common}
          d={item.points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")}
        />
      );
    }
    const x = Math.min(item.start.x, item.end.x);
    const y = Math.min(item.start.y, item.end.y);
    const width = Math.abs(item.end.x - item.start.x);
    const height = Math.abs(item.end.y - item.start.y);
    if (item.type === "line") {
      return <line key={item.id} {...common} x1={item.start.x} y1={item.start.y} x2={item.end.x} y2={item.end.y} />;
    }
    if (item.type === "rect") return <rect key={item.id} {...common} x={x} y={y} width={width} height={height} />;
    if (item.type === "ellipse") {
      return (
        <ellipse key={item.id} {...common} cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} />
      );
    }
    if (item.type === "right-triangle") {
      // Right angle at the bottom-left corner.
      return <polygon key={item.id} {...common} points={`${x},${y + height} ${x},${y} ${x + width},${y + height}`} />;
    }
    return (
      <polygon
        key={item.id}
        {...common}
        points={`${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`}
      />
    );
  };

  // Theme-aware grid surface:
  //  - Maroon: subtle light-red tint (#fff5f5) with soft maroon grid lines.
  //  - Charcoal (dark): pure black canvas with clean white grid lines.
  //  - Other dark themes: muted navy so lines don't glow.
  //  - Light themes: warm paper white.
  let surfaceBg = "#f8f7f2";
  let gridLine = "#e8e6df";
  let borderCol = "#cbc8bf";
  if (theme === "maroon") {
    surfaceBg = "#fff5f5";
    gridLine = "#eccfd5";
    borderCol = "#d9a3ae";
  } else if (theme === "dark") {
    surfaceBg = "#000000";
    gridLine = "rgba(255,255,255,0.16)";
    borderCol = "rgba(255,255,255,0.35)";
  } else if (theme === "obsidian") {
    surfaceBg = "#121a26";
    gridLine = "rgba(148, 168, 192, 0.14)";
    borderCol = "rgba(120, 145, 170, 0.28)";
  } else if (dark) {
    surfaceBg = "#121a26";
    gridLine = "rgba(148, 168, 192, 0.14)";
    borderCol = "rgba(120, 145, 170, 0.28)";
  }
  const padBg = dark ? "var(--paper-soft)" : "#f8f7f2";

  return (
    <div
      className="fixed z-[945] flex resize flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_24px_70px_rgba(0,0,0,.32)]"
      style={{
        left: position.x,
        top: position.y,
        width: minimized ? 340 : "min(790px, calc(100vw - 24px))",
        height: minimized ? 48 : "min(720px, calc(100vh - 24px))",
        minWidth: minimized ? 340 : 580,
        minHeight: minimized ? 48 : 520,
      }}
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
          setPosition({
            x: Math.max(6, event.clientX - windowDrag.current.x),
            y: Math.max(6, event.clientY - windowDrag.current.y),
          });
        }}
        onPointerUp={() => {
          windowDrag.current = null;
        }}
      >
        <GripHorizontal className="h-4 w-4 text-[var(--ink-faint)]" />
        <span className="grow text-[13px] font-bold text-[var(--ink)]">Math Canvas</span>
        {pendingNumber ? (
          <span
            aria-live="polite"
            className="rounded-[5px] border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[12px] font-bold text-[var(--accent)]"
          >
            {pendingNumber}
            <span className="ml-1 font-sans text-[10px] font-semibold opacity-70">release Alt</span>
          </span>
        ) : (
          <span className="hidden text-[10.5px] text-[var(--ink-faint)] sm:inline">
            Alt + letter/digit adds a label
          </span>
        )}
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setMinimized((value) => !value)}
          aria-label={minimized ? "Restore canvas" : "Minimize canvas"}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--bad)]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Close canvas"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!minimized && (
        <>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] bg-[var(--paper-raised)] p-2">
            {TOOLS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                onClick={() => setTool(entry.id)}
                className={
                  tool === entry.id
                    ? "btn btn-primary !min-h-8 !px-2.5 !py-1.5"
                    : "btn btn-ghost !min-h-8 !px-2.5 !py-1.5"
                }
              >
                <entry.icon className="h-4 w-4" />
              </button>
            ))}
            <span className="mx-1 h-6 w-px bg-[var(--line)]" />
            <input
              type="color"
              value={color}
              onChange={(event) => {
                userPickedColor.current = true;
                setColor(event.target.value);
              }}
              className="h-8 w-9 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0.5"
              aria-label="Drawing color"
            />
            <button
              type="button"
              className="btn btn-ghost !min-h-8 !px-2 !text-[11px]"
              title="Reset pen to theme default"
              onClick={() => {
                userPickedColor.current = false;
                setColor(defaultPenForTheme(theme));
              }}
            >
              Auto
            </button>
            <input
              type="range"
              min="1"
              max="8"
              value={strokeWidth}
              onChange={(event) => setStrokeWidth(Number(event.target.value))}
              className="w-20"
              aria-label="Line width"
            />
            <button
              type="button"
              className="btn btn-ghost !min-h-8 !px-2.5"
              title="Undo (Ctrl+Z)"
              disabled={past.length === 0}
              onClick={undo}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-ghost !min-h-8 !px-2.5"
              title="Redo (Ctrl+Y)"
              disabled={future.length === 0}
              onClick={redo}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-ghost !min-h-8 !px-2.5 text-[var(--bad)]"
              title="Clear canvas (undoable)"
              disabled={items.length === 0}
              onClick={() => commitItems([])}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] bg-[var(--paper-soft)] px-2 py-1.5">
            <input
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              className="input !h-8 !w-24 !px-2 !py-1 text-sm"
              aria-label="Text to add"
            />
            <button type="button" className="btn btn-soft !min-h-8 !px-2.5 !py-1.5 !text-[11px]" onClick={() => addText(textValue || "x")}>
              Add text
            </button>
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Quick</span>
            {QUICK_LETTERS.map((letter) => (
              <button
                key={letter}
                type="button"
                className="flex h-7 min-w-7 items-center justify-center rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 font-mono text-xs font-bold text-[var(--ink)] hover:border-[var(--accent)]"
                onClick={() => addText(letter)}
              >
                {letter}
              </button>
            ))}
            <span
              className={cn(
                "ml-auto hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex",
                smartShapes
                  ? "border-[var(--good)]/60 bg-[color-mix(in_srgb,var(--good)_12%,var(--paper-raised))] text-[var(--good)]"
                  : "border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink-faint)]",
              )}
              title={smartShapes ? "Rough scribbles snap to crisp shapes and glyphs" : "Smart shape recognition is off (Settings → Math canvas)"}
            >
              {smartShapes ? "Smart shapes on" : "Smart shapes off"}
            </span>
          </div>
          <div className="min-h-0 grow p-2" style={{ background: padBg }}>
            <svg
              ref={svgRef}
              viewBox="0 0 720 480"
              className={cn(
                // `select-none` is scoped to this SVG so pen/move drags never
                // highlight the canvas's own text objects. Text selection
                // everywhere else in the app is untouched.
                "h-full w-full touch-none select-none rounded-[6px] border",
                tool === "select" ? "cursor-move" : "cursor-crosshair",
              )}
              onDragStart={(event) => event.preventDefault()}
              style={{
                backgroundColor: surfaceBg,
                borderColor: borderCol,
                backgroundImage: `linear-gradient(${gridLine} 1px, transparent 1px), linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
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
            <span>
              Pen for algebra work · presets for geometry · hold Alt and type digits (e.g. 1-2-5) then release for
              one &ldquo;125&rdquo; label · Move tool repositions objects
            </span>
            <span>{items.length} objects</span>
          </div>
        </>
      )}
    </div>
  );
}

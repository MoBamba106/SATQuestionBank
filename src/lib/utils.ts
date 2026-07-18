import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ENTITY_MAP: Record<string, string> = {
  "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&ndash;": "–", "&mdash;": "—",
  "&rsquo;": "’", "&lsquo;": "‘", "&rdquo;": "”", "&ldquo;": "“",
  "&hellip;": "…", "&minus;": "−", "&times;": "×", "&divide;": "÷",
};

export function decodeEntities(s: string): string {
  let out = s;
  for (const [k, v] of Object.entries(ENTITY_MAP)) out = out.split(k).join(v);
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return out;
}

export function stripHtml(html?: string | null): string {
  if (!html) return "";
  let s = decodeEntities(String(html));
  s = s
    .replace(/<math[\s\S]*?<\/math>/gi, (m) => {
      const alt = /alttext="([^"]*)"/i.exec(m);
      return alt ? ` ${decodeEntities(alt[1])} ` : " ";
    })
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** Normalized answer comparison: case / whitespace insensitive, strips trailing .0 */
export function answersMatch(a: string, b: string): boolean {
  const norm = (x: string) =>
    x.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.0+$/, "");
  return norm(a) === norm(b);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function difficultyColor(d: string): string {
  switch (d) {
    case "Easy": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Medium": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Hard": return "bg-rose-100 text-rose-800 border-rose-200";
    default: return "bg-stone-100 text-stone-700 border-stone-200";
  }
}

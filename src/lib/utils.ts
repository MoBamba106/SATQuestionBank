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

export type SoftTone = "blue" | "teal" | "green" | "yellow" | "peach" | "rose" | "pink" | "lavender" | "paper";

export function difficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "Easy": return "bg-[#dfece3] text-[#477b5c] border-[#b5cdbd]";
    case "Medium": return "bg-[#f1e4cf] text-[#8b622f] border-[#d9bd91]";
    case "Hard": return "bg-[#f0dfe5] text-[#8e5264] border-[#d2abb7]";
    default: return "bg-[#e6dbd1] text-[#686377] border-[#cac1b9]";
  }
}

export function domainColor(domain: string): string {
  if (domain === "Math") return "bg-[#deeaeb] text-[#4d7c83] border-[#b3cccf]";
  if (domain === "Reading & Writing") return "bg-[#e9e1ec] text-[#6e5d7b] border-[#c9b9d1]";
  return "bg-[#e6dbd1] text-[#686377] border-[#cac1b9]";
}

export function skillTone(skill: string): SoftTone {
  switch (skill) {
    case "Algebra": return "blue";
    case "Advanced Math": return "lavender";
    case "Problem-Solving and Data Analysis": return "green";
    case "Geometry and Trigonometry": return "yellow";
    case "Information and Ideas": return "teal";
    case "Craft and Structure": return "blue";
    case "Expression of Ideas": return "peach";
    case "Standard English Conventions": return "pink";
    default: return "paper";
  }
}

export function skillColor(skill: string): string {
  const tone = skillTone(skill);
  const colors: Record<SoftTone, string> = {
    blue: "bg-[#dce8ed] text-[#245d73] border-[#acc7d0]",
    teal: "bg-[#deeaeb] text-[#4d7c83] border-[#b3cccf]",
    green: "bg-[#dfece3] text-[#477b5c] border-[#b5cdbd]",
    yellow: "bg-[#f1e4cf] text-[#8b622f] border-[#d9bd91]",
    peach: "bg-[#f3dfd7] text-[#9c5949] border-[#dfb6a9]",
    rose: "bg-[#f0dfe5] text-[#8e5264] border-[#d2abb7]",
    pink: "bg-[#f1ddea] text-[#965378] border-[#dab1ca]",
    lavender: "bg-[#e9e1ec] text-[#6e5d7b] border-[#c9b9d1]",
    paper: "bg-[#e6dbd1] text-[#686377] border-[#cac1b9]",
  };
  return colors[tone];
}

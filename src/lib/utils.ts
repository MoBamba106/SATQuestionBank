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

/** Convert College Board spoken-math alttext into compact symbols for snippets. */
function humanizeSpokenMath(text: string): string {
  return text
    .replace(/\bleft parenthesis\b/gi, "(")
    .replace(/\bright parenthesis\b/gi, ")")
    .replace(/\bleft bracket\b/gi, "[")
    .replace(/\bright bracket\b/gi, "]")
    .replace(/\bStartFraction\s+(.+?)\s+Over\s+(.+?)\s+EndFraction\b/g, "($1)/($2)")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "−")
    .replace(/\bequals\b/g, "=");
}

export function stripHtml(html?: string | null): string {
  if (!html) return "";
  let s = decodeEntities(String(html));
  // Expand bare <mfenced> so plain-text snippets keep their parentheses.
  for (let guard = 0; guard < 20 && /<mfenced\b/i.test(s); guard++) {
    s = s.replace(/<mfenced\b([^>]*)>([\s\S]*?)<\/mfenced>/i, (_full, attrs: string, inner: string) => {
      const open = /(?:^|\s)open\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? "(";
      const close = /(?:^|\s)close\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? ")";
      return `${open}${inner}${close}`;
    });
  }
  s = s
    .replace(/<math[\s\S]*?<\/math>/gi, (m) => {
      const alt = /alttext="([^"]*)"/i.exec(m);
      // Only rewrite alttext (math speech), never the surrounding prose.
      return alt ? ` ${humanizeSpokenMath(decodeEntities(alt[1]))} ` : " ";
    })
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** Extract alt="..." fragments from raw HTML for image-based answer keys. */
function extractAltTexts(html: string): string[] {
  const out: string[] = [];
  const re = /alt\s*=\s*["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(decodeEntities(m[1]));
  return out;
}

const WORD_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};
const DEN_WORD: Record<string, number> = {
  half: 2, halves: 2,
  third: 3, thirds: 3,
  quarter: 4, quarters: 4, fourth: 4, fourths: 4,
  fifth: 5, fifths: 5,
  sixth: 6, sixths: 6,
  seventh: 7, sevenths: 7,
  eighth: 8, eighths: 8,
  ninth: 9, ninths: 9,
  tenth: 10, tenths: 10,
};

function wordToNum(w: string): number | null {
  const low = w.toLowerCase();
  if (/^-?\d+$/.test(low)) return Number(low);
  if (WORD_NUM[low] != null) return WORD_NUM[low];
  return null;
}

function parseSpokenFractions(text: string): string[] {
  const results: string[] = [];
  const lower = text.toLowerCase();

  // Pattern: "<num> over <num>"  e.g. "7 over 6" or "10 over 3"
  const overRe = /(\b(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b)\s+over\s+(\b(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b)/gi;
  let m: RegExpExecArray | null;
  while ((m = overRe.exec(lower)) !== null) {
    const n = wordToNum(m[1]);
    const d = wordToNum(m[2]);
    if (n != null && d != null && d !== 0) results.push(`${n}/${d}`);
  }

  // Pattern: "<word> <denWord>" e.g. "three halves", "one fifth"
  const denNames = Object.keys(DEN_WORD).join("|");
  const wordFracRe = new RegExp(`\\b(${Object.keys(WORD_NUM).join("|")}|\\d+)\\s+(${denNames})\\b`, "gi");
  while ((m = wordFracRe.exec(lower)) !== null) {
    const n = wordToNum(m[1]);
    const d = DEN_WORD[m[2].toLowerCase()];
    if (n != null && d) results.push(`${n}/${d}`);
  }

  // Also plain numeric fractions  like 3/2 inside alt/text
  const slashRe = /-?\d+\s*\/\s*\d+/g;
  let s: RegExpExecArray | null;
  while ((s = slashRe.exec(text)) !== null) {
    results.push(s[0].replace(/\s+/g, ""));
  }

  // plain decimal / integer numbers that look like answers? Only keep if near "correct answer" context – handled elsewhere.
  return [...new Set(results)];
}

/**
 * Pull a free-response key out of a College Board explanation when the
 * stored correct_answer field is blank (legacy import bug).
 * Examples: "The correct answer is 3,540." → "3540"
 * Now also understands image alt texts like "three halves" → "3/2".
 */
export function extractAnswerFromExplanation(explanation?: string | null): string {
  if (!explanation) return "";
  const raw = String(explanation);
  const altTexts = extractAltTexts(raw);
  const altJoined = altTexts.join(" ");
  const text = stripHtml(raw) + " " + altJoined;

  // First try spoken fractions from alt + text
  const spoken = parseSpokenFractions(altJoined + " " + text);

  const either = /correct answer is either\s+(.+?)\./i.exec(text);
  if (either) {
    const parts = either[1].match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g);
    if (parts?.length) return parts.join("|");
    // If numeric regex failed, try spoken fractions collection near this sentence
    const nearbySpoken = parseSpokenFractions(either[1]);
    if (nearbySpoken.length) return nearbySpoken.join("|");
    if (spoken.length >= 2) {
      // assume the either case is represented by these spoken fractions
      // e.g. alt contains 10/3 15/4 25/6 for eeb4143c
      // Heuristic: if we found >=2 spoken fractions globally, return them
      if (spoken.length >= 2 && /either/i.test(either[0])) return spoken.slice(0, 5).join("|");
    }
  }
  const single =
    /correct answer is\s+(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?(?:\/\d+)?)/i.exec(
      text,
    );
  if (single) return single[1].replace(/,/g, "");

  // If we got spoken fractions and they look like the answer (e.g., single image answer)
  if (spoken.length === 1) return spoken[0];
  // Multiple spoken but we are not in either case: if text says "correct answer is <img>", alt is the answer.
  // Prefer first spoken if text contains "correct answer is"
  if (/correct answer is/i.test(text) && spoken.length > 0) {
    // Return all found if small set, else first
    if (spoken.length <= 3) return spoken.join("|");
    return spoken[0];
  }

  const choice = /Choice\s+([A-D])\s+is correct/i.exec(text);
  if (choice) return choice[1].toUpperCase();
  return "";
}

/** Prefer the stored key; fall back to parsing the explanation. */
export function resolveCorrectAnswer(
  correctAnswer?: string | null,
  explanation?: string | null,
): string {
  const stored = String(correctAnswer ?? "").trim();
  if (stored && stored !== "?") return stored;
  return extractAnswerFromExplanation(explanation);
}

/**
 * Normalized free-response comparison.
 * - case / whitespace insensitive
 * - ignores thousands separators (3,540 === 3540)
 * - accepts any of several pipe-separated keys (0|3)
 * - treats leading-dot decimals as 0.x (.5 === 0.5)
 * - strips trailing .0 from whole numbers
 * - accepts equivalent fractions vs decimals within a tight tolerance
 */
export function answersMatch(a?: string | null, b?: string | null): boolean {
  if (a == null || b == null) return false;
  const student = String(a).trim();
  const key = String(b).trim();
  if (!student || !key) return false;

  const keys = key.split("|").map((part) => part.trim()).filter(Boolean);
  return keys.some((accepted) => singleAnswerMatch(student, accepted));
}

function singleAnswerMatch(student: string, accepted: string): boolean {
  const normText = (x: string) =>
    x
      .trim()
      .toLowerCase()
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/\s+/g, "")
      .replace(/,/g, "");

  const s = normText(student);
  const t = normText(accepted);
  if (!s || !t) return false;
  if (s === t) return true;

  const sNum = parseLooseNumber(s);
  const tNum = parseLooseNumber(t);
  if (sNum != null && tNum != null) {
    // Absolute epsilon for small values, relative for large ones.
    const tol = Math.max(1e-9, Math.abs(tNum) * 1e-9);
    if (Math.abs(sNum - tNum) <= tol) return true;
  }
  return false;
}

function parseLooseNumber(raw: string): number | null {
  let x = raw.trim();
  if (!x) return null;
  // leading-dot decimals: .5 → 0.5
  if (/^[+-]?\.\d+$/.test(x)) x = x.replace(".", "0.");
  // simple fraction a/b
  const frac = /^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(x);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }
  // strip trailing .0 from "12.0"
  x = x.replace(/\.0+$/, "");
  if (!/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(x)) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
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

/** SAT Nexus displays calendar times in its home time zone (Detroit / Eastern). */
export const DETROIT_TIME_ZONE = "America/Detroit";
export function formatDetroitDate(value: string | number | Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", { timeZone: DETROIT_TIME_ZONE, ...options }).format(new Date(value));
}
export function formatDetroitDateTime(value: string | number | Date) {
  return formatDetroitDate(value, { dateStyle: "medium", timeStyle: "short" });
}

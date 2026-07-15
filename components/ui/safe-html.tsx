"use client";
import * as React from "react";

function decodeEntitiesOnce(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Un-escape double-encoded HTML: &lt;p&gt; -> <p>
function fullyDecode(html: string): string {
  let prev = "";
  let cur = html;
  // repeat up to 3 times to handle double/triple encoding
  for (let i = 0; i < 3 && cur !== prev; i++) {
    prev = cur;
    // if it looks like escaped markup but has no real tags, decode
    if (cur.includes("&lt;") && !cur.includes("<p") && !cur.includes("<div") && !cur.includes("<table") && !cur.includes("<math") && !cur.includes("<span") && !cur.includes("<em") && !cur.includes("<strong")) {
      cur = decodeEntitiesOnce(cur);
      continue;
    }
    // always decode common entities that break reading
    cur = decodeEntitiesOnce(cur);
    // break if stable
    if (cur === prev) break;
  }
  return cur;
}

export function SafeHtml({ html, className, as = "div" }: { html?: string | null; className?: string; as?: keyof JSX.IntrinsicElements }) {
  if (!html) return null;
  let clean = String(html);
  // fully decode entities first
  clean = fullyDecode(clean);
  // normalize SAT blank markers so users don't see raw accessibility helper text
  clean = clean
    .replace(/<span[^>]*aria-hidden=(["'])true\1[^>]*>\s*_+\s*<\/span>\s*<span[^>]*class=(["'])sr-only\2[^>]*>\s*blank\s*<\/span>/gi, "_____")
    .replace(/<span[^>]*class=(["'])sr-only\1[^>]*>\s*blank\s*<\/span>/gi, "")
    .replace(/\b_+\s*blank\b/gi, "_____");
  // strip script / on* handlers (very basic)
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/\son\w+="[^"]*"/gi, "");
  clean = clean.replace(/\son\w+='[^']*'/gi, "");
  clean = clean.replace(/javascript:/gi, "");

  const Tag = as as any;
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
export default SafeHtml;

"use client";

import * as React from "react";
import { decodeEntities } from "@/lib/utils";

// Un-escape double-encoded HTML: &lt;p&gt; -> <p>
function fullyDecode(html: string): string {
  let prev = "";
  let cur = html;
  for (let i = 0; i < 3 && cur !== prev; i++) {
    prev = cur;
    cur = decodeEntities(cur);
    if (cur === prev) break;
  }
  return cur;
}

export function SafeHtml({
  html,
  className,
}: {
  html?: string | null;
  className?: string;
}) {
  if (!html) return null;
  let clean = String(html);
  clean = fullyDecode(clean);
  clean = clean
    .replace(/<span[^>]*aria-hidden=(["'])true\1[^>]*>\s*_+\s*<\/span>\s*<span[^>]*class=(["'])sr-only\2[^>]*>\s*blank\s*<\/span>/gi, "_____")
    .replace(/<span[^>]*class=(["'])sr-only\1[^>]*>\s*blank\s*<\/span>/gi, "")
    .replace(/\b_+\s*blank\b/gi, "_____");
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/\son\w+="[^"]*"/gi, "");
  clean = clean.replace(/\son\w+='[^']*'/gi, "");
  clean = clean.replace(/javascript:/gi, "");

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
export default SafeHtml;

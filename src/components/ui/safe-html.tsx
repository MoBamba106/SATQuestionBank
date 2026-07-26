"use client";

import * as React from "react";
import { decodeEntities } from "@/lib/utils";

function fullyDecode(html: string): string {
  let previous = "";
  let current = html;
  for (let index = 0; index < 3 && current !== previous; index++) {
    previous = current;
    current = decodeEntities(current);
  }
  return current;
}

function sanitize(html: string) {
  let clean = fullyDecode(html);
  clean = clean
    .replace(/<span[^>]*aria-hidden=(["'])true\1[^>]*>\s*_+\s*<\/span>\s*<span[^>]*class=(["'])sr-only\2[^>]*>\s*blank\s*<\/span>/gi, "_____")
    .replace(/<span[^>]*class=(["'])sr-only\1[^>]*>\s*blank\s*<\/span>/gi, "")
    .replace(/\b_+\s*blank\b/gi, "_____")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<img(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy" decoding="async"$1>');
  return clean;
}

function SafeHtmlInner({ html, className }: { html?: string | null; className?: string }) {
  const clean = React.useMemo(() => html ? sanitize(String(html)) : "", [html]);
  if (!clean) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

export const SafeHtml = React.memo(SafeHtmlInner);
export default SafeHtml;

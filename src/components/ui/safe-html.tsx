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

/**
 * Chromium and Safari often drop MathML <mfenced> fences (the parentheses /
 * brackets around expressions). College Board HTML leans on bare <mfenced>
 * for things like r(x − 8), so we rewrite those tags into explicit
 * <mo>(</mo>…<mo>)</mo> pairs before rendering.
 */
function fixMathFences(html: string): string {
  // Self-closing or empty mfenced first.
  let out = html.replace(/<mfenced\b([^>]*)\/>/gi, (_full, attrs: string) => {
    const open = /(?:^|\s)open\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? "(";
    const close = /(?:^|\s)close\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? ")";
    return `<mrow><mo>${escapeXml(open)}</mo><mo>${escapeXml(close)}</mo></mrow>`;
  });

  // Nested-safe rewrite: repeatedly replace innermost <mfenced>...</mfenced>.
  const fenced =
    /<mfenced\b([^>]*)>([\s\S]*?)<\/mfenced>/i;
  for (let guard = 0; guard < 40 && fenced.test(out); guard++) {
    out = out.replace(fenced, (_full, attrs: string, inner: string) => {
      const open = /(?:^|\s)open\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? "(";
      const close = /(?:^|\s)close\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2] ?? ")";
      const separators = /(?:^|\s)separators\s*=\s*(["'])(.*?)\1/i.exec(attrs)?.[2];
      let body = inner;
      if (separators && separators.length > 0) {
        // Split top-level sibling elements and join with separator mos.
        // For SAT content separators are almost always "," — keep it simple.
        const sep = separators[0] || ",";
        // Only inject if there are multiple top-level mrow/children and no existing commas.
        if (!/<mo[^>]*>\s*,\s*<\/mo>/i.test(body) && (body.match(/<\/mrow>/gi) || []).length >= 2) {
          body = body.replace(/<\/mrow>\s*<mrow/gi, `</mrow><mo>${escapeXml(sep)}</mo><mrow`);
        }
      }
      return `<mrow><mo stretchy="false">${escapeXml(open)}</mo>${body}<mo stretchy="false">${escapeXml(close)}</mo></mrow>`;
    });
  }
  return out;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Some CB stems dump "StartFraction a Over b EndFraction" / "left parenthesis"
 * style alttext into plain questionText. Only rewrite when the payload is
 * clearly spoken math (not ordinary English prose).
 */
function humanizeSpokenMath(text: string): string {
  return text
    .replace(/\bleft parenthesis\b/gi, "(")
    .replace(/\bright parenthesis\b/gi, ")")
    .replace(/\bleft bracket\b/gi, "[")
    .replace(/\bright bracket\b/gi, "]")
    .replace(/\bleft brace\b/gi, "{")
    .replace(/\bright brace\b/gi, "}")
    .replace(/\bStartFraction\s+(.+?)\s+Over\s+(.+?)\s+EndFraction\b/g, "($1)/($2)");
}

function sanitize(html: string) {
  let clean = fullyDecode(html);
  clean = fixMathFences(clean);
  // Plain-text fallback only: rewrite spoken fence/fraction tokens.
  if (!/<[a-z][\s\S]*>/i.test(clean) && /left parenthesis|right parenthesis|StartFraction/i.test(clean)) {
    clean = humanizeSpokenMath(clean);
  }
  clean = clean
    .replace(/<span[^>]*aria-hidden=(["'])true\1[^>]*>\s*_+?\s*<\/span>\s*<span[^>]*class=(["'])sr-only\2[^>]*>\s*blank\s*<\/span>/gi, "_____")
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
  const clean = React.useMemo(() => (html ? sanitize(String(html)) : ""), [html]);
  if (!clean) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

export const SafeHtml = React.memo(SafeHtmlInner);
export default SafeHtml;

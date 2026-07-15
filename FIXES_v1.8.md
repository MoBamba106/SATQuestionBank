# SAT Nexus v1.8 – Soft Paper – Full Fix

Date: 2026-07-07
Theme: Soft Paper #faf8f3 (user confirmed preference – NOT dark #1a1a2e)

## Critical bugs fixed

1. **Module not found `@/components/ui/safe-html`**
   - `SafeHtml` now exports both named + default
   - Quiz page import changed to `@/components/ui/safe-html` (alias works, tsconfig `"@/*": ["./*"]`)
   - Build passes

2. **Raw HTML leaking everywhere**
   - `<p style=...>`, `<figure class="table">`, `<math alttext=...>`, `2003&ndash;2004`, `&rsquo;`
   - New `SafeHtml`:
     - fully decodes entities (up to 3 passes): `&lt;`, `&gt;`, `&amp;`, `&ndash;`, `&mdash;`, `&rsquo;`, `&ldquo;`, numeric `&#...;`
     - strips `<script>` + on* handlers
     - preserves MathML, tables, images, SVG
   - `QuestionCard` stripHtml now double-decodes before stripping tags
   - Quiz, Bank, Editor all use `SafeHtml`

3. **Black inputs / invisible text**
   - `globals.css` forces: `input, select, textarea { background:#fff !important; color:#2b2b2a !important; border:1.5px solid #d5cfc0 !important; }`
   - Every form in QuestionEditor, Quiz, Analytics, Bank updated with `text-ink bg-white`
   - Manual Test Entry modal fixed (was `bg-[#0b1014]` black)

4. **Missing graphs / tables**
   - College Board HTML is preserved end-to-end:
     - `cb-import.ts` saves `questionHtml`, `passageHtml`, `choicesHtml`
     - `cb-seed.ts` upserts `q.questionHtml || q.questionText` → DB `questionText` CONTAINS HTML
     - UI renders via `<SafeHtml html={...} className="sat-content" />`
   - `.sat-content` CSS:
     ```css
     .sat-content table { border-collapse:collapse; background:#fff }
     .sat-content td, th { border:1px solid #d5cfc0; padding:8px 14px }
     .sat-content img { max-width:100%; border-radius:8px }
     ```
   - Images inline in HTML render automatically

5. **Quiz UX**
   - ✅ Check Answer button (no instant feedback)
   - ✅ Results “Congratulations” modal with pie + bar charts
   - ✅ No timer
   - ✅ Desmos ONLY for Math, resizable (range 280-760px + native resize-y)
   - ✅ Flagging
   - ✅ Back / Skip / navigator

6. **Data / scraping**
   - OCR **removed** per spec. `/upload` is now a CB scraper info page.
   - `scripts/cb-import.ts` – hits `https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions`
     - 8 official domains: Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and Trigonometry,
       Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions
     - Preserves HTML
     - Output: `prisma/cb-full.json`
   - `npm run cb:full` → import + seed → 3,444 questions
   - Store v5 (`sat-nexus-bank-v5`) – wipes old synthetic + fake stats
   - `timesAnswered:0`, `timesCorrect:0`, `mastery:0` – zero fake stats

7. **Management**
   - Delete question button in QuestionEditor
   - Edit saves via Zustand + Prisma
   - Bank pagination: 48/page, memoized cards, `useDeferredValue` search – fast

8. **Performance / bloat**
   - Removed: GSAP, vaul, tesseract from runtime deps (optional only)
   - Kept framer-motion minimal (nav + results modal) – can strip later
   - QuestionCard = `React.memo`
   - API `take:5000`
   - Package: `sat-nexus@1.8.0` – “Soft Paper • CB HTML rendering fixed”

9. **Desktop app**
   - `electron-main.js` present
   - `src-tauri/tauri.conf.json` present
   - `npm run desktop` → Electron

## How to load all 3,444 CB questions

```bash
cd sat-question-bank
npm install
npx prisma migrate dev --name init
npm run cb:full   # scrapes qbank-api.collegeboard.org → prisma/cb-full.json → seeds SQLite
npm run dev
# open http://localhost:3000/bank
# Bank auto-syncs from /api/questions
```

If Bank shows “0 eligible • 3444 total”, pick Domain = Math or Reading & Writing – “All” skill filter works, subskill defaults to All.

## Files changed in v1.8

- `components/ui/safe-html.tsx` – full entity decode, script strip
- `components/question-card.tsx` – robust stripHtml + decode
- `app/quiz/page.tsx` – `@/components/ui/safe-html` import, always SafeHtml, soft-paper colors, light tooltips, white inputs, Desmos Math-only resizable
- `components/question-editor.tsx` – `text-ink bg-white` everywhere, passage field, Delete button
- `app/upload/page.tsx` – OCR removed, CB scraper instructions
- `components/nav-shell.tsx` – soft paper sidebar, v1.8 branding
- `app/analytics/page.tsx` – light inputs, light recharts tooltips
- `lib/store.ts` – v5 persist key, zero stats, improved sync
- `app/globals.css` – input force-white, `.sat-content` tables/math
- `package.json` – 1.8.0

All 8 official SAT domains supported, answer checking is manual, results page shows congratulations, no confidence slider, no timer.

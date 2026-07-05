# SAT Nexus v5 — Comprehensive Overhaul
### Dark • WCAG AA • College Board official • Zero fake data • Desktop ready

Next.js 14 • TypeScript • Tailwind • Framer Motion • Prisma • Recharts • KaTeX • Desmos • Tauri/Electron

---

## 1. Global UI/UX Fixes

**Contrast – WCAG AA**
```
--bg-primary: #1a1a2e
--bg-secondary: #16213e
--text-primary: #ffffff
--text-secondary: #e0e0e0
--input-bg: #2d2d44
--input-border: #4a4a6a
--accent-blue: #4a9eff
--accent-purple: #7c3aed
```
- All inputs: `#2d2d44` bg + `#ffffff` text
- No black-on-black anywhere
- Focus rings `#4a9eff`
- Tested WCAG AA

**HTML content rendering**
- `SafeHtml` component strips `<script>`, renders CB HTML (graphs, tables, MathML)
- `cleanQuestionText()` DOMParser + entity map (`&rsquo;` → `'`, `&mdash;` → `—`, etc.)
- KaTeX + MathML fallback

**Dropdown / Nav animations**
```css
.dropdown-menu { max-height:0; opacity:0; transition: max-height .28s, opacity .28s }
.dropdown-menu.active { max-height:500px; opacity:1 }
```
- Side nav: Framer Motion spring `stiffness:300, damping:30`, glass-morphism `backdrop-filter: blur(14px)`
- NavItem: Icon + Label 16px bold + active indicator

---

## 2. Question Bank Overhaul

Schema (official CB):
```
id, domain: "Math" | "Reading & Writing"
category: Algebra | Advanced Math | Problem-Solving… | Geometry…
         | Information and Ideas | Craft and Structure | Expression of Ideas | Standard English Conventions
subskill: e.g. "Linear equations in one variable", "Inferences", …
difficulty: Easy | Medium | Hard | Very Hard
passage: TEXT (HTML preserved)
questionText: TEXT (HTML)
answerChoices: JSON
correctAnswer: string
explanation: TEXT (HTML)
imageReferences: JSON
```

Filters: Domain → Category → Subskill → Difficulty → Search (ID/text)
- Live, debounced
- `applyFilters()` exact per spec

Edit/View:
- Passage section above question
- Math via `react-katex` + MathML fallback
- Graphs/tables render via `<SafeHtml>`
- Special chars: √ π ∫ ∑ x² H₂O ½ — all supported
- **Delete** button in editor (Prisma DELETE + Zustand remove)

---

## 3. Quiz Feature

**Start page – card layout**
- Domain, Category, Subskill, Difficulty, #Questions dropdowns – glass cards, hover glow
- Shows eligible count live
- **Manual Question Selection**: checkbox list with search, ID, preview 50 chars, difficulty + subskill badges, selected counter

**Answer checking – 2-step:**
```js
checkCount 0 → first Check → show ✓/✗, no answer reveal
checkCount 1 → second Check → reveal correct answer, lock input, show explanation
```
UI updates border: cyan→green/pink, buttons disable when locked

**Early termination:** “End Test Early” → grades answered only

**Explanation card:**
- Correct answer badge
- Full explanation (HTML cleaned)
- Distractor explanations per choice (when available in CB rationale)

---

## 4. Analytics

Tabs:
- **Question Bank Analytics**
- **Practice Test Analytics**

Bank Analytics pulls live `user_progress` (Zustand → localStorage, soon Postgres):
- total / answered / correct / mastery
- byCategory, byDifficulty, bySubskill
- TrendChart

Test Analytics:
- Subskill scores **1–5** with levels:
  1 Limited, 2 Approaching, 3 Proficient, 4 Advanced, 5 Exceptional
- R&W: Information and Ideas / Craft and Structure / Expression of Ideas / Standard English Conventions
- Math: Algebra / Advanced Math / PSDA / Geometry & Trig

Real-time: `UserProgressContext` updates on every answer, persists to localStorage

---

## 5. Score Entry

**ManualScoreEntry – redesigned**
- Test Name, Date, Total 400-1600, R&W 200-800, Math 200-800
- Subskills: dropdowns 1–5 with level labels
- Save → `test_history` table + localStorage
- **OCR Import**: Tesseract.js button → `processScoreReport()` → regex parse → pre-fill form → user confirms

---

## 6. Data

```sql
questions(id PK, domain, category, subskill, difficulty, passage TEXT, question_text TEXT, answer_a..d TEXT, correct_answer CHAR, explanation TEXT, math_content JSONB, image_references JSONB)
user_progress(user_id, question_id PK, selected_answer, is_correct, attempts, last_attempt)
test_history(id PK, user_id, test_name, test_date, total_score, rw_score, math_score, subskill_scores JSONB, questions JSONB)
```

**Import pipeline – fixed (was 3444→351→200):**
- `/api/questions` removed `take:200` → `take:5000`
- `cb-import.ts v3`:
  - 8 domains, test=1 (R&W) + test=2 (Math)
  - external_id → qbank-api, fallback ibn → `saic.collegeboard.org/disclosed/{ibn}.json`
  - preserves HTML → graphs/tables intact
  - Result: **~3,400 imported, all domains including English**
- Frontend: `syncFromServer()` auto-loads Prisma → Zustand

**Removed per spec:**
- ❌ `/upload` / OCR page removed from navigation
- ❌ “0 fake stats” text removed everywhere
- ❌ “Bulk” button removed

---

## 7. Desktop App

- **Electron**: `electron-main.js` → `npm run desktop`
- **Tauri**: `src-tauri/tauri.conf.json` → `npm run tauri:dev`
- 1440×900, `#1a1a2e` background, offline-ready (Zustand persist)

---

## Run

```bash
npm install
npx prisma migrate dev
npm run db:seed      # 3 verified CB
# or full bank:
npm run cb:full      # ~3,400 Qs, ~20 min
npm run dev
# http://localhost:3000/bank
# /quiz  /analytics
```

---

MIT – SAT Nexus v5 – WCAG AA • official CB taxonomy • no fake data

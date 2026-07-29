# Migration: Desktop → Web (Vercel + CloudBase)

## Before

- Next.js + **PGlite / local Postgres**
- **Electron / Tauri** packaging for `.exe`
- Single-user tables (no `user_id`)

## After

- Next.js **App Router** browser app only
- **Vercel** deployment
- **Postgres** via `DATABASE_URL` (CloudBase RDB / Neon / etc.)
- **CloudBase Auth** (optional guest mode)
- Multi-user data: favorites, notes, collections, sessions, attempts

## Removed

- `electron-main.js`, `desktop-launcher.js`, `src-tauri/`, desktop scripts
- `cross-env` / Tauri static export modes
- Desktop-only docs (`BUILD_APP.md`, `DESKTOP.md`)

## Preserved

- Full question bank, filters, quiz, Bluebook tests, mistakes, collections
- Themes, settings, command palette, math rendering fixes
- Analytics / study sessions UI

## Deploy checklist

1. Create Postgres + set `DATABASE_URL` on Vercel  
2. (Optional) CloudBase env + secrets for sign-in  
3. `git push` → Vercel auto-build  
4. Hit `/api/health` — should return `{ ok: true, database: "postgres" }`  

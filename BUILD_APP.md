# SAT Nexus – Build a real desktop app (double-click installer)

v1.8.2 – Soft Paper – Windows / Mac / Linux

You asked: “make it so it is a real app. Like one that I can click on the desktop icon and it opens up it runs but in the developer way. I want to turn it into an app that I can download and click. Like an official app.”

You have **2 official build pipelines** – both produce a real installer with Start Menu + Desktop icon.

---

## FASTEST – Electron (1 command, ~5 min)

No Rust needed. Produces:
- `dist-electron/SAT-Nexus-Setup-1.8.2.exe` – NSIS installer, Start Menu + Desktop shortcut
- `dist-electron/SAT-Nexus-Portable-1.8.2.exe` – portable, no install, double-click to run

```powershell
cd sat-question-bank

# 1. install
npm install

# 2. (optional) load full CB bank
# npm run cb:full

# 3. build web app
npm run build

# 4. package
npm run desktop:build
# → dist-electron/SAT-Nexus-Setup-1.8.2.exe   (~140 MB)
# → dist-electron/SAT-Nexus-Portable-1.8.2.exe
```

Double-click the Setup → installs → Desktop icon “SAT Nexus” → opens Soft Paper app, no terminal, no `npm run dev`.

What’s inside:
- Electron 31 – Chromium shell
- Next.js 14 production server (`next start`) auto-spawned, hidden
- SQLite + Prisma bundled
- Icon: `src-tauri/icons/icon.ico`
- Auto-updater ready (electron-builder)

Uninstall: Windows Settings → Apps → SAT Nexus → Uninstall

---

## SMALL – Tauri v2 (~8 MB installer, needs Rust)

```powershell
# prerequisites (once):
# - Rust: https://rustup.rs
# - VS Build Tools C++
# - WebView2 (built into Win11)

cd sat-question-bank
npm install
npm run tauri:build
```

Output:
```
src-tauri/target/release/bundle/
  msi/SAT Nexus_1.8.2_x64_en-US.msi
  nsis/SAT Nexus_1.8.2_x64-setup.exe
```

Double-click MSI → installs → Start Menu “SAT Nexus”.

Tauri uses the system WebView – much smaller.

---

## What changed in v1.8.2 to make it “real app”

- `next.config.mjs`: `output: 'standalone'`
- `electron-main.js`:
  - Detects `app.isPackaged`
  - Dev: spawns `next dev`
  - Prod: spawns `next start`
  - Waits for http://localhost:3000 ready, then shows window
  - Hides menu bar, Soft Paper `#faf8f3` background, proper icon
  - Clean shutdown kills Next server
- `package.json`:
  ```
  "desktop:build": "npm run build && npx electron-builder --win --x64"
  "app:build": "npm run build && npm run desktop:build"
  ```
  electron-builder config:
  - appId `ai.arena.satnexus`
  - asar: true
  - NSIS oneClick, Desktop + Start Menu shortcuts
  - icon `src-tauri/icons/icon.ico`
  - output `dist-electron/`
- Tauri:
  - `src-tauri/` full Cargo project
  - `tauri.conf.json` v1.8.2, background `#faf8f3`
  - icons: `.ico`, `.png`, `32x32`, `128x128`
- Version bumped everywhere: `1.8.2`

---

## Quick test (no installer)

```powershell
npm run desktop:go
```
→ starts Next, opens Electron, looks exactly like the installed app.

---

## Distribute to friends

Send them:
- `dist-electron/SAT-Nexus-Setup-1.8.2.exe`  (~140 MB – Electron)
or
- `src-tauri/target/release/bundle/msi/SAT Nexus_1.8.2_x64_en-US.msi` (~8 MB – Tauri)

They double-click → Next → Finish → Desktop icon “SAT Nexus” → launches instantly, offline, no Node, no `npm`.

---

## Troubleshooting

**`icons/icon.ico not found`**
→ you’re on an old checkout. Download `sat-nexus-desktop-fix-v181.zip` – or run:
```
npx @tauri-apps/cli icon src-tauri/icons/icon.png
```

**`Cannot find module @tauri-apps/cli/tauri.js`**
→ use `npm run tauri:dev` (now runs `npx tauri dev`), NOT `tauri dev` directly. Or just use Electron: `npm run desktop:go`.

**Blank white window**
→ Next server didn’t start in time. electron-main.js now waits up to 45s – check http://localhost:3000 in browser.

**Build fails “node_modules …” too big**
→ Normal. electron-builder packs ~180 MB node_modules → ~140 MB installer, ~350 MB installed. Tauri build is ~8 MB.

---

Enjoy – SAT Nexus v1.8.2 is now a real, installable Windows app with Desktop icon, Start Menu entry, proper uninstaller, Soft Paper UI, CB HTML rendering fixed.

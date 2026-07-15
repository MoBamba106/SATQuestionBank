# SAT Nexus – Desktop App v1.8.1

**If Tauri gave you:**
```
Error: Cannot find module '...node_modules\@tauri-apps\cli\tauri.js'
node:internal/modules/cjs/loader:1503
```
→ This is fixed in v1.8.1. See “Tauri MODULE_NOT_FOUND fix” below.

You have **two** desktop options. Recommended: **Electron** (1 command, no Rust).

---

## Option A – Electron (fastest, no Rust) – RECOMMENDED

Already scaffolded in `electron-main.js` (background `#faf8f3`).

```powershell
cd sat-question-bank
npm install
# first time only – installs electron
npm run desktop:install

# then
npm run desktop
```

This spawns `next dev -p 3000` then opens an Electron window (1440×900).

Build a distributable:
```powershell
npx electron-builder --win --x64
```
Output → `dist/`

---

## Option B – Tauri v2 (smaller binary, needs Rust)

Full Tauri scaffold is now in `src-tauri/`:

- `src-tauri/Cargo.toml` – sat-nexus 1.8.0
- `src-tauri/src/main.rs` / `lib.rs`
- `src-tauri/tauri.conf.json` – Soft Paper `#faf8f3`, window 1440×900
- `src-tauri/capabilities/default.json`
- `src-tauri/icons/icon.png`

Prereqs (Windows):
1. Install Rust: https://rustup.rs – run `rustup default stable`
2. Install Visual Studio Build Tools (C++): https://visualstudio.microsoft.com/visual-cpp-build-tools/
   – check “Desktop development with C++”
3. WebView2 – already in Windows 11

Then:
```powershell
cd sat-question-bank
npm install
# tauri CLI is now in devDependencies
npm run tauri:dev
# or: npx tauri dev
```

If you saw:
```
failed to watch ...\src-tauri\Cargo.toml: Input watch path is neither a file nor a directory.
```
→ That was because `src-tauri/` was empty except `tauri.conf.json`. v1.8 now ships the full Cargo project, so `npm run tauri:dev` works.

First run will compile Rust (~3-8 min). Subsequent runs are instant.

Build release:
```powershell
npm run tauri:build
```
Output: `src-tauri/target/release/bundle/`

---

## Troubleshooting

**`npm error Missing script: "tauri:dev"`**
- Fixed in v1.8 – `package.json` now has:
  ```
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
  ```

**`failed to watch Cargo.toml`**
- Fixed – full `src-tauri/` scaffold added.

**White screen / cannot connect**
- Make sure `npm run dev` is running on :3000 first, or let Tauri/Electron spawn it.
- Check firewall.

**Icons missing**
- `src-tauri/icons/icon.png` is included. Add more sizes (32x32, 128x128, .ico) for production with:
  ```
  npx tauri icon src-tauri/icons/icon.png
  ```

Recommended for quick testing: **Electron** (`npm run desktop:go`).
For shipping: **Tauri** (`npm run tauri:build`) → ~8 MB vs ~120 MB Electron.

---

## Tauri MODULE_NOT_FOUND fix (v1.8.1)

Error you saw:
```
Error: Cannot find module 'C:\...\node_modules\@tauri-apps\cli\tauri.js'
code: 'MODULE_NOT_FOUND'
Node.js v24.16.0
```

Cause:
- `package.json` had `"tauri": "tauri"` which tries to require `./node_modules/@tauri-apps/cli/tauri.js` – that file does **not exist** in @tauri-apps/cli v2 (it's ESM bin, not CJS).
- Node 24 + missing local install = crash.

Fix in v1.8.1:
- All tauri scripts now use `npx`:
  ```
  "tauri": "npx tauri",
  "tauri:dev": "npx tauri dev",
  "tauri:build": "npx tauri build"
  ```
- Added full `src-tauri/` Cargo project (was empty before → `failed to watch Cargo.toml`)
- Added `@tauri-apps/api@2` + `@tauri-apps/plugin-shell@2`
- Added Electron fallback with one-click launcher

If you still see MODULE_NOT_FOUND:
```powershell
# 1. clean
cd sat-question-bank
rmdir /s /q node_modules
del package-lock.json

# 2. fresh install (Node 20 LTS recommended – Node 24 is very new)
npm install --no-audit

# 3. use Electron (0 Rust needed)
npm run desktop:go
# or double-click start-desktop.bat
```

Tauri (if you want native Rust):
```powershell
npm run tauri:install
npm run tauri:dev
# first compile 3-8 min
```

If Tauri still fails on Node 24, use Electron – identical UI, Soft Paper theme, 100% feature parity.


# Build SAT Nexus as a Windows app (.exe)

You do **not** need Tauri or Rust for a normal desktop installer.

## Recommended: Electron (full app, works offline)

This packages the real Next.js server + embedded question database into a
double-clickable Windows installer.

### One-time setup

```powershell
cd $env:USERPROFILE\Downloads\SATQuestionBank
# If you cloned from GitHub, pull the latest build fixes first:
git pull

npm install
```

### Build the installer

```powershell
npm run app:build
```

That single command:

1. Builds the web app
2. Installs Electron tooling if needed
3. Creates installers under `dist-electron\`

### What you get

| File | What it is |
|------|------------|
| `dist-electron\SAT Nexus-Setup-1.9.0.exe` | Installer (Start Menu + Desktop shortcut) |
| `dist-electron\SAT Nexus-Portable-1.9.0.exe` | Portable – no install, just double-click |

Double-click **Setup** → install → open **SAT Nexus** from the Desktop.

Your practice data is stored under your user profile (not inside Program Files),
so it survives app updates.

### Dev desktop window (no installer)

```powershell
npm run desktop
```

Opens Electron against `next dev` for day-to-day coding.

---

## Optional: Tauri (small binary, incomplete backend)

Tauri builds a **static** front-end shell. API routes are disabled during that
build, so the question bank / practice tests will **not** fully work.

Only use this if you specifically want a tiny WebView wrapper and already have:

- Rust (`rustup`)
- Visual Studio Build Tools (C++ workload)
- WebView2 (included on Windows 11)

```powershell
npm install
npm run tauri:build
```

Output (if successful):

```
src-tauri\target\release\bundle\nsis\
src-tauri\target\release\bundle\msi\
```

If you previously saw:

```
'cross-env' is not recognized...
```

that is fixed — the scripts no longer depend on a global `cross-env`.

If a failed Tauri build left the API disabled, run:

```powershell
node scripts/tauri-postbuild.js
```

or simply:

```powershell
npm run app:build
```

which restores `src/app/api` automatically.

---

## Troubleshooting

### `npm run tauri:build` / `cross-env` errors
Use Electron instead:

```powershell
npm run app:build
```

### Build fails on `next build`
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run build
```

### Installer builds but app window is blank
Wait ~10–20 seconds on first launch while the local server starts and the
question bank seeds. Check Task Manager for a `node`/`SAT Nexus` process.

### Antivirus quarantines the .exe
Unsigned Electron apps are often flagged the first time. Allow the file, or
right-click → Properties → Unblock.

### Still on an old download folder
Make sure you pulled the latest branch:

```powershell
git fetch origin
git checkout arena/019fa463-satquestionbank
git pull origin arena/019fa463-satquestionbank
npm install
npm run app:build
```

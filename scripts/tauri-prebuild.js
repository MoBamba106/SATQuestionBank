/**
 * Prepare a static Next export for Tauri packaging.
 * API routes cannot ship in a pure static export — they are moved aside
 * for the build and always restored afterwards (also on failure).
 *
 * Prefer Electron (`npm run app:build`) if you want the full local
 * database + API inside a Windows .exe.
 */
const fs = require("fs");
const path = require("path");

const api = path.join(__dirname, "..", "src", "app", "api");
const bak = path.join(__dirname, "..", "src", "app", "_api_disabled");

function restore() {
  if (fs.existsSync(bak) && !fs.existsSync(api)) {
    fs.renameSync(bak, api);
    console.log("→ restored src/app/api");
  }
}

// Always restore first so a previous failed build can't leave API disabled.
restore();

if (fs.existsSync(api)) {
  if (fs.existsSync(bak)) fs.rmSync(bak, { recursive: true, force: true });
  fs.renameSync(api, bak);
  console.log("→ src/app/api → src/app/_api_disabled (static export)");
} else {
  console.log("src/app/api already disabled");
}

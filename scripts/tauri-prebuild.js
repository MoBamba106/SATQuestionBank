/**
 * Prepare a static Next export for Tauri packaging.
 * API routes cannot ship in a pure static export — they are moved aside
 * for the build and restored afterwards. Prefer Electron (`npm run desktop`)
 * if you need the full local PGlite/API stack inside the .exe.
 */
const fs = require("fs");
const path = require("path");

const api = path.join(__dirname, "..", "src", "app", "api");
const bak = path.join(__dirname, "..", "src", "app", "_api_disabled");

if (fs.existsSync(api)) {
  if (fs.existsSync(bak)) fs.rmSync(bak, { recursive: true, force: true });
  fs.renameSync(api, bak);
  console.log("→ src/app/api → src/app/_api_disabled (static export)");
} else {
  console.log("src/app/api already disabled");
}

#!/usr/bin/env node
/**
 * Optional Tauri build (needs Rust + VS C++ Build Tools on Windows).
 *
 * NOTE: Tauri static export disables the API routes. The resulting app
 * will NOT have the full question bank backend. Prefer:
 *
 *   npm run app:build
 *
 * for a working offline Windows installer with Electron.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const isWin = process.platform === "win32";

function run(command, args, opts = {}) {
  console.log(`\n> ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, ...opts.env },
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function restoreApi() {
  const api = path.join(root, "src", "app", "api");
  const bak = path.join(root, "src", "app", "_api_disabled");
  if (fs.existsSync(bak) && !fs.existsSync(api)) {
    fs.renameSync(bak, api);
    console.log("Restored src/app/api");
  }
}

process.on("exit", restoreApi);
process.on("SIGINT", () => {
  restoreApi();
  process.exit(1);
});

console.log("⚠ Tauri builds a static shell only.");
console.log("  For a full working .exe with the question bank, use:  npm run app:build\n");

try {
  require.resolve("@tauri-apps/cli", { paths: [root] });
} catch {
  console.log("Installing @tauri-apps/cli…");
  run(isWin ? "npm.cmd" : "npm", ["install", "--save-dev", "@tauri-apps/cli@^2.5.0", "--no-audit", "--no-fund"]);
}

run(isWin ? "node" : "node", [path.join("scripts", "tauri-prebuild.js")]);
run(isWin ? "node" : "node", [path.join("scripts", "with-env.js"), "TAURI=1", "--", "next", "build"]);
run(isWin ? "node" : "node", [path.join("scripts", "tauri-postbuild.js")]);

const tauriCli = path.join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
if (!fs.existsSync(tauriCli)) {
  console.error("Tauri CLI missing. Run: npm install --save-dev @tauri-apps/cli");
  process.exit(1);
}
run(isWin ? "node" : "node", [tauriCli, "build"]);

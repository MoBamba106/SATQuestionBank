#!/usr/bin/env node
/**
 * Build a real Windows .exe (Electron + Next standalone).
 *
 *   npm run app:build
 *
 * Output:
 *   dist-electron/SAT Nexus Setup x.y.z.exe   (installer)
 *   dist-electron/SAT Nexus x.y.z.exe         (portable)
 *
 * No Rust. No cross-env. Works in plain PowerShell / cmd.
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
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureDep(pkgName, installSpec) {
  try {
    require.resolve(pkgName, { paths: [root] });
    return;
  } catch {
    console.log(`Installing ${installSpec} (one-time)…`);
    run(isWin ? "npm.cmd" : "npm", ["install", "--save-dev", installSpec, "--no-audit", "--no-fund"]);
  }
}

// Make sure a previous failed Tauri build didn't leave the API disabled.
const api = path.join(root, "src", "app", "api");
const bak = path.join(root, "src", "app", "_api_disabled");
if (fs.existsSync(bak) && !fs.existsSync(api)) {
  fs.renameSync(bak, api);
  console.log("Restored src/app/api from a previous interrupted Tauri build.");
}

console.log("SAT Nexus – building Windows desktop app (Electron)");
console.log("This keeps the full question bank + local database working offline.\n");

ensureDep("electron", "electron@31");
ensureDep("electron-builder", "electron-builder@24");

// Production Next build (standalone output — default when TAURI is unset).
run(isWin ? "npm.cmd" : "npm", ["run", "build"], {
  env: { TAURI: "", NODE_ENV: "production" },
});

// Package with electron-builder using the config in package.json.
run(isWin ? "npx.cmd" : "npx", ["electron-builder", "--win", "--x64"]);

const outDir = path.join(root, "dist-electron");
console.log("\n✅ Desktop build finished.");
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".exe"));
  if (files.length) {
    console.log("Installers:");
    for (const file of files) console.log(`  ${path.join(outDir, file)}`);
  } else {
    console.log(`Check the folder: ${outDir}`);
  }
} else {
  console.log("Look for output under dist-electron/");
}
console.log("\nDouble-click the Setup .exe to install, or the portable .exe to run immediately.");

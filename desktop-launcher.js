#!/usr/bin/env node
// SAT Nexus – one-click desktop launcher (dev)
// Starts Next, then opens Electron when ready.
const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = 3000;
const root = __dirname;
const isWin = process.platform === "win32";

function check(url, cb, tries = 0) {
  http
    .get(url, (res) => {
      res.resume();
      cb(true);
    })
    .on("error", () => {
      if (tries > 90) return cb(false);
      setTimeout(() => check(url, cb, tries + 1), 1000);
    });
}

console.log("SAT Nexus Desktop (dev)");
try {
  require.resolve("electron", { paths: [root] });
} catch {
  console.log("Installing electron (one-time)…");
  execSync("npm install --save-dev electron@31 --no-audit --no-fund", {
    stdio: "inherit",
    cwd: root,
    shell: true,
  });
}

console.log("Starting Next.js…");
const next = spawn(isWin ? "npx.cmd" : "npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], {
  stdio: "inherit",
  shell: true,
  cwd: root,
  env: { ...process.env, DATABASE_MODE: process.env.DATABASE_MODE || "embedded" },
});

check(`http://127.0.0.1:${PORT}`, (ok) => {
  if (!ok) {
    console.error("Next failed to start");
    process.exit(1);
  }
  console.log("Opening Electron…");
  const electron = spawn(isWin ? "npx.cmd" : "npx", ["electron", "."], {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: { ...process.env, SAT_NEXUS_PORT: String(PORT) },
  });
  electron.on("close", () => {
    try {
      next.kill();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  try {
    next.kill();
  } catch {
    /* ignore */
  }
  process.exit(0);
});

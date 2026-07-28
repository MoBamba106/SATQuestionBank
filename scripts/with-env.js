#!/usr/bin/env node
/**
 * Tiny Windows-safe env runner.
 * Usage: node scripts/with-env.js TAURI=1 -- next build
 * Avoids depending on the cross-env binary being on PATH.
 */
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const env = { ...process.env };
const forwarded = [];
let sawSeparator = false;

for (const arg of args) {
  if (!sawSeparator && arg === "--") {
    sawSeparator = true;
    continue;
  }
  if (!sawSeparator && /^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) {
    const eq = arg.indexOf("=");
    env[arg.slice(0, eq)] = arg.slice(eq + 1);
    continue;
  }
  forwarded.push(arg);
}

if (forwarded.length === 0) {
  console.error("Usage: node scripts/with-env.js KEY=value -- command args...");
  process.exit(1);
}

const command = forwarded[0];
const commandArgs = forwarded.slice(1);
const child = spawn(command, commandArgs, {
  env,
  stdio: "inherit",
  shell: true,
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

#!/usr/bin/env node
// SAT Nexus – one-click desktop launcher
// - ensures electron is installed
// - starts Next dev server
// - opens Electron when http://localhost:3000 is ready
const { spawn, execSync } = require('child_process');
const http = require('http');

function check(url, cb, tries=0){
  http.get(url, res=>cb(true)).on('error', ()=>{
    if(tries>60) return cb(false);
    setTimeout(()=>check(url, cb, tries+1), 1000);
  });
}

console.log('SAT Nexus Desktop – Soft Paper v1.8.1');
console.log('Checking electron…');
try {
  require.resolve('electron');
} catch {
  console.log('Installing electron (one-time)…');
  execSync('npm install --save-dev electron@31 --no-audit --no-fund', { stdio: 'inherit' });
}

console.log('Starting Next.js…');
const next = spawn(process.platform==='win32'?'npx.cmd':'npx', ['next','dev','-p','3000'], { stdio: 'inherit', shell: true });

check('http://localhost:3000', ok=>{
  if(!ok){ console.error('Next failed to start'); process.exit(1); }
  console.log('Opening Electron…');
  const electron = spawn(process.platform==='win32'?'npx.cmd':'npx', ['electron', '.'], { stdio: 'inherit', shell: true });
  electron.on('close', ()=>{ next.kill(); process.exit(0); });
});

process.on('SIGINT', ()=>{ next.kill(); process.exit(0); });

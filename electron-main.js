const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
let nextProcess;

const isDev = !app.isPackaged;
const PORT = 3000;

function waitForServer(url, timeoutMs=30000){
  const start = Date.now();
  return new Promise((resolve, reject)=>{
    (function check(){
      http.get(url, res=>resolve(true)).on('error', ()=>{
        if(Date.now()-start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(check, 500);
      });
    })();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#faf8f3',
    icon: path.join(__dirname, 'src-tauri', 'icons', 'icon.png'),
    title: 'SAT Nexus',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  win.once('ready-to-show', ()=> win.show());
  win.loadURL(`http://localhost:${PORT}`);
  if (isDev) {
    // win.webContents.openDevTools();
  }
  win.setMenuBarVisibility(false);
}

app.whenReady().then(async ()=>{
  // Start Next.js server
  const nextCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const nextArgs = isDev ? ['next', 'dev', '-p', String(PORT)] : ['next', 'start', '-p', String(PORT), '-H', '127.0.0.1'];
  // In packaged app, next is in app.asar.unpacked node_modules/.bin
  nextProcess = spawn(nextCmd, nextArgs, {
    cwd: __dirname,
    shell: true,
    stdio: isDev ? 'inherit' : 'ignore',
    env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production', PORT: String(PORT) }
  });

  try {
    await waitForServer(`http://localhost:${PORT}`, 45000);
    createWindow();
  } catch(e){
    console.error('Next server failed to start', e);
    app.quit();
  }
});

app.on('window-all-closed', ()=>{
  if (nextProcess) { try { nextProcess.kill(); } catch{} }
  app.quit();
});

app.on('activate', ()=>{
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


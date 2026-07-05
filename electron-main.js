const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let nextProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#050505',
    titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadURL('http://localhost:3000');
}

app.whenReady().then(()=>{
  // start next dev server
  nextProcess = spawn('npx', ['next', 'dev', '-p', '3000'], { cwd: __dirname, shell: true, stdio: 'inherit' });
  setTimeout(createWindow, 4000);
});

app.on('window-all-closed', ()=>{ if (nextProcess) nextProcess.kill(); app.quit(); });

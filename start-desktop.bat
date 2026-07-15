@echo off
echo SAT Nexus Desktop – Soft Paper v1.8.1
cd /d %~dp0
echo Installing deps (first run may take 2-3 min)…
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo npm install failed. Try: npm cache clean --force
  pause
  exit /b 1
)
echo.
echo Starting desktop app…
node desktop-launcher.js
pause

@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
echo Starting LSCC Finance Manager Central Server on port 4785...
node server.js
pause

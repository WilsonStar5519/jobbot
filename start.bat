@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting HKPA interview coach at http://127.0.0.1:3000
start "" http://127.0.0.1:3000
node server/index.mjs
pause

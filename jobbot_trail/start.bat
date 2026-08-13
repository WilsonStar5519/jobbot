@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
REM 試驗版用獨立埠，避免同原版（3000 / 8090）衝突
set APP_PORT=3001
set LLM_PORT=8091
echo Starting jobbot_trail (test copy) at http://127.0.0.1:3001
echo Original platform remains at http://127.0.0.1:3000 if you start it separately.
echo Do not load both language models on the GPU at the same time.
start "" http://127.0.0.1:3001
node server/index.mjs
pause

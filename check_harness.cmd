@echo off
setlocal
cd /d %~dp0
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  exit /b 1
)
echo [1/2] Running unit tests...
node tests\core.test.js
if errorlevel 1 exit /b 1
echo [2/2] Checking required files...
for %%F in (index.html style.css src\game.js src\game-core.js harness\app_blueprint.yaml README.md) do (
  if not exist %%F (
    echo [ERROR] Missing %%F
    exit /b 1
  )
)
echo PASS: harness checks complete.
exit /b 0

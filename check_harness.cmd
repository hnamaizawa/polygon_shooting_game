@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [1/3] Checking required files...
for %%F in (index.html style.css src\game.js src\game-core.js harness\app_blueprint.yaml README.md tests\core.test.js) do (
  if not exist "%%F" (
    echo [ERROR] Missing %%F
    exit /b 1
  )
)
echo PASS: required files found.

echo [2/3] Checking harness/source invariants...
findstr /C:"const VERSION = '0.2.0'" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] Expected game version was not found in src\game-core.js.
  exit /b 1
)
findstr /C:"function project3D" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] project3D was not found in src\game-core.js.
  exit /b 1
)
findstr /C:"function projectChase3D" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] projectChase3D was not found in src\game-core.js.
  exit /b 1
)
findstr /C:"function spheresHit" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] spheresHit was not found in src\game-core.js.
  exit /b 1
)
findstr /C:"function makeEnemy" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] makeEnemy was not found in src\game-core.js.
  exit /b 1
)
findstr /C:"function drawTexturedTriangle" "src\game.js" >nul
if errorlevel 1 (
  echo [ERROR] texture-mapped polygon renderer was not found in src\game.js.
  exit /b 1
)
findstr /C:"non_negotiable_invariants:" "harness\app_blueprint.yaml" >nul
if errorlevel 1 (
  echo [ERROR] non_negotiable_invariants was not found in harness\app_blueprint.yaml.
  exit /b 1
)
echo PASS: baseline source/harness invariants.

echo [3/3] Running JavaScript unit tests when Node.js is available...
where node >nul 2>nul
if errorlevel 1 (
  echo [WARN] Node.js was not found in PATH.
  echo [WARN] JavaScript unit tests were skipped; baseline harness checks passed.
  echo [INFO] Install Node.js LTS later if you want to run the full unit-test suite.
  echo PASS: harness checks complete ^(baseline mode^).
  exit /b 0
)

node --check src\game-core.js
if errorlevel 1 (
  echo [ERROR] src\game-core.js syntax check failed.
  exit /b 1
)
node --check src\game.js
if errorlevel 1 (
  echo [ERROR] src\game.js syntax check failed.
  exit /b 1
)
node tests\core.test.js
if errorlevel 1 (
  echo [ERROR] JavaScript unit tests failed.
  exit /b 1
)

echo PASS: harness checks complete ^(full mode^).
exit /b 0

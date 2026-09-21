@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [1/3] Checking required files...
for %%F in (index.html style.css src\game.js src\game-core.js src\audio.js harness\app_blueprint.yaml README.md tests\core.test.js tests\browser.test.html) do (
  if not exist "%%F" (
    echo [ERROR] Missing %%F
    exit /b 1
  )
)
echo PASS: required files found.

echo [2/3] Checking harness/source invariants...
findstr /C:"const VERSION = '0.4.2'" "src\game-core.js" >nul || exit /b 1
findstr /C:"stageDurationSec: 60" "src\game-core.js" >nul || exit /b 1
findstr /C:"bossIntroSec: 50" "src\game-core.js" >nul || exit /b 1
findstr /C:"EARTH SURFACE" "src\game-core.js" >nul || exit /b 1
findstr /C:"function continueCampaign" "src\game-core.js" >nul || exit /b 1
findstr /C:"function nextLives" "src\game-core.js" >nul || exit /b 1
findstr /C:"e.code==='KeyI'" "src\game.js" >nul || exit /b 1
findstr /C:"function continueGame" "src\game.js" >nul || exit /b 1
findstr /C:"function drawEarthSurface" "src\game.js" >nul || exit /b 1
findstr /C:"state.worldScroll+=C.CONFIG.backgroundScrollSpeed*dt" "src\game.js" >nul || exit /b 1
findstr /C:"transitionFromBackdrop" "src\game.js" >nul || exit /b 1
findstr /C:"const FIXED_STEP=1/60" "src\game.js" >nul || exit /b 1
findstr /C:"non_negotiable_invariants:" "harness\app_blueprint.yaml" >nul || exit /b 1
echo PASS: baseline source/harness invariants.

echo [3/3] Running JavaScript tests...
where node >nul 2>nul
if not errorlevel 1 goto node_tests

set "BROWSER="
for %%B in (msedge.exe chrome.exe) do (
  if not defined BROWSER (
    for /f "delims=" %%P in ('where %%B 2^>nul') do if not defined BROWSER set "BROWSER=%%P"
  )
)
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined BROWSER goto browser_tests

echo [INFO] Node.js and Edge/Chrome were not detected for execution testing.
echo PASS: harness checks complete ^(baseline mode^).
exit /b 0

:node_tests
echo [INFO] Node.js detected. Running full JavaScript tests...
node --check src\game-core.js || exit /b 1
node --check src\audio.js || exit /b 1
node --check src\game.js || exit /b 1
node tests\core.test.js || exit /b 1
echo PASS: harness checks complete ^(Node.js full mode^).
exit /b 0

:browser_tests
echo [INFO] Node.js was not found. Running browser fallback tests...
set "TEST_OUT=%TEMP%\polygon_strike_browser_test_%RANDOM%.txt"
set "TEST_PROFILE=%TEMP%\polygon_strike_browser_profile_%RANDOM%"
set "TEST_URL=file:///%CD:\=/%/tests/browser.test.html"
"%BROWSER%" --headless=new --disable-gpu --allow-file-access-from-files --no-first-run --user-data-dir="%TEST_PROFILE%" --dump-dom "%TEST_URL%" > "%TEST_OUT%" 2>nul
if errorlevel 1 "%BROWSER%" --headless --disable-gpu --allow-file-access-from-files --no-first-run --user-data-dir="%TEST_PROFILE%" --dump-dom "%TEST_URL%" > "%TEST_OUT%" 2>nul
findstr /C:"PASS: browser core tests" "%TEST_OUT%" >nul
if errorlevel 1 (
  echo [ERROR] Browser JavaScript tests failed.
  if exist "%TEST_OUT%" type "%TEST_OUT%"
  if exist "%TEST_OUT%" del /q "%TEST_OUT%" >nul 2>nul
  if exist "%TEST_PROFILE%" rmdir /s /q "%TEST_PROFILE%" >nul 2>nul
  exit /b 1
)
echo PASS: browser core tests
if exist "%TEST_OUT%" del /q "%TEST_OUT%" >nul 2>nul
if exist "%TEST_PROFILE%" rmdir /s /q "%TEST_PROFILE%" >nul 2>nul
echo PASS: harness checks complete ^(browser full mode^).
exit /b 0

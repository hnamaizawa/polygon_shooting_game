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
findstr /C:"const VERSION = '0.3.1'" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] Expected game version was not found in src\game-core.js.
  exit /b 1
)
findstr /C:"flightPlaneY: 3.25" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] Shared flight plane configuration was not found.
  exit /b 1
)
findstr /C:"cameraPitchDeg: 30" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] Elevated camera pitch configuration was not found.
  exit /b 1
)
findstr /C:"cameraBackOffset: 4.0" "src\game-core.js" >nul
if errorlevel 1 (
  echo [ERROR] Rear camera offset configuration was not found.
  exit /b 1
)
findstr /C:"function movePlayer" "src\game-core.js" >nul
if errorlevel 1 exit /b 1
findstr /C:"forward:keys.has('ArrowUp')" "src\game.js" >nul
if errorlevel 1 exit /b 1
findstr /C:"backward:keys.has('ArrowDown')" "src\game.js" >nul
if errorlevel 1 exit /b 1
findstr /C:"function makeGlossMetalTexture" "src\game.js" >nul
if errorlevel 1 (
  echo [ERROR] Gloss-metal texture generator was not found.
  exit /b 1
)
findstr /C:"function drawWorldTexturedQuad" "src\game.js" >nul
if errorlevel 1 (
  echo [ERROR] Capital-ship texture mapping implementation was not found.
  exit /b 1
)
findstr /C:"const melody = [" "src\audio.js" >nul
if errorlevel 1 exit /b 1
findstr /C:"bgmBus.gain.value = 0.34" "src\audio.js" >nul
if errorlevel 1 (
  echo [ERROR] Expected BGM level was not found.
  exit /b 1
)
findstr /C:"non_negotiable_invariants:" "harness\app_blueprint.yaml" >nul
if errorlevel 1 exit /b 1
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
node --check src\game-core.js
if errorlevel 1 exit /b 1
node --check src\audio.js
if errorlevel 1 exit /b 1
node --check src\game.js
if errorlevel 1 exit /b 1
node tests\core.test.js
if errorlevel 1 exit /b 1
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

@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [1/3] Checking required files...
for %%F in (index.html style.css src\game.js src\game-core.js src\v052-enhancements.js src\release-version.js src\audio.js src\PolygonStrike.Windows\PolygonStrike.Windows.csproj src\PolygonStrike.Windows\Program.cs .github\workflows\windows-release.yml harness\app_blueprint.yaml README.md tests\core.test.js tests\browser.test.html) do (
  if not exist "%%F" (
    echo [ERROR] Missing %%F
    exit /b 1
  )
)
echo PASS: required files found.

echo [2/3] Checking harness/source invariants...
findstr /C:"const VERSION = '0.6.0'" "src\release-version.js" >nul || exit /b 1
findstr /C:"const CAMPAIGN_LOOPS = 2" "src\v052-enhancements.js" >nul || exit /b 1
findstr /C:"const LOOP2_ENEMY_MULTIPLIER = 1.2" "src\v052-enhancements.js" >nul || exit /b 1
findstr /C:"const LOOP2_BOSS_HP_MULTIPLIER = 1.2" "src\v052-enhancements.js" >nul || exit /b 1
findstr /C:"function installCanvasPolygonDetail" "src\v052-enhancements.js" >nul || exit /b 1
findstr /C:"stageCount: STAGES_PER_LOOP * CAMPAIGN_LOOPS" "src\v052-enhancements.js" >nul || exit /b 1
findstr /C:"src/v052-enhancements.js" "index.html" >nul || exit /b 1
findstr /C:"src/release-version.js" "index.html" >nul || exit /b 1
findstr /C:"stageDurationSec: 60" "src\game-core.js" >nul || exit /b 1
findstr /C:"bossIntroSec: 50" "src\game-core.js" >nul || exit /b 1
findstr /C:"function mapSegment" "src\game-core.js" >nul || exit /b 1
findstr /C:"function updatePlayerBeamCharge" "src\game-core.js" >nul || exit /b 1
findstr /C:"function makeSecretCharacter" "src\game-core.js" >nul || exit /b 1
findstr /C:"function drawSecretCharacter" "src\game.js" >nul || exit /b 1
findstr /C:"keys.has('KeyL')" "src\game.js" >nul || exit /b 1
findstr /C:"const FIXED_STEP=1/60" "src\game.js" >nul || exit /b 1
findstr /C:"<Version>0.6.0</Version>" "src\PolygonStrike.Windows\PolygonStrike.Windows.csproj" >nul || exit /b 1
findstr /C:"Microsoft.Web.WebView2" "src\PolygonStrike.Windows\PolygonStrike.Windows.csproj" >nul || exit /b 1
findstr /C:"--smoke-test" "src\PolygonStrike.Windows\Program.cs" >nul || exit /b 1
findstr /C:"POLYGON-STRIKE-win-x64.exe" ".github\workflows\windows-release.yml" >nul || exit /b 1
findstr /C:"--latest" ".github\workflows\windows-release.yml" >nul || exit /b 1
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
node --check src\v052-enhancements.js || exit /b 1
node --check src\release-version.js || exit /b 1
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
  if exist "%TEST_PROFILE%" rmdir /s /q "%TEST_PROFILE%" >nul 2>nul
  exit /b 1
)
echo PASS: browser core tests
if exist "%TEST_OUT%" del /q "%TEST_OUT%" >nul 2>nul
if exist "%TEST_PROFILE%" rmdir /s /q "%TEST_PROFILE%" >nul 2>nul
echo PASS: harness checks complete ^(browser full mode^).
exit /b 0
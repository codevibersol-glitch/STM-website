@echo off
setlocal
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  start-site.cmd     double-click: opens the STM website on http://localhost
rem                     in your browser, and reloads it on every save.
rem
rem  Stop it by closing this window.
rem ---------------------------------------------------------------------------

rem Node installed by winget is not always on the PATH of a window opened by Explorer.
where node >nul 2>&1 || set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1 || (
  echo Node.js was not found. Install it with:
  echo     winget install -e --id OpenJS.NodeJS.LTS
  echo then double-click this file again.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo The website is not built yet - this folder only has PROMPT.md.
  echo Open this folder in VS Code and tell Claude: Read PROMPT.md and build it.
  echo Then double-click this file again.
  pause
  exit /b 1
)

if not exist "node_modules\.package-lock.json" (
  echo Installing the site's tools, this takes a minute the first time...
  call npm install --no-audit --no-fund || goto :fail
)

echo.
echo Opening the website in your browser - close this window to stop it.
echo.
call npm run dev -- --open
echo.
echo The website stopped.
pause
goto :end

:fail
echo.
echo Something failed. The error is in the output above.
pause
exit /b 1

:end
endlocal

@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0.tools\node-v24.21.0-win-x64\node.exe" set "PATH=%~dp0.tools\node-v24.21.0-win-x64;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS from https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Open Buzz at http://127.0.0.1:5173
echo If this port is already in use, open that address in your browser.
echo Press Ctrl+C to stop the server.
echo.
call npm run dev -- --port 5173 --strictPort
pause

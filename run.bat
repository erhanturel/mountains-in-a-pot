@echo off
rem ---------------------------------------------------------------------
rem  Mountains in a Pot - serve the page and open it.
rem
rem  The page CANNOT be opened as a file. It loads three.js as an ES module,
rem  module scripts are subject to CORS, and a file:// page has an opaque
rem  origin - so the import is refused and the viewport comes up blank with
rem  nothing but a CORS error behind it. three.js r185 ships ESM only, so
rem  there is no classic script to drop in instead; it wants a server.
rem
rem  Close this window to stop the server.
rem ---------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set PY=python
where python >nul 2>nul || set PY=py
where %PY% >nul 2>nul || (
  echo Python was not found on PATH. Install it, or serve this folder
  echo any other way you like on port 8777.
  pause
  exit /b 1
)

rem  Already serving? Then just open a tab rather than fighting for the port.
netstat -ano | findstr /r /c:":8777 .*LISTENING" >nul
if not errorlevel 1 (
  echo Something is already serving on 8777 - opening that.
  start "" "http://localhost:8777/index.html"
  exit /b 0
)

echo Serving %CD%
echo   http://localhost:8777/index.html
echo   http://localhost:8777/index.html?r=48     ^(8, 10, 12, 14, 24, 36, 48 or 64^)
echo.
echo Close this window to stop.
echo.

rem  Give the server a moment before the browser asks it for anything.
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start "" "http://localhost:8777/index.html""

%PY% -m http.server 8777

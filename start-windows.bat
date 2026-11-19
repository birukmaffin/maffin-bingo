@echo off
rem MAFFIN BINGO - opens the app in its own window (Microsoft Edge or Chrome). No internet needed.
set "APP=file:///%~dp0index.html"
where msedge >nul 2>nul && (start "" msedge --app="%APP%" & exit /b)
where chrome >nul 2>nul && (start "" chrome --app="%APP%" & exit /b)
start "" "%~dp0index.html"

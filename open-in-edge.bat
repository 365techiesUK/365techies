@echo off
rem 365 Techies — local preview launcher
rem Starts a local web server (needed for the site's JavaScript modules)
rem and opens the site in Microsoft Edge.
cd /d "%~dp0"
start "365 Techies local server" /min cmd /c "python -m http.server 8123"
timeout /t 2 /nobreak >nul
start msedge "http://localhost:8123"

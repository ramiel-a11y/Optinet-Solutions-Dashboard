@echo off
cd /d "%~dp0"
echo Starting Optinet Solutions Dashboard...
start http://localhost:3000
npm run dev

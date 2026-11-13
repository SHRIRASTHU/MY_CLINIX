@echo off
title MY CLINIX Runner
echo ===================================================
echo               Starting MY CLINIX
echo ===================================================

echo [1/2] Starting FastAPI Backend on port 8000...
start "MY CLINIX - Backend (Port 8000)" cmd /k "cd /d %~dp0backend && .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on port 5173...
start "MY CLINIX - Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Launching browser at http://localhost:5173...
start http://localhost:5173

echo ===================================================
echo Both services are running in their own windows!
echo Close those windows when you wish to stop them.
echo ===================================================

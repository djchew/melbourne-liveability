@echo off
setlocal enabledelayedexpansion

set "ROOT=C:\Users\Darrell\Desktop\Projects\Melbourne Suburb Liveability\melbourne-liveability"

REM Start backend in new window
start "Backend" cmd /k "cd /d "!ROOT!" && .venv\Scripts\activate && cd backend && python -m uvicorn app.main:app --reload"

REM Wait for backend to start
timeout /t 4 /nobreak

REM Start frontend in new window
start "Frontend" cmd /k "cd /d "!ROOT!\frontend" && npm run dev"

REM Wait for frontend to start, then open browser
timeout /t 6 /nobreak
start http://localhost:3000

echo Melbourne Liveability is running!
echo Close the terminal windows to stop the servers.

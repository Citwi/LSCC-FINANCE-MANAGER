@echo off
setlocal
if "%SUPABASE_URL%"=="" echo Set SUPABASE_URL first.
if "%SUPABASE_SERVICE_ROLE_KEY%"=="" echo Set SUPABASE_SERVICE_ROLE_KEY first.
if "%SESSION_SECRET%"=="" echo Set SESSION_SECRET first.
node server.js
pause

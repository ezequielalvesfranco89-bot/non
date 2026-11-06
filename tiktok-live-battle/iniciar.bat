@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
 call instalar.bat
 if errorlevel 1 exit /b 1
)
if not exist "frontend\dist\index.html" (
 echo Interface nao compilada. Execute instalar.bat primeiro.
 pause
 exit /b 1
)
.venv\Scripts\python.exe backend\launch.py
if errorlevel 1 pause

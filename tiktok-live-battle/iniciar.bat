@echo off
setlocal
cd /d "%~dp0"
title TikTok Live Battle 2.1 - mantenha esta janela aberta
if not exist ".venv\Scripts\python.exe" goto instalar
.venv\Scripts\python.exe -c "import fastapi,uvicorn,pydantic" >nul 2>nul
if not errorlevel 1 goto executar
:instalar
call instalar.bat --auto
if errorlevel 1 exit /b 1
:executar
echo Abrindo o programa. Aguarde o navegador...
.venv\Scripts\python.exe backend\launch.py
if errorlevel 1 (
 echo O programa encontrou um erro. Copie a mensagem acima antes de fechar.
 pause
 exit /b 1
)

@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
 echo Instale Python 3.11 ou mais recente de python.org, incluindo o Python Launcher.
 pause
 exit /b 1
)
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)"
if errorlevel 1 (
 echo E necessario Python 3.11 ou mais recente.
 pause
 exit /b 1
)
if not exist ".venv\Scripts\python.exe" py -3 -m venv .venv
if errorlevel 1 goto erro
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto erro
if not exist "frontend\dist\index.html" (
 where npm >nul 2>nul
 if errorlevel 1 (
  echo Para compilar a interface, instale Node.js 22.12+ ou 24 LTS.
  goto erro
 )
 pushd frontend
 call npm ci
 if errorlevel 1 (popd & goto erro)
 call npm run build
 if errorlevel 1 (popd & goto erro)
 popd
)
echo Instalacao concluida. Execute iniciar.bat.
pause
exit /b 0
:erro
echo Falha na instalacao. Leia o erro acima; nenhuma verificacao TLS deve ser desativada.
pause
exit /b 1

@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
 echo Execute TESTAR-PRIMEIRO.bat e confirme que o jogo abre antes de instalar LIVE.
 pause
 exit /b 1
)
echo Instalando integracao opcional TikTok LIVE...
.venv\Scripts\python.exe -m pip install -r backend\requirements-live.txt
if errorlevel 1 (
 echo Falha ao instalar integracao. O modo de teste continua disponivel.
 pause
 exit /b 1
)
echo Pronto. Feche e reabra iniciar.bat para ativar a integracao.
pause

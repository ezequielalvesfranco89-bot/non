@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
 echo Execute instalar.bat primeiro.
 pause
 exit /b 1
)
.venv\Scripts\python.exe -m pip install pyinstaller==6.16.0
if errorlevel 1 goto erro
.venv\Scripts\python.exe -m PyInstaller --noconfirm --clean --onedir --name TikTokLiveBattle --paths backend --collect-all TikTokLive --collect-all TikTokLiveProto --collect-all EulerApiSdk --collect-all betterproto2 --collect-all uvicorn --add-data "frontend\dist;frontend/dist" backend\launch.py
if errorlevel 1 goto erro
echo Executavel gerado em dist\TikTokLiveBattle\TikTokLiveBattle.exe
echo Distribua a pasta inteira, incluindo _internal.
pause
exit /b 0
:erro
echo Falha ao gerar executavel. Leia o erro acima.
pause
exit /b 1

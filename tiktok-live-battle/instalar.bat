@echo off
setlocal
cd /d "%~dp0"
title Instalar TikTok Live Battle 2.1
if not exist ".logs" mkdir .logs
echo.
echo TikTok Live Battle 2.1 - instalacao do MODO TESTE
echo Nao e necessario TikTok, OBS ou Node.js para este primeiro teste.
echo.
set "BATTLE_PY_CMD=py -3"
where py >nul 2>nul
if not errorlevel 1 goto verificar_python
set "BATTLE_PY_CMD=python"
where python >nul 2>nul
if errorlevel 1 goto falta_python
:verificar_python
%BATTLE_PY_CMD% -c "import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)" > .logs\python.log 2>&1
if errorlevel 1 goto falta_python
if not exist "frontend\dist\index.html" (
 echo Arquivos incompletos. Extraia o ZIP inteiro usando Extrair Tudo.
 goto erro
)
echo [1/3] Preparando a pasta de dependencias...
if not exist ".venv\Scripts\python.exe" %BATTLE_PY_CMD% -m venv .venv > .logs\ambiente.log 2>&1
if errorlevel 1 goto erro
echo [2/3] Instalando dependencias. Aguarde; precisa de internet nesta etapa.
.venv\Scripts\python.exe -m pip install --disable-pip-version-check --timeout 30 --retries 2 -r backend\requirements.txt > .logs\instalacao.log 2>&1
if errorlevel 1 goto erro
echo [3/3] Conferindo instalacao...
.venv\Scripts\python.exe -c "import fastapi,uvicorn,pydantic; print('Instalacao OK')" > .logs\verificacao.log 2>&1
if errorlevel 1 goto erro
echo.
echo INSTALACAO CONCLUIDA. Agora execute iniciar.bat.
if /i not "%~1"=="--auto" pause
exit /b 0
:falta_python
echo Nao encontramos Python 3.11 ou superior funcionando neste computador.
echo Instale Python 3.12 pelo site https://www.python.org/downloads/windows/
echo Na instalacao, marque Add python.exe to PATH. Depois tente novamente.
echo Consulte tambem TUTORIAL_TESTE.html nesta pasta.
pause
exit /b 1
:erro
echo.
echo A INSTALACAO NAO TERMINOU. Nao feche antes de ler esta mensagem.
echo Abra a pasta .logs e veja instalacao.log, ambiente.log ou verificacao.log.
echo Se a pasta veio de um ZIP, use Extrair Tudo e tente fora do ZIP.
echo Envie a mensagem de erro para receber ajuda. Nao precisa enviar senhas.
pause
exit /b 1

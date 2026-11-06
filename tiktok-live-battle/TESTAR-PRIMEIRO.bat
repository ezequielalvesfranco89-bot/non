@echo off
setlocal
cd /d "%~dp0"
title Primeiro teste - TikTok Live Battle 2.1
start "" "%~dp0TUTORIAL_TESTE.html"
echo A janela seguinte permanece aberta para mostrar qualquer erro.
cmd /k call "%~dp0iniciar.bat"

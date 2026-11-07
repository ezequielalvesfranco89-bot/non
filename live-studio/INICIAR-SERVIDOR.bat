@echo off
cd /d "%~dp0"
if /i "%~1"=="--executar" goto executar
cmd /k ""%~f0" --executar"
exit /b
:executar
chcp 65001 >nul
echo LIVE STUDIO - servidor local opcional
where node >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js LTS 22 ou 24 em https://nodejs.org/
 echo Depois feche esta janela e abra INICIAR-SERVIDOR.bat novamente.
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22){console.error('Use Node.js 22 ou superior.');process.exit(1)}"
if errorlevel 1 exit /b 1
if exist node_modules\matter-js\package.json if exist node_modules\ws\package.json goto iniciar
echo Instalando dependencias. Precisa de internet apenas nesta etapa.
call npm ci --omit=dev --ignore-scripts
if errorlevel 1 (
 echo A instalacao falhou. Copie a mensagem acima para pedir ajuda.
 echo Para testar sem instalar, abra TESTAR.html.
 exit /b 1
)
:iniciar
echo Abra http://127.0.0.1:8780 no navegador.
echo Mantenha esta janela aberta. Ctrl+C encerra o servidor.
call npm start
if errorlevel 1 echo Nao foi possivel iniciar. Copie o erro acima para pedir ajuda.

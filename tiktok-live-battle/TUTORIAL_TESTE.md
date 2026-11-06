# Primeiro teste — passo a passo

**Este teste é para computador com Windows 10 ou 11. Não é para celular.**
Não precisa de TikTok, OBS ou presente pago. Não há um EXE pronto neste pacote.

## 1 — Baixar

1. Na página do GitHub, confira a branch **tiktok-live-battle-21**.
2. Clique no botão **Code** e depois em **Download ZIP**.
3. Abra a pasta **Downloads** do Windows.
4. Clique com o botão direito no ZIP e escolha **Extrair Tudo → Extrair**.
5. Abra a pasta extraída e entre em **tiktok-live-battle**.

Você deve encontrar `TESTAR-PRIMEIRO.bat`, `iniciar.bat` e `TUTORIAL_TESTE.html`.
**Não execute os arquivos dentro da janela do ZIP.**

## 2 — Instalar Python, se ainda não tiver

1. Abra https://www.python.org/downloads/windows/.
2. Instale Python 3.11 ou superior. Recomendamos Python 3.12 de 64 bits.
3. No instalador, marque **Add python.exe to PATH** e clique em **Install Now**.
4. Espere terminar e feche o instalador.

Node não é necessário: a interface já está compilada no download.

## 3 — Abrir o jogo

1. Dê dois cliques em **TESTAR-PRIMEIRO.bat**.
2. O tutorial abrirá e uma janela com mensagens fará a instalação.
3. Aguarde. A primeira instalação precisa de internet e pode levar alguns minutos.
4. O navegador deve abrir o jogo. Você deve ver **LIVE BATTLE 2.1**, **Sistema online**
   e **Modo teste**.
5. Deixe a janela com mensagens aberta. Fechá-la encerra o jogo.

Se o navegador não abrir, copie o endereço mostrado nessa janela e cole no Chrome
ou Edge. Normalmente é `http://127.0.0.1:8766`; pode ser outra porta se ela estava ocupada.
O modo local não exige instalar a integração TikTok.

## 4 — Conferir o jogo, um clique por vez

1. Clique **Iniciar batalha**. Deve aparecer um monstro e uma barra de vida.
2. Desça até **Laboratório de interações** e clique **Rosa**. A vida deve diminuir.
3. Clique **+ Novo seguidor**. Deve aparecer o nome e o contador deve aumentar.
4. Clique de novo com o mesmo ID. Ele não conta outra vez: isso evita duplicatas.
5. Use **+ Seguidor com novo ID** para simular outra pessoa.
6. Clique **100 curtidas**. Deve sair um ataque coletivo e surgir uma carga de poder.
7. Use **!poder** para gastar essa carga. Se acabou de usar outro comando com a mesma
   pessoa, espere pelo menos **3 segundos** para a recarga terminar.
8. Teste **!atacar**, **!curar** e **!defender**, esperando 3 segundos entre comandos.
   Cura recupera a vida da equipe, não a do monstro; se a equipe já tem 100, não sobe mais.
9. Para derrotar rapidamente o chefe, use **Leão lendário**. A fase seguinte aparece
   depois da celebração.

Até aqui, todas as interações são **simuladas** e gratuitas.

## 5 — Ver o overlay

1. Abra **Configurações**.
2. Clique em **Vertical · 1080 × 1920**.
3. Uma nova aba mostra o jogo sem os botões administrativos.
4. O OBS é opcional e pode ser configurado depois que esse teste funcionar.

## 6 — Abrir e fechar nas próximas vezes

Para abrir, use **iniciar.bat**. Para encerrar, volte à janela do programa e pressione
**Ctrl+C**. Não precisa instalar tudo novamente em cada abertura.

## Se der erro

- **A janela fechava antes:** use TESTAR-PRIMEIRO. Ele agora mantém uma janela aberta
  mesmo se o início falhar. Copie a mensagem exata.
- **Python não encontrado:** volte ao passo 2 e marque a opção PATH.
- **Instalação falhou:** abra `.logs/instalacao.log` e copie o trecho do erro.
- **Arquivos incompletos:** use Extrair Tudo; não rode de dentro do ZIP.
- **Servidor desconectado:** veja se a janela do programa foi fechada ou mostra erro.
- **Sem monstro:** tente Chrome/Edge atualizado com WebGL habilitado.
- **Sem som:** clique Ativar som e confira o volume.
- **Bloqueio do Windows:** leia e informe a mensagem; não desative antivírus ou TLS.

Erros de abertura também ficam em
`%LOCALAPPDATA%\TikTokLiveBattle2\inicializacao.log`.
Não envie senhas, cookies ou chaves junto dos registros.

## Somente depois: TikTok de verdade

Depois de confirmar o teste local, execute **instalar-live.bat**. Feche e reabra o
programa, selecione LIVE e informe o @ de uma transmissão pública ativa.
O programa não pede senha. A entrega de eventos depende do TikTok e da integração.

**Limite da validação:** os testes do desenvolvimento rodaram em Linux. Foram
verificados pacotes de dependências para Windows, mas a execução nativa dos arquivos
BAT e a conexão com uma live real ainda precisam ser confirmadas no seu computador.

## Novidades da 2.1 — música e atenção

1. Feche a janela do programa antigo antes de abrir a atualização.
2. Clique **Ativar trilha**. **Ativar som** continua controlando os efeitos.
3. Em Configurações, ajuste **Volume da trilha** e **Estilo da trilha**; salve.
4. Simule quatro IDs diferentes curtindo, seguindo ou comentando: a união gera
   golpe coletivo e cura, uma vez por fase, sem exigir presentes.
5. Quando surgir o aviso de ataque do chefe, teste **!defender**.
6. No OBS, abra Interagir e clique no overlay uma vez para permitir áudio.
   Mantenha apenas uma aba com música.

A trilha pausa com o combate e pode ser desligada. Essas escolhas são hipóteses de
design, não garantia científica de retenção.

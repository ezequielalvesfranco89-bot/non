# Validação — 7 de novembro de 2026

## Motor e API

`npm run build` concluiu a verificação TypeScript e gerou o HTML portátil, JavaScript/CSS e servidor compilado.

`npm test`: **42 testes passaram, zero falhas**. Executa diretamente o runner TypeScript de testes Node, com os casos individuais visíveis. Inclui as 60 ações, estado serializável, gravidade/colisões, plataforma e personagem físicos, vento, caixa surpresa, derrota por queda, vitória por sobrevivência, coleta de estrelas por colisão, seleção aleatória/sequencial, preservação da sequência ao mudar volume, combinações, som escolhido, metas uma vez, prioridades, atrasos, fila cheia sem contagem indevida, pausa, limites, configurações inválidas, IDs reservados, deduplicação e combos cumulativos. API: persistência, stream WebSocket, Host/Origin, rotas inválidas e recusa de origem real inventada.

## Navegador

Chromium no Linux com Playwright: **10 verificações integradas passaram, zero erros de execução de página**.

- HTML único com API ausente executou motor local; sem recursos ou serviços externos necessários.
- Rosa criou flor; áudio real foi medido no sinal do Web Audio após ativação por clique, sem osciladores antes disso.
- Seguidores ampliaram a plataforma e criaram árvore em sequência.
- Editor combinou bola e pontos, selecionou outro som e manteve as regras depois de recarregar.
- Evento passou pela regra personalizada e produziu objeto físico e ranking.
- Biblioteca mostrou 60 ações filtráveis; plataformas mostraram conexão indisponível.
- Tutorial abriu, recebeu foco e fechou por Escape.
- Visão geral, editor, biblioteca e plataformas não ultrapassaram a largura em 320 e 390 pixels.
- Painel e overlay receberam o mesmo estado, com fundo transparente e duplicatas sem objeto extra.
- Servidor pausou seu relógio e executou a meta coletiva de cinco seguidores.

Para repetir em desenvolvimento:

```sh
npm ci --ignore-scripts
npm run build
npx playwright install chromium
npm run test:browser
```

O teste cria seu próprio servidor temporário em 127.0.0.1:8784, sem usar o arquivo de regras normal. Necessita das portas de teste livres. `CHROME_PATH` permite escolher um Chromium instalado; `CI=1` acrescenta a opção de sandbox usada pelo ambiente de automação. Não é necessário rodar estes comandos para usar TESTAR.html.

## Limites da verificação

A política do Chromium gerenciado bloqueia URLs `file://`. Por isso, o teste do arquivo portátil usou o conteúdo exato de TESTAR.html entregue como resposta HTTP local pelo Playwright e API ausente (404); não contornou a política. A abertura por duplo clique e o lançador BAT não foram executados em Windows nativo. O HTML usa script clássico IIFE e todos os recursos estão embutidos, sem módulos ou carregamento de arquivos locais separados.

Não houve teste de conexão com conta de TikTok, YouTube ou Twitch: nenhum adaptador real foi implementado. O OBS não foi executado; sua página de captura foi testada no Chromium com sincronização e transparência. Emojis e sons podem variar conforme navegador/sistema. Os sons são sintetizados; não são gravações realistas de animais ou trilhas musicais.

## Correção da entrada principal

A entrada raiz ainda continha o catálogo Maxon. Foi substituída pelo HTML portátil do Live Studio, e a compilação passou a atualizar esse arquivo automaticamente. A raiz agora inclui `npm start` / `npm run dev`, sem dependências, para abrir a mesma experiência na porta 3000.

`npm --prefix live-studio run test:entry` passou no Chromium: URL principal identifica Live Studio, Rosa cria flor, seguidor amplia plataforma para 395 pixels, biblioteca mostra 60 ações, tutorial abre e arquivos internos não são expostos pelo servidor de prévia. Este teste usa servidor temporário na porta 8786. Ele verifica a entrada efetivamente aberta pelo visitante.

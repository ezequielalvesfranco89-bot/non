# TikTok Live Battle

Jogo 2D local com motor autoritativo em Python, painel React/TypeScript,
renderização PixiJS, SQLite e transmissão de estado por WebSocket. Este projeto
fica separado do site Maxon Oil e não altera seus arquivos.

## Começar no Windows

1. Extraia o ZIP em uma pasta do seu computador.
2. Instale **Python 3.11 ou superior**, com o Python Launcher (`py`).
3. Execute **instalar.bat** e aguarde terminar. A conexão com o PyPI é necessária.
4. Execute **iniciar.bat**. O navegador abre o painel local automaticamente.
5. Na Visão geral, clique **Iniciar batalha** e experimente os presentes e seguidores
   no Laboratório de interações. O modo inicial é TESTE.

O pacote entregue já inclui `frontend/dist`; Node não é necessário para rodar essa
interface compilada. Para recompilar ou desenvolver, use Node.js 22.12+ ou 24 LTS,
entre em `frontend`, execute `npm ci` e `npm run build`.

O servidor usa `127.0.0.1:8765` e aceita somente acesso local. No Windows, o launcher
salva o banco em `%LOCALAPPDATA%\TikTokLiveBattle\battle.sqlite3`. O terminal deve
permanecer aberto; Ctrl+C encerra o servidor. Se a porta estiver ocupada, encerre
uma instância anterior antes de iniciar outra.

## O que funciona

- Três chefes desenhados e animados em PixiJS, cenários por fase, vida interpolada,
  partículas, números de dano, ataques críticos/lendários, cura e poder coletivo.
- Vida da equipe, ataques periódicos do chefe, derrota, vitória, dificuldade crescente,
  combos de ataques, top 5 por dano aplicado e histórico persistente de batalhas.
- Presentes configuráveis por **ID**, dano, multiplicador, animação, som e ativação.
- Curtidas por quantidade do lote e comentários `!atacar`/`!attack`.
- Novos seguidores com boas-vindas, contador, ação configurável e metas coletivas.
- Simulador com espectador/ID, presentes, sequências acumuladas, seguidores novos ou
  repetidos, curtidas, comentários, replay exato e conexão simulada.
- Painel com ajustes salvos em SQLite, nomes de chefes, paletas de aparência, exportação JSON e modos separados TESTE/LIVE.
- Overlay horizontal, vertical, transparente e arena em tela cheia, sem exigir OBS.
- Fila assíncrona de eventos e aplicação serializada das regras, sem mutações de
  combate no frontend. WebSockets lentos recebem o estado mais recente.

Os sons são sintetizados com WebAudio. Clique **Ativar som** após abrir o painel;
alguns navegadores exigem uma interação para permitir áudio. O botão de volume e
a seleção de som de cada regra controlam os efeitos. Não há garantia de áudio
automático em uma fonte de navegador do OBS: capture o áudio do painel ou habilite
interação/autoplay conforme a configuração do seu OBS.

## Seguidores, metas e duplicatas

A integração usa o **FollowEvent real de TikTokLive 7.0.1**. Nenhuma detecção é feita
por variação no total de seguidores. A presença da classe e dos handlers foi testada
na biblioteca instalada; recepção real ainda depende de uma live pública ativa e de
a plataforma entregar o evento. Veja [INTEGRATION.md](INTEGRATION.md).

Um seguidor só conta uma vez por ID estável na sessão, ainda que deixe de seguir e
siga novamente. Metas já premiadas também não são premiadas novamente. Essas marcas
persistem no SQLite e sobrevivem a uma reconexão ou reinício. Eventos sem informação
suficiente para identificação são descartados, em vez de inventar recompensas.

Presentes em sequência usam os deltas de `repeat_count` por espectador, presente e
grupo. Contagens repetidas ou menores não causam dano adicional. O ranking usa dano
real aplicado, limitado pela vida restante do chefe; dano excedente não passa de
um chefe para outro. Os presets `demo-*` são apenas para simulação. Configure os IDs
reais conforme a lista de presentes detectados no painel.

**Pausar ou aguardar o início** mantém ações de recompensa em uma fila limitada;
contadores e boas-vindas continuam sendo processados. Retomar aplica cada ação uma
vez. A fila comporta 256 ações e recusa novos eventos antes de saturar. Reiniciar a
rodada descarta ações pendentes explicitamente e mantém os contadores/recompensas da
sessão. Mudar TESTE/LIVE cria uma nova sessão e limpa esses contadores, preservando
configurações e histórico. O histórico marca a origem TESTE/LIVE.

## Conectar uma live real

1. Desconecte qualquer conexão anterior e mude o seletor **Modo teste** para LIVE.
   A interface pede confirmação porque isso cria uma sessão nova.
2. Digite apenas o @ do perfil com transmissão pública ativa.
3. Clique **Conectar à live**. Inicie a batalha para aplicar as recompensas.
4. Ajuste os IDs de presentes reais recebidos no painel Presentes.

Não se pede senha do TikTok. Bloqueios, CAPTCHAs, restrições da plataforma e requisitos
externos do serviço de assinatura não são contornados. Reconexões usam intervalos
progressivos até 60s; falhas de autenticação/bloqueio exigem correção antes de tentar
novamente. A documentação de integração registra os detalhes e a correção de TLS.

**A conexão real não foi validada nesta entrega:** não foi fornecido um perfil com
live ativa e a rede cloud permite somente destinos predefinidos. O modo de teste e
a camada de eventos foram validados sem fingir acesso real ao TikTok.

## OBS e layouts

Em Configurações, abra um dos links de overlay. Para uma Fonte de navegador do OBS,
copie a URL correspondente no computador onde o programa está rodando:

- Horizontal: `http://127.0.0.1:8765/overlay?layout=horizontal` — 1920 × 1080.
- Vertical: `http://127.0.0.1:8765/overlay?layout=vertical` — 1080 × 1920.
- Transparente: acrescente `&transparent=1`.

Não adicione o painel administrativo como fonte. O overlay não possui controles e
recebe o mesmo estado autoritativo do painel. No modo TESTE, a marca de simulação
permanece visível no overlay. O jogo também funciona abrindo o painel normalmente,
sem OBS. A resolução do canvas acompanha a fonte; partículas e alertas têm limites.
A meta de renderização é 60 FPS, condicionada ao equipamento e ao navegador.

## Desenvolvimento e testes

Linux/macOS (na raiz deste projeto):

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-test.txt
cd frontend
npm ci
npm run build
cd ../backend
../.venv/bin/python -m unittest discover -s tests -v
../.venv/bin/python -m battle --port 8765 --data-dir ../.data
```

Windows, após a instalação:

```bat
.venv\Scripts\python.exe -m pip install -r backend\requirements-test.txt
cd backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Para Vite em desenvolvimento, rode o backend na porta 8765 e `npm run dev` em
`frontend`. A origem do proxy deve ser local; não se habilita CORS irrestrito.

`config.example.json` contém as configurações iniciais. O painel salva as alterações
no SQLite. Para importar explicitamente um JSON exportado, execute o backend com
`--config caminho/battle-settings.json`; essa opção substitui a configuração salva
naquela inicialização. Faça backup do banco com o programa fechado.

### Arquitetura

- `backend/battle/engine.py`: regras puras, deduplicação transacional e progressão.
- `backend/battle/models.py`: validação estrita e limites de configurações/eventos.
- `backend/battle/storage.py`: SQLite, histórico, IDs e metas premiadas.
- `backend/battle/tiktok.py`: adaptador substituível, normalização e reconexão.
- `backend/battle/api.py`: FastAPI, fila, ciclo de vida e WebSocket somente leitura.
- `frontend/src/App.tsx`: administração, simulador e HUD/overlay.
- `frontend/src/BattleScene.tsx`: arte procedural, chefes, partículas e animação PixiJS.

## Executável Windows

Execute **gerar-executavel.bat no Windows** depois de instalar e compilar. O script
usa PyInstaller e cria `dist\TikTokLiveBattle\TikTokLiveBattle.exe`; distribua a pasta
inteira, incluindo `_internal`. O executável usa o mesmo diretório de dados local e
abre o navegador. PyInstaller não faz compilação cruzada Windows a partir de Linux.

A instalação por scripts e o empacotamento estão preparados, mas **a execução nativa
Windows e o EXE não foram testados/gerados neste ambiente Linux**. Antes de distribuir,
teste o executável em Windows limpo e valide uma live real.

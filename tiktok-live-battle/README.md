# TikTok Live Battle 2.1 — primeira versão funcional

**Comece pelo [tutorial passo a passo](TUTORIAL_TESTE.md).** Depois de extrair o ZIP, também pode abrir TUTORIAL_TESTE.html. É um guia local com cada
clique, o resultado esperado e ajuda para os erros mais comuns.

## Para testar no Windows

1. Baixe o ZIP da branch `tiktok-live-battle-21` no GitHub.
2. Use **Extrair Tudo**; abra a pasta `tiktok-live-battle` que está dentro.
3. Instale Python 3.11+ (recomendado Python 3.12, com PATH).
4. Abra **TESTAR-PRIMEIRO.bat**. Aguarde a instalação e o navegador abrir.
5. Clique em **Iniciar batalha** e use o Laboratório de interações.

Não precisa TikTok, OBS, Node ou senha para esse primeiro teste. A interface já está
compilada. Precisa de internet para instalar as bibliotecas Python pela primeira vez.
Nas próximas aberturas, use **iniciar.bat**. Deixe o terminal aberto enquanto joga.
Se o navegador não abrir, copie o endereço mostrado no terminal (normalmente
`http://127.0.0.1:8766`). Outra porta é escolhida automaticamente se estiver ocupada.

A versão anterior não abriu no computador do usuário; a mensagem exata ainda não
foi informada. Esta entrega simplifica a instalação e melhora os diagnósticos;
não afirma que uma causa específica do problema anterior foi identificada.

## Funcionalidades da primeira versão 2.1

- Três chefes animados, cenário vertical/horizontal, vida da equipe, vitória,
  derrota, ranking, histórico, sons e partículas limitadas, usando React/TypeScript
  e PixiJS; motor autoritativo Python/FastAPI e SQLite.
- Presentes por ID, dano, multiplicador, animação, som, mensagem com `{name}` e
  recarga configurável. Por padrão, recarga zero preserva todos os deltas do combo.
  Quando a recarga é configurada, presentes recebidos durante ela são registrados,
  mas não aplicam dano nem são acumulados para depois. A regra fica visível no painel.
- Seguidores individuais: boas-vindas, ataque gratuito, contador, metas e recompensa
  de cenário desbloqueável. A mesma pessoa/meta não é premiada repetidamente.
- Curtidas carregam um ataque coletivo e uma carga de poder. Por padrão, 100 curtidas
  geram 300 de dano coletivo e uma carga adicional; `!poder` usa uma carga para atacar.
- `!atacar`, `!curar`, `!defender`, `!poder`; limite por espectador, padrão 3 segundos.
  A defesa reduz o dano do chefe à metade por 8 segundos. Cura afeta a equipe, não o chefe.
- Padrões distintos: golem recebe escudo mágico nos eventos especiais; espectro
  causa menos dano básico; dragão causa 50% mais dano abaixo de metade de sua vida.
  O intervalo de eventos é configurável e eles podem ser desativados.
- A dificuldade cresce até um teto de 3 vezes a vida base, permitindo progresso
  gratuito; não é necessário enviar presentes para derrotar os chefes.
- Análise de participantes únicos, interações gratuitas, presentes, frequência de
  eventos por pessoa e duração das batalhas (tempo decorrido, incluindo pausas).
- Overlay vertical com área central maior, instruções gratuitas, transparência real
  e uma tela exclusiva sem controles administrativos. A meta é 60 FPS, não uma garantia
  medida em todo equipamento. Há suporte a preferência por movimento reduzido.

A fila processa eventos sequencialmente. IDs e contagens acumuladas de combos evitam
repetição de dano. Ações recebidas com a batalha pausada ficam em uma fila limitada.
Reiniciar a rodada descarta ações pendentes e preserva contadores da sessão; mudar
TESTE/LIVE cria uma sessão separada. Os eventos simulados são identificados no painel
e no overlay. O histórico preserva a origem TESTE/LIVE.

## Instalação e diagnóstico

- `instalar.bat`: instala somente as dependências do jogo/simulador.
- `iniciar.bat`: confere dependências, inicia e abre o navegador após o servidor responder.
- `TESTAR-PRIMEIRO.bat`: abre o tutorial, instala e inicia numa sequência.
- `.logs/`: diagnóstico da instalação, verificação de Python e ambiente virtual.
- `%LOCALAPPDATA%\TikTokLiveBattle2\inicializacao.log`: problemas de inicialização.
- `%LOCALAPPDATA%\TikTokLiveBattle2\battle.sqlite3`: dados locais da versão 2.1.

Se houver bloqueio de segurança, não desative antivírus nem TLS: informe a mensagem.
Os scripts mantêm erros visíveis. Não execute como administrador para tentar resolver
uma falha sem diagnóstico. Este pacote não contém um EXE Windows pronto.

## TikTok LIVE é uma etapa separada

Depois que o jogo local funcionar, execute **instalar-live.bat**, feche o servidor e
abra de novo. Mude para LIVE e informe o @ de uma live pública ativa. Não há solicitação
de senha. O adaptador usa FollowEvent de TikTokLive 7.0.1, verificado no código e na
biblioteca instalada; não se inferem novos seguidores pela contagem total.

A integração preserva TLS, proxies e deduplicação. Veja [INTEGRATION.md](INTEGRATION.md).
Uma live real não foi testada aqui, e o acesso externo depende da rede e da plataforma.
O jogo/simulador continua disponível mesmo sem instalar a integração opcional.

## Desenvolvimento e testes

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-test.txt
cd frontend
npm ci
npm run build
cd ../backend
../.venv/bin/python -m unittest discover -s tests -v
../.venv/bin/python -m battle --port 8766 --data-dir ../.data-v2
```

Para testar também a integração instalada, instale `backend/requirements-live.txt`.
Sem ela, apenas o teste que instancia o SDK real é marcado como não executado.
Os demais testes de normalização, regras e API não precisam acessar TikTok.
Node.js 22.12+ ou 24 LTS é necessário somente para recompilar o frontend.

`config.example.json` documenta os padrões. A opção `--config arquivo.json` importa
uma configuração explicitamente. O painel salva as alterações em SQLite.

## Etapas seguintes e limites claros

Esta é a primeira versão funcional, não a conclusão automática das oito etapas do
prompt. Ainda precisam de trabalho/validação: editor genérico de eventos e padrões,
comparação de sessões com configurações congeladas, medição da latência até o quadro
visível, validação de live real, instalação nativa e EXE no Windows. Retenção e tempo
médio de visualização não estão disponíveis e não são inventados a partir de eventos.

A arte, o feedback e os objetivos implementam hipóteses de design. Não há afirmação
de aumento de retenção, de dependência ou de resultado psicológico garantido. A
participação gratuita é explícita; não há urgência falsa nem recompensa financeira
aleatória. Veja [docs/DESIGN.md](docs/DESIGN.md).

Para gerar um EXE no Windows, use `gerar-executavel.bat` após testar o jogo. É preciso
validar o resultado em Windows; PyInstaller no Linux não gera um EXE Windows.

## Atualização 2.1: atenção, cooperação e trilha original

- **União da equipe:** quatro pessoas diferentes participando gratuitamente
  liberam golpe + cura. Contagem e dano configuráveis, uma recompensa por fase.
- **Aviso antecipado de ataque:** dá uma oportunidade real de usar !defender.
- **Trilha procedural:** melodia, baixo, acordes e percussão, com variação por chefe
  e camada de clímax abaixo de 25% da vida. Volume independente; estilo ambiente
  opcional. Nenhum arquivo musical externo precisa ser baixado.
- **Prioridade à leitura:** orientações contextuais e música mais baixa durante
  avisos/boas-vindas. Não há garantia de aumentar retenção; veja docs/DESIGN.md.

Clique **Ativar trilha** para começar. O navegador exige interação. No OBS, use
Interagir no overlay e clique uma vez, ou capture o áudio da aba do painel. Não deixe
duas abas tocando ao mesmo tempo. Feche a janela da versão anterior antes de iniciar
a atualização. O arquivo docs/previa-trilha.webm contém uma pequena gravação de teste.

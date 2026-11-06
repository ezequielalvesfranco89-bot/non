# Validação da entrega

Ambiente executado: Linux, Python 3.12, Node 24, Chromium com WebGL por software.

- 46 testes automatizados Python aprovados. Resultado em `testes-python.txt`.
- Compilação TypeScript (`tsc --noEmit`) e build de produção Vite aprovados.
- Testes funcionais no navegador: canvas Pixi ativo, dano de presente, seguidores
  individuais, boas-vindas, repetição sem recompensa extra e metas coletivas.
- Edição e persistência de ações de seguidores e regras de presentes após recarregar.
- Personalização do nome do chefe e da paleta; vitória e histórico pelo fluxo real.
- Inicialização de áudio por interação, seguida de eventos sem erro JavaScript.
- Overlay vertical sem controles administrativos e com transparência real: PNG RGBA,
  pixel de canto (0,0,0,0), incluindo documento e canvas sem fundo opaco.
- Layout administrativo sem rolagem horizontal a 320 e 390 px.
- Nenhum erro de JavaScript ou resposta HTTP com falha nos fluxos de navegador.
- Teste concorrente de 12 entregas repetidas resultou em um único seguidor/recompensa.
- O cliente real TikTokLive foi instanciado sem rede, com handlers individuais e
  verificação CERT_REQUIRED no transporte do signer.

## Não validado

- Recepção ponta a ponta em TikTok LIVE: não houve @ com live ativa; a política de
  rede cloud também não inclui os destinos externos necessários. Não se contabilizou
  nenhum seguidor simulado como evento real.
- Instalação e execução nativa Windows; arquivo EXE não gerado em Linux. Os scripts
  e as orientações precisam de validação em Windows antes de distribuição.
- 60 FPS em hardware do usuário: o ticker tem limite de 60 FPS e limites de partículas,
  mas isso é uma meta de desempenho, não uma medição garantida em qualquer equipamento.

As capturas do painel contêm eventos do simulador, explicitamente marcados como TESTE.

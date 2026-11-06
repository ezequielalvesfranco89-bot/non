# Validação da primeira versão 2.0

## Executado

- Build TypeScript e Vite de produção concluído.
- Suíte com integração instalada: 54 testes aprovados (testes-python.txt).
- Instalação Python limpa, sem TikTokLive: 53 aprovados e 1 teste de SDK marcado
  como não executado (testes-instalacao-limpa.txt). Não se tratou skip como aprovação.
- Resolução/download no PyPI dos 14 pacotes binários necessários ao núcleo para
  Windows amd64/Python 3.12, sem compilar extensões nativas ou desativar TLS.
- Navegador Chromium contra a instalação limpa: canvas Pixi, tutorial HTTP200,
  ataque grátis, cooldown, defesa, carga por curtidas, !poder, boas-vindas,
  seguidores repetidos, análise com limitações explícitas e largura320 sem overflow.
- O mesmo fluxo passou contra o ambiente com o adaptador opcional instalado.
- Captura da versão atual: preview-v2.png. As demais capturas são referência da 1.0.

## O que NÃO foi verificado

- Execução real dos BAT/EXE em Windows: os testes rodaram em Linux. Resolver wheels
  para Windows não é executar o programa nesse sistema operacional.
- Recepção de eventos de uma live ativa: não há perfil/live de teste fornecido.
- Causa específica da janela fechar no computador do usuário: somente o sintoma
  foi informado. O novo primeiro teste usa cmd /k para manter o erro visível.
- Ganho de retenção, tempo assistido ou FPS garantido em todo equipamento.
- Scripts de PyInstaller/EXE no Windows.

O tutorial separa o teste gratuito local da instalação opcional da integração real.

## Atualização 2.1 — atenção e trilha sonora

- 61 casos Python: 60 aprovados; 1 do SDK TikTok opcional não executado no núcleo
  sem a dependência. Registro em testes-atencao.txt.
- O conjunto anterior é verificado com a nova mecânica de união desligada no fixture
  de regressão; testes específicos habilitam a união para verificar a composição,
  unicidade dos participantes, premiação uma vez por fase e persistência.
- TypeScript e build Vite aprovados, sem novas dependências de áudio.
- Teste real do WebAudio no Chromium: zero contextos antes do gesto, sinal RMS não
  zero depois do clique, notas agendadas, pausa sem novos osciladores, mute com
  contexto suspenso e troca persistente entre estilos arcade e ambiente.
- Quatro estados musicais verificados: pausa, combate, clímax e vitória.
- Prévia sonora capturada do navegador: previa-trilha.webm. É uma gravação do teste,
  não uma validação de qualidade musical subjetiva ou de efeito sobre retenção.
- Fluxo completo da união gratuita, configurações da trilha e mobile320 testados
  sem erros JavaScript. Captura atual em preview-21.png.
- Windows nativo, áudio no OBS e recepção de live real continuam sem validação aqui.
- Nenhuma melhora de atenção/retenção foi medida com espectadores. As referências
  orientam hipóteses de design; não se afirmam resultados psicológicos garantidos.

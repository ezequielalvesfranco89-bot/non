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

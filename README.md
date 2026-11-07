# Live Studio

A tela inicial deste projeto agora é o **Live Studio**: editor de interações, 60 ações, física 2D e simulador de presentes e seguidores.

## Abrir sem instalar

1. Baixe o ZIP e escolha **Extrair tudo**.
2. Abra **index.html**, na primeira pasta do projeto, no Chrome ou Edge.
3. Clique **Ativar sons** e **Enviar presente de teste**. A Rosa cria uma flor no cenário.

Você também pode abrir `live-studio/TESTAR.html`. Ambos contêm a mesma aplicação completa. O tutorial passo a passo está em [live-studio/TUTORIAL.html](live-studio/TUTORIAL.html).

## Iniciar a prévia

Com Node instalado, execute na pasta principal:

```sh
npm start
```

Abra http://localhost:3000. A prévia usa o motor local do navegador e não precisa de `npm install`. `npm run dev` abre a mesma prévia. A porta pode ser configurada por `PORT`.

Para o servidor sincronizado com OBS, siga [as instruções completas](live-studio/README.md). A prévia básica e o arquivo HTML guardam as regras no navegador; o servidor OBS tem seu próprio armazenamento. Exporte e importe as regras para transferi-las.

**TikTok, YouTube e Twitch ainda não estão conectados.** Os eventos desta versão são simulados.

Para recompilar, instale as dependências em `live-studio` e execute `npm run build` na raiz. A compilação atualiza tanto `live-studio/TESTAR.html` quanto o `index.html` principal.

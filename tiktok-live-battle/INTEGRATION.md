# Integração TikTok LIVE

Dependência fixada: **TikTokLive 7.0.1**. O modo de teste não acessa TikTok.

## Evidência de suporte a seguidores

O pacote oficial 7.0.1 foi consultado e instalado pelo PyPI. `FollowEvent` está em
`TikTokLive/events/custom_events.py` e herda `SocialEvent`. O despacho em
`TikTokLive/client/client.py` seleciona esse evento para o marcador individual
`follow` do protocolo. O adaptador registra essa classe; não registra uma detecção
inventada, não usa `follow_count` e não consulta o total de seguidores para contar
pessoas. `capabilities()` verifica a instalação e a classe na versão suportada.

Referências consultadas:
- https://pypi.org/project/TikTokLive/7.0.1/
- https://github.com/isaackogan/TikTokLive
- https://github.com/isaackogan/TikTokLive/blob/master/TikTokLive/events/custom_events.py
- https://github.com/isaackogan/TikTokLive/blob/master/TikTokLive/client/client.py

O suporte da biblioteca não garante que o TikTok entregue todos os eventos em toda
região/sessão. Sem evento individual e identidade estável, não há recompensa.

## Presentes e duplicatas

IDs de presentes e `common.msg_id` identificam os eventos. Sequências com `group_id`
processam apenas o delta positivo de `repeat_count`, inclusive no fechamento da
sequência. O identificador inclui sala, espectador e presente. Sem grupo estável,
mensagens intermediárias de uma sequência são ignoradas; somente o fechamento
com identificação de mensagem é aceito. Mensagens sem identidade são descartadas.
Os IDs `demo-*` são exemplos de simulador, não IDs oficiais de presentes. Os IDs
reais recebidos aparecem em Presentes detectados e podem ser mapeados pelo painel.

Seguidores usam mensagem/sala e ID estável do usuário. O SQLite também impede uma
segunda recompensa para a mesma pessoa ou meta dentro da sessão. Reiniciar a rodada
não limpa essa proteção. Nova sessão (mudança de modo) limpa contadores e preserva
histórico e configurações. Reconexões dentro de uma sessão preservam a deduplicação.

## Rede, autenticação e TLS

Uma live pública ativa e o @ correto são necessários. O programa não pede senha e
não contorna autenticação, CAPTCHA, bloqueios regionais ou restrições da plataforma.
A biblioteca usa o serviço de assinatura Euler Stream. A disponibilidade e eventuais
requisitos de conta desse serviço são externos ao programa. A variável opcional
`SIGN_API_KEY` é lida pela própria biblioteca; nunca inclua valores em código ou chat.

O acesso exige, conforme a região, `www.tiktok.com`, `webcast.tiktok.com`,
`api.eulerstream.com` e o host WSS devolvido pela plataforma (frequentemente sob
`tiktok.com`/`tiktokv.com`). As imagens de avatar usam hosts de CDN informados pelos
próprios eventos. A lista exata deve ser obtida do erro e da configuração da rede;
não se altera uma allowlist desconhecida automaticamente. No ambiente cloud desta
conversa esses destinos não estavam liberados; nenhuma live real foi testada.

Os proxies HTTP/HTTPS herdados são preservados, inclusive no WebSocket. A confiança
CA do sistema/`SSL_CERT_FILE`/`REQUESTS_CA_BUNDLE` é usada com verificação habilitada.
O signer do pacote 7.0.1 nasce com `verify_ssl=False`; antes de qualquer requisição,
o adaptador instala um cliente HTTPX verificado usando `set_async_httpx_client`,
preservando cabeçalhos, autenticação e proxy. Nunca execute o signer sem essa troca.
Os testes inspecionam `CERT_REQUIRED` no transporte efetivo.

## Compatibilidade do loop assíncrono

Em 7.0.1, `on()` converte a classe em string e acaba chamando outro método que espera
classe; usamos o método público `add_listener(EventClass, callback)`, validado no
pacote instalado. Também usamos `start()` e aguardamos a tarefa retornada, evitando
`connect()`/`close_client=True` que podem tentar executar um loop síncrono dentro do
loop FastAPI ao cancelar. A desconexão fecha somente os transportes desta integração.

## Validação feita e limites

Testados: classe real FollowEvent, registro de handlers no cliente real, transporte
TLS, normalização, eventos com dados incompletos, contagem do lote de curtidas,
combos e proteção do motor contra duplicatas. A conexão e recepção ponta a ponta
em uma live real precisam ser testadas com uma transmissão ativa. Nenhum resultado
simulado é apresentado como validação de acesso ao TikTok.

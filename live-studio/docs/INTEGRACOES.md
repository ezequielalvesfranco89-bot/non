# Integrações e eventos

Esta entrega funciona como simulação. `server/platform-adapter.ts` define um contrato de adaptador; `UnconfiguredAdapter` declara `connected: false` e lista de eventos vazia. Seu método start recusa execução com uma explicação. Não há OAuth, assinatura EventSub, conexão LIVE, tokens ou endpoint de webhook de plataforma implementados. `/api/command` aceita apenas eventos com origem `simulation`.

## TikTok

Não se assume acesso geral a presentes ou seguidores LIVE por uma API pública. Produtos e permissões precisam ser verificados para a conta e para a região no portal https://developers.tiktok.com/. Nenhuma biblioteca não oficial foi adicionada e nenhum scraping é feito. O sistema permanece em demonstração até existir uma fonte autorizada. A contagem total de seguidores não identifica quem seguiu e nunca é transformada em eventos individuais.

## YouTube

Uma integração futura precisa de OAuth e permissões apropriadas para o recurso oficial de chat ao vivo: https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list. Eventos monetizados, como Super Chat, dependem do tipo de mensagem e da disponibilidade do recurso. Novos inscritos não são universalmente expostos por um evento individual em tempo real; privacidade e capacidade documentada devem ser respeitadas. Não se deduzem eventos a partir de contagens agregadas.

## Twitch

Uma integração futura pode usar EventSub, com registro, autorização, escopos e transporte adequados: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/. `channel.follow` exige as permissões atuais documentadas, incluindo o contexto de moderador quando aplicável. Follow, inscrição paga e Bits são eventos diferentes; não se tratam como “presentes” intercambiáveis sem uma regra explícita. O contrato desta entrega ainda não faz essa conexão.

## Contrato de implementação futura

Antes de encaminhar um evento ao motor: validar autorização, assinatura/transporte e origem; usar IDs de evento e de pessoa fornecidos pela plataforma; definir a semântica cumulativa ou incremental do combo; mapear identificadores oficiais aos gatilhos; informar capacidades reais na interface. O motor e a UI não devem aceitar rótulo de “conectado” sem um adaptador ativo e verificado. O tipo `AuthorizedEvent` é apenas a intenção do contrato e não certifica mensagens por si só: será necessário implementar a verificação e um caminho separado do simulador.

Não exponha o servidor local diretamente à internet. Uma integração oficial exigirá autenticação administrativa, gestão de credenciais, segurança de webhooks e política de reconexão próprias, ainda fora desta entrega.

# Atenção e música: fundamentos e hipóteses da versão 2.1

Os princípios abaixo orientam escolhas de design. Nenhum estudo com espectadores
foi realizado neste projeto. Não há garantia de aumentar retenção ou tempo assistido.

## Referências e limites da aplicação

- Ryan e Deci (2000), Teoria da Autodeterminação, DOI 10.1037/0003-066X.55.1.68:
  autonomia, competência e relacionamento são referências para escolhas gratuitas,
  feedback de contribuição e cooperação. A teoria não prova a eficácia deste jogo.
- Sweller (1988), carga cognitiva em resolução de problemas,
  DOI 10.1207/s15516709cog1202_4: referência para limitar informação concorrente.
  Sua aplicação a uma live de entretenimento é uma hipótese de transferência,
  não um resultado experimental demonstrado aqui.

## O que foi implementado

1. Hierarquia visual: saúde do chefe permanece visível; uma orientação contextual
   fica ao lado da batalha. O aviso de perigo assume prioridade sobre o objetivo.
2. Feedback: participantes veem nome, dano e consequência, sem flashes intensos.
3. União: por padrão, quatro pessoas distintas curtindo, seguindo ou comentando
   liberam um golpe de 180 e 12 de cura. Não exige presentes; uma premiação por fase.
   Não há prazo artificial para completar essa meta. A próxima fase abre uma nova.
4. Antecipação: o chefe anuncia o ataque nos três segundos finais de seu intervalo
   (ou metade do intervalo quando ele é menor). O tempo corresponde ao relógio real
   do combate; !defender pode reduzir o impacto. Pausar cancela o aviso pendente.
5. Trilha: composição procedural original, com melodia, baixo, acordes e percussão
   suaves. Muda de tonalidade por chefe e acrescenta uma camada no último quarto
   da vida do chefe. A música para de agendar notas quando a batalha pausa.
6. Legibilidade sonora: o volume musical abaixa por 1,8s em boas-vindas, metas e
   avisos. Há volume separado, silêncio e uma versão ambiente mais simples.

O efeito da trilha sobre atenção, conforto ou preferência é uma hipótese a testar.
Não se prometem efeitos por frequências especiais ou controle psicológico. A música
não começa sem gesto do usuário. Preferência de movimento reduzido e desativação das
animações continuam disponíveis. Recompensas não são financeiras e presentes seguem
opcionais para avançar.

## Como avaliar sem inventar resultados

Compare sessões semelhantes, alterando uma opção por vez. Registre a configuração,
o tipo de audiência e a origem TESTE/LIVE; observe também desconforto e legibilidade.
A versão mede participação entregue pela integração, não pessoas assistindo.
Retenção e tempo de visualização permanecem indisponíveis. Não se infere causalidade
por poucos eventos ou pela impressão de que uma música é mais animada.

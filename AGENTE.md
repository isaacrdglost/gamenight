# BRIEFING PARA O AGENTE — Salão de Jogos

Cole este arquivo (ou o conteúdo dele) como contexto inicial quando abrir o projeto no seu
agente de código. Ele explica o que é, como está montado, a direção de design, e o que evoluir.

---

## 1. O que é

Um **salão de jogos de grupo** para jogar com amigos, no celular e no desktop. O primeiro jogo é o
**Perfil**: um jogo de dedução em que um time tenta adivinhar uma personalidade a partir de 10 pistas,
que valem de 10 (mais difícil, no topo) a 1 (quase entrega, embaixo). A ideia é ir adicionando
**novos joguinhos** na mesma estante com o tempo.

O foco atual é o **modo online em times** (Vermelho vs Azul), com sorteio automático de time ao entrar.

## 2. Como está montado (arquitetura)

Site **100% estático** (HTML + CSS + JS puro, sem build, sem framework, sem bundler). Isso é proposital:
tem que continuar hospedável em qualquer lugar (Netlify, GitHub Pages) só subindo os arquivos.
Scripts são carregados por `<script>` clássico na ordem definida no `index.html` e conversam por um
namespace global (`window.App`, `window.Perfil`, `window.Net`, `window.AVATARS`, `window.DECK_B64`).
**Não** migre para ES modules / bundler sem um motivo forte — quebraria o "abrir e usar".

```
index.html            carrega tudo, na ordem certa
styles.css            todo o visual (tema "dossiê", ver seção 4)
config.js             chaves do Supabase (o dono preenche; vazio = online desligado)
netlify.toml          publica a raiz
sql/schema.sql        tabela rooms + realtime (rodar no Supabase)
js/
  avatars.js          12 bichinhos em SVG puro (window.AVATARS)
  app.js              storage, perfil do usuário (nick+avatar), roteador, HOME e ESTANTE
  supabase-client.js  window.Net: salas em tempo real (createClient, criar/ler/alterar/inscrever)
  perfil/
    deck.js           window.DECK_B64: baralho embutido, base64 (respostas não ficam em texto puro)
    perfil.js         os 3 modos do Perfil (online / 1v1 local / placar de mesa)
```

**Fluxo de telas:** `App.iniciar()` → se não há perfil salvo, HOME (nick + bichinho) → ESTANTE (cards
dos jogos) → ao abrir o Perfil, `Perfil.abrir(ctx)` assume o `#app`. Cada jogo novo deve seguir esse
contrato: um `window.MeuJogo.abrir(ctx)` que recebe `{perfil, guardar, ler, voltar, el, esc, avatarPorId}`
e desenha dentro de `#app`.

**Helper de DOM:** use o `el(tag, attrs, ...filhos)` que já existe (em app.js e injetado no ctx). Nada de
innerHTML com dado do usuário — sempre `esc()`.

**Storage:** `guardar/ler` abstraem `window.storage` (ambiente de artifact) e `localStorage` (site normal).

## 3. Modelo do ONLINE (o que priorizar)

- Backend: **Supabase**. Uma tabela `rooms (code, state jsonb, updated_at)`. Todo o estado da partida
  vive no JSON `state`. Realtime via `postgres_changes` (UPDATE) filtrando pelo `code`.
- **Modelo leitor**: a cada carta, o app escolhe um leitor do time que NÃO está adivinhando. Só a tela
  do leitor mostra a resposta; todos os outros veem as pistas se abrindo, uma a uma, em tempo real.
  O leitor toca "próxima dica" (valor cai de 10 a 1) e "acertou". O host toca "próxima carta".
- **Times**: ao entrar na sala, o jogador é **sorteado** para o time menor (empate = moeda). O host pode
  "Embaralhar times" no lobby antes de começar. Vermelho = time A, Azul = time B.
- O baralho está embutido em todo cliente; pela rede só trafega o **índice** da carta + quem é o leitor.
  A resposta nunca passa pelo banco. (Quem abrir o console vê o baralho — mesma confiança do jogo de mesa.)
- Sincronização é **último a escrever vence** sobre o `state` inteiro. Como só o leitor e o host disparam
  ações durante a partida, quase não há corrida. O ponto sensível é o lobby (várias pessoas entrando juntas):
  há um retry simples em `Net.alterar`.

### Melhorias de online que valem a pena (roadmap sugerido)
1. **Presença / reconexão**: detectar quem saiu, remover da sala, lidar com host que caiu (passar o host
   para outro jogador automaticamente).
2. **Anti-corrida no lobby**: trocar o read-modify-write do `state` inteiro por uma coluna de membros
   (tabela `room_players`) ou usar `rpc` transacional no Supabase.
3. **Reentrar na sala**: se a pessoa recarregar, voltar direto pra sala em que estava (guardar `code` local).
4. **Placar por jogador** dentro do time e histórico de cartas da partida.
5. **Sala com link** (`?sala=XYZW`) para entrar sem digitar o código.
6. **3+ times** ou tamanho de time configurável (hoje é A vs B).
7. **Timer compartilhado** de verdade (hoje o relógio de 1 min roda local no leitor).

## 4. Direção de DESIGN (não vira "vibe coding")

Tema: **dossiê / ficha de investigação** — combina com "Perfil" (identificar alguém pelas pistas).
Regras que devem ser mantidas em qualquer tela nova:
- **Sem degradê decorativo e sem glow/neon.** Cores chapadas, hairlines de 1px, sombras suaves e baixas.
- Paleta (tokens em `:root` no `styles.css`): papel `#E7E2D6`, cartão `#FBF9F4`, tinta `#1D1A15`,
  secundário `#726A5B`, **Time Vermelho `#C8452C`**, **Time Azul `#2C5C86`**, ouro (valor/pontos) `#C98A12`,
  verde (acerto) `#2C7A52`. As cores dos times têm significado — não use vermelho/azul pra outra coisa.
- Tipografia: **Bricolage Grotesque** (display, números grandes), **Inter** (corpo), **Space Mono**
  (código da sala, rótulos, valores). Mantenha esse contraste display/mono como assinatura.
- Pistas travadas aparecem **desfocadas** (blur) como "informação classificada" e são liberadas em ordem.
  Esse é o elemento-assinatura do jogo; preserve a metáfora.
- Piso de qualidade: responsivo até o mobile, foco de teclado visível, `prefers-reduced-motion` respeitado,
  contraste legível. Copy em português, voz ativa, sentence case, sem enfeite.
- Ao criar UI nova, leia o `styles.css` e **reuse as classes existentes** (`.card`, `.btn`, `.btn-linha`,
  `.btn-ghost`, `.pista`, `.pl.a/.pl.b`, etc.) antes de inventar classe nova.

## 5. Regras de conteúdo do baralho

- Só **pessoas reais**, atuais e conhecidas do público jovem brasileiro (YouTubers, TikTok/Instagram,
  atores, cantores BR e internacionais, esporte). Nada obscuro tipo figura histórica difícil.
- **Exatamente 10 pistas por carta.** Pista 10 (topo, vale 10) é seca e difícil; vai amaciando até a
  pista 1 (vale 1), que quase entrega. Frases curtas.
- **Nunca** ancore a pista em fato que muda (namoro atual, nº de seguidores, "hoje joga no time X"). Se
  o dado é de época, ponha a data na frase ("virei o mais seguido em 2022").
- O baralho fica em `js/perfil/deck.js` como base64 pra não vazar resposta no código. Para editar: decodifique
  o base64 → array de `{n:nome, c:categoria, d:[10 pistas]}` → valide 10 pistas e nomes únicos → recodifique.

## 6. Restrições e não-fazer

- Não introduzir framework/bundler/etc. Manter estático e sem passo de build.
- Não commitar `service_role` do Supabase em lugar nenhum. Só a **anon** vai no `config.js` (é pública).
- Não quebrar os modos offline (1v1 local e placar) ao mexer no online.
- Não trocar a paleta/tipografia por um dos clichês de IA (fundo escuro + acento neon; creme + serifa +
  terracota). A direção "dossiê claro" acima é a escolha.

## 7. Como testar sem navegador (opcional)

Dá pra rodar um smoke test com `jsdom` (Node): carregar os JS na ordem do index, simular `window.storage`
e um `supabase` falso (insert/select/update em memória + um canal que guarda o callback), e dirigir os
cliques. Serve pra pegar erro de fluxo e de realtime antes de subir.

---

## TAREFA INICIAL SUGERIDA (o que pedir ao agente primeiro)

> "Leia este briefing e o código. Rode/valide o modo online ponta a ponta e conserte o que quebrar em
> uso real (reconexão, host que sai, reentrar na sala ao recarregar). Depois melhore o lobby para evitar
> corrida quando várias pessoas entram juntas. Mantenha o site estático, a direção de design 'dossiê' e
> os modos offline funcionando. Não altere o baralho nesta etapa."

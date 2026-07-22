# Salão de Jogos 🎮

Joguinhos de grupo pra jogar com os amigos, no celular e no desktop. Visual estilo Gartic.
O primeiro jogo é o **Perfil**: adivinhe a personalidade pelas dicas — Time Vermelho contra Time Azul.

## Como jogar (online)
1. Abra o site, escolha um **nick** e um **personagem** (3 meninas, 3 meninos, 2 bichinhos).
2. Clique em **Perfil** → **Criar sala nova**.
3. Toque em **Copiar link de convite** e mande no grupo. Quem clicar cai direto na sala
   (também dá pra entrar digitando o código de 4 letras, estilo Among Us).
4. Cada um cai sorteado num time. O host pode **embaralhar os times** e **começar**.

### Regras do Perfil
- A cada carta, **alguém do time da vez é sorteado pra receber a carta**: só essa pessoa vê a
  resposta, e lê as dicas em voz alta pro próprio time.
- As **10 dicas aparecem desde o início**, mas embaçadas. A primeira vale **10 pontos**; cada
  "próxima dica" libera mais uma e o valor cai até **1**.
- Cada dica tem **1 minuto** no relógio (todo mundo vê o mesmo relógio).
- Acertou → o time leva os pontos da dica atual. Primeiro time a fazer **50 pontos** vence
  (com o mesmo número de cartas pros dois lados).
- Time com 1 pessoa só? Aí quem lê é alguém do outro time.

Também tem **1v1 no mesmo celular** e **placar de mesa** (pra quando jogam com cartas de papel).

## Stack
- Site **100% estático** (HTML + CSS + JS puro, sem build) — hospedado na **Vercel**.
- Salas em tempo real via **Supabase** (projeto `gamenight`, região São Paulo).
  A tabela `rooms` guarda o estado da partida em JSON; realtime via `postgres_changes`.
- As chaves públicas do Supabase ficam em `config.js` (já preenchido — a chave é publishable,
  pode ficar no site; **nunca** colocar a `service_role`).

## Rodar local
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura
```
index.html            carrega tudo
styles.css            visual (estilo Gartic)
config.js             chaves públicas do Supabase (preenchido)
sql/schema.sql        tabela rooms + realtime (já aplicado no projeto)
js/
  avatars.js          8 personagens em SVG
  app.js              login (nick + avatar), estante, convite ?sala=CODE
  supabase-client.js  camada de salas em tempo real
  perfil/
    deck.js           baralho (codificado em base64)
    perfil.js         os 3 modos do Perfil
```

## Adicionar um jogo novo
Em `js/app.js`, na lista `JOGOS`, troque `pronto:false` por `pronto:true` e ligue o `abrirJogo`
ao seu módulo (espelhando `window.Perfil.abrir`).

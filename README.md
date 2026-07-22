# Salão de Jogos

Um salão de joguinhos de grupo. Começa com o **Perfil** (dedução por dicas) e a ideia é ir
adicionando novos jogos na estante. Funciona no celular e no desktop.

## O que já tem
- **Home / perfil**: cada pessoa escolhe um nick e um bichinho (12 avatares). Fica salvo no aparelho.
- **Estante de jogos**: cards dos jogos disponíveis. Hoje o Perfil está pronto; outros aparecem como "em breve".
- **Perfil**, com três modos:
  - **Marcar pontos** — placar de mesa pra até 8 pessoas (pra quando jogam com as cartas de papel).
  - **1v1 no mesmo celular** — vocês se revezam passando o aparelho.
  - **Online em times** — sala com código, dois times, um leitor por rodada. *(precisa do Supabase, veja abaixo)*

O baralho fica embutido e codificado em `js/perfil/deck.js` — as respostas não aparecem no código à toa.

---

## Rodar local (sem instalar nada)
Como o app usa vários arquivos `.js`, abrir o `index.html` direto pode esbarrar em bloqueio do navegador.
O jeito mais simples é um servidor local de uma linha:

```bash
# dentro da pasta do projeto
python3 -m http.server 8000
# abra http://localhost:8000
```

Sem servidor, o modo **local** (placar e 1v1) funciona; o **online** só liga com o Supabase configurado.

---

## Subir no ar (Netlify Drop — o mais rápido)
1. Acesse **app.netlify.com/drop**
2. Arraste a **pasta inteira** (ou o zip) pra área de upload
3. Sai um link `algo.netlify.app`. Pronto.

Já vem um `netlify.toml` dizendo que a raiz é o site.

## Subir no GitHub
```bash
git init
git add .
git commit -m "salão de jogos: perfil"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```
Depois dá pra ligar o deploy automático no Netlify apontando pro repositório, ou usar o GitHub Pages
(Settings > Pages > branch `main` / pasta raiz).

---

## Ligar o ONLINE (Supabase) — ~5 minutos
O online precisa de um servidor de salas em tempo real. Usamos o Supabase (tem plano grátis).

1. Crie uma conta em **supabase.com** e um **projeto novo** (de preferência dedicado a este app,
   não misture com outros bancos seus).
2. No projeto, vá em **SQL Editor > New query**, cole o conteúdo de **`sql/schema.sql`** e clique **Run**.
   Isso cria a tabela `rooms` e liga o realtime.
3. Vá em **Project Settings > API** e copie:
   - **Project URL** (ex.: `https://xxxx.supabase.co`)
   - a chave **anon public** (começa com `eyJ...`)
4. Abra **`config.js`** e cole os dois valores:
   ```js
   window.PERFIL_CONFIG = {
     SUPABASE_URL: "https://xxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJ..."
   };
   ```
5. Suba de novo (ou recarregue no local). O card **Online em times** fica ativo.

> A chave **anon** é pública por design, pode ficar no site. **Nunca** ponha a `service_role` aqui.

### Como o online funciona (modo leitor)
- Uma pessoa cria a sala e passa o **código de 4 letras**.
- Todo mundo entra e escolhe **Time A** ou **Time B**.
- A cada carta, o app escolhe um **leitor** do time que *não* está adivinhando. Só a tela do leitor
  mostra a resposta; todos os outros veem as dicas se abrindo, uma a uma.
- O leitor toca **próxima dica** (o valor cai de 10 a 1) e **acertou** quando o time adivinha.
- O host toca **próxima carta**. Primeiro time a bater a meta (50 por padrão) vence, com número de cartas igual.

### Limitações conhecidas (é beta)
- Sincronização é "último a escrever vence". Como só o leitor e o host disparam ações, quase não dá conflito,
  mas se dois entrarem na sala no mesmo instante, um pode precisar entrar de novo.
- Quem abrir o console do navegador consegue ver o baralho — mesma "regra de confiança" do jogo de mesa.
- Sala não expira sozinha (a menos que você ligue a faxina opcional no fim do `sql/schema.sql`).

---

## Estrutura
```
index.html            carrega tudo
styles.css            visual
config.js             chaves do Supabase (você preenche)
netlify.toml          config de deploy
sql/schema.sql        tabela de salas + realtime
js/
  avatars.js          os 12 bichinhos (SVG)
  app.js              home, perfil do usuário, estante de jogos
  supabase-client.js  camada de salas em tempo real
  perfil/
    deck.js           baralho (codificado)
    perfil.js         os três modos do Perfil
```

## Adicionar um jogo novo depois
Em `js/app.js`, na lista `JOGOS`, troque `pronto:false` por `pronto:true` e ligue o `abrirJogo`
ao seu módulo novo (espelhando o que `window.Perfil.abrir` faz). Cada jogo vira um arquivo em `js/`.

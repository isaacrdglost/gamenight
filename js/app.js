window.App = (function(){
  const el = (tag,attrs={},...kids) => {
    const n = document.createElement(tag);
    for(const k in attrs){
      if(k==="class") n.className = attrs[k];
      else if(k==="html") n.innerHTML = attrs[k];
      else if(k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(c => n.appendChild(typeof c==="string"?document.createTextNode(c):c));
    return n;
  };
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  /* ---------- storage (Artifacts window.storage OU localStorage) ---------- */
  async function guardar(chave,valor){
    const d = JSON.stringify(valor);
    try{ if(window.storage&&window.storage.set) await window.storage.set(chave,d); else localStorage.setItem(chave,d); }catch(e){}
  }
  async function ler(chave){
    try{
      let b=null;
      if(window.storage&&window.storage.get){ const r=await window.storage.get(chave); b=r&&r.value; }
      else b=localStorage.getItem(chave);
      return b?JSON.parse(b):null;
    }catch(e){ return null; }
  }

  /* ---------- perfil do usuário ---------- */
  let perfil = null; // {nick, avatar, id}
  function avatarPorId(id){ return (window.AVATARS||[]).find(a=>a.id===id) || window.AVATARS[0]; }
  function novoId(){ return "u-"+Math.random().toString(36).slice(2,9); }

  const raiz = () => document.getElementById("app");

  /* ---------- convite por link (?sala=ABCD) ---------- */
  let salaConvite = null;
  function leConvite(){
    try{
      const c = new URLSearchParams(location.search).get("sala");
      if(c && /^[A-Za-z0-9]{4,6}$/.test(c)) salaConvite = c.toUpperCase();
    }catch(e){}
  }

  /* ================= HOME / LOGIN ================= */
  function telaHome(primeiraVez){
    const av = window.AVATARS;
    let escolhido = perfil ? perfil.avatar : av[Math.floor(Math.random()*av.length)].id;

    const grid = el("div",{class:"avatares"});
    av.forEach(a=>{
      const b = el("button",{type:"button","aria-pressed":String(a.id===escolhido),"aria-label":a.nome,html:a.svg});
      b.addEventListener("click",()=>{
        escolhido=a.id;
        grid.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", String(x===b)));
      });
      grid.appendChild(b);
    });

    const nome = el("input",{type:"text",id:"nk",maxlength:"16",placeholder:"Seu nick",autocomplete:"off",value:perfil?perfil.nick:""});
    const salvar = el("button",{class:"btn",style:"margin-top:20px"}, primeiraVez?"Jogar!":"Salvar");
    salvar.addEventListener("click", async ()=>{
      const nk = nome.value.trim();
      if(!nk){ nome.focus(); return; }
      perfil = { nick:nk, avatar:escolhido, id: perfil?perfil.id:novoId() };
      await guardar("app:perfil", perfil);
      // veio por link de convite? cai direto na sala do jogo certo
      if(salaConvite) roteiaConvite();
      else telaEstante();
    });
    nome.addEventListener("keydown",e=>{ if(e.key==="Enter") salvar.click(); });

    const voltar = perfil ? el("button",{class:"btn-ghost", onclick:()=>telaEstante()},"Voltar") : null;

    raiz().replaceChildren(
      el("header", primeiraVez?{}:{class:"compacto"},
        primeiraVez
          ? el("div",{},
              el("div",{class:"eyebrow"},"Salão de Jogos"),
              el("h1",{html:'Bora <em>jogar</em>?'}),
              el("p",{class:"sub"}, salaConvite
                ? "Você foi convidado pra uma sala! Escolha seu nick e um personagem pra entrar."
                : "Escolha um nick e um personagem. Fica salvo neste aparelho."))
          : [el("div",{}, el("div",{class:"eyebrow"},"Perfil"), el("h1",{},"Editar")), voltar]
      ),
      el("div",{class:"card"},
        el("label",{class:"rot",for:"nk"},"Nick"), nome,
        el("div",{class:"rot",style:"margin-top:22px"},"Escolha seu personagem"),
        grid
      ),
      salvar
    );
  }

  /* ================= ESTANTE DE JOGOS ================= */
  // tags de modo: "dupla" (1v1), "grupo" (times/3+), "individual" (todos contra todos)
  const JOGOS = [
    { id:"perfil", nome:"Perfil", emoji:"🕵️", desc:"Adivinhe a personalidade pelas dicas. Vermelho contra Azul!", pronto:true, tags:["dupla","grupo"] },
    { id:"palpite", nome:"Palpite", emoji:"🎯", desc:"Pergunta numérica, cada um chuta. O mais próximo pontua!", pronto:true, tags:["dupla","grupo","individual"] },
    { id:"maisprovavel", nome:"Mais Provável", emoji:"👥", desc:"Quem do grupo é mais provável de...? Vote na galera!", pronto:true, tags:["grupo"] },
    { id:"verdademito", nome:"Verdade ou Mito", emoji:"🤔", desc:"Afirmação bizarra, vote em 15s. Combo por sequência!", pronto:true, tags:["dupla","grupo","individual"] },
    { id:"quiz", nome:"Quiz Relâmpago", emoji:"⚡", desc:"Perguntas rápidas, quem responde certo e rápido pontua!", pronto:true, tags:["dupla","grupo","individual"] },
    { id:"impostor", nome:"Impostor", emoji:"🎭", desc:"Todos recebem a mesma palavra, menos o impostor.", pronto:true, tags:["grupo"] },
    { id:"espiao", nome:"O Espião", emoji:"🕶️", desc:"Todos sabem o lugar secreto, menos um.", pronto:true, tags:["grupo"] },
    { id:"ordem", nome:"Põe na Ordem", emoji:"📊", desc:"Ordene os 5 itens. Cada posição certa vale ponto!", pronto:true, tags:["dupla","grupo","individual"] },
    { id:"emoji", nome:"Emoji Enigma", emoji:"🎬", desc:"Monte um filme só com emojis. Adivinhem!", pronto:true, tags:["grupo"] },
    { id:"quem", nome:"Quem Escreveu?", emoji:"🎣", desc:"Invente uma resposta falsa e engane a galera!", pronto:true, tags:["grupo"], pegadinha:true },
    { id:"diferente", nome:"A Pergunta Diferente", emoji:"🙃", desc:"Um recebeu outra pergunta. Descubram quem!", pronto:true, tags:["grupo"], pegadinha:true },
    { id:"duasverdades", nome:"2 Verdades 1 Mentira", emoji:"🤥", desc:"Duas verdades e uma mentira. Achem a mentira!", pronto:true, tags:["grupo"], pegadinha:true },
    { id:"batata", nome:"Batata Quente", emoji:"🥔", desc:"Responda em 10s sem repetir. Último vivo vence!", pronto:true, tags:["dupla","grupo"] }
  ];
  const TAGS = { individual:{t:"Individual",e:"👤"}, dupla:{t:"Dupla",e:"👥"}, grupo:{t:"Grupo",e:"👨‍👩‍👧"} };

  function telaEstante(){
    const a = avatarPorId(perfil.avatar);
    const lista = el("div",{class:"galeria"});
    JOGOS.forEach(j=>{
      const badges = el("div",{class:"tags"}, ...(j.tags||[]).map(k=>
        el("span",{class:"tag tag-"+k, title:TAGS[k].t}, TAGS[k].e+" "+TAGS[k].t)));
      if(j.pegadinha) badges.insertBefore(el("span",{class:"tag tag-pegadinha",title:"Jogo de pegadinha"},"😈 Pegadinha"), badges.firstChild);
      const card = el("button",{class:"jcard"+(j.pronto?"":" soon"), type:"button", title:j.desc},
        el("div",{class:"jemoji"}, j.emoji),
        el("h2",{}, j.nome),
        el("p",{}, j.desc),
        badges,
        el("span",{class:"selo"}, j.pronto?"Jogar":"Em breve")
      );
      if(j.pronto) card.addEventListener("click",()=>abrirJogo(j.id));
      lista.appendChild(card);
    });

    raiz().replaceChildren(
      el("header",{class:"compacto larga"},
        el("div",{class:"saudacao"},
          el("div",{class:"av",html:a.svg}),
          el("div",{}, el("div",{class:"eyebrow"},"Olá"), el("h1",{style:"font-size:26px"}, perfil.nick))
        ),
        el("button",{class:"btn-ghost", onclick:()=>telaHome(false)},"Editar")
      ),
      el("div",{}, el("div",{class:"eyebrow",style:"margin-bottom:8px"},"Escolha um jogo"), lista),
      el("footer",{class:"larga",html:'Salão de Jogos · mais jogos entram na galeria em breve.'})
    );
  }

  // liga cada jogo ao seu módulo (mesmo contrato: abrir(ctx))
  const MODULOS = {
    perfil: ()=>window.Perfil, palpite: ()=>window.Palpite,
    maisprovavel: ()=>window.MaisProvavel, verdademito: ()=>window.VerdadeMito,
    quiz: ()=>window.Quiz, impostor: ()=>window.Impostor, espiao: ()=>window.Espiao,
    ordem: ()=>window.Ordem, emoji: ()=>window.EmojiJogo, batata: ()=>window.Batata,
    quem: ()=>window.QuemEscreveu, diferente: ()=>window.Diferente, duasverdades: ()=>window.DuasVerdades
  };
  function abrirJogo(id, joinCode){
    const mod = MODULOS[id] && MODULOS[id]();
    if(!mod) return telaEstante();
    mod.abrir({ perfil, guardar, ler, voltar:telaEstante, el, esc, avatarPorId, joinCode });
  }

  // convite por link: descobre qual jogo é a sala e abre o módulo certo
  async function roteiaConvite(){
    const code = salaConvite; salaConvite = null;
    let gameId = "perfil";
    try{
      if(window.Net && window.Net.disponivel()){
        const st = await window.Net.lerSala(code);
        if(st && st.game && MODULOS[st.game]) gameId = st.game;
      }
    }catch(e){}
    abrirJogo(gameId, code);
  }

  /* ================= BOOT ================= */
  async function iniciar(){
    if(window.FX && window.FX.montar) window.FX.montar();
    leConvite();
    perfil = await ler("app:perfil");
    if(perfil && !perfil.id){ perfil.id = novoId(); await guardar("app:perfil", perfil); }
    if(perfil && perfil.nick){
      if(salaConvite) roteiaConvite();
      else telaEstante();
    } else {
      telaHome(true);
    }
  }

  return { iniciar, el, esc, guardar, ler };
})();

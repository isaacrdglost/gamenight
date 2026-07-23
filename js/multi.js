/* ====================================================================
   MOTOR DE SALA COMPARTILHADO (online, em rodadas)
   Jogos de "todo mundo responde -> revela -> pontua -> próxima rodada"
   plugam aqui passando uma definição (def). Vale pra Palpite, Mais
   Provável, Verdade ou Mito, etc. Individual (todos contra todos).

   Cada jogo fornece um `def`:
   {
     id, nome, emoji, min, metaLabel, metaPadrao, metaMin, metaMax,
     tempoResposta (seg), comoJogar,
     novaRodada(s)   -> define s.dados (a pergunta da rodada)
     renderPergunta(api) -> node de responder
     renderReveal(api)   -> node do resultado
     pontua(s)       -> soma pontos em s.players[id].score e monta s.reveal
   }
   ==================================================================== */
window.Multi = (function(){
  let ctx, el, esc, raiz, def;
  let sala=null, estado=null, desinscrever=null;
  const eu = () => ctx.perfil;
  const Net = () => window.Net;

  function tela(node){ raiz().replaceChildren(node); window.scrollTo({top:0}); }
  function cabec(titulo, extra){
    return el("header",{class:"compacto"},
      el("div",{}, el("div",{class:"eyebrow"}, def.emoji+" "+def.nome), el("h1",{}, titulo)),
      extra || el("button",{class:"btn-ghost", onclick:sairTudo}, "Voltar"));
  }
  function codigoNovo(){ const L="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<4;i++)s+=L[Math.floor(Math.random()*L.length)]; return s; }
  function linkSala(code){ return location.origin+location.pathname+"?sala="+code; }
  function avatarMini(id){ const a=ctx.avatarPorId(id); return el("div",{class:"av",html:a.svg}); }
  const souHost = () => estado && estado.host===eu().id;
  function jogadores(){ return estado.order.filter(id=>estado.players[id]).map(id=>Object.assign({id}, estado.players[id])); }
  function sorteiaIdx(usadas, tam){
    let livres=[]; for(let i=0;i<tam;i++) if(!usadas.includes(i)) livres.push(i);
    if(!livres.length){ usadas.length=0; for(let i=0;i<tam;i++) livres.push(i); }
    return livres[Math.floor(Math.random()*livres.length)];
  }

  /* ---------------- relógio compartilhado ---------------- */
  let timerId=null;
  function paraRel(){ if(timerId){ clearInterval(timerId); timerId=null; } }
  function relogioNode(prazo){
    const total=(def.tempoResposta||30);
    const box=el("div",{class:"relogio"}), txt=el("span"), bar=el("i");
    box.append(txt, el("span",{class:"bar"}, bar));
    function tick(){
      const rest=Math.max(0, Math.ceil((prazo-Date.now())/1000));
      txt.textContent = rest===0?"tempo!":(rest+"s");
      bar.style.width=(rest/total*100)+"%";
      if(rest<=0){ box.classList.add("acabou"); paraRel(); if(souHost()) forcaRevelar(); }
    }
    paraRel(); tick(); timerId=setInterval(tick,500);
    return box;
  }

  /* ---------------- rede ---------------- */
  const chaveSala = () => "sala:"+def.id;
  async function criarSala(){
    const code=codigoNovo();
    const st={
      game:def.id, host:eu().id, phase:"lobby", meta:def.metaPadrao,
      players:{ [eu().id]:{nick:eu().nick, avatar:eu().avatar, score:0, streak:0} },
      order:[eu().id], round:0, usadas:[], answers:{}, dados:null, reveal:null, prazo:null
    };
    try{
      await Net().criarSala(code, st);
      sala={code}; ctx.guardar(chaveSala(),{code});
      ligarCanal(); estado=st; render();
    }catch(e){ alert("Não consegui criar a sala. Tente de novo."); console.error(e); }
  }
  async function entrarSala(code, silencioso){
    try{
      const st=await Net().lerSala(code);
      if(!st){ if(!silencioso) alert("Sala "+code+" não encontrada."); ctx.guardar(chaveSala(),null); return false; }
      const novo=await Net().alterar(code, s=>{
        if(!s.players[eu().id]){ s.players[eu().id]={nick:eu().nick, avatar:eu().avatar, score:0, streak:0}; s.order.push(eu().id); }
        else { s.players[eu().id].nick=eu().nick; s.players[eu().id].avatar=eu().avatar; }
        return s;
      });
      sala={code}; ctx.guardar(chaveSala(),{code});
      ligarCanal(); estado=novo; render();
      return true;
    }catch(e){ if(!silencioso) alert("Não consegui entrar na sala."); console.error(e); return false; }
  }
  function ligarCanal(){
    if(desinscrever){ desinscrever(); desinscrever=null; }
    desinscrever=Net().inscrever(sala.code, st=>{ if(st){ estado=st; render(); } });
  }
  async function mutar(f){
    try{ const novo=await Net().alterar(sala.code, f); if(novo){ estado=novo; render(); } }
    catch(e){ console.error(e); }
  }
  function sairOnline(){
    paraRel();
    if(desinscrever){ desinscrever(); desinscrever=null; }
    ctx.guardar(chaveSala(), null);
    if(sala){
      const code=sala.code;
      Net().alterar(code, s=>{
        if(s.players[eu().id]){ delete s.players[eu().id]; s.order=s.order.filter(i=>i!==eu().id); delete s.answers[eu().id]; }
        if(s.host===eu().id && s.order.length) s.host=s.order[0];
        return s;
      }).then(s=>{ if(s && (!s.order || !s.order.length)) Net().apagarSala(code); }).catch(()=>{});
    }
    sala=null; estado=null; menu();
  }
  function sairTudo(){ paraRel(); if(desinscrever){ desinscrever(); desinscrever=null; } sala=null; estado=null; ctx.voltar(); }

  /* ---------------- menu de entrada ---------------- */
  function menu(){
    const online = Net() && Net().disponivel();
    if(!online){
      return tela(el("div",{},
        cabec(def.nome),
        el("div",{class:"card"}, el("p",{class:"hint"},"Esse jogo é online. Configure o Supabase (config.js) para liberar.")),
        el("footer",{}, def.comoJogar)
      ));
    }
    const codeInput=el("input",{type:"text",maxlength:"4",placeholder:"CÓDIGO",autocomplete:"off",style:"text-transform:uppercase;text-align:center;letter-spacing:.3em;font-family:'Fredoka',sans-serif;font-size:22px"});
    const criar=el("button",{class:"btn"},"Criar sala nova");
    const entrar=el("button",{class:"btn btn-linha"},"Entrar");
    criar.addEventListener("click",criarSala);
    const vai=()=>{ const c=codeInput.value.trim().toUpperCase(); if(c.length>=4) entrarSala(c); };
    entrar.addEventListener("click",vai);
    codeInput.addEventListener("keydown",e=>{ if(e.key==="Enter") vai(); });
    tela(el("div",{},
      cabec(def.nome),
      el("div",{class:"card"},
        el("p",{class:"hint"}, def.comoJogar),
        el("div",{style:"height:14px"}),
        criar,
        el("div",{style:"height:16px"}),
        el("label",{class:"rot"},"Já tem um código?"),
        el("div",{class:"campo"}, codeInput, entrar)
      ),
      el("footer",{},"Chame a galera, todo mundo joga junto!")
    ));
  }

  /* ---------------- placar ---------------- */
  function placarBar(){
    const js=jogadores().sort((a,b)=>b.score-a.score);
    const topo=js.length?js[0].score:0;
    return el("div",{class:"placar-chips"}, ...js.map(p=>
      el("div",{class:"pchip"+(p.score===topo&&topo>0?" lider":"")+(p.id===eu().id?" eu":"")},
        avatarMini(p.avatar), el("b",{}, String(p.score)))));
  }
  function placarLista(){
    const js=jogadores().sort((a,b)=>b.score-a.score);
    const topo=js.length?js[0].score:0;
    return el("div",{class:"placar-lista"}, ...js.map((p,i)=>
      el("div",{class:"linha-placar"+(p.score===topo&&topo>0?" lider":"")},
        el("span",{class:"pos"},(i+1)+"º"), avatarMini(p.avatar),
        el("span",{class:"nm"}, p.nick + (p.id===estado.host?" 👑":"")),
        el("span",{class:"pt"}, String(p.score)))));
  }

  /* ---------------- api pros jogos ---------------- */
  function jaRespondi(){ return estado.answers && estado.answers[eu().id]!=null; }
  function meuAnswer(){ return estado.answers[eu().id]; }
  function responder(v){
    if(jaRespondi()) return;
    mutar(s=>{ if(s.answers[eu().id]==null){ s.answers[eu().id]=v; } return s; });
  }
  function fazApi(){
    return { s:estado, el, esc, euId:eu().id, souHost:souHost(),
      avatarPorId:ctx.avatarPorId, avatarMini,
      responder, jaRespondi, meuAnswer, jogadores };
  }

  /* ---------------- lobby ---------------- */
  function lobby(){
    paraRel();
    const grade=el("div",{class:"lobby-jogadores"}, ...jogadores().map(p=>
      el("div",{class:"membro"+(p.id===eu().id?" eu":"")}, avatarMini(p.avatar),
        el("span",{}, p.nick + (p.id===estado.host?" 👑":"")))));

    const copiar=el("button",{class:"btn btn-linha",style:"margin-top:14px"},"Copiar link de convite");
    copiar.addEventListener("click", async ()=>{
      const link=linkSala(sala.code);
      try{ await navigator.clipboard.writeText(link); copiar.textContent="Link copiado! ✓"; }
      catch(e){ prompt("Copie o link:", link); }
      setTimeout(()=>{ copiar.textContent="Copiar link de convite"; },2000);
    });

    const podeComecar = souHost() && estado.order.length>=def.min;
    const controles=[];
    if(souHost()){
      // seletor de rodadas
      const menos=el("button",{class:"btn-ghost"},"−");
      const mais=el("button",{class:"btn-ghost"},"+");
      const val=el("b",{}, String(estado.meta)+" "+(def.metaLabel||"rodadas"));
      menos.addEventListener("click",()=>mutar(s=>{ s.meta=Math.max(def.metaMin, s.meta-1); return s; }));
      mais.addEventListener("click",()=>mutar(s=>{ s.meta=Math.min(def.metaMax, s.meta+1); return s; }));
      controles.push(el("div",{class:"seletor-meta"}, menos, val, mais));
      const comecar=el("button",{class:"btn",style:"margin-top:10px"},"Começar!");
      comecar.disabled=!podeComecar;
      comecar.addEventListener("click", comecar_partida);
      controles.push(comecar);
    } else {
      controles.push(el("p",{class:"aviso",style:"margin-top:18px"},"Esperando o host começar…"));
    }

    tela(el("div",{},
      cabec("Sala", el("button",{class:"btn-ghost",onclick:sairOnline},"Sair")),
      el("div",{class:"card"},
        el("div",{class:"eyebrow",style:"text-align:center"},"Código da sala"),
        el("div",{class:"codigo"}, sala.code),
        el("p",{class:"aviso"},"Mande o link ou o código pra galera."),
        copiar,
        el("div",{class:"rot",style:"margin-top:20px"}, "Na sala ("+estado.order.length+")"),
        grade,
        ...controles
      ),
      el("footer",{}, podeComecar||!souHost() ? def.comoJogar : "Precisa de pelo menos "+def.min+" jogadores.")
    ));
  }
  function comecar_partida(){
    mutar(s=>{
      s.phase="pergunta"; s.round=1; s.usadas=[]; s.answers={}; s.reveal=null;
      s.order.forEach(id=>{ s.players[id].score=0; s.players[id].streak=0; });
      def.novaRodada(s); s.prazo=Date.now()+(def.tempoResposta||30)*1000;
      return s;
    });
  }

  /* ---------------- rodada: responder ---------------- */
  let revelandoRodada=-1;
  function forcaRevelar(){
    if(!estado || estado.phase!=="pergunta") return;
    if(revelandoRodada===estado.round) return;
    revelandoRodada=estado.round;
    mutar(s=>{ if(s.phase!=="pergunta") return s; def.pontua(s); s.reveal=s.reveal||{}; s.phase="reveal"; return s; });
  }
  function fasePergunta(){
    const respondidos=estado.order.filter(id=>estado.answers[id]!=null).length;
    const total=estado.order.length;
    const meio=def.renderPergunta(fazApi());

    const chips=el("div",{class:"aguardando"}, ...jogadores().map(p=>
      el("span",{class:"chip"+(estado.answers[p.id]!=null?" ok":"")}, avatarMini(p.avatar), p.nick)));

    const controles=[];
    if(souHost()){
      const rev=el("button",{class:"btn-ghost larga",style:"width:100%"},"Revelar agora ("+respondidos+"/"+total+")");
      rev.addEventListener("click", forcaRevelar);
      controles.push(rev);
    }

    tela(el("div",{},
      placarBar(),
      relogioNode(estado.prazo),
      el("div",{class:"card"},
        el("div",{class:"eyebrow"},"Rodada "+estado.round+" de "+estado.meta),
        meio),
      jaRespondi()?el("p",{class:"aviso"},"Resposta enviada! Faltam "+(total-respondidos)+"…"):"",
      chips,
      ...controles,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));

    // host revela sozinho quando todos responderam
    if(souHost() && estado.order.every(id=>estado.answers[id]!=null)) forcaRevelar();
  }

  /* ---------------- rodada: resultado ---------------- */
  function faseReveal(){
    paraRel();
    const fim = estado.round>=estado.meta;
    const meio=def.renderReveal(fazApi());
    const cont=el("button",{class:"btn"}, fim?"Ver resultado 🏆":"Próxima rodada");
    if(souHost()) cont.addEventListener("click",()=>proxima(fim));
    else { cont.disabled=true; cont.textContent="Esperando o host…"; }
    tela(el("div",{},
      placarBar(),
      el("div",{class:"card"}, meio),
      el("div",{class:"rot",style:"margin-top:4px"},"Placar"),
      placarLista(),
      cont,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));
  }
  function proxima(fim){
    mutar(s=>{
      if(fim){ s.phase="over"; return s; }
      s.round++; s.answers={}; s.reveal=null; def.novaRodada(s);
      s.prazo=Date.now()+(def.tempoResposta||30)*1000; s.phase="pergunta";
      return s;
    });
  }

  /* ---------------- fim ---------------- */
  function faseOver(){
    paraRel();
    const js=jogadores().sort((a,b)=>b.score-a.score);
    const topo=js.length?js[0].score:0;
    const campeoes=js.filter(p=>p.score===topo);
    const titulo = campeoes.length===1 ? (campeoes[0].nick+" venceu!") : "Empate!";
    const rev=el("button",{class:"btn"},"Jogar de novo");
    if(souHost()) rev.addEventListener("click", comecar_partida);
    else { rev.disabled=true; rev.textContent="Esperando o host…"; }
    tela(el("div",{},
      confetes(120),
      el("div",{class:"card fim"},
        el("div",{class:"trofeu"},"🏆"), el("div",{class:"eyebrow"},"Fim de jogo"),
        el("h2",{}, titulo),
        el("div",{style:"margin:14px 0 4px"}, ...campeoes.map(p=>avatarMini(p.avatar))),
        placarLista(),
        el("div",{style:"margin-top:20px"}, rev),
        el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    )));
  }

  /* ---------------- confete ---------------- */
  function confetes(qtd){
    const cores=["#FF5252","#38A3FF","#FFC94D","#35C66F","#C9A7FF","#FFFFFF"];
    const box=el("div",{class:"confetes","aria-hidden":"true"});
    for(let i=0;i<qtd;i++){
      box.appendChild(el("i",{style:
        "left:"+(Math.random()*100)+"%;background:"+cores[i%cores.length]+
        ";animation-delay:"+(Math.random()*.9).toFixed(2)+"s"+
        ";animation-duration:"+(2.2+Math.random()*1.8).toFixed(2)+"s"+
        ";width:"+(7+Math.random()*7).toFixed(0)+"px"}));
    }
    return box;
  }

  /* ---------------- roteador ---------------- */
  function render(){
    if(!estado) return;
    if(estado.phase==="lobby") return lobby();
    if(estado.phase==="pergunta") return fasePergunta();
    if(estado.phase==="reveal") return faseReveal();
    if(estado.phase==="over") return faseOver();
  }

  /* ---------------- entrada ---------------- */
  async function abrir(context, definicao){
    ctx=context; el=context.el; esc=context.esc; def=definicao;
    raiz=()=>document.getElementById("app");
    const online = Net() && Net().disponivel();
    if(online && ctx.joinCode){ if(await entrarSala(ctx.joinCode)) return; }
    if(online){
      const salva=await ctx.ler(chaveSala());
      if(salva && salva.code){ if(await entrarSala(salva.code, true)) return; }
    }
    menu();
  }

  return { abrir, _util:{ sorteiaIdx } };
})();

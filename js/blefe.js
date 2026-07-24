/* ====================================================================
   MOTOR DE BLEFE (online, em rodadas)
   Jogos de pegadinha: "todo mundo escreve algo -> todo mundo vota ->
   revela quem enganou quem". Serve Quem Escreveu?, A Pergunta Diferente
   e Duas Verdades e Uma Mentira.

   Cada jogo fornece um `def`:
   {
     id, nome, emoji, min, metaPadrao, metaMin, metaMax, total,
     comoJogar, rapidas, tempoEscrever, tempoVotar,
     novaRodada(s)         -> define s.dados
     escrevem(s)           -> [ids] de quem precisa escrever nesta rodada
     telaEscrever(api)     -> node (usa api.escrever(valor))
     esperando(api)        -> node de quem não escreve nesta rodada
     opcoes(s)             -> [{k, rotulo, avatar}] no que se vota
     votam(s)              -> [ids] de quem vota
     tituloVotar(s)        -> texto do cabeçalho da votação
     pontua(s)             -> soma pontos e monta s.reveal
     renderReveal(api)     -> node do resultado
   }
   ==================================================================== */
window.Blefe = (function(){
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
  let somGate=null;
  function som(n,k){ if(somGate!==k){ somGate=k; if(window.FX&&window.FX.toca) window.FX.toca(n); } }
  function sorteiaIdx(usadas, tam){
    let livres=[]; for(let i=0;i<tam;i++) if(!usadas.includes(i)) livres.push(i);
    if(!livres.length){ usadas.length=0; for(let i=0;i<tam;i++) livres.push(i); }
    return livres[Math.floor(Math.random()*livres.length)];
  }
  function embaralha(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=b[i]; b[i]=b[j]; b[j]=t; } return b; }

  /* relógio */
  let timerId=null;
  function paraRel(){ if(timerId){ clearInterval(timerId); timerId=null; } }
  function relogio(prazo, total, aoZerar){
    const box=el("div",{class:"relogio"}), txt=el("span"), bar=el("i");
    box.append(txt, el("span",{class:"bar"}, bar));
    function tick(){
      const rest=Math.max(0, Math.ceil((prazo-Date.now())/1000));
      txt.textContent = rest===0?"tempo!":(rest+"s");
      bar.style.width=(rest/total*100)+"%";
      if(rest<=0){ box.classList.add("acabou"); paraRel(); if(souHost()) aoZerar(); }
    }
    paraRel(); tick(); timerId=setInterval(tick,500); return box;
  }
  function barraEsgoto(){
    const total=def.total||0; if(!total) return el("div",{});
    const usado=estado&&estado.usadas?estado.usadas.length:0;
    const resta=Math.max(0,Math.min(1,(total-usado)/total));
    const cor=resta>0.5?"var(--verde)":(resta>0.2?"var(--ouro)":"var(--tva)");
    return el("div",{class:"esgoto","aria-hidden":"true"}, el("i",{style:"width:"+(resta*100).toFixed(0)+"%;background:"+cor}));
  }

  /* rede */
  const chaveSala=()=>"sala:"+def.id;
  async function criarSala(){
    const code=codigoNovo();
    const st={ game:def.id, host:eu().id, phase:"lobby", meta:def.metaPadrao,
      players:{[eu().id]:{nick:eu().nick,avatar:eu().avatar,score:0}}, order:[eu().id],
      round:0, usadas:[], dados:null, textos:{}, votos:{}, prazo:null, reveal:null };
    try{ await Net().criarSala(code,st); sala={code}; ctx.guardar(chaveSala(),{code}); ligar(); estado=st; render(); }
    catch(e){ alert("Não consegui criar a sala."); console.error(e); }
  }
  async function entrarSala(code,sil){
    try{ const st=await Net().lerSala(code); if(!st){ if(!sil) alert("Sala "+code+" não encontrada."); ctx.guardar(chaveSala(),null); return false; }
      const novo=await Net().alterar(code,s=>{
        if(!s.players[eu().id]){ s.players[eu().id]={nick:eu().nick,avatar:eu().avatar,score:0}; s.order.push(eu().id); }
        else { s.players[eu().id].nick=eu().nick; s.players[eu().id].avatar=eu().avatar; }
        return s; });
      sala={code}; ctx.guardar(chaveSala(),{code}); ligar(); estado=novo; render(); return true;
    }catch(e){ if(!sil) alert("Não consegui entrar."); console.error(e); return false; }
  }
  function ligar(){
    if(desinscrever){ desinscrever(); desinscrever=null; }
    desinscrever=Net().inscrever(sala.code, st=>{ if(st){ estado=st; render(); } });
    if(window.Chat) window.Chat.ligar({ mutar, eu, avatarPorId:ctx.avatarPorId, rapidas:def.rapidas||[] });
  }
  async function mutar(f){ try{ const n=await Net().alterar(sala.code,f); if(n){ estado=n; render(); } }catch(e){ console.error(e); } }
  function sairOnline(){
    paraRel(); if(window.Chat) window.Chat.desligar();
    if(desinscrever){ desinscrever(); desinscrever=null; }
    ctx.guardar(chaveSala(),null);
    if(sala){ const code=sala.code; Net().alterar(code,s=>{
      if(s.players[eu().id]){ delete s.players[eu().id]; s.order=s.order.filter(i=>i!==eu().id); delete s.textos[eu().id]; delete s.votos[eu().id]; }
      if(s.host===eu().id && s.order.length) s.host=s.order[0];
      return s; }).then(s=>{ if(s&&(!s.order||!s.order.length)) Net().apagarSala(code); }).catch(()=>{}); }
    sala=null; estado=null; menu();
  }
  function sairTudo(){ paraRel(); if(window.Chat) window.Chat.desligar(); if(desinscrever){ desinscrever(); desinscrever=null; } sala=null; estado=null; ctx.voltar(); }

  /* menu / lobby */
  function menu(){
    const online=Net()&&Net().disponivel();
    if(!online) return tela(el("div",{}, cabec(def.nome),
      el("div",{class:"card"}, el("p",{class:"hint"},"Esse jogo é online. Configure o Supabase (config.js).")),
      el("footer",{}, def.comoJogar)));
    const ci=el("input",{type:"text",maxlength:"4",placeholder:"CÓDIGO",autocomplete:"off",style:"text-transform:uppercase;text-align:center;letter-spacing:.3em;font-family:'Fredoka',sans-serif;font-size:22px"});
    const criar=el("button",{class:"btn"},"Criar sala nova"), entrar=el("button",{class:"btn btn-linha"},"Entrar");
    criar.addEventListener("click",criarSala);
    const vai=()=>{ const c=ci.value.trim().toUpperCase(); if(c.length>=4) entrarSala(c); };
    entrar.addEventListener("click",vai); ci.addEventListener("keydown",e=>{ if(e.key==="Enter") vai(); });
    tela(el("div",{}, cabec(def.nome), el("div",{class:"card"},
      el("p",{class:"hint"}, def.comoJogar),
      el("div",{style:"height:14px"}), criar,
      el("div",{style:"height:16px"}), el("label",{class:"rot"},"Já tem um código?"),
      el("div",{class:"campo"}, ci, entrar)),
      el("footer",{},"Melhor de "+def.min+" a 7 pessoas!")));
  }
  function placarLista(){
    const js=jogadores().sort((a,b)=>b.score-a.score); const topo=js.length?js[0].score:0;
    return el("div",{class:"placar-lista"}, ...js.map((p,i)=>el("div",{class:"linha-placar"+(p.score===topo&&topo>0?" lider":"")},
      el("span",{class:"pos"},(i+1)+"º"), avatarMini(p.avatar),
      el("span",{class:"nm"}, p.nick+(p.id===estado.host?" 👑":"")), el("span",{class:"pt"}, String(p.score)))));
  }
  function confetes(q){ const c=["#FF5252","#38A3FF","#FFC94D","#35C66F","#C9A7FF","#FFFFFF"]; const b=el("div",{class:"confetes","aria-hidden":"true"});
    for(let i=0;i<q;i++) b.appendChild(el("i",{style:"left:"+(Math.random()*100)+"%;background:"+c[i%c.length]+";animation-delay:"+(Math.random()*.9).toFixed(2)+"s;animation-duration:"+(2.2+Math.random()*1.8).toFixed(2)+"s;width:"+(7+Math.random()*7).toFixed(0)+"px"})); return b; }

  function lobby(){
    paraRel();
    const grade=el("div",{class:"lobby-jogadores"}, ...jogadores().map(p=>
      el("div",{class:"membro"+(p.id===eu().id?" eu":"")}, avatarMini(p.avatar), el("span",{}, p.nick+(p.id===estado.host?" 👑":"")))));
    const copiar=el("button",{class:"btn btn-linha",style:"margin-top:14px"},"Copiar link de convite");
    copiar.addEventListener("click", async ()=>{ const link=linkSala(sala.code);
      try{ await navigator.clipboard.writeText(link); copiar.textContent="Link copiado! ✓"; }catch(e){ prompt("Copie o link:", link); }
      setTimeout(()=>{ copiar.textContent="Copiar link de convite"; },2000); });
    const pode=souHost()&&estado.order.length>=def.min; const ctrl=[];
    if(souHost()){
      const menos=el("button",{class:"btn-ghost"},"−"), mais=el("button",{class:"btn-ghost"},"+"), val=el("b",{}, String(estado.meta)+" rodadas");
      menos.addEventListener("click",()=>mutar(s=>{ s.meta=Math.max(def.metaMin,s.meta-1); return s; }));
      mais.addEventListener("click",()=>mutar(s=>{ s.meta=Math.min(def.metaMax,s.meta+1); return s; }));
      ctrl.push(el("div",{class:"seletor-meta"}, menos, val, mais));
      const c=el("button",{class:"btn",style:"margin-top:10px"},"Começar!"); c.disabled=!pode; c.addEventListener("click",comecar); ctrl.push(c);
    } else ctrl.push(el("p",{class:"aviso",style:"margin-top:18px"},"Esperando o host começar…"));
    tela(el("div",{}, cabec("Sala", el("button",{class:"btn-ghost",onclick:sairOnline},"Sair")),
      el("div",{class:"card"},
        el("div",{class:"eyebrow",style:"text-align:center"},"Código da sala"), el("div",{class:"codigo"}, sala.code),
        el("p",{class:"aviso"},"Mande o link ou o código pra galera."), copiar,
        el("div",{class:"rot",style:"margin-top:20px"},"Na sala ("+estado.order.length+")"), grade, ...ctrl),
      el("footer",{}, pode||!souHost()? def.comoJogar : "Precisa de pelo menos "+def.min+" jogadores.")));
  }
  function comecar(){
    mutar(s=>{ s.phase="escrever"; s.round=1; s.usadas=[]; s.order.forEach(id=>s.players[id].score=0);
      def.novaRodada(s); s.textos={}; s.votos={}; s.reveal=null;
      s.prazo=Date.now()+(def.tempoEscrever||70)*1000; return s; });
  }

  /* ---------------- escrever ---------------- */
  function escrever(valor){
    if(estado.textos[eu().id]!=null) return;
    mutar(s=>{ if(s.textos[eu().id]==null) s.textos[eu().id]=valor; return s; });
  }
  let fechandoEscrita=-1;
  function fechaEscrita(){
    if(!estado || estado.phase!=="escrever") return;
    if(fechandoEscrita===estado.round) return;
    fechandoEscrita=estado.round;
    mutar(s=>{ if(s.phase!=="escrever") return s;
      s.phase="votar"; s.prazo=Date.now()+(def.tempoVotar||45)*1000; return s; });
  }
  function rodapeEscrita(){
    const faltam=def.escrevem(estado).filter(id=>estado.textos[id]==null).length;
    const chips=el("div",{class:"aguardando"}, ...def.escrevem(estado).map(id=>{
      const p=estado.players[id]; if(!p) return el("span",{});
      return el("span",{class:"chip"+(estado.textos[id]!=null?" ok":"")}, avatarMini(p.avatar), p.nick);
    }));
    const filhos=[chips];
    if(souHost() && faltam>0){
      const b=el("button",{class:"btn-ghost larga",style:"width:100%"},"Fechar e votar ("+(def.escrevem(estado).length-faltam)+"/"+def.escrevem(estado).length+")");
      b.addEventListener("click",fechaEscrita); filhos.push(b);
    }
    filhos.push(el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala")));
    return el("div",{id:"rodape-blefe"}, ...filhos);
  }
  function faseEscrever(){
    som("pop","e"+estado.round);
    const souEscritor=def.escrevem(estado).includes(eu().id);
    const meio = souEscritor && estado.textos[eu().id]==null ? def.telaEscrever(fazApi())
               : (estado.textos[eu().id]!=null ? el("div",{class:"resposta-dada"},"Enviado! Esperando os outros…") : def.esperando(fazApi()));
    tela(el("div",{}, barraEsgoto(), relogio(estado.prazo, def.tempoEscrever||70, fechaEscrita),
      el("div",{class:"card"}, el("div",{class:"eyebrow"},"Rodada "+estado.round+" de "+estado.meta), meio),
      rodapeEscrita()));
    if(souHost() && def.escrevem(estado).every(id=>estado.textos[id]!=null)) fechaEscrita();
  }

  /* ---------------- votar ---------------- */
  let fechandoVoto=-1;
  function fechaVoto(){
    if(!estado || estado.phase!=="votar") return;
    if(fechandoVoto===estado.round) return;
    fechandoVoto=estado.round;
    mutar(s=>{ if(s.phase!=="votar") return s; def.pontua(s); s.phase="reveal"; return s; });
  }
  function faseVotar(){
    som("chime","v"+estado.round);
    const podeVotar=def.votam(estado).includes(eu().id);
    const jaVotei=estado.votos[eu().id]!=null;
    const wrap=el("div",{});
    wrap.appendChild(el("p",{class:"pergunta-jogo",style:"text-align:center"}, def.tituloVotar(estado)));
    if(!podeVotar){ wrap.appendChild(el("p",{class:"aviso"},"Você não vota nesta rodada. Deixa a galera se enrolar! 😏")); }
    else if(jaVotei){
      const op=def.opcoes(estado).find(o=>o.k===estado.votos[eu().id]);
      wrap.appendChild(el("div",{class:"resposta-dada"},"Você votou em ", el("b",{}, op?op.rotulo:"algo")));
    } else {
      const lista=el("div",{class:"opcoes-blefe"});
      def.opcoes(estado).forEach(o=>{
        const b=el("button",{class:"op-blefe",type:"button"});
        if(o.avatar!=null) b.appendChild(avatarMini(o.avatar));
        b.appendChild(el("span",{}, o.rotulo));
        b.addEventListener("click",()=>mutar(s=>{ if(s.votos[eu().id]==null) s.votos[eu().id]=o.k; return s; }));
        lista.appendChild(b);
      });
      wrap.appendChild(lista);
    }
    const votaram=def.votam(estado).filter(id=>estado.votos[id]!=null).length;
    const total=def.votam(estado).length;
    const chips=el("div",{class:"aguardando"}, ...def.votam(estado).map(id=>{
      const p=estado.players[id]; if(!p) return el("span",{});
      return el("span",{class:"chip"+(estado.votos[id]!=null?" ok":"")}, avatarMini(p.avatar), p.nick);
    }));
    const ctrl=[];
    if(souHost() && votaram<total){
      const b=el("button",{class:"btn-ghost larga",style:"width:100%"},"Fechar votação ("+votaram+"/"+total+")");
      b.addEventListener("click",fechaVoto); ctrl.push(b);
    }
    tela(el("div",{}, barraEsgoto(), relogio(estado.prazo, def.tempoVotar||45, fechaVoto),
      el("div",{class:"card"}, el("div",{class:"eyebrow"},"Rodada "+estado.round+" de "+estado.meta), wrap),
      chips, ...ctrl,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))));
    if(souHost() && def.votam(estado).every(id=>estado.votos[id]!=null)) fechaVoto();
  }

  /* ---------------- revelação e fim ---------------- */
  function faseReveal(){
    paraRel(); som("chime","r"+estado.round);
    const fim=estado.round>=estado.meta;
    const cont=el("button",{class:"btn"}, fim?"Ver resultado 🏆":"Próxima rodada");
    if(souHost()) cont.addEventListener("click",()=>proxima(fim));
    else { cont.disabled=true; cont.textContent="Esperando o host…"; }
    tela(el("div",{}, confetes(50),
      el("div",{class:"card"}, def.renderReveal(fazApi())),
      el("div",{class:"rot"},"Placar"), placarLista(), cont,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))));
  }
  function proxima(fim){
    mutar(s=>{ if(fim){ s.phase="over"; return s; }
      s.round++; def.novaRodada(s); s.textos={}; s.votos={}; s.reveal=null;
      s.prazo=Date.now()+(def.tempoEscrever||70)*1000; s.phase="escrever"; return s; });
  }
  function faseOver(){
    paraRel(); som("fanfarra","over");
    const js=jogadores().sort((a,b)=>b.score-a.score); const topo=js.length?js[0].score:0;
    const campe=js.filter(p=>p.score===topo);
    const titulo=campe.length===1?(campe[0].nick+" venceu!"):"Empate!";
    const rev=el("button",{class:"btn"},"Jogar de novo");
    if(souHost()) rev.addEventListener("click",comecar); else { rev.disabled=true; rev.textContent="Esperando o host…"; }
    tela(el("div",{}, confetes(120), el("div",{class:"card fim"},
      el("div",{class:"trofeu"},"🏆"), el("div",{class:"eyebrow"},"Fim de jogo"), el("h2",{}, titulo),
      el("div",{style:"margin:14px 0 4px"}, ...campe.map(p=>avatarMini(p.avatar))), placarLista(),
      el("div",{style:"margin-top:20px"}, rev),
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala")))));
  }

  function fazApi(){
    return { s:estado, el, esc, euId:eu().id, souHost:souHost(), avatarMini,
      avatarPorId:ctx.avatarPorId, escrever, jogadores, embaralha };
  }

  /* roteador (preserva o que está sendo digitado) */
  let sigEsc=null;
  function render(){
    if(!estado) return;
    if(window.Chat) window.Chat.novoEstado(estado);
    if(estado.phase==="escrever"){
      const sig=estado.round+"|"+(estado.textos[eu().id]!=null?"1":"0");
      if(sig!==sigEsc){ sigEsc=sig; faseEscrever(); }
      else { const r=document.getElementById("rodape-blefe"); if(r) r.replaceWith(rodapeEscrita()); }
      if(souHost() && def.escrevem(estado).every(id=>estado.textos[id]!=null)) fechaEscrita();
      return;
    }
    sigEsc=null;
    if(estado.phase==="lobby") return lobby();
    if(estado.phase==="votar") return faseVotar();
    if(estado.phase==="reveal") return faseReveal();
    if(estado.phase==="over") return faseOver();
  }

  async function abrir(context, definicao){
    ctx=context; el=context.el; esc=context.esc; def=definicao;
    raiz=()=>document.getElementById("app");
    const online=Net()&&Net().disponivel();
    if(online && ctx.joinCode){ if(await entrarSala(ctx.joinCode)) return; }
    if(online){ const salva=await ctx.ler(chaveSala()); if(salva&&salva.code){ if(await entrarSala(salva.code,true)) return; } }
    menu();
  }
  return { abrir, _util:{ sorteiaIdx, embaralha } };
})();

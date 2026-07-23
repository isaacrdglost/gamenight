/* ====================================================================
   MOTOR DE DEDUÇÃO SOCIAL (online, em rodadas)
   Jogos de "todo mundo recebe um papel secreto, conversa e vota em quem
   é o infiltrado". Serve Impostor e O Espião.

   Cada jogo fornece um `def`:
   {
     id, nome, emoji, min, metaPadrao, metaMin, metaMax, comoJogar,
     textoAlvo,          // "impostor" | "espião"
     papelCaption,       // título do cartão de papel
     montaRodada(s)      // host: define s.rodada = { ...segredo..., alvoId }
     meuPapel(s, myId)   // -> { titulo, sub, alerta:bool } que ESTE jogador vê
     segredoReveal(s)    // -> texto do segredo pra tela de revelação
   }

   OBS de confiança: como a sala é um JSON compartilhado, quem abrir o
   console consegue ver o papel dos outros. Mesma regra do jogo de mesa:
   confia na galera e não abre o console. :)
   ==================================================================== */
window.Deducao = (function(){
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

  /* ---------------- rede ---------------- */
  const chaveSala = () => "sala:"+def.id;
  async function criarSala(){
    const code=codigoNovo();
    const st={
      game:def.id, host:eu().id, phase:"lobby", meta:def.metaPadrao,
      players:{ [eu().id]:{nick:eu().nick, avatar:eu().avatar, score:0} },
      order:[eu().id], round:0, usadas:[], rodada:null, prontos:{}, votos:{}, reveal:null
    };
    try{ await Net().criarSala(code, st); sala={code}; ctx.guardar(chaveSala(),{code}); ligarCanal(); estado=st; render(); }
    catch(e){ alert("Não consegui criar a sala. Tente de novo."); console.error(e); }
  }
  async function entrarSala(code, silencioso){
    try{
      const st=await Net().lerSala(code);
      if(!st){ if(!silencioso) alert("Sala "+code+" não encontrada."); ctx.guardar(chaveSala(),null); return false; }
      const novo=await Net().alterar(code, s=>{
        if(!s.players[eu().id]){ s.players[eu().id]={nick:eu().nick, avatar:eu().avatar, score:0}; s.order.push(eu().id); }
        else { s.players[eu().id].nick=eu().nick; s.players[eu().id].avatar=eu().avatar; }
        return s;
      });
      sala={code}; ctx.guardar(chaveSala(),{code}); ligarCanal(); estado=novo; render(); return true;
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
    if(desinscrever){ desinscrever(); desinscrever=null; }
    ctx.guardar(chaveSala(), null);
    if(sala){
      const code=sala.code;
      Net().alterar(code, s=>{
        if(s.players[eu().id]){ delete s.players[eu().id]; s.order=s.order.filter(i=>i!==eu().id); delete s.votos[eu().id]; delete s.prontos[eu().id]; }
        if(s.host===eu().id && s.order.length) s.host=s.order[0];
        return s;
      }).then(s=>{ if(s && (!s.order || !s.order.length)) Net().apagarSala(code); }).catch(()=>{});
    }
    sala=null; estado=null; menu();
  }
  function sairTudo(){ if(desinscrever){ desinscrever(); desinscrever=null; } sala=null; estado=null; ctx.voltar(); }

  /* ---------------- menu ---------------- */
  function menu(){
    const online = Net() && Net().disponivel();
    if(!online){
      return tela(el("div",{}, cabec(def.nome),
        el("div",{class:"card"}, el("p",{class:"hint"},"Esse jogo é online. Configure o Supabase (config.js) para liberar.")),
        el("footer",{}, def.comoJogar)));
    }
    const codeInput=el("input",{type:"text",maxlength:"4",placeholder:"CÓDIGO",autocomplete:"off",style:"text-transform:uppercase;text-align:center;letter-spacing:.3em;font-family:'Fredoka',sans-serif;font-size:22px"});
    const criar=el("button",{class:"btn"},"Criar sala nova");
    const entrar=el("button",{class:"btn btn-linha"},"Entrar");
    criar.addEventListener("click",criarSala);
    const vai=()=>{ const c=codeInput.value.trim().toUpperCase(); if(c.length>=4) entrarSala(c); };
    entrar.addEventListener("click",vai);
    codeInput.addEventListener("keydown",e=>{ if(e.key==="Enter") vai(); });
    tela(el("div",{}, cabec(def.nome),
      el("div",{class:"card"},
        el("p",{class:"hint"}, def.comoJogar),
        el("div",{style:"height:14px"}), criar,
        el("div",{style:"height:16px"}), el("label",{class:"rot"},"Já tem um código?"),
        el("div",{class:"campo"}, codeInput, entrar)),
      el("footer",{},"Melhor com a galera conversando por voz!")));
  }

  /* ---------------- placar ---------------- */
  function placarLista(){
    const js=jogadores().sort((a,b)=>b.score-a.score);
    const topo=js.length?js[0].score:0;
    return el("div",{class:"placar-lista"}, ...js.map((p,i)=>
      el("div",{class:"linha-placar"+(p.score===topo&&topo>0?" lider":"")},
        el("span",{class:"pos"},(i+1)+"º"), avatarMini(p.avatar),
        el("span",{class:"nm"}, p.nick + (p.id===estado.host?" 👑":"")),
        el("span",{class:"pt"}, String(p.score)))));
  }

  /* ---------------- lobby ---------------- */
  function lobby(){
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
      const menos=el("button",{class:"btn-ghost"},"−"), mais=el("button",{class:"btn-ghost"},"+");
      const val=el("b",{}, String(estado.meta)+" rodadas");
      menos.addEventListener("click",()=>mutar(s=>{ s.meta=Math.max(def.metaMin, s.meta-1); return s; }));
      mais.addEventListener("click",()=>mutar(s=>{ s.meta=Math.min(def.metaMax, s.meta+1); return s; }));
      controles.push(el("div",{class:"seletor-meta"}, menos, val, mais));
      const comecar=el("button",{class:"btn",style:"margin-top:10px"},"Começar!");
      comecar.disabled=!podeComecar;
      comecar.addEventListener("click", comecarPartida);
      controles.push(comecar);
    } else controles.push(el("p",{class:"aviso",style:"margin-top:18px"},"Esperando o host começar…"));
    tela(el("div",{}, cabec("Sala", el("button",{class:"btn-ghost",onclick:sairOnline},"Sair")),
      el("div",{class:"card"},
        el("div",{class:"eyebrow",style:"text-align:center"},"Código da sala"),
        el("div",{class:"codigo"}, sala.code),
        el("p",{class:"aviso"},"Mande o link ou o código pra galera."),
        copiar,
        el("div",{class:"rot",style:"margin-top:20px"}, "Na sala ("+estado.order.length+")"), grade,
        ...controles),
      el("footer",{}, podeComecar||!souHost()? def.comoJogar : "Precisa de pelo menos "+def.min+" jogadores.")));
  }
  function comecarPartida(){
    mutar(s=>{
      s.phase="papel"; s.round=1; s.usadas=[]; s.prontos={}; s.votos={}; s.reveal=null;
      s.order.forEach(id=>{ s.players[id].score=0; });
      def.montaRodada(s);
      return s;
    });
  }

  /* ---------------- fase PAPEL (ver seu segredo) ---------------- */
  function fasePapel(){
    const papel=def.meuPapel(estado, eu().id);
    const prontos=Object.keys(estado.prontos).length, total=estado.order.length;
    const jaPronto=!!estado.prontos[eu().id];
    const cartao=el("div",{class:"papel"+(papel.alerta?" alerta":"")},
      el("div",{class:"eyebrow",style:"text-align:center"}, def.papelCaption),
      el("div",{class:"papel-titulo"}, papel.titulo),
      el("p",{class:"papel-sub"}, papel.sub));
    const controles=[];
    if(!jaPronto){
      const ok=el("button",{class:"btn"},"Entendi!");
      ok.addEventListener("click",()=>mutar(s=>{ s.prontos[eu().id]=true; return s; }));
      controles.push(ok);
    } else controles.push(el("p",{class:"aviso"},"Beleza! Esperando os outros… ("+prontos+"/"+total+")"));
    if(souHost() && prontos<total){
      const pular=el("button",{class:"btn-ghost larga",style:"width:100%"},"Todos viram, ir pra votação");
      pular.addEventListener("click", iniciaVotacao);
      controles.push(pular);
    }
    const chips=el("div",{class:"aguardando"}, ...jogadores().map(p=>
      el("span",{class:"chip"+(estado.prontos[p.id]?" ok":"")}, avatarMini(p.avatar), p.nick)));
    tela(el("div",{},
      el("div",{class:"eyebrow",style:"text-align:center;color:var(--claro-2)"},"Rodada "+estado.round+" de "+estado.meta),
      el("div",{class:"card"}, cartao,
        el("p",{class:"hint",style:"text-align:center;margin-top:14px"},"Guarde pra você! Quando todo mundo estiver pronto, conversem em voz alta e tentem achar o "+def.textoAlvo+"."),
        ...controles),
      chips,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));
    if(souHost() && estado.order.every(id=>estado.prontos[id])) iniciaVotacao();
  }
  function iniciaVotacao(){ mutar(s=>{ if(s.phase!=="papel") return s; s.phase="votacao"; return s; }); }

  /* ---------------- fase VOTAÇÃO ---------------- */
  function faseVotacao(){
    const jaVotei=estado.votos[eu().id]!=null;
    const votaram=Object.keys(estado.votos).length, total=estado.order.length;
    const wrap=el("div",{});
    wrap.appendChild(el("p",{class:"pergunta-jogo",style:"text-align:center"}, "Quem é o "+def.textoAlvo+"?"));
    if(jaVotei){
      const alvo=estado.players[estado.votos[eu().id]];
      wrap.appendChild(el("div",{class:"resposta-dada"}, "Você votou em ", el("b",{}, alvo?alvo.nick:"alguém")));
    } else {
      const grade=el("div",{class:"votar"});
      jogadores().filter(p=>p.id!==eu().id).forEach(p=>{
        const b=el("button",{class:"voto",type:"button"}, avatarMini(p.avatar), el("span",{}, p.nick));
        b.addEventListener("click",()=>mutar(s=>{ if(s.votos[eu().id]==null) s.votos[eu().id]=p.id; return s; }));
        grade.appendChild(b);
      });
      wrap.appendChild(grade);
    }
    const chips=el("div",{class:"aguardando"}, ...jogadores().map(p=>
      el("span",{class:"chip"+(estado.votos[p.id]!=null?" ok":"")}, avatarMini(p.avatar), p.nick)));
    const controles=[];
    if(souHost() && votaram<total){
      const fechar=el("button",{class:"btn-ghost larga",style:"width:100%"},"Fechar votação ("+votaram+"/"+total+")");
      fechar.addEventListener("click", fechaVotacao);
      controles.push(fechar);
    }
    tela(el("div",{},
      el("div",{class:"card"},
        el("div",{class:"eyebrow"},"Rodada "+estado.round+" de "+estado.meta), wrap,
        jaVotei?el("p",{class:"aviso"},"Voto registrado! ("+votaram+"/"+total+")"):""),
      chips, ...controles,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));
    if(souHost() && estado.order.every(id=>estado.votos[id]!=null)) fechaVotacao();
  }
  let fechandoRodada=-1;
  function fechaVotacao(){
    if(!estado || estado.phase!=="votacao") return;
    if(fechandoRodada===estado.round) return;
    fechandoRodada=estado.round;
    mutar(s=>{
      if(s.phase!=="votacao") return s;
      const alvoId=s.rodada.alvoId;
      const tally={}; Object.values(s.votos).forEach(t=>{ tally[t]=(tally[t]||0)+1; });
      let max=0; Object.values(tally).forEach(v=>{ if(v>max) max=v; });
      const acusados=Object.keys(tally).filter(id=>tally[id]===max);
      const pego = acusados.length===1 && acusados[0]===alvoId;
      const ganhos={};
      if(pego){
        Object.keys(s.votos).forEach(v=>{ if(s.votos[v]===alvoId){ ganhos[v]=1; s.players[v].score+=1; } });
      } else {
        ganhos[alvoId]=3; if(s.players[alvoId]) s.players[alvoId].score+=3;
      }
      s.reveal={ alvoId, pego, tally, votos:Object.assign({},s.votos), ganhos, segredo:def.segredoReveal(s) };
      s.phase="reveal";
      return s;
    });
  }

  /* ---------------- REVELAÇÃO ---------------- */
  function faseReveal(){
    const r=estado.reveal, alvo=estado.players[r.alvoId];
    const fim=estado.round>=estado.meta;
    const wrap=el("div",{});
    wrap.appendChild(el("div",{class:"eyebrow",style:"text-align:center"}, "O "+def.textoAlvo+" era"));
    wrap.appendChild(el("div",{class:"eleito",style:"margin:8px 0"}, avatarMini(alvo?alvo.avatar:0), el("b",{}, alvo?alvo.nick:"?")));
    wrap.appendChild(el("div",{class:"nome-final "+(r.pego?"cor-verdade":"cor-mito"),style:"font-size:26px"}, r.pego?"Pego! 🎯":"Escapou! 😈"));
    wrap.appendChild(el("p",{class:"hint",style:"text-align:center;margin-bottom:12px"}, r.segredo));
    const lista=el("div",{class:"resultados"});
    jogadores().forEach(p=>{
      const votou=r.votos[p.id]!=null?estado.players[r.votos[p.id]]:null;
      const g=r.ganhos[p.id]>0;
      lista.appendChild(el("div",{class:"res"+(g?" ganhou":"")+(p.id===r.alvoId?" alvo":"")},
        avatarMini(p.avatar),
        el("span",{class:"nm"}, p.nick + (p.id===r.alvoId?(" ("+def.textoAlvo+")"):"")),
        el("span",{class:"chute"}, votou?("→ "+votou.nick):"não votou"),
        g?el("span",{class:"ganho"},"+"+r.ganhos[p.id]):el("span",{class:"ganho zero"},"0")));
    });
    wrap.appendChild(lista);
    const cont=el("button",{class:"btn"}, fim?"Ver resultado 🏆":"Próxima rodada");
    if(souHost()) cont.addEventListener("click",()=>proxima(fim));
    else { cont.disabled=true; cont.textContent="Esperando o host…"; }
    tela(el("div",{},
      r.pego?confetes(60):"",
      el("div",{class:"card"}, wrap),
      el("div",{class:"rot"},"Placar"), placarLista(),
      cont,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));
  }
  function proxima(fim){
    mutar(s=>{
      if(fim){ s.phase="over"; return s; }
      s.round++; s.prontos={}; s.votos={}; s.reveal=null; def.montaRodada(s); s.phase="papel";
      return s;
    });
  }

  /* ---------------- FIM ---------------- */
  function faseOver(){
    const js=jogadores().sort((a,b)=>b.score-a.score);
    const topo=js.length?js[0].score:0;
    const campeoes=js.filter(p=>p.score===topo);
    const titulo=campeoes.length===1?(campeoes[0].nick+" venceu!"):"Empate!";
    const rev=el("button",{class:"btn"},"Jogar de novo");
    if(souHost()) rev.addEventListener("click", comecarPartida);
    else { rev.disabled=true; rev.textContent="Esperando o host…"; }
    tela(el("div",{}, confetes(120),
      el("div",{class:"card fim"},
        el("div",{class:"trofeu"},"🏆"), el("div",{class:"eyebrow"},"Fim de jogo"),
        el("h2",{}, titulo),
        el("div",{style:"margin:14px 0 4px"}, ...campeoes.map(p=>avatarMini(p.avatar))),
        placarLista(), el("div",{style:"margin-top:20px"}, rev),
        el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala")))));
  }

  function confetes(qtd){
    const cores=["#FF5252","#38A3FF","#FFC94D","#35C66F","#C9A7FF","#FFFFFF"];
    const box=el("div",{class:"confetes","aria-hidden":"true"});
    for(let i=0;i<qtd;i++) box.appendChild(el("i",{style:
      "left:"+(Math.random()*100)+"%;background:"+cores[i%cores.length]+
      ";animation-delay:"+(Math.random()*.9).toFixed(2)+"s;animation-duration:"+(2.2+Math.random()*1.8).toFixed(2)+"s;width:"+(7+Math.random()*7).toFixed(0)+"px"}));
    return box;
  }

  /* ---------------- roteador ---------------- */
  function render(){
    if(!estado) return;
    if(estado.phase==="lobby") return lobby();
    if(estado.phase==="papel") return fasePapel();
    if(estado.phase==="votacao") return faseVotacao();
    if(estado.phase==="reveal") return faseReveal();
    if(estado.phase==="over") return faseOver();
  }

  async function abrir(context, definicao){
    ctx=context; el=context.el; esc=context.esc; def=definicao;
    raiz=()=>document.getElementById("app");
    const online = Net() && Net().disponivel();
    if(online && ctx.joinCode){ if(await entrarSala(ctx.joinCode)) return; }
    if(online){ const salva=await ctx.ler(chaveSala()); if(salva && salva.code){ if(await entrarSala(salva.code, true)) return; } }
    menu();
  }

  const util = { sorteiaIdx(usadas, tam){ let livres=[]; for(let i=0;i<tam;i++) if(!usadas.includes(i)) livres.push(i); if(!livres.length){ usadas.length=0; for(let i=0;i<tam;i++) livres.push(i);} return livres[Math.floor(Math.random()*livres.length)]; },
    sorteiaJogador(order){ return order[Math.floor(Math.random()*order.length)]; } };

  return { abrir, _util:util };
})();

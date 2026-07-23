/* ====================================================================
   EMOJI ENIGMA — um jogador (autor) monta um filme só com emojis;
   os outros adivinham digitando, em tempo real. Autor roda a cada rodada.
   (O título fica no state compartilhado: mesma confiança do jogo de mesa.)
   ==================================================================== */
window.EmojiJogo = (function(){
  let TITULOS=[];
  try{ TITULOS=JSON.parse(decodeURIComponent(atob(window.EMOJI_B64))); }catch(e){ TITULOS=[]; }

  let ctx, el, esc, raiz;
  let sala=null, estado=null, desinscrever=null;
  const eu=()=>ctx.perfil, Net=()=>window.Net;
  const NOME="Emoji Enigma", EMOJI="🎬", ID="emoji", MIN=3, TEMPO=80;

  function tela(node){ raiz().replaceChildren(node); window.scrollTo({top:0}); }
  function cabec(titulo, extra){ return el("header",{class:"compacto"},
    el("div",{}, el("div",{class:"eyebrow"}, EMOJI+" "+NOME), el("h1",{}, titulo)),
    extra || el("button",{class:"btn-ghost", onclick:sairTudo}, "Voltar")); }
  function codigoNovo(){ const L="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<4;i++)s+=L[Math.floor(Math.random()*L.length)]; return s; }
  function linkSala(code){ return location.origin+location.pathname+"?sala="+code; }
  function avatarMini(id){ const a=ctx.avatarPorId(id); return el("div",{class:"av",html:a.svg}); }
  const souHost=()=>estado&&estado.host===eu().id;
  const souAutor=()=>estado&&estado.autorId===eu().id;
  let somGate=null;
  function som(nome, chave){ if(somGate!==chave){ somGate=chave; if(window.FX && window.FX.toca) window.FX.toca(nome); } }
  function jogadores(){ return estado.order.filter(id=>estado.players[id]).map(id=>Object.assign({id},estado.players[id])); }
  function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim(); }
  function acerta(guess){ const g=norm(guess), t=norm(TITULOS[estado.dados.i]); if(!g||!t) return false; return g===t || (t.length>=5 && g.includes(t)); }

  /* relógio */
  let timerId=null;
  function paraRel(){ if(timerId){ clearInterval(timerId); timerId=null; } }
  function relogioNode(prazo){
    const box=el("div",{class:"relogio"}), txt=el("span"), bar=el("i");
    box.append(txt, el("span",{class:"bar"}, bar));
    function tick(){ const rest=Math.max(0,Math.ceil((prazo-Date.now())/1000)); txt.textContent=rest===0?"tempo!":(rest+"s"); bar.style.width=(rest/TEMPO*100)+"%"; if(rest<=0){ box.classList.add("acabou"); paraRel(); if(souHost()) encerraRodada(); } }
    paraRel(); tick(); timerId=setInterval(tick,500); return box;
  }
  function barraEsgoto(){
    const total=TITULOS.length||0; if(!total) return el("div",{});
    const usado=estado&&estado.usadas?estado.usadas.length:0;
    const resta=Math.max(0,Math.min(1,(total-usado)/total));
    const cor=resta>0.5?"var(--verde)":(resta>0.2?"var(--ouro)":"var(--tva)");
    return el("div",{class:"esgoto","aria-hidden":"true"}, el("i",{style:"width:"+(resta*100).toFixed(0)+"%;background:"+cor}));
  }

  /* rede */
  const chaveSala=()=>"sala:"+ID;
  async function criarSala(){
    const code=codigoNovo();
    const st={ game:ID, host:eu().id, phase:"lobby", meta:6,
      players:{[eu().id]:{nick:eu().nick,avatar:eu().avatar,score:0}}, order:[eu().id],
      round:0, usadas:[], autorId:null, dados:null, emojis:"", prazo:null, guesses:{}, reveal:null };
    try{ await Net().criarSala(code,st); sala={code}; ctx.guardar(chaveSala(),{code}); ligar(); estado=st; render(); }
    catch(e){ alert("Não consegui criar a sala."); console.error(e); }
  }
  async function entrarSala(code,sil){
    try{ const st=await Net().lerSala(code); if(!st){ if(!sil) alert("Sala "+code+" não encontrada."); ctx.guardar(chaveSala(),null); return false; }
      const novo=await Net().alterar(code,s=>{ if(!s.players[eu().id]){ s.players[eu().id]={nick:eu().nick,avatar:eu().avatar,score:0}; s.order.push(eu().id); } else { s.players[eu().id].nick=eu().nick; s.players[eu().id].avatar=eu().avatar; } return s; });
      sala={code}; ctx.guardar(chaveSala(),{code}); ligar(); estado=novo; render(); return true;
    }catch(e){ if(!sil) alert("Não consegui entrar."); console.error(e); return false; }
  }
  function ligar(){ if(desinscrever){ desinscrever(); desinscrever=null; } desinscrever=Net().inscrever(sala.code, st=>{ if(st){ estado=st; render(); } });
    if(window.Chat) window.Chat.ligar({ mutar, eu, avatarPorId:ctx.avatarPorId, rapidas:["Que emoji é esse? 🤨","Impossível adivinhar isso.","Genial esse enigma!"] }); }
  async function mutar(f){ try{ const n=await Net().alterar(sala.code,f); if(n){ estado=n; render(); } }catch(e){ console.error(e); } }
  function sairOnline(){
    paraRel(); if(window.Chat) window.Chat.desligar(); if(desinscrever){ desinscrever(); desinscrever=null; } ctx.guardar(chaveSala(),null);
    if(sala){ const code=sala.code; Net().alterar(code,s=>{
      if(s.players[eu().id]){ delete s.players[eu().id]; s.order=s.order.filter(i=>i!==eu().id); delete s.guesses[eu().id]; }
      if(s.host===eu().id && s.order.length) s.host=s.order[0];
      return s; }).then(s=>{ if(s&&(!s.order||!s.order.length)) Net().apagarSala(code); }).catch(()=>{}); }
    sala=null; estado=null; menu();
  }
  function sairTudo(){ paraRel(); if(window.Chat) window.Chat.desligar(); if(desinscrever){ desinscrever(); desinscrever=null; } sala=null; estado=null; ctx.voltar(); }

  /* menu */
  function menu(){
    const online=Net()&&Net().disponivel();
    if(!online) return tela(el("div",{}, cabec(NOME), el("div",{class:"card"}, el("p",{class:"hint"},"Esse jogo é online. Configure o Supabase (config.js).")), el("footer",{},"Monte filmes só com emojis!")));
    const ci=el("input",{type:"text",maxlength:"4",placeholder:"CÓDIGO",autocomplete:"off",style:"text-transform:uppercase;text-align:center;letter-spacing:.3em;font-family:'Fredoka',sans-serif;font-size:22px"});
    const criar=el("button",{class:"btn"},"Criar sala nova"), entrar=el("button",{class:"btn btn-linha"},"Entrar");
    criar.addEventListener("click",criarSala);
    const vai=()=>{ const c=ci.value.trim().toUpperCase(); if(c.length>=4) entrarSala(c); };
    entrar.addEventListener("click",vai); ci.addEventListener("keydown",e=>{ if(e.key==="Enter") vai(); });
    tela(el("div",{}, cabec(NOME), el("div",{class:"card"},
      el("p",{class:"hint"},"Um jogador monta um filme só com emojis e os outros adivinham digitando. Quem acerta mais rápido pontua, e quem montou também ganha se alguém acertar. O autor roda a cada rodada!"),
      el("div",{style:"height:14px"}), criar, el("div",{style:"height:16px"}), el("label",{class:"rot"},"Já tem um código?"), el("div",{class:"campo"}, ci, entrar)),
      el("footer",{},"Melhor com a galera junta!")));
  }

  /* placar */
  function placarLista(){
    const js=jogadores().sort((a,b)=>b.score-a.score); const topo=js.length?js[0].score:0;
    return el("div",{class:"placar-lista"}, ...js.map((p,i)=>el("div",{class:"linha-placar"+(p.score===topo&&topo>0?" lider":"")},
      el("span",{class:"pos"},(i+1)+"º"), avatarMini(p.avatar), el("span",{class:"nm"}, p.nick+(p.id===estado.host?" 👑":"")), el("span",{class:"pt"}, String(p.score)))));
  }
  function confetes(qtd){ const cores=["#FF5252","#38A3FF","#FFC94D","#35C66F","#C9A7FF","#FFFFFF"]; const box=el("div",{class:"confetes","aria-hidden":"true"});
    for(let i=0;i<qtd;i++) box.appendChild(el("i",{style:"left:"+(Math.random()*100)+"%;background:"+cores[i%cores.length]+";animation-delay:"+(Math.random()*.9).toFixed(2)+"s;animation-duration:"+(2.2+Math.random()*1.8).toFixed(2)+"s;width:"+(7+Math.random()*7).toFixed(0)+"px"})); return box; }

  /* lobby */
  function lobby(){
    paraRel();
    const grade=el("div",{class:"lobby-jogadores"}, ...jogadores().map(p=>el("div",{class:"membro"+(p.id===eu().id?" eu":"")}, avatarMini(p.avatar), el("span",{}, p.nick+(p.id===estado.host?" 👑":"")))));
    const copiar=el("button",{class:"btn btn-linha",style:"margin-top:14px"},"Copiar link de convite");
    copiar.addEventListener("click", async ()=>{ const link=linkSala(sala.code); try{ await navigator.clipboard.writeText(link); copiar.textContent="Link copiado! ✓"; }catch(e){ prompt("Copie o link:", link); } setTimeout(()=>{ copiar.textContent="Copiar link de convite"; },2000); });
    const pode=souHost()&&estado.order.length>=MIN; const ctrl=[];
    if(souHost()){
      const menos=el("button",{class:"btn-ghost"},"−"), mais=el("button",{class:"btn-ghost"},"+"), val=el("b",{}, String(estado.meta)+" rodadas");
      menos.addEventListener("click",()=>mutar(s=>{ s.meta=Math.max(3,s.meta-1); return s; }));
      mais.addEventListener("click",()=>mutar(s=>{ s.meta=Math.min(20,s.meta+1); return s; }));
      ctrl.push(el("div",{class:"seletor-meta"}, menos, val, mais));
      const c=el("button",{class:"btn",style:"margin-top:10px"},"Começar!"); c.disabled=!pode; c.addEventListener("click",comecar); ctrl.push(c);
    } else ctrl.push(el("p",{class:"aviso",style:"margin-top:18px"},"Esperando o host começar…"));
    tela(el("div",{}, cabec("Sala", el("button",{class:"btn-ghost",onclick:sairOnline},"Sair")), el("div",{class:"card"},
      el("div",{class:"eyebrow",style:"text-align:center"},"Código da sala"), el("div",{class:"codigo"}, sala.code),
      el("p",{class:"aviso"},"Mande o link ou o código pra galera."), copiar,
      el("div",{class:"rot",style:"margin-top:20px"},"Na sala ("+estado.order.length+")"), grade, ...ctrl),
      el("footer",{}, pode||!souHost()?"Um monta o filme com emojis, o resto adivinha!":"Precisa de pelo menos "+MIN+" jogadores.")));
  }
  function comecar(){
    mutar(s=>{ s.phase="compor"; s.round=1; s.usadas=[]; s.order.forEach(id=>s.players[id].score=0);
      s.autorId=s.order[0]; novoTitulo(s); s.emojis=""; s.guesses={}; s.reveal=null; return s; });
  }
  function novoTitulo(s){ let livres=[]; for(let i=0;i<TITULOS.length;i++) if(!s.usadas.includes(i)) livres.push(i); if(!livres.length){ s.usadas=[]; for(let i=0;i<TITULOS.length;i++) livres.push(i); } const i=livres[Math.floor(Math.random()*livres.length)]; s.usadas.push(i); s.dados={i}; }

  /* compor (autor monta os emojis) */
  function faseCompor(){
    paraRel();
    som("pop","c"+estado.round);
    const autor=estado.players[estado.autorId];
    const wrap=el("div",{});
    if(souAutor()){
      wrap.appendChild(el("div",{class:"card"},
        el("div",{class:"eyebrow",style:"text-align:center"},"Monte com emojis (só você vê)"),
        el("div",{class:"papel-titulo",style:"font-size:28px;text-align:center"}, TITULOS[estado.dados.i])));
      const inp=el("input",{type:"text",placeholder:"Digite os emojis aqui 🎬🍿",autocomplete:"off",style:"font-size:24px;text-align:center"});
      const b=el("button",{class:"btn btn-mint",style:"margin-top:12px"},"Enviar enigma");
      b.addEventListener("click",()=>{ const v=inp.value.trim(); if(!v){ inp.focus(); return; } mutar(s=>{ s.emojis=v; s.phase="adivinhar"; s.prazo=Date.now()+TEMPO*1000; s.guesses={}; return s; }); });
      wrap.appendChild(el("div",{class:"card"}, el("p",{class:"hint"},"Use só emojis pra representar o filme. Capriche pra ser adivinhável!"), inp, b));
    } else {
      wrap.appendChild(el("div",{class:"card"},
        el("div",{style:"text-align:center;font-size:44px;margin-bottom:8px"},"🤔"),
        el("h2",{style:"text-align:center;font-weight:600"}, (autor?autor.nick:"Alguém")+" está montando o enigma…"),
        el("p",{class:"hint",style:"text-align:center;margin-top:8px"},"Prepare-se pra adivinhar!")));
    }
    tela(el("div",{}, barraEsgoto(), el("div",{class:"eyebrow",style:"text-align:center;color:var(--claro-2)"},"Rodada "+estado.round+" de "+estado.meta),
      wrap, el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))));
  }

  /* adivinhar */
  let sigAdiv=null;
  function rodapeAdiv(){
    const total=estado.order.length-1; // menos o autor
    const acertaram=Object.keys(estado.guesses).length;
    const chips=el("div",{class:"aguardando"}, ...jogadores().filter(p=>p.id!==estado.autorId).map(p=>
      el("span",{class:"chip"+(estado.guesses[p.id]?" ok":"")}, avatarMini(p.avatar), p.nick)));
    const filhos=[chips];
    if(souHost()){ const b=el("button",{class:"btn-ghost larga",style:"width:100%"},"Encerrar rodada ("+acertaram+"/"+total+")"); b.addEventListener("click",encerraRodada); filhos.push(b); }
    filhos.push(el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala")));
    return el("div",{id:"adiv-rodape"}, ...filhos);
  }
  function faseAdivinhar(){
    const enigma=el("div",{class:"enigma"}, estado.emojis);
    const meio=el("div",{});
    if(souAutor()){
      meio.appendChild(el("p",{class:"aviso"},"Você montou este enigma. Deixa a galera adivinhar! 🤫"));
    } else if(estado.guesses[eu().id]){
      meio.appendChild(el("div",{class:"resposta-dada"},"Você acertou! 🎉 Aguardando os outros…"));
    } else {
      const inp=el("input",{type:"text",placeholder:"Qual é o filme?",autocomplete:"off"});
      const b=el("button",{class:"btn btn-mint"},"Chutar");
      const fb=el("p",{class:"hint",style:"text-align:center;min-height:18px;margin-top:8px"});
      function chutar(){ const v=inp.value.trim(); if(!v){ inp.focus(); return; }
        if(acerta(v)){ if(window.FX) window.FX.toca("ding"); mutar(s=>{ if(!s.guesses[eu().id]) s.guesses[eu().id]={t:Date.now()}; return s; }); }
        else { fb.textContent="Não é esse… tenta de novo!"; if(window.FX) window.FX.toca("erro"); inp.select(); }
      }
      b.addEventListener("click",chutar); inp.addEventListener("keydown",e=>{ if(e.key==="Enter") chutar(); });
      meio.appendChild(el("div",{class:"campo"}, inp, b)); meio.appendChild(fb);
    }
    tela(el("div",{}, barraEsgoto(), relogioNode(estado.prazo),
      el("div",{class:"card"}, el("div",{class:"eyebrow"},"Rodada "+estado.round+" de "+estado.meta+" · adivinhem!"), enigma, meio),
      rodapeAdiv()));
  }

  function encerraRodada(){
    if(!estado||estado.phase!=="adivinhar") return;
    mutar(s=>{ if(s.phase!=="adivinhar") return s;
      const acertos=Object.keys(s.guesses).map(id=>({id,t:s.guesses[id].t})).sort((a,b)=>a.t-b.t);
      const ganhos={};
      acertos.forEach((a,idx)=>{ const pts=idx===0?3:(idx===1?2:1); ganhos[a.id]=pts; s.players[a.id].score+=pts; });
      if(acertos.length>0){ ganhos[s.autorId]=(ganhos[s.autorId]||0)+2; if(s.players[s.autorId]) s.players[s.autorId].score+=2; }
      s.reveal={ titulo:TITULOS[s.dados.i], emojis:s.emojis, autorId:s.autorId, ordem:acertos.map(a=>a.id), ganhos };
      s.phase="reveal"; return s; });
  }

  /* reveal */
  function faseReveal(){
    paraRel();
    som("chime","r"+estado.round);
    const r=estado.reveal, autor=estado.players[r.autorId];
    const fim=estado.round>=estado.meta;
    const wrap=el("div",{});
    wrap.appendChild(el("div",{class:"eyebrow",style:"text-align:center"},"O filme era"));
    wrap.appendChild(el("div",{class:"nome-final"}, r.titulo));
    wrap.appendChild(el("div",{class:"enigma",style:"font-size:34px"}, r.emojis));
    wrap.appendChild(el("p",{class:"hint",style:"text-align:center;margin:8px 0 12px"}, "montado por "+(autor?autor.nick:"?")));
    const lista=el("div",{class:"resultados"});
    jogadores().forEach(p=>{
      const g=r.ganhos[p.id]>0, ehAutor=p.id===r.autorId, acertou=r.ordem.includes(p.id);
      lista.appendChild(el("div",{class:"res"+(g?" ganhou":"")},
        avatarMini(p.avatar), el("span",{class:"nm"}, p.nick+(ehAutor?" 🎬":"")),
        el("span",{class:"chute"}, ehAutor?"autor":(acertou?"acertou":"errou")),
        g?el("span",{class:"ganho"},"+"+r.ganhos[p.id]):el("span",{class:"ganho zero"},"0")));
    });
    wrap.appendChild(lista);
    const cont=el("button",{class:"btn"}, fim?"Ver resultado 🏆":"Próxima rodada");
    if(souHost()) cont.addEventListener("click",()=>proxima(fim)); else { cont.disabled=true; cont.textContent="Esperando o host…"; }
    tela(el("div",{}, r.ordem.length?confetes(60):"", el("div",{class:"card"}, wrap), el("div",{class:"rot"},"Placar"), placarLista(), cont,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))));
  }
  function proxima(fim){
    mutar(s=>{ if(fim){ s.phase="over"; return s; }
      s.round++;
      const idx=s.order.indexOf(s.autorId); s.autorId=s.order[(idx+1)%s.order.length];
      novoTitulo(s); s.emojis=""; s.guesses={}; s.reveal=null; s.phase="compor"; return s; });
  }

  function faseOver(){
    paraRel();
    som("fanfarra","over");
    const js=jogadores().sort((a,b)=>b.score-a.score); const topo=js.length?js[0].score:0; const campe=js.filter(p=>p.score===topo);
    const titulo=campe.length===1?(campe[0].nick+" venceu!"):"Empate!";
    const rev=el("button",{class:"btn"},"Jogar de novo"); if(souHost()) rev.addEventListener("click",comecar); else { rev.disabled=true; rev.textContent="Esperando o host…"; }
    tela(el("div",{}, confetes(120), el("div",{class:"card fim"}, el("div",{class:"trofeu"},"🏆"), el("div",{class:"eyebrow"},"Fim de jogo"),
      el("h2",{}, titulo), el("div",{style:"margin:14px 0 4px"}, ...campe.map(p=>avatarMini(p.avatar))), placarLista(),
      el("div",{style:"margin-top:20px"}, rev), el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala")))));
  }

  /* roteador */
  function render(){
    if(!estado) return;
    if(window.Chat) window.Chat.novoEstado(estado);
    if(estado.phase==="adivinhar"){
      const sig=estado.round+"|"+estado.autorId+"|"+estado.emojis+"|"+(souAutor()?"A":(estado.guesses[eu().id]?"1":"0"));
      if(sig!==sigAdiv){ sigAdiv=sig; faseAdivinhar(); } else { const r=document.getElementById("adiv-rodape"); if(r) r.replaceWith(rodapeAdiv()); }
      if(souHost()){ const total=estado.order.length-1; if(total>0 && Object.keys(estado.guesses).length>=total) encerraRodada(); }
      return;
    }
    sigAdiv=null; paraRel();
    if(estado.phase==="lobby") return lobby();
    if(estado.phase==="compor") return faseCompor();
    if(estado.phase==="reveal") return faseReveal();
    if(estado.phase==="over") return faseOver();
  }

  async function abrir(context){
    ctx=context; el=context.el; esc=context.esc; raiz=()=>document.getElementById("app");
    const online=Net()&&Net().disponivel();
    if(online && ctx.joinCode){ if(await entrarSala(ctx.joinCode)) return; }
    if(online){ const salva=await ctx.ler(chaveSala()); if(salva&&salva.code){ if(await entrarSala(salva.code,true)) return; } }
    menu();
  }
  return { abrir };
})();

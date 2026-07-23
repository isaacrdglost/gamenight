/* ====================================================================
   BATATA QUENTE — categoria na tela; na sua vez, 10 segundos pra digitar
   uma resposta que ninguém falou. Travou ou repetiu? Eliminado. Último
   vivo vence a rodada. (Vale o combinado do grupo, sem roubar!)
   ==================================================================== */
window.Batata = (function(){
  const CATS = [
    "Marcas de carro","Frutas","Times de futebol","Nomes de cachorro","Coisas de praia",
    "Comidas de festa junina","Animais do zoológico","Profissões","Países","Capitais do mundo",
    "Cores","Filmes da Disney","Super-heróis","Coisas de cozinha","Matérias da escola",
    "Cantores brasileiros","Coisas que tem no banheiro","Marcas de refrigerante","Instrumentos musicais",
    "Esportes","Sabores de pizza","Sabores de sorvete","Ferramentas","Coisas de bebê",
    "Aplicativos de celular","Jogos de videogame","Personagens de desenho","Coisas de escritório",
    "Bichos de jardim","Comidas de rodízio"
  ];
  const TURNO_S = (window.BATATA_TURNO_S || 10);

  let ctx, el, esc, raiz;
  let sala=null, estado=null, desinscrever=null;
  const eu=()=>ctx.perfil, Net=()=>window.Net;
  const NOME="Batata Quente", EMOJI="🥔", ID="batata", MIN=2;

  function tela(node){ raiz().replaceChildren(node); window.scrollTo({top:0}); }
  function cabec(titulo, extra){ return el("header",{class:"compacto"},
    el("div",{}, el("div",{class:"eyebrow"}, EMOJI+" "+NOME), el("h1",{}, titulo)),
    extra || el("button",{class:"btn-ghost", onclick:sairTudo}, "Voltar")); }
  function codigoNovo(){ const L="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<4;i++)s+=L[Math.floor(Math.random()*L.length)]; return s; }
  function linkSala(code){ return location.origin+location.pathname+"?sala="+code; }
  function avatarMini(id){ const a=ctx.avatarPorId(id); return el("div",{class:"av",html:a.svg}); }
  const souHost=()=>estado&&estado.host===eu().id;
  const minhaVez=()=>estado&&estado.vezId===eu().id;
  function jogadores(){ return estado.order.filter(id=>estado.players[id]).map(id=>Object.assign({id},estado.players[id])); }
  function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim(); }
  let somGate=null;
  function som(nome, chave){ if(somGate!==chave){ somGate=chave; if(window.FX && window.FX.toca) window.FX.toca(nome); } }

  /* relógio do turno */
  let timerId=null;
  function paraRel(){ if(timerId){ clearInterval(timerId); timerId=null; } }
  function relogioTurno(prazo){
    const box=el("div",{class:"relogio"}), txt=el("span"), bar=el("i");
    box.append(txt, el("span",{class:"bar"}, bar));
    function tick(){
      const rest=Math.max(0,(prazo-Date.now())/1000);
      txt.textContent=rest<=0?"tempo!":(Math.ceil(rest)+"s");
      bar.style.width=Math.min(100,(rest/TURNO_S*100))+"%";
      if(rest<=0){ box.classList.add("acabou"); paraRel(); if(souHost()) estourou(); }
    }
    paraRel(); tick(); timerId=setInterval(tick,250); return box;
  }
  function barraEsgoto(){
    const total=CATS.length, usado=estado&&estado.usadas?estado.usadas.length:0;
    const resta=Math.max(0,Math.min(1,(total-usado)/total));
    const cor=resta>0.5?"var(--verde)":(resta>0.2?"var(--ouro)":"var(--tva)");
    return el("div",{class:"esgoto","aria-hidden":"true"}, el("i",{style:"width:"+(resta*100).toFixed(0)+"%;background:"+cor}));
  }

  /* rede */
  const chaveSala=()=>"sala:"+ID;
  async function criarSala(){
    const code=codigoNovo();
    const st={ game:ID, host:eu().id, phase:"lobby", meta:5,
      players:{[eu().id]:{nick:eu().nick,avatar:eu().avatar,score:0}}, order:[eu().id],
      round:0, usadas:[], catIdx:null, vivos:[], vezId:null, prazoTurno:null,
      respostas:[], eliminados:[], reveal:null };
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
    if(window.Chat) window.Chat.ligar({ mutar, eu, avatarPorId:ctx.avatarPorId, rapidas:["Deu branco total.","Quase! 😤","Tô sem ideia nenhuma."] }); }
  async function mutar(f){ try{ const n=await Net().alterar(sala.code,f); if(n){ estado=n; render(); } }catch(e){ console.error(e); } }
  function sairOnline(){
    paraRel(); if(window.Chat) window.Chat.desligar(); if(desinscrever){ desinscrever(); desinscrever=null; } ctx.guardar(chaveSala(),null);
    if(sala){ const code=sala.code; Net().alterar(code,s=>{
      if(s.players[eu().id]){ delete s.players[eu().id]; s.order=s.order.filter(i=>i!==eu().id); s.vivos=(s.vivos||[]).filter(i=>i!==eu().id); }
      if(s.host===eu().id && s.order.length) s.host=s.order[0];
      if(s.phase==="jogo" && s.vezId===eu().id){ s.vezId=s.vivos[0]||null; s.prazoTurno=Date.now()+TURNO_S*1000; }
      if(s.phase==="jogo" && s.vivos.length<=1){ fechaRodada(s); }
      return s; }).then(s=>{ if(s&&(!s.order||!s.order.length)) Net().apagarSala(code); }).catch(()=>{}); }
    sala=null; estado=null; menu();
  }
  function sairTudo(){ paraRel(); if(window.Chat) window.Chat.desligar(); if(desinscrever){ desinscrever(); desinscrever=null; } sala=null; estado=null; ctx.voltar(); }

  /* menu / lobby */
  function menu(){
    const online=Net()&&Net().disponivel();
    if(!online) return tela(el("div",{}, cabec(NOME), el("div",{class:"card"}, el("p",{class:"hint"},"Esse jogo é online. Configure o Supabase (config.js).")), el("footer",{},"")));
    const ci=el("input",{type:"text",maxlength:"4",placeholder:"CÓDIGO",autocomplete:"off",style:"text-transform:uppercase;text-align:center;letter-spacing:.3em;font-family:'Fredoka',sans-serif;font-size:22px"});
    const criar=el("button",{class:"btn"},"Criar sala nova"), entrar=el("button",{class:"btn btn-linha"},"Entrar");
    criar.addEventListener("click",criarSala);
    const vai=()=>{ const c=ci.value.trim().toUpperCase(); if(c.length>=4) entrarSala(c); };
    entrar.addEventListener("click",vai); ci.addEventListener("keydown",e=>{ if(e.key==="Enter") vai(); });
    tela(el("div",{}, cabec(NOME), el("div",{class:"card"},
      el("p",{class:"hint"},"Uma categoria aparece. Na sua vez, você tem "+TURNO_S+" segundos pra digitar uma resposta que ninguém falou. Travou ou repetiu? Tá fora! Último vivo leva 3 pontos. Vale o combinado do grupo, sem roubar!"),
      el("div",{style:"height:14px"}), criar, el("div",{style:"height:16px"}), el("label",{class:"rot"},"Já tem um código?"), el("div",{class:"campo"}, ci, entrar)),
      el("footer",{},"Quanto mais gente, mais tensão!")));
  }
  function lobby(){
    paraRel();
    const grade=el("div",{class:"lobby-jogadores"}, ...jogadores().map(p=>el("div",{class:"membro"+(p.id===eu().id?" eu":"")}, avatarMini(p.avatar), el("span",{}, p.nick+(p.id===estado.host?" 👑":"")))));
    const copiar=el("button",{class:"btn btn-linha",style:"margin-top:14px"},"Copiar link de convite");
    copiar.addEventListener("click", async ()=>{ const link=linkSala(sala.code); try{ await navigator.clipboard.writeText(link); copiar.textContent="Link copiado! ✓"; }catch(e){ prompt("Copie o link:", link); } setTimeout(()=>{ copiar.textContent="Copiar link de convite"; },2000); });
    const pode=souHost()&&estado.order.length>=MIN; const ctrl=[];
    if(souHost()){
      const menos=el("button",{class:"btn-ghost"},"−"), mais=el("button",{class:"btn-ghost"},"+"), val=el("b",{}, String(estado.meta)+" rodadas");
      menos.addEventListener("click",()=>mutar(s=>{ s.meta=Math.max(3,s.meta-1); return s; }));
      mais.addEventListener("click",()=>mutar(s=>{ s.meta=Math.min(15,s.meta+1); return s; }));
      ctrl.push(el("div",{class:"seletor-meta"}, menos, val, mais));
      const c=el("button",{class:"btn",style:"margin-top:10px"},"Começar!"); c.disabled=!pode; c.addEventListener("click",comecar); ctrl.push(c);
    } else ctrl.push(el("p",{class:"aviso",style:"margin-top:18px"},"Esperando o host começar…"));
    tela(el("div",{}, cabec("Sala", el("button",{class:"btn-ghost",onclick:sairOnline},"Sair")), el("div",{class:"card"},
      el("div",{class:"eyebrow",style:"text-align:center"},"Código da sala"), el("div",{class:"codigo"}, sala.code),
      el("p",{class:"aviso"},"Mande o link ou o código pra galera."), copiar,
      el("div",{class:"rot",style:"margin-top:20px"},"Na sala ("+estado.order.length+")"), grade, ...ctrl),
      el("footer",{}, pode||!souHost()?"Na sua vez, responda antes do tempo estourar!":"Precisa de pelo menos "+MIN+" jogadores.")));
  }
  function novaCategoria(s){ let livres=[]; for(let i=0;i<CATS.length;i++) if(!s.usadas.includes(i)) livres.push(i); if(!livres.length){ s.usadas=[]; for(let i=0;i<CATS.length;i++) livres.push(i); } const i=livres[Math.floor(Math.random()*livres.length)]; s.usadas.push(i); s.catIdx=i; }
  function comecar(){
    mutar(s=>{ s.phase="jogo"; s.round=1; s.usadas=[]; s.order.forEach(id=>s.players[id].score=0);
      novaCategoria(s); s.vivos=s.order.slice(); s.vezId=s.vivos[0];
      s.prazoTurno=Date.now()+TURNO_S*1000; s.respostas=[]; s.eliminados=[]; s.reveal=null; return s; });
  }

  /* jogo: turnos */
  function proximoVivo(s, aposId){
    if(!s.vivos.length) return null;
    const i=s.vivos.indexOf(aposId);
    return s.vivos[(i+1)%s.vivos.length];
  }
  function fechaRodada(s){
    const venc=s.vivos[0]||null;
    if(venc && s.players[venc]) s.players[venc].score+=3;
    s.reveal={ vencedor:venc, cat:CATS[s.catIdx], respostas:s.respostas.slice(), eliminados:s.eliminados.slice() };
    s.phase="reveal";
  }
  let estourando=null;
  function estourou(){
    if(!estado||estado.phase!=="jogo") return;
    const chave=estado.round+"|"+estado.vezId+"|"+estado.prazoTurno;
    if(estourando===chave) return; estourando=chave;
    mutar(s=>{
      if(s.phase!=="jogo") return s;
      if(Date.now() < s.prazoTurno-300) return s;      // ainda tem tempo, ignora
      const fora=s.vezId;
      s.vivos=s.vivos.filter(id=>id!==fora);
      s.eliminados.push(fora);
      if(s.vivos.length<=1){ fechaRodada(s); return s; }
      // o próximo é quem viria depois do eliminado na ordem original
      const ordemViva=s.order.filter(id=>s.vivos.includes(id));
      const posFora=s.order.indexOf(fora);
      let prox=null;
      for(let k=1;k<=s.order.length;k++){ const cand=s.order[(posFora+k)%s.order.length]; if(s.vivos.includes(cand)){ prox=cand; break; } }
      s.vezId=prox||ordemViva[0];
      s.prazoTurno=Date.now()+TURNO_S*1000;
      return s;
    });
  }
  function responder(txt){
    const v=norm(txt);
    if(!v) return { ok:false, motivo:"vazio" };
    if(estado.respostas.some(r=>norm(r.txt)===v)) return { ok:false, motivo:"repetida" };
    mutar(s=>{
      if(s.phase!=="jogo" || s.vezId!==eu().id) return s;
      if(s.respostas.some(r=>norm(r.txt)===v)) return s;
      s.respostas.push({ id:eu().id, txt:String(txt).trim() });
      s.vezId=proximoVivo(s, eu().id);
      s.prazoTurno=Date.now()+TURNO_S*1000;
      return s;
    });
    return { ok:true };
  }

  function faseJogo(){
    som("pop","r"+estado.round+"v"+estado.vezId);
    const cat=CATS[estado.catIdx];
    const vez=estado.players[estado.vezId];
    const meio=el("div",{});
    meio.appendChild(el("div",{class:"cat",style:"display:block;text-align:center;font-size:15px;padding:8px 14px"}, cat));
    // quem tá vivo / eliminado
    const fila=el("div",{class:"aguardando",style:"margin:12px 0"}, ...jogadores().map(p=>{
      const morto=!estado.vivos.includes(p.id);
      return el("span",{class:"chip"+(p.id===estado.vezId?" ok":"")+(morto?" morto":"")}, avatarMini(p.avatar), p.nick+(morto?" 💀":""));
    }));
    meio.appendChild(fila);
    // respostas já ditas
    if(estado.respostas.length){
      meio.appendChild(el("div",{class:"respostas-ditas"}, ...estado.respostas.map(r=>{
        const p=estado.players[r.id];
        return el("span",{class:"dita"}, (p?p.nick:"?")+": "+r.txt);
      })));
    }
    if(minhaVez()){
      const inp=el("input",{type:"text",placeholder:"Digite rápido!",autocomplete:"off"});
      const b=el("button",{class:"btn btn-mint"},"Valeu!");
      const fb=el("p",{class:"hint",style:"text-align:center;min-height:18px;margin-top:8px"});
      function envia(){ const r=responder(inp.value);
        if(!r.ok){ fb.textContent=r.motivo==="repetida"?"Já falaram essa! Outra, rápido!":"Digita alguma coisa!"; if(window.FX) window.FX.toca("erro"); inp.select(); } }
      b.addEventListener("click",envia); inp.addEventListener("keydown",e=>{ if(e.key==="Enter") envia(); });
      meio.appendChild(el("p",{class:"pergunta-jogo",style:"text-align:center;margin:10px 0 8px"},"SUA VEZ! 🔥"));
      meio.appendChild(el("div",{class:"campo"}, inp, b)); meio.appendChild(fb);
      setTimeout(()=>{ try{ inp.focus(); }catch(e){} },50);
    } else {
      meio.appendChild(el("p",{class:"pergunta-jogo",style:"text-align:center;margin:10px 0 8px"}, "Vez de "+(vez?vez.nick:"?")+"…"));
      if(!estado.vivos.includes(eu().id)) meio.appendChild(el("p",{class:"aviso"},"Você já era nesta rodada 💀 Torça pelo caos!"));
    }
    tela(el("div",{}, barraEsgoto(), relogioTurno(estado.prazoTurno),
      el("div",{class:"card"}, el("div",{class:"eyebrow"},"Rodada "+estado.round+" de "+estado.meta), meio),
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))));
  }

  function faseReveal(){
    paraRel();
    som("chime","rev"+estado.round);
    const r=estado.reveal, venc=r.vencedor?estado.players[r.vencedor]:null;
    const fim=estado.round>=estado.meta;
    const wrap=el("div",{});
    wrap.appendChild(el("div",{class:"eyebrow",style:"text-align:center"},"Sobreviveu à batata!"));
    wrap.appendChild(el("div",{class:"eleito",style:"margin:8px 0"}, venc?avatarMini(venc.avatar):el("span",{},"💨"), el("b",{}, venc?venc.nick:"Ninguém")));
    wrap.appendChild(el("div",{class:"pts"},"+3"));
    wrap.appendChild(el("p",{class:"hint",style:"text-align:center;margin:4px 0 12px"}, r.respostas.length+" respostas em “"+r.cat+"”"));
    if(r.respostas.length){
      wrap.appendChild(el("div",{class:"respostas-ditas"}, ...r.respostas.map(x=>{
        const p=estado.players[x.id]; return el("span",{class:"dita"},(p?p.nick:"?")+": "+x.txt); })));
    }
    const cont=el("button",{class:"btn",style:"margin-top:14px"}, fim?"Ver resultado 🏆":"Próxima rodada");
    if(souHost()) cont.addEventListener("click",()=>proxima(fim)); else { cont.disabled=true; cont.textContent="Esperando o host…"; }
    tela(el("div",{}, confetes(50), el("div",{class:"card"}, wrap), el("div",{class:"rot"},"Placar"), placarLista(), cont,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))));
  }
  function proxima(fim){
    mutar(s=>{ if(fim){ s.phase="over"; return s; }
      s.round++; novaCategoria(s); s.vivos=s.order.slice();
      s.vezId=s.order[(s.round-1)%s.order.length];
      s.prazoTurno=Date.now()+TURNO_S*1000; s.respostas=[]; s.eliminados=[]; s.reveal=null; s.phase="jogo"; return s; });
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

  function placarLista(){
    const js=jogadores().sort((a,b)=>b.score-a.score); const topo=js.length?js[0].score:0;
    return el("div",{class:"placar-lista"}, ...js.map((p,i)=>el("div",{class:"linha-placar"+(p.score===topo&&topo>0?" lider":"")},
      el("span",{class:"pos"},(i+1)+"º"), avatarMini(p.avatar), el("span",{class:"nm"}, p.nick+(p.id===estado.host?" 👑":"")), el("span",{class:"pt"}, String(p.score)))));
  }
  function confetes(qtd){ const cores=["#FF5252","#38A3FF","#FFC94D","#35C66F","#C9A7FF","#FFFFFF"]; const box=el("div",{class:"confetes","aria-hidden":"true"});
    for(let i=0;i<qtd;i++) box.appendChild(el("i",{style:"left:"+(Math.random()*100)+"%;background:"+cores[i%cores.length]+";animation-delay:"+(Math.random()*.9).toFixed(2)+"s;animation-duration:"+(2.2+Math.random()*1.8).toFixed(2)+"s;width:"+(7+Math.random()*7).toFixed(0)+"px"})); return box; }

  /* roteador: preserva o input de quem está na vez */
  let sigJogo=null;
  function render(){
    if(!estado) return;
    if(window.Chat) window.Chat.novoEstado(estado);
    if(estado.phase==="jogo"){
      const sig=estado.round+"|"+estado.vezId+"|"+estado.respostas.length+"|"+estado.vivos.length;
      if(sig!==sigJogo){ sigJogo=sig; faseJogo(); }
      return;
    }
    sigJogo=null;
    if(estado.phase==="lobby") return lobby();
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

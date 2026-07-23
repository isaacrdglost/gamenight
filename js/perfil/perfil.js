window.Perfil = (function(){
  let ctx, el, esc, raiz;
  let BARALHO = [];
  try{
    BARALHO = JSON.parse(decodeURIComponent(atob(window.DECK_B64).split("").map(c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0")).join("")));
  }catch(e){ BARALHO=[]; }

  function tela(node){ raiz().replaceChildren(node); window.scrollTo({top:0}); }
  function cabec(titulo, onVoltar, extra){
    return el("header",{class:"compacto"},
      el("div",{}, el("div",{class:"eyebrow"},"Perfil"), el("h1",{}, titulo)),
      extra || el("button",{class:"btn-ghost", onclick:onVoltar}, "Voltar")
    );
  }

  /* ============ APITO + RELÓGIO (1 minuto por dica) ============ */
  let timerId=null, restante=60, relBar=null, relTxt=null, relBox=null;
  function apitar(){
    try{
      const ac=new (window.AudioContext||window.webkitAudioContext)();
      [0,.25].forEach(t0=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);
        o.type="triangle";o.frequency.value=760;const t=ac.currentTime+t0;
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.2);
        o.start(t);o.stop(t+.25);});
    }catch(e){}
  }
  function pintaRel(){
    if(!relTxt) return;
    const m=Math.floor(restante/60),s=restante%60;
    relTxt.textContent = restante===0?"tempo!":`${m}:${String(s).padStart(2,"0")}`;
    relBar.style.width=(restante/60*100)+"%";
  }
  function paraRel(){ if(timerId){clearInterval(timerId);timerId=null;} }
  // conta 60s a partir de agora (modos locais)
  function iniciaRel(){ iniciaRelDesde(Date.now()); }
  // conta 60s a partir de um instante compartilhado (modo online: todos veem o mesmo relógio)
  function iniciaRelDesde(t0){
    paraRel();
    const calc=()=>Math.max(0, 60 - Math.floor((Date.now()-t0)/1000));
    restante=calc();
    if(relBox) relBox.classList.toggle("acabou", restante===0);
    pintaRel();
    if(restante===0) return;
    timerId=setInterval(()=>{
      restante=calc();
      if(restante<=0){ restante=0; paraRel(); if(relBox)relBox.classList.add("acabou"); apitar(); }
      pintaRel();
    },1000);
  }
  document.addEventListener("visibilitychange",()=>{ if(document.hidden) paraRel(); });

  /* ============ MENU DO PERFIL ============ */
  function menu(){
    const online = ctx.net && ctx.net.disponivel();
    const opt = (tag,titulo,desc,fn,off) => {
      const b=el("button",{class:"jogo"+(off?" soon":""),type:"button"},
        el("div",{class:"emoji"}, tag),
        el("div",{class:"info"}, el("h2",{},titulo), el("p",{},desc)),
        el("span",{class:"selo"}, off?"Indisponível":"Jogar"));
      if(!off) b.addEventListener("click",fn);
      return b;
    };
    tela(el("div",{},
      cabec("Perfil", ctx.voltar),
      el("div",{class:"jogos"},
        opt("🌐","Jogar online", online?"Crie uma sala e mande o link pros amigos. Vermelho contra Azul!":"Configure o Supabase (config.js) para liberar.", modoOnlineHome, !online),
        opt("📱","1v1 no mesmo celular","Sem internet: vocês se revezam passando o aparelho.", modoLocalSetup),
        opt("🏆","Só marcar pontos","Placar de mesa pra até 8, quando jogam com as cartas de papel.", modoPlacarSetup)
      ),
      el("footer",{}, BARALHO.length+" cartas no baralho")
    ));
  }

  /* util baralho */
  function sorteia(usadas){
    let livres=BARALHO.map((_,i)=>i).filter(i=>!usadas.includes(i));
    if(!livres.length){ usadas.length=0; livres=BARALHO.map((_,i)=>i); }
    return livres[Math.floor(Math.random()*livres.length)];
  }

  /* ====================================================================
     MODO 1 — PLACAR DE MESA
     ==================================================================== */
  let pl;
  async function carregaPlacar(){ pl = await ctx.ler("perfil:placar") || {jogadores:[],rodada:1,pendente:{},historico:[]}; }
  function salvaPlacar(){ ctx.guardar("perfil:placar", pl); }

  async function modoPlacarSetup(){
    await carregaPlacar();
    const input=el("input",{type:"text",maxlength:"18",placeholder:"Nome do jogador",autocomplete:"off"});
    const listaEl=el("ul",{class:"lista"});
    const add=el("button",{class:"btn"},"Adicionar");
    const iniciar=el("button",{class:"btn",style:"margin-top:20px"},"Começar a marcar");
    function repinta(){
      listaEl.replaceChildren(...pl.jogadores.map((j,i)=>{
        const rm=el("button",{type:"button","aria-label":"Remover "+j.nome},"×");
        rm.addEventListener("click",()=>{ pl.jogadores=pl.jogadores.filter(x=>x.id!==j.id); salvaPlacar(); repinta(); });
        return el("li",{}, el("span",{class:"n"},String(i+1).padStart(2,"0")), el("span",{class:"nm"},j.nome), rm);
      }));
      iniciar.disabled=pl.jogadores.length<2;
      add.disabled=pl.jogadores.length>=8;
      input.disabled=pl.jogadores.length>=8;
      input.placeholder=pl.jogadores.length>=8?"Grupo completo (8)":"Nome do jogador";
    }
    function addJ(){ const n=input.value.trim(); if(!n||pl.jogadores.length>=8) return;
      pl.jogadores.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,6),nome:n,pontos:0});
      input.value="";input.focus();salvaPlacar();repinta(); }
    add.addEventListener("click",addJ);
    input.addEventListener("keydown",e=>{if(e.key==="Enter")addJ();});
    iniciar.addEventListener("click",()=>{ if(pl.jogadores.length>=2) modoPlacarJogo(); });
    repinta();
    tela(el("div",{},
      cabec("Placar", menu),
      el("div",{class:"card"}, el("p",{class:"hint"},"Nome de quem vai jogar, até 8 pessoas."), el("div",{class:"campo"},input,add), listaEl),
      iniciar,
      el("footer",{},"Precisa de pelo menos 2 jogadores.")
    ));
  }

  function modoPlacarJogo(){
    const box=el("div",{class:"jogadores"});
    const status=el("p",{class:"status"});
    const encerrar=el("button",{class:"btn"});
    const desfazer=el("button",{class:"btn-ghost"});
    const zerar=el("button",{class:"btn-ghost"},"Novo placar");
    function marca(id,pts){ if(pl.pendente[id]===pts) delete pl.pendente[id]; else pl.pendente[id]=pts; salvaPlacar(); repinta(); }
    function repinta(){
      const ord=[...pl.jogadores].sort((a,b)=>b.pontos-a.pontos);
      const topo=ord.length?ord[0].pontos:0;
      box.replaceChildren(...ord.map((j,i)=>{
        const g=pl.pendente[j.id];
        const trilha=el("div",{class:"trilha"});
        for(let p=1;p<=10;p++){ const b=el("button",{type:"button","aria-pressed":String(g===p),"aria-label":`${p} para ${j.nome}`},String(p));
          b.addEventListener("click",()=>marca(j.id,p)); trilha.appendChild(b); }
        return el("div",{class:"jogador"+(j.pontos===topo&&topo>0?" lider":"")},
          el("div",{class:"topo"}, el("span",{class:"pos"},(i+1)+"º"), el("span",{class:"nm-g"},j.nome),
            g?el("span",{class:"ganho"},"+"+g):"", el("span",{class:"total"},String(j.pontos))),
          trilha);
      }));
      const n=Object.keys(pl.pendente).length, soma=Object.values(pl.pendente).reduce((a,b)=>a+b,0);
      status.textContent = n===0?"Ninguém pontuou ainda nesta rodada":`${n} pontuando · ${soma} pontos na mesa`;
      encerrar.textContent="Encerrar rodada "+pl.rodada;
      desfazer.textContent=n?"Limpar rodada":"Desfazer rodada";
      desfazer.disabled=!n&&!pl.historico.length;
    }
    encerrar.addEventListener("click",()=>{
      const g=Object.assign({},pl.pendente);
      pl.jogadores.forEach(j=>{if(g[j.id])j.pontos+=g[j.id];});
      pl.historico.push({rodada:pl.rodada,ganhos:g}); pl.rodada++; pl.pendente={};
      salvaPlacar(); repinta(); window.scrollTo({top:0,behavior:"smooth"});
    });
    desfazer.addEventListener("click",()=>{
      if(Object.keys(pl.pendente).length){ pl.pendente={}; salvaPlacar(); repinta(); return; }
      const u=pl.historico.pop(); if(!u) return;
      pl.jogadores.forEach(j=>{if(u.ganhos[j.id])j.pontos=Math.max(0,j.pontos-u.ganhos[j.id]);});
      pl.rodada=Math.max(1,pl.rodada-1); salvaPlacar(); repinta();
    });
    zerar.addEventListener("click",()=>{ if(!confirm("Apagar este placar?"))return;
      pl={jogadores:[],rodada:1,pendente:{},historico:[]}; salvaPlacar(); modoPlacarSetup(); });
    repinta();
    tela(el("div",{},
      cabec("Placar", menu),
      box,
      el("div",{class:"barra"}, status, encerrar, el("div",{class:"acoes"}, desfazer, zerar))
    ));
  }

  /* ====================================================================
     MODO 2 — 1v1 LOCAL (revezando o celular)
     ==================================================================== */
  let lg;
  function modoLocalSetup(){
    const j1=el("input",{type:"text",maxlength:"14",placeholder:"Nome",autocomplete:"off"});
    const j2=el("input",{type:"text",maxlength:"14",placeholder:"Nome",autocomplete:"off"});
    const meta=el("input",{type:"number",value:"50",min:"10",max:"200",step:"5"});
    const comecar=el("button",{class:"btn",style:"margin-top:20px"},"Começar partida");
    comecar.addEventListener("click",()=>{
      lg={nomes:[j1.value.trim()||"Jogador 1", j2.value.trim()||"Jogador 2"],
          pontos:[0,0],cartas:[0,0],meta:Math.max(10,Math.min(200,parseInt(meta.value,10)||50)),
          vez:0,carta:null,dica:0,usadas:[],trocas:[5,5]};
      localPassagem();
    });
    tela(el("div",{},
      cabec("1v1 local", menu),
      el("div",{class:"card"}, el("div",{style:"display:flex;flex-direction:column;gap:20px"},
        el("div",{}, el("label",{class:"rot"},"Jogador 1"), j1),
        el("div",{}, el("label",{class:"rot"},"Jogador 2"), j2),
        el("div",{}, el("label",{class:"rot"},"Pontos para vencer"), meta)
      )),
      el("div",{class:"card"}, el("h2",{style:"font-size:19px"},"Como funciona"),
        el("p",{class:"hint",style:"margin:12px 0 0"},
          "Vocês se revezam: um adivinha, o outro segura o celular e lê. As dez dicas aparecem juntas, embaçadas; cada toque libera a de baixo. A dica de cima vale 10 e a de baixo vale 1.")),
      comecar
    ));
  }

  function placarDupla(vez){
    return el("div",{class:"placarfixo"},
      ...lg.nomes.map((n,i)=>el("div",{class:"pl"+(i===vez?" vez":"")},
        el("div",{class:"q"}, n+(i===vez?" · adivinha":"")), el("div",{class:"v"}, String(lg.pontos[i])))));
  }
  function localPassagem(){
    paraRel();
    const quem=lg.nomes[lg.vez], leitor=lg.nomes[1-lg.vez];
    const abrir=el("button",{class:"btn"}, leitor+", abrir a carta");
    abrir.addEventListener("click",()=>{ lg.carta=sorteia(lg.usadas); lg.dica=0; localCarta(false); });
    tela(el("div",{},
      placarDupla(lg.vez),
      el("div",{class:"card passagem"},
        el("div",{class:"seta"},"↓"), el("h2",{},"Vez de "+quem),
        el("p",{}, "Entregue o celular para "+leitor+", que vai ler as dicas. "+quem+", não olhe a tela."),
        abrir),
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:()=>{ if(confirm("Encerrar a partida?")){paraRel();menu();} }},"Encerrar partida"))
    ));
  }
  function localCarta(rolar){
    const c=BARALHO[lg.carta];
    relBox=el("div",{class:"relogio"}); relTxt=el("span"); relBar=el("i");
    relBox.append(relTxt, el("span",{class:"bar"}, relBar));
    const pistas=el("ol",{class:"pistas"});
    const btnProx=el("button",{class:"btn btn-linha larga"});
    function repinta(){
      pistas.replaceChildren(...c.d.map((t,i)=>{
        const aberta=i<=lg.dica;
        return el("li",{class:"pista "+(aberta?"aberta":"trancada")+(i===lg.dica?" atual":"")},
          el("span",{class:"v"},String(10-i)), el("span",{class:"t"}, t));
      }));
      btnProx.textContent = lg.dica>=9?"Ninguém acertou, encerrar":"Próxima dica";
      valBox.textContent=String(10-lg.dica);
    }
    function avanca(){ if(lg.dica>=9){ localReveal(0); return; } lg.dica++; repinta(); iniciaRel();
      const atual=pistas.children[lg.dica]; if(atual) atual.scrollIntoView && atual.scrollIntoView({block:"center",behavior:"smooth"}); }
    btnProx.addEventListener("click",avanca);
    const acertou=el("button",{class:"btn btn-mint larga"},"Acertou");
    acertou.addEventListener("click",()=>localReveal(10-lg.dica));
    if(!lg.trocas) lg.trocas=[5,5];
    const restaT=lg.trocas[lg.vez];
    const pular=el("button",{class:"btn-ghost larga",style:"width:100%"},
      restaT>0?("Trocar carta ("+restaT+(restaT===1?" troca restante":" trocas restantes")+")"):"Sem trocas restantes");
    pular.disabled=restaT<=0;
    pular.addEventListener("click",()=>{
      if(lg.trocas[lg.vez]<=0) return;
      lg.trocas[lg.vez]--;
      lg.usadas.push(lg.carta); lg.carta=sorteia(lg.usadas); lg.dica=0;
      localCarta(false); window.scrollTo({top:0,behavior:"smooth"});
    });

    const valBox=el("strong",{},String(10-lg.dica));
    tela(el("div",{},
      placarDupla(lg.vez),
      el("div",{class:"carta"},
        el("div",{class:"carta-topo"},
          el("div",{}, el("div",{class:"cat"},"Personalidade · "+c.c),
            el("div",{style:"font-size:13px;color:var(--suave);margin-top:8px;font-weight:700"}, lg.nomes[lg.vez]+" está adivinhando")),
          el("div",{class:"valor"}, el("span",{},"Vale agora"), valBox)),
        el("div",{class:"resposta"}, el("span",{},"Só o leitor vê"), el("strong",{}, c.n)),
        relBox, pistas),
      el("div",{class:"controles"}, acertou, btnProx, pular)
    ));
    repinta(); iniciaRel();
    if(rolar){ const atual=pistas.children[lg.dica]; if(atual&&atual.scrollIntoView) atual.scrollIntoView({block:"center"}); }
  }
  function localReveal(pontos){
    paraRel();
    const c=BARALHO[lg.carta], quem=lg.vez;
    lg.usadas.push(lg.carta);
    lg.pontos[quem]+=pontos; lg.cartas[quem]++;
    const empatadas=lg.cartas[0]===lg.cartas[1];
    const lider=lg.pontos[0]===lg.pontos[1]?-1:(lg.pontos[0]>lg.pontos[1]?0:1);
    const acabou=empatadas&&lider>=0&&lg.pontos[lider]>=lg.meta;
    lg.vez=1-lg.vez;
    const cont=el("button",{class:"btn"}, acabou?"Ver resultado":"Próxima carta");
    cont.addEventListener("click",()=> acabou?localFim():localPassagem());
    tela(el("div",{},
      pontos>0?confetes(50):"",
      el("div",{class:"card revelacao"},
        el("div",{class:"eyebrow"}, pontos>0?("Acertou na dica de "+(10-lg.dica)+" pontos"):"Passou as 10 dicas"),
        el("div",{class:"nome-final"}, c.n),
        el("div",{class:"pts"+(pontos>0?"":" zero")}, pontos>0?("+"+pontos):"0"),
        el("div",{class:"detalhe"}, lg.nomes[quem]+" agora tem "+lg.pontos[quem]+" de "+lg.meta),
        cont
    )));
  }
  function localFim(){
    const venc=lg.pontos[0]>lg.pontos[1]?0:1;
    const rev=el("button",{class:"btn"},"Revanche");
    rev.addEventListener("click",()=>{ lg.pontos=[0,0];lg.cartas=[0,0];lg.vez=0; localPassagem(); });
    tela(el("div",{},
      confetes(100),
      el("div",{class:"card fim"},
        el("div",{class:"trofeu"},"🏆"), el("div",{class:"eyebrow"},"Fim de partida"),
        el("h2",{}, lg.nomes[venc]+" venceu"),
        el("div",{class:"linha"}, `${lg.nomes[0]} ${lg.pontos[0]} × ${lg.pontos[1]} ${lg.nomes[1]}`),
        el("div",{style:"margin-top:34px"}, rev),
        el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:menu},"Voltar"))
    )));
  }

  /* ====================================================================
     MODO 3 — ONLINE EM TIMES (Supabase)
     Vermelho vs Azul. A cada carta, ALGUÉM DO PRÓPRIO TIME que vai
     adivinhar é sorteado pra receber a carta (vê a resposta e lê as
     dicas). Exceção: time com 1 pessoa só — aí lê alguém do outro time.
     ==================================================================== */
  const Net = () => ctx.net;
  let sala=null;         // {code}
  let estado=null;       // snapshot do state remoto
  let desinscrever=null;
  const eu = () => ctx.perfil;

  function codigoNovo(){ const L="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<4;i++)s+=L[Math.floor(Math.random()*L.length)]; return s; }
  function linkSala(code){ return location.origin + location.pathname + "?sala=" + code; }

  const TIMES = { A:{nome:"Vermelho", cls:"a"}, B:{nome:"Azul", cls:"b"} };
  function membrosDe(s,t){ return s.order.filter(id=>s.members[id] && s.members[id].team===t); }
  function contaTimes(s){ return { a:membrosDe(s,"A").length, b:membrosDe(s,"B").length }; }
  function sorteiaTime(s){ const {a,b}=contaTimes(s); if(a<b)return "A"; if(b<a)return "B"; return Math.random()<0.5?"A":"B"; }
  function embaralhaTimes(s){
    const ids=[...s.order].filter(id=>s.members[id]);
    for(let i=ids.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
    ids.forEach((id,k)=>{ s.members[id].team = k%2===0 ? "A" : "B"; });
  }

  // sorteia quem recebe a carta: alguém do PRÓPRIO time que adivinha
  // (evita repetir a mesma pessoa duas vezes seguidas).
  // Se o time só tem 1 pessoa, sorteia do time adversário.
  function sorteiaLeitor(s, timeAdivinha){
    let pool = membrosDe(s, timeAdivinha);
    if(pool.length < 2){
      const outros = membrosDe(s, timeAdivinha==="A"?"B":"A");
      if(pool.length===1 && outros.length) pool = outros;
      else if(!pool.length) return null;
    }
    if(!s.lastReader) s.lastReader = {A:null,B:null};
    let cands = pool.filter(id => id !== s.lastReader[timeAdivinha]);
    if(!cands.length) cands = pool;
    const id = cands[Math.floor(Math.random()*cands.length)];
    s.lastReader[timeAdivinha] = id;
    return id;
  }

  function modoOnlineHome(){
    const codeInput=el("input",{type:"text",maxlength:"4",placeholder:"CÓDIGO",autocomplete:"off",style:"text-transform:uppercase;text-align:center;letter-spacing:.3em;font-family:'Fredoka',sans-serif;font-size:22px"});
    const criar=el("button",{class:"btn"},"Criar sala nova");
    const entrar=el("button",{class:"btn btn-linha"},"Entrar");
    criar.addEventListener("click",criarSala);
    const vai=()=>{ const c=codeInput.value.trim().toUpperCase(); if(c.length>=4) entrarSala(c); };
    entrar.addEventListener("click",vai);
    codeInput.addEventListener("keydown",e=>{ if(e.key==="Enter") vai(); });
    tela(el("div",{},
      cabec("Online", menu),
      el("div",{class:"card"},
        el("p",{class:"hint"},"Crie a sala e mande o link (ou o código de 4 letras) pros amigos. Quem entra cai sorteado num time."),
        criar,
        el("div",{style:"height:16px"}),
        el("label",{class:"rot"},"Já tem um código?"),
        el("div",{class:"campo"}, codeInput, entrar)
      ),
      el("footer",{},"Primeiro time a fazer 50 pontos vence!")
    ));
  }

  async function criarSala(){
    const code=codigoNovo();
    const st={
      host:eu().id, phase:"lobby", meta:50,
      members:{ [eu().id]:{nick:eu().nick, avatar:eu().avatar, team:(Math.random()<0.5?"A":"B")} },
      order:[eu().id], turn:"A", readerId:null, lastReader:{A:null,B:null},
      card:null, dica:0, dicaT:null, scores:{A:0,B:0}, cartas:{A:0,B:0},
      trocas:{A:5,B:5}, used:[], last:null
    };
    try{
      await Net().criarSala(code, st);
      sala={code}; ctx.guardar("perfil:sala",{code});
      ligarCanal(); estado=st; renderOnline();
    }
    catch(e){ alert("Não consegui criar a sala. Confira a internet e tente de novo."); console.error(e); }
  }
  async function entrarSala(code, silencioso){
    try{
      const st=await Net().lerSala(code);
      if(!st){ if(!silencioso) alert("Sala "+code+" não encontrada."); ctx.guardar("perfil:sala",null); return false; }
      const novo=await Net().alterar(code, s=>{
        if(!s.members[eu().id]){
          s.members[eu().id]={nick:eu().nick,avatar:eu().avatar,team:sorteiaTime(s)};
          s.order.push(eu().id);
        } else {
          // reconectando: atualiza nick/avatar
          s.members[eu().id].nick=eu().nick;
          s.members[eu().id].avatar=eu().avatar;
        }
        return s;
      });
      sala={code}; ctx.guardar("perfil:sala",{code});
      ligarCanal(); estado=novo; renderOnline();
      return true;
    }catch(e){ if(!silencioso) alert("Não consegui entrar na sala."); console.error(e); return false; }
  }
  function ligarCanal(){
    if(desinscrever){ desinscrever(); desinscrever=null; }
    desinscrever=Net().inscrever(sala.code, st=>{ if(st){ estado=st; renderOnline(); } });
  }
  function sairOnline(){
    paraRel();
    if(desinscrever){ desinscrever(); desinscrever=null; }
    ctx.guardar("perfil:sala",null);
    if(sala){
      const code=sala.code;
      Net().alterar(code, s=>{
        if(s.members[eu().id]){ delete s.members[eu().id]; s.order=s.order.filter(i=>i!==eu().id); }
        // host saiu? passa a coroa pro próximo
        if(s.host===eu().id && s.order.length) s.host=s.order[0];
        // quem tinha a carta saiu? sorteia outro
        if(s.readerId===eu().id && s.phase==="card") s.readerId=sorteiaLeitor(s, s.turn);
        return s;
      }).then(s=>{
        // último a sair apaga a luz: sala vazia some do banco
        if(s && (!s.order || !s.order.length)) Net().apagarSala(code);
      }).catch(()=>{});
    }
    sala=null; estado=null; menu();
  }
  async function mutar(f){
    try{ const novo=await Net().alterar(sala.code, f); if(novo){ estado=novo; renderOnline(); } }
    catch(e){ console.error(e); }
  }

  const souHost = () => estado && estado.host===eu().id;
  const meuTime = () => estado && estado.members[eu().id] && estado.members[eu().id].team;
  const souLeitor = () => estado && estado.readerId===eu().id;

  function renderOnline(){
    if(!estado) return;
    if(estado.phase==="lobby") return lobby();
    if(estado.phase==="card") return cartaOnline();
    if(estado.phase==="reveal") return revealOnline();
    if(estado.phase==="over") return fimOnline();
  }
  function avatarMini(id){ const a=ctx.avatarPorId(id); return el("div",{class:"av",html:a.svg}); }

  /* ---------------- FESTINHA (confete + banner de vez) ---------------- */
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
  // se o time que adivinha tem 1 pessoa só, o jogo vira duelo → copy diferente
  function infoVez(s){
    const ids=membrosDe(s, s.turn);
    const solo=ids.length===1;
    const nick=solo && s.members[ids[0]] ? s.members[ids[0]].nick : null;
    return { solo, nick, rotulo: solo ? nick : "Time "+TIMES[s.turn].nome };
  }
  let bannerVisto=null; // garante que o banner só aparece quando muda a carta/vez
  // banner fica no <body> pra sobreviver às re-renderizações da tela
  function mostraBanner(txt, cls){
    document.querySelectorAll(".banner-vez").forEach(b=>b.remove());
    const b=el("div",{class:"banner-vez "+cls,"aria-hidden":"true"}, txt);
    document.body.appendChild(b);
    setTimeout(()=>{ b.remove(); }, 1900);
  }

  /* ---------------- LOBBY ---------------- */
  function lobby(){
    paraRel();
    const membrosDoTime=t=>membrosDe(estado,t).map(i=>{
      const m=estado.members[i];
      return el("div",{class:"membro"+(i===eu().id?" eu":"")}, avatarMini(m.avatar), el("span",{}, m.nick + (i===estado.host?" 👑":"")));
    });
    const timeA=el("div",{class:"time a"}, el("h3",{},"Time Vermelho"), ...membrosDoTime("A"));
    const timeB=el("div",{class:"time b"}, el("h3",{},"Time Azul"), ...membrosDoTime("B"));

    const mt=meuTime();
    const seuTime = mt ? el("div",{class:"seu-time"}, "Você caiu no ", el("b",{class:TIMES[mt].cls}, "Time "+TIMES[mt].nome)) : "";

    const {a,b}=contaTimes(estado);
    const podeComecar=souHost() && a>=1 && b>=1;

    const copiar=el("button",{class:"btn btn-linha",style:"margin-top:14px"},"Copiar link de convite");
    copiar.addEventListener("click", async ()=>{
      const link=linkSala(sala.code);
      try{ await navigator.clipboard.writeText(link); copiar.textContent="Link copiado! ✓"; }
      catch(e){ prompt("Copie o link:", link); }
      setTimeout(()=>{ copiar.textContent="Copiar link de convite"; },2000);
    });

    const embaralhar=el("button",{class:"btn-ghost",style:"margin-top:16px"},"Embaralhar times");
    embaralhar.addEventListener("click",()=>mutar(s=>{ embaralhaTimes(s); return s; }));

    const comecar=el("button",{class:"btn",style:"margin-top:10px"},"Começar partida");
    comecar.disabled=!podeComecar;
    comecar.addEventListener("click",()=>mutar(s=>{
      s.phase="card"; s.turn="A"; s.card=sorteia(s.used); s.dica=0; s.dicaT=Date.now();
      s.readerId=sorteiaLeitor(s,"A");
      return s;
    }));

    tela(el("div",{},
      cabec("Sala", null, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair")),
      el("div",{class:"card"},
        el("div",{class:"eyebrow",style:"text-align:center"},"Código da sala"),
        el("div",{class:"codigo"}, sala.code),
        el("p",{class:"aviso"},"Mande o link ou o código pra galera."),
        copiar,
        el("div",{class:"times"}, timeA, timeB),
        seuTime,
        souHost()
          ? el("div",{}, el("div",{class:"acoes"},embaralhar), comecar)
          : el("p",{class:"aviso",style:"margin-top:18px"},"Esperando o host começar…")
      ),
      el("footer",{}, podeComecar||!souHost()
        ? "A cada carta, alguém do time da vez é sorteado pra ler as dicas."
        : "Cada time precisa de pelo menos 1 pessoa.")
    ));
  }

  // faixa discreta de esgotamento do baralho (só cor, sem número)
  function barraEsgotoPerfil(){
    const total=BARALHO.length||0;
    if(!total) return el("div",{});
    const usado=(estado && estado.used ? estado.used.length : 0);
    const resta=Math.max(0, Math.min(1, (total-usado)/total));
    const cor = resta>0.5 ? "var(--verde)" : (resta>0.2 ? "var(--ouro)" : "var(--tva)");
    return el("div",{class:"esgoto","aria-hidden":"true",title:"Baralho restante"},
      el("i",{style:"width:"+(resta*100).toFixed(0)+"%;background:"+cor}));
  }
  function placarTimes(){
    return el("div",{class:"placarfixo"},
      el("div",{class:"pl a"+(estado.turn==="A"?" vez":"")}, el("div",{class:"q"},"Vermelho"+(estado.turn==="A"?" · adivinha":"")), el("div",{class:"v"}, String(estado.scores.A))),
      el("div",{class:"pl b"+(estado.turn==="B"?" vez":"")}, el("div",{class:"q"},"Azul"+(estado.turn==="B"?" · adivinha":"")), el("div",{class:"v"}, String(estado.scores.B))));
  }

  /* ---------------- CARTA ---------------- */
  function cartaOnline(){
    const c=BARALHO[estado.card];
    if(!c){ return; }
    const leitor=souLeitor();
    const nomeLeitor=estado.members[estado.readerId]?estado.members[estado.readerId].nick:"alguém";
    const timeVez=TIMES[estado.turn].nome;
    const adivinho = meuTime()===estado.turn && !leitor;
    const vez=infoVez(estado); // vez.solo = duelo (1 pessoa adivinhando)

    // banner "vez de..." só quando muda a carta ou o turno
    const chaveBanner = estado.card+":"+estado.turn;
    const novaCarta = bannerVisto!==chaveBanner;
    if(novaCarta){
      bannerVisto=chaveBanner;
      mostraBanner("Vez "+(vez.solo?("de "+vez.nick):("do Time "+timeVez))+"!", TIMES[estado.turn].cls);
    }

    relBox=el("div",{class:"relogio"}); relTxt=el("span"); relBar=el("i");
    relBox.append(relTxt, el("span",{class:"bar"}, relBar));

    // as 10 dicas aparecem SEMPRE: reveladas abertas, o resto com blur
    const pistas=el("ol",{class:"pistas"});
    c.d.forEach((t,i)=>{
      const aberta=i<=estado.dica;
      pistas.appendChild(el("li",{class:"pista "+(aberta?"aberta":"trancada")+(i===estado.dica?" atual":"")},
        el("span",{class:"v"},String(10-i)), el("span",{class:"t"}, t)));
    });

    let papel;
    if(vez.solo){
      // DUELO: um contra o outro
      if(leitor) papel="Você lê as dicas pra "+vez.nick+". Cara de paisagem, não entrega nada! 😏";
      else if(adivinho) papel="Sua vez! "+nomeLeitor+" lê as dicas. Mostra que você sabe! 😤";
      else papel=vez.nick+" está adivinhando. Sem cochicho! 🤫";
    } else {
      // GRUPO vs GRUPO
      if(leitor) papel="Você recebeu a carta! Leia a dica em voz alta pro seu time.";
      else if(adivinho) papel=nomeLeitor+" recebeu a carta. Adivinhem juntos!";
      else papel="Time "+timeVez+" está adivinhando. Fiquem de olho e bico calado! 🤫";
    }

    let controles;
    if(leitor){
      const prox=el("button",{class:"btn btn-linha larga"}, estado.dica>=9?(vez.solo?"Não acertou, encerrar":"Ninguém acertou, encerrar"):"Próxima dica");
      prox.addEventListener("click",()=>{ if(estado.dica>=9) return encerraOnline(0); mutar(s=>{ s.dica=Math.min(9,s.dica+1); s.dicaT=Date.now(); return s; }); });
      const acertou=el("button",{class:"btn btn-mint larga"},(vez.solo?vez.nick:"Time "+timeVez)+" acertou!");
      acertou.addEventListener("click",()=>encerraOnline(10-estado.dica));
      const restaT=(estado.trocas&&estado.trocas[estado.turn]!=null)?estado.trocas[estado.turn]:5;
      const pular=el("button",{class:"btn-ghost larga",style:"width:100%"},
        restaT>0?("Trocar carta ("+restaT+(restaT===1?" troca restante":" trocas restantes")+")"):"Sem trocas restantes");
      pular.disabled=restaT<=0;
      pular.addEventListener("click",()=>mutar(s=>{
        if(!s.trocas) s.trocas={A:5,B:5};
        if(s.trocas[s.turn]<=0) return s;
        s.trocas[s.turn]--;
        s.used.push(s.card); s.card=sorteia(s.used); s.dica=0; s.dicaT=Date.now();
        return s;
      }));
      controles=el("div",{class:"controles"}, el("p",{class:"aviso",style:"margin-bottom:2px"}, papel), acertou, prox, pular);
    } else {
      controles=el("p",{class:"aviso"}, papel);
    }

    tela(el("div",{},
      barraEsgotoPerfil(),
      placarTimes(),
      el("div",{class:"carta"+(novaCarta?" nova":"")},
        el("div",{class:"carta-topo"},
          el("div",{}, el("div",{class:"cat"},"Personalidade · "+c.c),
            el("div",{style:"font-size:13px;color:var(--suave);margin-top:8px;font-weight:700"}, leitor?(vez.rotulo+" adivinha · você lê"):papel)),
          el("div",{class:"valor"}, el("span",{},"Vale agora"), el("strong",{}, String(10-estado.dica)))),
        leitor?el("div",{class:"resposta"}, el("span",{},"Só você vê a resposta"), el("strong",{}, c.n)):"",
        relBox, pistas),
      controles,
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));

    // relógio compartilhado: todo mundo conta o mesmo 1 minuto por dica
    if(estado.dicaT) iniciaRelDesde(estado.dicaT); else iniciaRel();
  }

  function encerraOnline(pontos){
    paraRel();
    mutar(s=>{
      s.scores[s.turn]+=pontos; s.cartas[s.turn]++;
      s.used.push(s.card);
      s.last={ team:s.turn, name:BARALHO[s.card].n, pts:pontos, dica:s.dica };
      const empat=s.cartas.A===s.cartas.B;
      const lider=s.scores.A===s.scores.B?null:(s.scores.A>s.scores.B?"A":"B");
      s.phase=(empat&&lider&&s.scores[lider]>=s.meta)?"over":"reveal";
      return s;
    });
  }

  /* ---------------- REVELAÇÃO / FIM ---------------- */
  function revealOnline(){
    paraRel();
    const L=estado.last||{team:"A",name:"?",pts:0,dica:0};
    // se o time só tem 1 pessoa, fala o nome dela (duelo); senão, o time
    const ids=membrosDe(estado, L.team);
    const quem = ids.length===1 && estado.members[ids[0]] ? estado.members[ids[0]].nick : "Time "+TIMES[L.team].nome;
    const cont=el("button",{class:"btn"},"Próxima carta");
    if(souHost()){
      cont.addEventListener("click",()=>mutar(s=>{
        s.turn = s.turn==="A"?"B":"A";
        s.readerId = sorteiaLeitor(s, s.turn);
        s.card=sorteia(s.used); s.dica=0; s.dicaT=Date.now(); s.phase="card"; s.last=null;
        return s;
      }));
    } else { cont.disabled=true; cont.textContent="Esperando o host…"; }
    tela(el("div",{},
      L.pts>0?confetes(60):"",
      placarTimes(),
      el("div",{class:"card revelacao"},
        el("div",{class:"eyebrow"}, L.pts>0?(quem+" acertou na dica de "+(10-L.dica)+" pontos"):(quem+" passou as 10 dicas")),
        el("div",{class:"nome-final"}, L.name),
        el("div",{class:"pts"+(L.pts>0?"":" zero")}, L.pts>0?("+"+L.pts):"0"),
        el("div",{class:"detalhe"}, "Vermelho "+estado.scores.A+" × "+estado.scores.B+" Azul"),
        cont),
      el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    ));
  }

  function fimOnline(){
    paraRel();
    const venc=estado.scores.A>estado.scores.B?"A":"B";
    const ids=membrosDe(estado, venc);
    const quem = ids.length===1 && estado.members[ids[0]] ? estado.members[ids[0]].nick : "Time "+TIMES[venc].nome;
    const rev=el("button",{class:"btn"},"Revanche");
    rev.disabled=!souHost();
    if(souHost()) rev.addEventListener("click",()=>mutar(s=>{
      s.scores={A:0,B:0}; s.cartas={A:0,B:0}; s.trocas={A:5,B:5}; s.turn="A"; s.phase="card";
      s.card=sorteia(s.used); s.dica=0; s.dicaT=Date.now(); s.readerId=sorteiaLeitor(s,"A"); s.last=null; return s;
    }));
    tela(el("div",{},
      confetes(120),
      placarTimes(),
      el("div",{class:"card fim"},
        el("div",{class:"trofeu"},"🏆"), el("div",{class:"eyebrow"},"Fim de partida"),
        el("h2",{class:venc==="A"?"venc-a":"venc-b"}, quem+" venceu!"),
        el("div",{class:"linha"}, "Vermelho "+estado.scores.A+" × "+estado.scores.B+" Azul"),
        el("div",{style:"margin-top:34px"}, rev),
        el("div",{class:"acoes"}, el("button",{class:"btn-ghost",onclick:sairOnline},"Sair da sala"))
    )));
  }

  /* ---------------- ENTRADA ---------------- */
  async function abrir(context){
    ctx = context; el = context.el; esc = context.esc;
    ctx.net = window.Net;
    raiz = () => document.getElementById("app");

    const online = ctx.net && ctx.net.disponivel();

    // veio por link de convite (?sala=ABCD)
    if(online && ctx.joinCode){
      const ok = await entrarSala(ctx.joinCode);
      if(ok) return;
    }
    // estava numa sala e recarregou? volta pra ela
    if(online){
      const salva = await ctx.ler("perfil:sala");
      if(salva && salva.code){
        const ok = await entrarSala(salva.code, true);
        if(ok) return;
      }
    }
    menu();
  }
  return { abrir };
})();

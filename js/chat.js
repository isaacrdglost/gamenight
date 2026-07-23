/* ====================================================================
   CHAT DA SALA — estilo Gartic: aberto pra todo mundo da sala, em tempo
   real. As mensagens viajam junto com o estado da sala (s.chat), então
   funciona em qualquer jogo sem infra nova.

   Cada motor de jogo chama:
     Chat.ligar({ mutar, eu, avatarPorId, rapidas })  ao entrar na sala
     Chat.novoEstado(estado)                          a cada atualização
     Chat.desligar()                                  ao sair da sala
   ==================================================================== */
window.Chat = (function(){
  const MAX_MSGS = 40;          // cabe folgado no limite de 100KB da sala
  const MAX_LEN  = 140;
  const EMOJIS = ["😂","🔥","❤️","👏","😱","🤔","💀","🎉"];

  let cfg=null, estado=null, montado=false, aberto=false;
  let vistos=0, ultimoTotal=0;
  let caixa, painel, botao, badge, listaEl, inputEl;

  function el(tag, attrs, ...kids){
    const n=document.createElement(tag);
    if(attrs) for(const k in attrs){
      if(k==="class") n.className=attrs[k];
      else if(k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(c=>{ if(c==null||c==="") return; n.appendChild(typeof c==="string"?document.createTextNode(c):c); });
    return n;
  }
  const msgs = () => (estado && Array.isArray(estado.chat)) ? estado.chat : [];

  function montarDOM(){
    if(montado || !document.body) return;
    montado=true;
    badge = el("span",{class:"chat-badge",hidden:"hidden"},"");
    botao = el("button",{class:"chat-botao",type:"button","aria-label":"Chat da sala",title:"Chat da sala"}, "💬", badge);
    botao.addEventListener("click", alterna);
    listaEl = el("div",{class:"chat-lista"});
    inputEl = el("input",{type:"text",maxlength:String(MAX_LEN),placeholder:"Escreva pra galera…",autocomplete:"off"});
    inputEl.addEventListener("keydown", e=>{ if(e.key==="Enter") enviarDoInput(); });
    const enviar = el("button",{class:"chat-enviar",type:"button","aria-label":"Enviar"},"➤");
    enviar.addEventListener("click", enviarDoInput);
    const emojisEl = el("div",{class:"chat-emojis"}, ...EMOJIS.map(e=>{
      const b=el("button",{class:"chat-emoji",type:"button","aria-label":e}, e);
      b.addEventListener("click",()=>{ inputEl.value=(inputEl.value+e).slice(0,MAX_LEN); try{ inputEl.focus(); }catch(_){} });
      return b;
    }));
    const rapidasEl = el("div",{class:"chat-rapidas"});
    painel = el("div",{class:"chat-painel",hidden:"hidden"},
      el("div",{class:"chat-topo"}, el("b",{},"Chat da sala"),
        el("button",{class:"chat-fechar",type:"button","aria-label":"Fechar"},"✕")),
      listaEl, rapidasEl, emojisEl,
      el("div",{class:"chat-barra"}, inputEl, enviar));
    painel.querySelector(".chat-fechar").addEventListener("click", alterna);
    caixa = el("div",{class:"chat-caixa"}, painel, botao);
    document.body.appendChild(caixa);
    caixa._rapidas = rapidasEl;
  }

  function pintaRapidas(){
    if(!caixa || !caixa._rapidas) return;
    const rs = (cfg && cfg.rapidas) || [];
    caixa._rapidas.replaceChildren(...rs.map(txt=>{
      const b=el("button",{class:"chat-rapida",type:"button"}, txt);
      b.addEventListener("click",()=>enviar(txt));
      return b;
    }));
  }

  function enviarDoInput(){
    const v=(inputEl.value||"").trim();
    if(!v) return;
    inputEl.value="";
    enviar(v);
  }
  function enviar(texto){
    if(!cfg || !cfg.mutar) return;
    const txt=String(texto||"").trim().slice(0,MAX_LEN);
    if(!txt) return;
    const meu=cfg.eu();
    cfg.mutar(s=>{
      const lista = Array.isArray(s.chat) ? s.chat : [];
      lista.push({ id:meu.id, nick:meu.nick, avatar:meu.avatar, txt, t:Date.now() });
      s.chat = lista.slice(-MAX_MSGS);
      return s;
    });
  }

  function alterna(){
    aberto=!aberto;
    painel.hidden=!aberto;
    caixa.classList.toggle("aberto", aberto);
    if(aberto){ vistos=msgs().length; atualizaBadge(); rolaFim(); try{ inputEl.focus(); }catch(_){} }
  }
  function atualizaBadge(){
    const n=Math.max(0, msgs().length - vistos);
    if(n>0){ badge.textContent=String(Math.min(99,n)); badge.hidden=false; botao.classList.add("pulsa"); }
    else { badge.hidden=true; botao.classList.remove("pulsa"); }
  }
  function rolaFim(){ try{ listaEl.scrollTop=listaEl.scrollHeight; }catch(_){} }

  function pintaLista(){
    const meu = cfg ? cfg.eu().id : null;
    const lista = msgs();
    if(!lista.length){
      listaEl.replaceChildren(el("p",{class:"chat-vazio"},"Ninguém falou nada ainda. Manda a primeira!"));
      return;
    }
    listaEl.replaceChildren(...lista.map(m=>{
      let avEl=null;
      if(cfg && cfg.avatarPorId){
        const a=cfg.avatarPorId(m.avatar);
        if(a){ avEl=document.createElement("div"); avEl.className="av"; avEl.innerHTML=a.svg; }
      }
      return el("div",{class:"chat-msg"+(m.id===meu?" meu":"")},
        avEl,
        el("div",{class:"chat-bolha"},
          el("span",{class:"chat-nick"}, m.nick||"?"),
          el("span",{class:"chat-txt"}, m.txt||"")));
    }));
    rolaFim();
  }

  function novoEstado(st){
    if(!cfg) return;
    estado=st;
    const total=msgs().length;
    if(total>ultimoTotal){
      const novas=msgs().slice(ultimoTotal);
      const deOutro=novas.some(m=>m.id!==cfg.eu().id);
      ultimoTotal=total;
      if(deOutro && window.FX && window.FX.toca) window.FX.toca("msg");
    } else if(total<ultimoTotal){ ultimoTotal=total; vistos=Math.min(vistos,total); }
    if(aberto) vistos=total;
    atualizaBadge();
    pintaLista();
  }

  function ligar(c){
    cfg=c; estado=null; aberto=false; vistos=0; ultimoTotal=0;
    montarDOM();
    pintaRapidas();
    painel.hidden=true; caixa.classList.remove("aberto");
    caixa.hidden=false;
    atualizaBadge(); pintaLista();
  }
  function desligar(){
    cfg=null; estado=null; aberto=false;
    if(caixa){ caixa.hidden=true; painel.hidden=true; caixa.classList.remove("aberto"); }
  }

  return { ligar, desligar, novoEstado, enviar, _abre:alterna };
})();

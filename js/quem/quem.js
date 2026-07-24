/* QUEM ESCREVEU? — a pergunta tem uma resposta real bizarra. Todo mundo
   inventa uma resposta falsa pra enganar a galera. Depois, todos votam em
   qual é a verdadeira. Você ganha achando a real E enganando os outros. */
window.QuemEscreveu = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.QUEM_B64))); }catch(e){ DECK=[]; }
  const U=window.Blefe._util;
  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"");

  const def = {
    id:"quem", nome:"Quem Escreveu?", emoji:"🎣", min:3,
    metaPadrao:6, metaMin:3, metaMax:12, total:DECK.length,
    tempoEscrever:70, tempoVotar:50,
    rapidas:["Essa é mentira na certa. 🤨","Muito bem inventada!","Caí feio nessa."],
    comoJogar:"Aparece uma pergunta com uma resposta real bem esquisita. Cada um inventa uma resposta falsa pra enganar a galera. Depois todos votam em qual acham que é a verdadeira. Acertar a real vale 3, e cada pessoa que cair na SUA mentira vale 2!",

    novaRodada(s){ const i=U.sorteiaIdx(s.usadas, DECK.length); s.usadas.push(i); s.dados={i}; },
    escrevem(s){ return s.order.slice(); },

    telaEscrever(api){
      const q=DECK[api.s.dados.i];
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("p",{class:"pergunta-jogo"}, q.p));
      wrap.appendChild(api.el("p",{class:"hint",style:"margin-bottom:10px"},"Invente uma resposta convincente. Quanto mais gente cair, melhor!"));
      const inp=api.el("input",{type:"text",maxlength:"60",placeholder:"Sua resposta falsa…",autocomplete:"off"});
      const b=api.el("button",{class:"btn btn-mint"},"Enviar mentira");
      const fb=api.el("p",{class:"hint",style:"text-align:center;min-height:18px;margin-top:8px"});
      function envia(){
        const v=inp.value.trim();
        if(!v){ inp.focus(); return; }
        if(norm(v)===norm(q.r)){ fb.textContent="Essa é a resposta VERDADEIRA! Inventa outra 😄"; inp.select(); return; }
        api.escrever(v);
      }
      b.addEventListener("click",envia); inp.addEventListener("keydown",e=>{ if(e.key==="Enter") envia(); });
      wrap.appendChild(api.el("div",{class:"campo"}, inp, b)); wrap.appendChild(fb);
      return wrap;
    },
    esperando(api){ return api.el("p",{class:"aviso"},"Esperando a galera inventar as mentiras…"); },

    opcoes(s){
      const q=DECK[s.dados.i];
      const lista=[{k:"__real__", rotulo:q.r}];
      s.order.forEach(id=>{ if(s.textos[id]!=null) lista.push({k:id, rotulo:s.textos[id]}); });
      // embaralha de forma estável na rodada (mesma ordem pra todo mundo)
      const semente=s.round*7919 + s.dados.i*104729;
      return lista.map((o,i)=>({o, r:(semente*(i+13))%9973})).sort((a,b)=>a.r-b.r).map(x=>x.o);
    },
    votam(s){ return s.order.slice(); },
    tituloVotar(s){ return DECK[s.dados.i].p; },

    pontua(s){
      const q=DECK[s.dados.i];
      const ganhos={}, caiuNa={};
      s.order.forEach(id=>{
        const v=s.votos[id]; if(v==null) return;
        if(v==="__real__"){ ganhos[id]=(ganhos[id]||0)+3; s.players[id].score+=3; }
        else if(v!==id && s.players[v]){ // caiu na mentira de alguém
          ganhos[v]=(ganhos[v]||0)+2; s.players[v].score+=2;
          caiuNa[id]=v;
        }
      });
      s.reveal={ real:q.r, pergunta:q.p, ganhos, caiuNa,
        votos:Object.assign({},s.votos), textos:Object.assign({},s.textos) };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"A resposta verdadeira era"));
      wrap.appendChild(api.el("div",{class:"nome-final"}, r.real));
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-bottom:12px"}, r.pergunta));
      const lista=api.el("div",{class:"resultados"});
      api.jogadores().forEach(p=>{
        const v=r.votos[p.id];
        const achou = v==="__real__";
        const enganou = Object.values(r.caiuNa).filter(x=>x===p.id).length;
        const cai = r.caiuNa[p.id] ? s.players[r.caiuNa[p.id]] : null;
        const pts=r.ganhos[p.id]||0;
        lista.appendChild(api.el("div",{class:"res"+(pts>0?" ganhou":"")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick),
          api.el("span",{class:"chute"}, achou?"achou a real ✓":(cai?("caiu na de "+cai.nick):"não votou")),
          pts>0?api.el("span",{class:"ganho"},"+"+pts+(enganou?(" 🎣"+enganou):"")):api.el("span",{class:"ganho zero"},"0")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };
  return { abrir(ctx){ window.Blefe.abrir(ctx, def); } };
})();

/* A PERGUNTA DIFERENTE — todo mundo responde a mesma pergunta, menos uma
   pessoa, que recebeu uma pergunta parecida mas diferente. As respostas
   aparecem juntas e a galera vota em quem ficou fora do tom. */
window.Diferente = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.DIFERENTE_B64))); }catch(e){ DECK=[]; }
  const U=window.Blefe._util;

  const def = {
    id:"diferente", nome:"A Pergunta Diferente", emoji:"🙃", min:4,
    metaPadrao:6, metaMin:3, metaMax:12, total:DECK.length,
    tempoEscrever:60, tempoVotar:50,
    rapidas:["Essa resposta tá estranha… 🤨","Faz sentido pra mim.","Tô perdido aqui."],
    comoJogar:"Todo mundo recebe a mesma pergunta, menos uma pessoa, que recebe uma parecida mas diferente. Todos respondem em uma frase. Depois vocês veem as respostas e votam em quem recebeu a pergunta diferente. Se pegarem, quem acusou certo leva 1. Se o infiltrado escapar, leva 3!",

    novaRodada(s){
      const i=U.sorteiaIdx(s.usadas, DECK.length); s.usadas.push(i);
      const alvoId=s.order[Math.floor(Math.random()*s.order.length)];
      s.dados={ i, alvoId };
    },
    escrevem(s){ return s.order.slice(); },

    telaEscrever(api){
      const s=api.s, par=DECK[s.dados.i];
      const souAlvo = s.dados.alvoId===api.euId;
      const minhaPergunta = souAlvo ? par.b : par.a;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"Sua pergunta (só você vê)"));
      wrap.appendChild(api.el("p",{class:"pergunta-jogo",style:"text-align:center"}, minhaPergunta));
      wrap.appendChild(api.el("p",{class:"hint",style:"margin-bottom:10px"},"Responda em poucas palavras. Cuidado pra não entregar qual pergunta você recebeu!"));
      const inp=api.el("input",{type:"text",maxlength:"60",placeholder:"Sua resposta…",autocomplete:"off"});
      const b=api.el("button",{class:"btn btn-mint"},"Responder");
      function envia(){ const v=inp.value.trim(); if(!v){ inp.focus(); return; } api.escrever(v); }
      b.addEventListener("click",envia); inp.addEventListener("keydown",e=>{ if(e.key==="Enter") envia(); });
      wrap.appendChild(api.el("div",{class:"campo"}, inp, b));
      return wrap;
    },
    esperando(api){ return api.el("p",{class:"aviso"},"Esperando as respostas…"); },

    opcoes(s){
      return s.order.filter(id=>s.players[id]).map(id=>({
        k:id, avatar:s.players[id].avatar,
        rotulo: s.players[id].nick + ": " + (s.textos[id]!=null ? s.textos[id] : "(não respondeu)")
      }));
    },
    votam(s){ return s.order.slice(); },
    tituloVotar(){ return "Quem recebeu a pergunta diferente?"; },

    pontua(s){
      const alvo=s.dados.alvoId;
      const tally={}; Object.values(s.votos).forEach(t=>{ tally[t]=(tally[t]||0)+1; });
      let max=0; Object.values(tally).forEach(v=>{ if(v>max) max=v; });
      const acusados=Object.keys(tally).filter(id=>tally[id]===max);
      const pego = acusados.length===1 && acusados[0]===alvo;
      const ganhos={};
      if(pego){
        Object.keys(s.votos).forEach(v=>{ if(s.votos[v]===alvo && v!==alvo){ ganhos[v]=1; s.players[v].score+=1; } });
      } else if(s.players[alvo]) { ganhos[alvo]=3; s.players[alvo].score+=3; }
      const par=DECK[s.dados.i];
      s.reveal={ alvo, pego, ganhos, votos:Object.assign({},s.votos),
        textos:Object.assign({},s.textos), perguntaGrupo:par.a, perguntaAlvo:par.b };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal, alvo=s.players[r.alvo];
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"A pergunta diferente era de"));
      wrap.appendChild(api.el("div",{class:"eleito",style:"margin:8px 0"}, api.avatarMini(alvo?alvo.avatar:0), api.el("b",{}, alvo?alvo.nick:"?")));
      wrap.appendChild(api.el("div",{class:"nome-final "+(r.pego?"cor-verdade":"cor-mito"),style:"font-size:26px"}, r.pego?"Pego! 🎯":"Escapou! 😈"));
      wrap.appendChild(api.el("div",{class:"papel",style:"margin:10px 0"},
        api.el("div",{class:"eyebrow"},"O grupo respondia"), api.el("p",{style:"font-weight:800;margin-bottom:8px"}, r.perguntaGrupo),
        api.el("div",{class:"eyebrow"},"E o infiltrado respondia"), api.el("p",{style:"font-weight:800"}, r.perguntaAlvo)));
      const lista=api.el("div",{class:"resultados"});
      api.jogadores().forEach(p=>{
        const votou=r.votos[p.id]!=null?s.players[r.votos[p.id]]:null;
        const g=r.ganhos[p.id]>0;
        lista.appendChild(api.el("div",{class:"res"+(g?" ganhou":"")+(p.id===r.alvo?" alvo":"")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick+(p.id===r.alvo?" 🙃":"")),
          api.el("span",{class:"chute"}, votou?("→ "+votou.nick):"não votou"),
          g?api.el("span",{class:"ganho"},"+"+r.ganhos[p.id]):api.el("span",{class:"ganho zero"},"0")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };
  return { abrir(ctx){ window.Blefe.abrir(ctx, def); } };
})();

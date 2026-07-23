/* VERDADE OU MITO — afirmação na tela, vote em segundos, sequência vale combo. */
window.VerdadeMito = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.VM_B64))); }catch(e){ DECK=[]; }
  const sorteia = window.Multi._util.sorteiaIdx;

  const def = {
    id:"verdademito", nome:"Verdade ou Mito", emoji:"🤔", min:2,
    metaLabel:"rodadas", metaPadrao:10, metaMin:5, metaMax:20, tempoResposta:15, total:28,
    comoJogar:"Uma afirmação bizarra aparece. Todo mundo vota Verdade ou Mito em 15 segundos. Cada acerto vale ponto, e acertos seguidos viram combo de até 3!",

    novaRodada(s){ const i=sorteia(s.usadas, DECK.length); s.usadas.push(i); s.dados={i}; },

    // robô do treino solo: acerta ~65% das vezes
    botResponde(s){ const c=DECK[s.dados.i].v; return Math.random()<0.65 ? c : !c; },

    renderPergunta(api){
      const c=DECK[api.s.dados.i];
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("p",{class:"afirmacao"}, c.t));
      if(api.jaRespondi()){
        wrap.appendChild(api.el("div",{class:"resposta-dada"},
          "Você votou: ", api.el("b",{}, api.meuAnswer()?"Verdade":"Mito")));
      } else {
        const bV=api.el("button",{class:"btn opcao verdade"},"✔ Verdade");
        const bM=api.el("button",{class:"btn opcao mito"},"✘ Mito");
        bV.addEventListener("click",()=>api.responder(true));
        bM.addEventListener("click",()=>api.responder(false));
        wrap.appendChild(api.el("div",{class:"opcoes"}, bV, bM));
      }
      return wrap;
    },

    pontua(s){
      const c=DECK[s.dados.i];
      const res=[];
      s.order.forEach(id=>{
        if(s.answers[id]==null) return;
        const acertou = s.answers[id]===c.v;
        const p=s.players[id];
        if(acertou){ p.streak=(p.streak||0)+1; const pts=Math.min(3,p.streak); p.score+=pts; res.push({id, answer:s.answers[id], acertou:true, pts, streak:p.streak}); }
        else { p.streak=0; res.push({id, answer:s.answers[id], acertou:false, pts:0, streak:0}); }
      });
      s.reveal={ correct:c.v, exp:c.e, t:c.t, res };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"A resposta é"));
      wrap.appendChild(api.el("div",{class:"nome-final "+(r.correct?"cor-verdade":"cor-mito")}, r.correct?"Verdade!":"Mito!"));
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-bottom:14px"}, r.exp));
      const lista=api.el("div",{class:"resultados"});
      r.res.sort((a,b)=>b.pts-a.pts).forEach(a=>{
        const p=s.players[a.id];
        lista.appendChild(api.el("div",{class:"res"+(a.acertou?" ganhou":" errou")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick),
          api.el("span",{class:"chute"}, a.answer?"Verdade":"Mito"),
          a.acertou?api.el("span",{class:"ganho"}, "+"+a.pts+(a.streak>=2?(" 🔥"+a.streak):"")):api.el("span",{class:"ganho zero"},"✘")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };

  return { abrir(ctx){ window.Multi.abrir(ctx, def); } };
})();

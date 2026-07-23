/* PALPITE — pergunta numérica, cada um chuta, o mais próximo pontua. */
window.Palpite = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.PALPITE_B64))); }catch(e){ DECK=[]; }
  const sorteia = window.Multi._util.sorteiaIdx;

  const def = {
    id:"palpite", nome:"Palpite", emoji:"🎯", min:2,
    metaLabel:"rodadas", metaPadrao:8, metaMin:3, metaMax:15, tempoResposta:35, total:78,
    rapidas:["Chutei alto demais.","Essa eu cravei! 🎯","Ninguém sabe isso, né?"],
    comoJogar:"Aparece uma pergunta com resposta em número. Cada um chuta um valor no seu celular. O palpite mais perto leva 3 pontos, e quem crava na mosca leva 5!",

    novaRodada(s){ const i=sorteia(s.usadas, DECK.length); s.usadas.push(i); s.dados={i}; },

    // robô do treino solo: chuta perto da resposta, com erro de até 25%
    botResponde(s){ const c=DECK[s.dados.i].a; const err=(Math.random()*0.5-0.25); return Math.max(0, Math.round(c*(1+err))); },

    renderPergunta(api){
      const q=DECK[api.s.dados.i];
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("p",{class:"pergunta-jogo"}, q.q));
      if(api.jaRespondi()){
        wrap.appendChild(api.el("div",{class:"resposta-dada"},
          "Seu palpite: ", api.el("b",{}, String(api.meuAnswer())+(q.u?(" "+q.u):""))));
      } else {
        if(q.u) wrap.appendChild(api.el("p",{class:"hint",style:"margin-bottom:8px"}, "Responda em "+q.u+"."));
        const inp=api.el("input",{type:"number",placeholder:"Seu número",inputmode:"numeric",autocomplete:"off"});
        const b=api.el("button",{class:"btn btn-mint"},"Enviar palpite");
        b.addEventListener("click",()=>{ const v=inp.value.trim(); if(v===""){ inp.focus(); return; } api.responder(Number(v)); });
        inp.addEventListener("keydown",e=>{ if(e.key==="Enter") b.click(); });
        wrap.appendChild(api.el("div",{class:"campo"}, inp, b));
      }
      return wrap;
    },

    pontua(s){
      const q=DECK[s.dados.i], c=q.a;
      const ans=s.order.filter(id=>s.answers[id]!=null).map(id=>({
        id, v:Number(s.answers[id]), dist:Math.abs(Number(s.answers[id])-c)
      }));
      let melhor=Infinity; ans.forEach(a=>{ if(a.dist<melhor) melhor=a.dist; });
      ans.forEach(a=>{ a.pts=(a.dist===melhor)?(a.dist===0?5:3):0; s.players[a.id].score+=a.pts; });
      ans.sort((x,y)=>x.dist-y.dist);
      s.reveal={ correct:c, u:q.u, q:q.q, ranking:ans };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"Resposta certa"));
      wrap.appendChild(api.el("div",{class:"nome-final"}, String(r.correct)+(r.u?(" "+r.u):"")));
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-bottom:14px"}, r.q));
      const lista=api.el("div",{class:"resultados"});
      r.ranking.forEach((a,idx)=>{
        const p=s.players[a.id];
        lista.appendChild(api.el("div",{class:"res"+(a.pts>0?" ganhou":"")},
          api.el("span",{class:"pos"},(idx+1)+"º"),
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick),
          api.el("span",{class:"chute"}, String(a.v)),
          a.pts>0?api.el("span",{class:"ganho"},"+"+a.pts):api.el("span",{class:"ganho zero"},"0")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };

  return { abrir(ctx){ window.Multi.abrir(ctx, def); } };
})();

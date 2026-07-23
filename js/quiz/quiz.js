/* QUIZ RELÂMPAGO — pergunta com 4 opções, quem acerta pontua; mais rápido leva bônus. */
window.Quiz = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.QUIZ_B64))); }catch(e){ DECK=[]; }
  const sorteia = window.Multi._util.sorteiaIdx;
  const LETRAS=["A","B","C","D"];

  const def = {
    id:"quiz", nome:"Quiz Relâmpago", emoji:"⚡", min:2,
    metaLabel:"rodadas", metaPadrao:10, metaMin:5, metaMax:20, tempoResposta:15,
    comoJogar:"Uma pergunta com 4 opções. Acertou vale 2 pontos, e quem acerta mais rápido leva bônus de velocidade. Quem tem mais pontos no fim vence!",

    novaRodada(s){ const i=sorteia(s.usadas, DECK.length); s.usadas.push(i); s.dados={i, t0:Date.now()}; },

    renderPergunta(api){
      const s=api.s, q=DECK[s.dados.i];
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("p",{class:"pergunta-jogo"}, q.q));
      if(api.jaRespondi()){
        const meu=api.meuAnswer();
        wrap.appendChild(api.el("div",{class:"resposta-dada"},
          "Você marcou: ", api.el("b",{}, LETRAS[meu.o]+". "+q.o[meu.o])));
      } else {
        const grade=api.el("div",{class:"alternativas"});
        q.o.forEach((op,idx)=>{
          const b=api.el("button",{class:"alt",type:"button"},
            api.el("span",{class:"letra"}, LETRAS[idx]), api.el("span",{class:"txt"}, op));
          b.addEventListener("click",()=>api.responder({o:idx, t:Date.now()}));
          grade.appendChild(b);
        });
        wrap.appendChild(grade);
      }
      return wrap;
    },

    pontua(s){
      const q=DECK[s.dados.i], cor=q.c;
      // acertadores ordenados por rapidez ganham bônus (1º +2, 2º +1)
      const certos=[];
      s.order.forEach(id=>{
        const a=s.answers[id]; if(a==null) return;
        if(a.o===cor) certos.push({id, t:a.t});
      });
      certos.sort((x,y)=>x.t-y.t);
      const res=[];
      s.order.forEach(id=>{
        const a=s.answers[id]; if(a==null){ res.push({id, o:null, acertou:false, pts:0}); return; }
        const acertou=a.o===cor;
        let pts=0;
        if(acertou){ pts=2; const pos=certos.findIndex(c=>c.id===id); if(pos===0) pts+=2; else if(pos===1) pts+=1; }
        s.players[id].score+=pts;
        res.push({id, o:a.o, acertou, pts, rapido:acertou&&certos[0]&&certos[0].id===id});
      });
      res.sort((a,b)=>b.pts-a.pts);
      s.reveal={ cor, q:q.q, opts:q.o, res };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"Resposta certa"));
      wrap.appendChild(api.el("div",{class:"nome-final",style:"font-size:24px"}, LETRAS[r.cor]+". "+r.opts[r.cor]));
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-bottom:14px"}, r.q));
      const lista=api.el("div",{class:"resultados"});
      r.res.forEach(a=>{
        const p=s.players[a.id];
        lista.appendChild(api.el("div",{class:"res"+(a.acertou?" ganhou":" errou")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick + (a.rapido?" ⚡":"")),
          api.el("span",{class:"chute"}, a.o!=null?LETRAS[a.o]:"—"),
          a.pts>0?api.el("span",{class:"ganho"},"+"+a.pts):api.el("span",{class:"ganho zero"}, a.acertou?"0":"✘")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };

  return { abrir(ctx){ window.Multi.abrir(ctx, def); } };
})();

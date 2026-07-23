/* PÕE NA ORDEM — 5 itens embaralhados, cada um ordena no seu celular. */
window.Ordem = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.ORDEM_B64))); }catch(e){ DECK=[]; }
  const sorteia = window.Multi._util.sorteiaIdx;

  const def = {
    id:"ordem", nome:"Põe na Ordem", emoji:"📊", min:2,
    metaLabel:"rodadas", metaPadrao:8, metaMin:4, metaMax:15, tempoResposta:55, total:DECK.length,
    rapidas:["Troquei tudo de lugar.","Essa ordem tá errada! 🤨","Acertei na sorte."],
    comoJogar:"Aparecem 5 itens embaralhados e um critério. Cada um monta a ordem no seu celular. Cada posição certa vale 1 ponto, e acertar as 5 vale 2 de bônus!",

    novaRodada(s){
      const i=sorteia(s.usadas, DECK.length); s.usadas.push(i);
      const ord=[0,1,2,3,4];
      for(let k=ord.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); const tmp=ord[k]; ord[k]=ord[j]; ord[j]=tmp; }
      s.dados={ i, ord };
    },

    // robô do treino solo: quase acerta, troca 1 ou 2 pares de lugar
    botResponde(){
      const a=[0,1,2,3,4];
      const trocas=1+Math.floor(Math.random()*2);
      for(let k=0;k<trocas;k++){ const i=Math.floor(Math.random()*5), j=Math.floor(Math.random()*5); const t=a[i]; a[i]=a[j]; a[j]=t; }
      return a;
    },

    renderPergunta(api){
      const s=api.s, q=DECK[s.dados.i], disp=s.dados.ord;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("p",{class:"pergunta-jogo"}, q.t+":"));
      if(api.jaRespondi()){
        const mine=api.meuAnswer();
        wrap.appendChild(api.el("div",{class:"resposta-dada"},"Ordem enviada!"));
        const box=api.el("div",{class:"ordem-escolhida",style:"margin-top:10px"});
        mine.forEach((id,k)=> box.appendChild(api.el("div",{class:"ordem-item"}, api.el("span",{class:"num"},(k+1)+"º"), api.el("span",{}, q.i[id]))));
        wrap.appendChild(box);
        return wrap;
      }
      let escolha=[];
      const area=api.el("div",{}); wrap.appendChild(area);
      function pinta(){
        area.replaceChildren();
        const esc=api.el("div",{class:"ordem-escolhida"});
        escolha.forEach((id,k)=>{
          const b=api.el("button",{class:"ordem-item",type:"button",title:"Remover"},
            api.el("span",{class:"num"},(k+1)+"º"), api.el("span",{}, q.i[id]));
          b.addEventListener("click",()=>{ escolha.splice(k,1); pinta(); });
          esc.appendChild(b);
        });
        for(let k=escolha.length;k<5;k++)
          esc.appendChild(api.el("div",{class:"ordem-item vazio"}, api.el("span",{class:"num"},(k+1)+"º"), api.el("span",{class:"ph"},"toque um item")));
        area.appendChild(esc);
        const pool=api.el("div",{class:"ordem-pool"});
        disp.filter(id=>!escolha.includes(id)).forEach(id=>{
          const b=api.el("button",{class:"pool-item",type:"button"}, q.i[id]);
          b.addEventListener("click",()=>{ if(escolha.length<5){ escolha.push(id); pinta(); } });
          pool.appendChild(b);
        });
        area.appendChild(pool);
        if(escolha.length===5){
          const conf=api.el("button",{class:"btn btn-mint larga",style:"margin-top:12px"},"Confirmar ordem");
          conf.addEventListener("click",()=>api.responder(escolha.slice()));
          area.appendChild(conf);
        } else {
          area.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-top:10px"},"Toque nos itens na ordem certa. Toque um escolhido pra tirar."));
        }
      }
      pinta();
      return wrap;
    },

    pontua(s){
      const q=DECK[s.dados.i];
      const res=[];
      s.order.forEach(id=>{
        const a=s.answers[id];
        if(a==null){ res.push({id, acertos:0, pts:0, ans:null}); return; }
        let acertos=0; for(let k=0;k<5;k++) if(a[k]===k) acertos++;
        let pts=acertos; if(acertos===5) pts+=2;
        s.players[id].score+=pts;
        res.push({id, acertos, pts, ans:a});
      });
      res.sort((x,y)=>y.pts-x.pts);
      s.reveal={ correta:q.i, criterio:q.t, res };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"Ordem certa"));
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-bottom:8px"}, r.criterio));
      const box=api.el("div",{class:"ordem-escolhida",style:"margin-bottom:14px"});
      r.correta.forEach((nome,k)=> box.appendChild(api.el("div",{class:"ordem-item certa"}, api.el("span",{class:"num"},(k+1)+"º"), api.el("span",{}, nome))));
      wrap.appendChild(box);
      const lista=api.el("div",{class:"resultados"});
      r.res.forEach(a=>{
        const p=s.players[a.id];
        lista.appendChild(api.el("div",{class:"res"+(a.pts>0?" ganhou":"")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick),
          api.el("span",{class:"chute"}, a.acertos+"/5"+(a.acertos===5?" 🎯":"")),
          a.pts>0?api.el("span",{class:"ganho"},"+"+a.pts):api.el("span",{class:"ganho zero"},"0")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };

  return { abrir(ctx){ window.Multi.abrir(ctx, def); } };
})();

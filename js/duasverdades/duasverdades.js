/* DUAS VERDADES E UMA MENTIRA — a cada rodada uma pessoa escreve três
   coisas sobre si: duas verdadeiras e uma mentira. O resto tenta achar a
   mentira. Quem descobre pontua; quem enganou também. */
window.DuasVerdades = (function(){
  let TEMAS=[];
  try{ TEMAS=JSON.parse(decodeURIComponent(atob(window.TEMAS_B64))); }catch(e){ TEMAS=[]; }
  const U=window.Blefe._util;

  const def = {
    id:"duasverdades", nome:"2 Verdades 1 Mentira", emoji:"🤥", min:3,
    metaPadrao:6, metaMin:3, metaMax:14, total:TEMAS.length,
    tempoEscrever:100, tempoVotar:50,
    rapidas:["Essa é mentira, óbvio. 😏","Não acredito nisso!","Conta essa história direito."],
    comoJogar:"A cada rodada uma pessoa escreve três coisas sobre ela: duas verdadeiras e uma mentira. O resto vota em qual é a mentira. Quem descobre leva 2, e quem escreveu leva 1 por pessoa enganada. O autor gira a cada rodada!",

    novaRodada(s){
      const i=U.sorteiaIdx(s.usadas, TEMAS.length); s.usadas.push(i);
      const anterior = s.dados && s.dados.autorId;
      const idx = anterior ? (s.order.indexOf(anterior)+1)%s.order.length : 0;
      s.dados={ i, autorId: s.order[idx] || s.order[0] };
    },
    escrevem(s){ return [s.dados.autorId]; },

    telaEscrever(api){
      const s=api.s;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"Sua vez! Tema sugerido"));
      wrap.appendChild(api.el("p",{class:"pergunta-jogo",style:"text-align:center"}, TEMAS[s.dados.i]));
      wrap.appendChild(api.el("p",{class:"hint",style:"margin-bottom:10px"},"Escreva três coisas sobre você e marque qual é a MENTIRA. O tema é só uma sugestão, pode fugir dele."));
      const campos=[0,1,2].map(k=>api.el("input",{type:"text",maxlength:"80",placeholder:"Afirmação "+(k+1),autocomplete:"off"}));
      let mentira=null;
      const marcas=[];
      const box=api.el("div",{class:"tres-afirmacoes"});
      campos.forEach((inp,k)=>{
        const m=api.el("button",{class:"marca-mentira",type:"button",title:"Marcar como mentira"},"mentira");
        m.addEventListener("click",()=>{ mentira=k; marcas.forEach((x,j)=>x.classList.toggle("on", j===k)); });
        marcas.push(m);
        box.appendChild(api.el("div",{class:"linha-afirm"}, inp, m));
      });
      wrap.appendChild(box);
      const fb=api.el("p",{class:"hint",style:"text-align:center;min-height:18px;margin-top:8px"});
      const b=api.el("button",{class:"btn btn-mint larga",style:"margin-top:10px"},"Enviar as três");
      b.addEventListener("click",()=>{
        const t=campos.map(c=>c.value.trim());
        if(t.some(x=>!x)){ fb.textContent="Preencha as três afirmações."; return; }
        if(mentira===null){ fb.textContent="Marque qual delas é a mentira."; return; }
        api.escrever({ t, m:mentira });
      });
      wrap.appendChild(b); wrap.appendChild(fb);
      return wrap;
    },
    esperando(api){
      const a=api.s.players[api.s.dados.autorId];
      return api.el("div",{style:"text-align:center"},
        api.el("div",{style:"font-size:44px;margin-bottom:6px"},"🤥"),
        api.el("h2",{style:"font-weight:600"}, (a?a.nick:"Alguém")+" está escrevendo…"),
        api.el("p",{class:"hint",style:"margin-top:8px"},"Prepare-se pra achar a mentira!"));
    },

    opcoes(s){
      const d=s.textos[s.dados.autorId];
      if(!d || !d.t) return [];
      return d.t.map((txt,k)=>({ k:String(k), rotulo:txt }));
    },
    votam(s){ return s.order.filter(id=>id!==s.dados.autorId); },
    tituloVotar(s){
      const a=s.players[s.dados.autorId];
      return "Qual dessas é a mentira de "+(a?a.nick:"?")+"?";
    },

    pontua(s){
      const autor=s.dados.autorId, d=s.textos[autor]||{t:["","",""],m:0};
      const ganhos={}; let enganados=0, acertaram=0;
      s.order.forEach(id=>{
        if(id===autor) return;
        const v=s.votos[id]; if(v==null) return;
        if(Number(v)===d.m){ ganhos[id]=2; s.players[id].score+=2; acertaram++; }
        else enganados++;
      });
      if(enganados>0 && s.players[autor]){ ganhos[autor]=enganados; s.players[autor].score+=enganados; }
      s.reveal={ autor, afirmacoes:d.t, mentira:d.m, ganhos, enganados, acertaram, votos:Object.assign({},s.votos) };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal, autor=s.players[r.autor];
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"A mentira de "+(autor?autor.nick:"?")+" era"));
      const box=api.el("div",{class:"tres-afirmacoes",style:"margin:10px 0 14px"});
      r.afirmacoes.forEach((t,k)=>{
        const eMentira=k===r.mentira;
        box.appendChild(api.el("div",{class:"afirm-res"+(eMentira?" mentira":" verdade")},
          api.el("span",{class:"selo-af"}, eMentira?"MENTIRA":"verdade"),
          api.el("span",{}, t)));
      });
      wrap.appendChild(box);
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin-bottom:10px"},
        r.acertaram+" acertaram · "+r.enganados+" caíram"));
      const lista=api.el("div",{class:"resultados"});
      api.jogadores().forEach(p=>{
        const ehAutor=p.id===r.autor;
        const v=r.votos[p.id];
        const g=r.ganhos[p.id]||0;
        lista.appendChild(api.el("div",{class:"res"+(g>0?" ganhou":"")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick+(ehAutor?" 🤥":"")),
          api.el("span",{class:"chute"}, ehAutor?"autor":(v!=null?("votou na "+(Number(v)+1)+"ª"):"não votou")),
          g>0?api.el("span",{class:"ganho"},"+"+g):api.el("span",{class:"ganho zero"},"0")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };
  return { abrir(ctx){ window.Blefe.abrir(ctx, def); } };
})();

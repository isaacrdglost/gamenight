/* O ESPIÃO — todos sabem o local secreto, menos o espião. Descubram quem é! */
window.Espiao = (function(){
  let LOCAIS=[];
  try{ LOCAIS=JSON.parse(decodeURIComponent(atob(window.ESPIAO_B64))); }catch(e){ LOCAIS=[]; }
  const U=window.Deducao._util;

  const def = {
    id:"espiao", nome:"O Espião", emoji:"🕶️", min:3,
    metaPadrao:5, metaMin:3, metaMax:12, total:24,
    textoAlvo:"espião", papelCaption:"Local secreto",
    comoJogar:"Todo mundo recebe o mesmo local, menos o espião, que não sabe onde é. Façam perguntas uns aos outros sobre o local sem entregar de graça. O espião tenta se passar por quem sabe. No fim, votem em quem é o espião!",

    montaRodada(s){
      const i=U.sorteiaIdx(s.usadas, LOCAIS.length); s.usadas.push(i);
      const alvoId=U.sorteiaJogador(s.order);
      s.rodada={ idx:i, alvoId };
    },
    meuPapel(s, myId){
      if(myId===s.rodada.alvoId){
        return { titulo:"Você é o ESPIÃO 🕶️", sub:"Você NÃO sabe o local. Preste atenção nas perguntas e finja que sabe. Se descobrir o local, melhor ainda!", alerta:true };
      }
      return { titulo:LOCAIS[s.rodada.idx], sub:"Esse é o local. Faça perguntas espertas e desmascare o espião sem entregar onde vocês estão.", alerta:false };
    },
    segredoReveal(s){ return "O local era “"+LOCAIS[s.rodada.idx]+"”."; }
  };

  return { abrir(ctx){ window.Deducao.abrir(ctx, def); } };
})();

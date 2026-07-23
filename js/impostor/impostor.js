/* IMPOSTOR — todos recebem a mesma palavra, menos o impostor (recebe outra parecida). */
window.Impostor = (function(){
  let DECK=[];
  try{ DECK=JSON.parse(decodeURIComponent(atob(window.IMPOSTOR_B64))); }catch(e){ DECK=[]; }
  const U=window.Deducao._util;

  const def = {
    id:"impostor", nome:"Impostor", emoji:"🎭", min:3,
    metaPadrao:5, metaMin:3, metaMax:12, total:86,
    rapidas:["Não fui eu, juro. 😇","Essa dica tá suspeita.","Tô de olho em você."],
    textoAlvo:"impostor", papelCaption:"Sua palavra secreta",
    comoJogar:"Todo mundo recebe a mesma palavra, menos o impostor, que recebe uma parecida. Cada um dá uma dica em voz alta sobre a sua palavra. Depois, votem em quem vocês acham que é o impostor!",

    montaRodada(s){
      const i=U.sorteiaIdx(s.usadas, DECK.length); s.usadas.push(i);
      const alvoId=U.sorteiaJogador(s.order);
      s.rodada={ idx:i, alvoId };
    },
    meuPapel(s, myId){
      const par=DECK[s.rodada.idx];
      if(myId===s.rodada.alvoId){
        return { titulo:par.b, sub:"("+par.c+") — você é o IMPOSTOR! Essa é a sua palavra de disfarce. Dê dicas convincentes sem entregar que a sua é diferente.", alerta:true };
      }
      return { titulo:par.a, sub:"("+par.c+") — essa é a palavra do grupo. Dê uma dica sutil e desmascare o impostor.", alerta:false };
    },
    segredoReveal(s){
      const par=DECK[s.rodada.idx];
      return "A palavra do grupo era “"+par.a+"”. O impostor tinha “"+par.b+"”.";
    }
  };

  return { abrir(ctx){ window.Deducao.abrir(ctx, def); } };
})();

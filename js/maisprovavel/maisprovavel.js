/* MAIS PROVÁVEL — "quem do grupo é mais provável de...?" Vote numa pessoa da sala. */
window.MaisProvavel = (function(){
  const PROMPTS = [
    "dormir na balada","chegar atrasado no rolê","virar famoso na internet",
    "gastar tudo em comida","chorar assistindo um filme","esquecer o aniversário de alguém",
    "ganhar na loteria e sumir","adotar dez gatos","brigar por causa de futebol",
    "cantar no karaokê sem vergonha nenhuma","perder o celular numa noite","responder mensagem depois de três dias",
    "comer o último pedaço de pizza sem perguntar","viajar o mundo sozinho","se apaixonar nas férias",
    "contar uma mentira e não segurar o riso","ficar rico com uma ideia maluca","dançar em cima da mesa",
    "cair num golpe do Pix","maratonar uma série inteira numa noite","esquecer onde estacionou o carro",
    "falar dormindo","tirar foto de tudo que come","ser o último a sair da festa",
    "fazer amizade com estranhos na fila","surtar antes de uma prova","comprar algo caro por impulso",
    "ir pro trabalho de pijama sem perceber","ganhar um reality show","ter um talento secreto",
    "se perder mesmo usando o GPS","rir na hora errada","dar o melhor conselho amoroso",
    "virar chef de cozinha","esquecer o nome de alguém na hora de apresentar","abraçar todo mundo quando bebe",
    "começar mil hobbies e não terminar nenhum","ser o mais dramático do grupo","acordar cedo no fim de semana à toa",
    "mandar mensagem pra ex de madrugada","furar fila sem perceber","discutir com atendente de telemarketing",
    "chorar de rir sozinho no celular","esquecer a comida no fogo","comprar planta e deixar morrer",
    "virar vegetariano por uma semana","postar indireta nas redes","dormir no cinema",
    "perder o voo por dormir demais","cantar no chuveiro alto demais","dar spoiler sem querer",
    "comprar coisa inútil na madrugada","levar bolo e achar graça","fazer amizade com o cachorro antes do dono",
    "esquecer o guarda-chuva em todo lugar","falar mal do trânsito todo dia","virar a noite jogando",
    "sumir do grupo por meses","responder áudio de 5 minutos com 'kkk'","tirar print de conversa",
    "ser o primeiro a chegar na festa","reclamar do preço e comprar mesmo assim","chorar em propaganda",
    "dar carona pra todo mundo","levar comida escondida pro cinema","dormir em qualquer lugar",
    "perder as chaves dentro de casa","esquecer aniversário de namoro","comprar ingresso e não ir",
    "fazer promessa de ano novo e desistir em janeiro","brigar por causa de série","comer no escuro pra ninguém ver",
    "ligar por engano pro chefe","achar que sabe cantar","fazer dieta e desistir no almoço",
    "virar influencer sem querer","chegar de última hora e resolver tudo","gastar em jogo de celular",
    "organizar viagem que nunca acontece","perder a paciência no trânsito","achar defeito em restaurante caro",
    "fazer todo mundo rir sem tentar","esquecer de responder e-mail importante","ficar amigo do garçom",
    "filmar tudo em vez de curtir","dar conselho e não seguir","assumir a playlist da festa",
    "comprar roupa e nunca usar","atrasar e culpar o trânsito","adotar sotaque de outro lugar em uma semana",
    "ser o primeiro a dormir na viagem","esquecer nome de quem acabou de conhecer","virar fã de algo do nada",
    "comer sobremesa antes do almoço","ficar sem bateria no pior momento","reclamar do frio o inverno inteiro",
    "chorar vendo vídeo de bicho","prometer academia e não ir","achar que a comida está sempre sem sal",
    "dar risada nervosa em situação séria","perder documento importante","fazer maratona de compras online",
    "virar especialista em assunto aleatório","adiar tudo pra segunda-feira","fazer amizade em fila de banheiro",
    "reclamar de filme e assistir até o fim","acordar com fome de madrugada","gastar meia hora escolhendo o que assistir",
    "cantar música errada com confiança","esquecer onde guardou algo importante","virar o rei do churrasco",
    "levar a sério jogo de tabuleiro","sumir na hora de dividir a conta","perder aposta boba",
    "fazer piada em hora errada","chegar em casa e deitar de roupa","comprar comida demais no delivery",
    "dormir com a TV ligada","encontrar conhecido em outra cidade","dar nome pro carro",
    "achar que o time vai ganhar sempre","chorar de saudade da infância","fazer teste de personalidade e acreditar",
    "virar o motorista da rua"
  ];
  const sorteia = window.Multi._util.sorteiaIdx;

  const def = {
    id:"maisprovavel", nome:"Mais Provável", emoji:"👥", min:3,
    metaLabel:"rodadas", metaPadrao:8, metaMin:4, metaMax:15, tempoResposta:25, total:124,
    rapidas:["Óbvio que é essa pessoa.","Injustiça pura! 😤","Tô até ofendido."],
    comoJogar:"Aparece um 'quem é mais provável de...?'. Cada um vota numa pessoa da sala. Quem votar na pessoa mais escolhida pela galera ganha 2 pontos!",

    novaRodada(s){ const i=sorteia(s.usadas, PROMPTS.length); s.usadas.push(i); s.dados={i}; },

    renderPergunta(api){
      const s=api.s;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("p",{class:"pergunta-jogo"}, "Quem é mais provável de "+PROMPTS[s.dados.i]+"?"));
      if(api.jaRespondi()){
        const alvo=s.players[api.meuAnswer()];
        wrap.appendChild(api.el("div",{class:"resposta-dada"},
          "Você votou em ", api.el("b",{}, alvo?alvo.nick:"alguém")));
      } else {
        const grade=api.el("div",{class:"votar"});
        api.jogadores().forEach(p=>{
          const b=api.el("button",{class:"voto",type:"button"}, api.avatarMini(p.avatar), api.el("span",{}, p.nick));
          b.addEventListener("click",()=>api.responder(p.id));
          grade.appendChild(b);
        });
        wrap.appendChild(grade);
      }
      return wrap;
    },

    pontua(s){
      const votos={}; // alvo -> qtd
      const quemVotou={}; // votante -> alvo
      s.order.forEach(id=>{ const alvo=s.answers[id]; if(alvo!=null){ votos[alvo]=(votos[alvo]||0)+1; quemVotou[id]=alvo; } });
      let max=0; Object.values(votos).forEach(v=>{ if(v>max) max=v; });
      const campeoes=Object.keys(votos).filter(a=>votos[a]===max);
      const ganhos={};
      Object.keys(quemVotou).forEach(id=>{
        if(campeoes.includes(quemVotou[id])){ ganhos[id]=2; s.players[id].score+=2; }
      });
      s.reveal={ votos, quemVotou, campeoes, max, ganhos, prompt:PROMPTS[s.dados.i] };
    },

    renderReveal(api){
      const s=api.s, r=s.reveal;
      const wrap=api.el("div",{});
      wrap.appendChild(api.el("div",{class:"eyebrow",style:"text-align:center"},"A galera elegeu"));
      const linha=api.el("div",{class:"eleitos"});
      r.campeoes.forEach(id=>{ const p=s.players[id]; if(p){ linha.appendChild(api.el("div",{class:"eleito"}, api.avatarMini(p.avatar), api.el("b",{}, p.nick))); } });
      wrap.appendChild(linha);
      wrap.appendChild(api.el("p",{class:"hint",style:"text-align:center;margin:6px 0 14px"}, "mais provável de "+r.prompt+" ("+r.max+" votos)"));
      const lista=api.el("div",{class:"resultados"});
      api.jogadores().forEach(p=>{
        const alvoId=r.quemVotou[p.id];
        const alvo=alvoId!=null?s.players[alvoId]:null;
        const ganhou=r.ganhos[p.id]>0;
        lista.appendChild(api.el("div",{class:"res"+(ganhou?" ganhou":"")},
          api.avatarMini(p.avatar),
          api.el("span",{class:"nm"}, p.nick),
          api.el("span",{class:"chute"}, alvo?("→ "+alvo.nick):"—"),
          ganhou?api.el("span",{class:"ganho"},"+2"):api.el("span",{class:"ganho zero"},"0")));
      });
      wrap.appendChild(lista);
      return wrap;
    }
  };

  return { abrir(ctx){ window.Multi.abrir(ctx, def); } };
})();

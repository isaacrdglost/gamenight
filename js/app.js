window.App = (function(){
  const el = (tag,attrs={},...kids) => {
    const n = document.createElement(tag);
    for(const k in attrs){
      if(k==="class") n.className = attrs[k];
      else if(k==="html") n.innerHTML = attrs[k];
      else if(k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(c => n.appendChild(typeof c==="string"?document.createTextNode(c):c));
    return n;
  };
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  /* ---------- storage (Artifacts window.storage OU localStorage) ---------- */
  async function guardar(chave,valor){
    const d = JSON.stringify(valor);
    try{ if(window.storage&&window.storage.set) await window.storage.set(chave,d); else localStorage.setItem(chave,d); }catch(e){}
  }
  async function ler(chave){
    try{
      let b=null;
      if(window.storage&&window.storage.get){ const r=await window.storage.get(chave); b=r&&r.value; }
      else b=localStorage.getItem(chave);
      return b?JSON.parse(b):null;
    }catch(e){ return null; }
  }

  /* ---------- perfil do usuário ---------- */
  let perfil = null; // {nick, avatar, id}
  function avatarPorId(id){ return (window.AVATARS||[]).find(a=>a.id===id) || window.AVATARS[0]; }
  function novoId(){ return "u-"+Math.random().toString(36).slice(2,9); }

  const raiz = () => document.getElementById("app");

  /* ---------- convite por link (?sala=ABCD) ---------- */
  let salaConvite = null;
  function leConvite(){
    try{
      const c = new URLSearchParams(location.search).get("sala");
      if(c && /^[A-Za-z0-9]{4,6}$/.test(c)) salaConvite = c.toUpperCase();
    }catch(e){}
  }

  /* ================= HOME / LOGIN ================= */
  function telaHome(primeiraVez){
    const av = window.AVATARS;
    let escolhido = perfil ? perfil.avatar : av[Math.floor(Math.random()*av.length)].id;

    const grid = el("div",{class:"avatares"});
    av.forEach(a=>{
      const b = el("button",{type:"button","aria-pressed":String(a.id===escolhido),"aria-label":a.nome,html:a.svg});
      b.addEventListener("click",()=>{
        escolhido=a.id;
        grid.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", String(x===b)));
      });
      grid.appendChild(b);
    });

    const nome = el("input",{type:"text",id:"nk",maxlength:"16",placeholder:"Seu nick",autocomplete:"off",value:perfil?perfil.nick:""});
    const salvar = el("button",{class:"btn",style:"margin-top:20px"}, primeiraVez?"Jogar!":"Salvar");
    salvar.addEventListener("click", async ()=>{
      const nk = nome.value.trim();
      if(!nk){ nome.focus(); return; }
      perfil = { nick:nk, avatar:escolhido, id: perfil?perfil.id:novoId() };
      await guardar("app:perfil", perfil);
      // veio por link de convite? cai direto na sala
      if(salaConvite) abrirJogo("perfil");
      else telaEstante();
    });
    nome.addEventListener("keydown",e=>{ if(e.key==="Enter") salvar.click(); });

    const voltar = perfil ? el("button",{class:"btn-ghost", onclick:()=>telaEstante()},"Voltar") : null;

    raiz().replaceChildren(
      el("header", primeiraVez?{}:{class:"compacto"},
        primeiraVez
          ? el("div",{},
              el("div",{class:"eyebrow"},"Salão de Jogos"),
              el("h1",{html:'Bora <em>jogar</em>?'}),
              el("p",{class:"sub"}, salaConvite
                ? "Você foi convidado pra uma sala! Escolha seu nick e um personagem pra entrar."
                : "Escolha um nick e um personagem. Fica salvo neste aparelho."))
          : [el("div",{}, el("div",{class:"eyebrow"},"Perfil"), el("h1",{},"Editar")), voltar]
      ),
      el("div",{class:"card"},
        el("label",{class:"rot",for:"nk"},"Nick"), nome,
        el("div",{class:"rot",style:"margin-top:22px"},"Escolha seu personagem"),
        grid
      ),
      salvar
    );
  }

  /* ================= ESTANTE DE JOGOS ================= */
  const JOGOS = [
    { id:"perfil", nome:"Perfil", emoji:"🕵️", desc:"Adivinhe a personalidade pelas dicas. Vermelho contra Azul, primeiro a fazer 50 pontos vence!", pronto:true },
    { id:"palpite", nome:"Palpite", emoji:"🎯", desc:"Pergunta numérica, cada um chuta. O palpite mais próximo leva os pontos!", pronto:false },
    { id:"espiao", nome:"O Espião", emoji:"🕶️", desc:"Todo mundo sabe o lugar secreto, menos um. Descubram quem é o espião!", pronto:false },
    { id:"quiz", nome:"Quiz Relâmpago", emoji:"⚡", desc:"Perguntas rápidas, quem responde certo primeiro pontua mais.", pronto:false }
  ];

  function telaEstante(){
    const a = avatarPorId(perfil.avatar);
    const lista = el("div",{class:"jogos"});
    JOGOS.forEach(j=>{
      const card = el("button",{class:"jogo"+(j.pronto?"":" soon"), type:"button"},
        el("div",{class:"emoji"}, j.emoji),
        el("div",{class:"info"}, el("h2",{},j.nome), el("p",{},j.desc)),
        el("span",{class:"selo"}, j.pronto?"Jogar":"Em breve")
      );
      if(j.pronto) card.addEventListener("click",()=>abrirJogo(j.id));
      lista.appendChild(card);
    });

    raiz().replaceChildren(
      el("header",{class:"compacto"},
        el("div",{class:"saudacao"},
          el("div",{class:"av",html:a.svg}),
          el("div",{}, el("div",{class:"eyebrow"},"Olá"), el("h1",{style:"font-size:26px"}, perfil.nick))
        ),
        el("button",{class:"btn-ghost", onclick:()=>telaHome(false)},"Editar")
      ),
      el("div",{}, el("div",{class:"eyebrow",style:"margin-bottom:2px"},"Seus jogos"), lista),
      el("footer",{html:'Salão de Jogos · novos jogos entram na estante em breve.'})
    );
  }

  function abrirJogo(id){
    if(id==="perfil"){
      const joinCode = salaConvite; salaConvite = null;
      window.Perfil.abrir({ perfil, guardar, ler, voltar:telaEstante, el, esc, avatarPorId, joinCode });
    }
  }

  /* ================= BOOT ================= */
  async function iniciar(){
    leConvite();
    perfil = await ler("app:perfil");
    if(perfil && !perfil.id){ perfil.id = novoId(); await guardar("app:perfil", perfil); }
    if(perfil && perfil.nick){
      if(salaConvite) abrirJogo("perfil");
      else telaEstante();
    } else {
      telaHome(true);
    }
  }

  return { iniciar, el, esc, guardar, ler };
})();

/* ====================================================================
   SOUNDBOARD — efeitos sonoros zoados, sintetizados no navegador
   (WebAudio, sem arquivo externo). Botõezinhos verticais na lateral,
   estilo soundboard de Discord / programa de auditório.
   ==================================================================== */
window.FX = (function(){
  let ac=null, mudo=false, montado=false;
  function ctx(){
    if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
    if(ac && ac.state==="suspended"){ try{ ac.resume(); }catch(e){} }
    return ac;
  }
  function ruido(a, dur){
    const buf=a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate*dur)), a.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s=a.createBufferSource(); s.buffer=buf; return s;
  }

  /* -------- os 5 efeitos -------- */
  function airhorn(a){
    const t=a.currentTime, g=a.createGain(); g.connect(a.destination);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.32,t+.03);
    g.gain.setValueAtTime(.32,t+.55); g.gain.exponentialRampToValueAtTime(.0001,t+.85);
    [0,7].forEach(det=>{
      const o=a.createOscillator(); o.type="sawtooth"; o.frequency.setValueAtTime(400+det,t);
      const lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=6; lg.gain.value=9;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t+.85);
      o.connect(g); o.start(t); o.stop(t+.85);
    });
  }
  function rimshot(a){
    const t=a.currentTime;
    function tom(when,freq){
      const o=a.createOscillator(),g=a.createGain();
      o.type="triangle"; o.frequency.setValueAtTime(freq,when); o.frequency.exponentialRampToValueAtTime(freq*.5,when+.12);
      g.gain.setValueAtTime(.4,when); g.gain.exponentialRampToValueAtTime(.001,when+.14);
      o.connect(g); g.connect(a.destination); o.start(when); o.stop(when+.15);
    }
    tom(t,240); tom(t+.15,190);
    const s=ruido(a,.3), hp=a.createBiquadFilter(), g=a.createGain();
    hp.type="highpass"; hp.frequency.value=6000;
    g.gain.setValueAtTime(.35,t+.3); g.gain.exponentialRampToValueAtTime(.001,t+.6);
    s.connect(hp); hp.connect(g); g.connect(a.destination); s.start(t+.3); s.stop(t+.62);
  }
  function trombone(a){
    const notes=[233,220,196,165]; let when=a.currentTime;
    notes.forEach((f,i)=>{
      const ultimo=i===notes.length-1, dur=ultimo?.6:.28;
      const o=a.createOscillator(),g=a.createGain(),lp=a.createBiquadFilter();
      o.type="sawtooth"; o.frequency.setValueAtTime(f,when); if(ultimo) o.frequency.linearRampToValueAtTime(f*.92,when+dur);
      lp.type="lowpass"; lp.frequency.setValueAtTime(700,when); lp.frequency.linearRampToValueAtTime(1500,when+dur*.5); lp.frequency.linearRampToValueAtTime(500,when+dur);
      g.gain.setValueAtTime(.0001,when); g.gain.exponentialRampToValueAtTime(.26,when+.03);
      g.gain.setValueAtTime(.26,when+dur-.05); g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      o.connect(lp); lp.connect(g); g.connect(a.destination); o.start(when); o.stop(when+dur); when+=dur*.85;
    });
  }
  function ding(a){
    const t=a.currentTime;
    [880,1320].forEach((f,i)=>{
      const o=a.createOscillator(),g=a.createGain(); o.type="sine"; o.frequency.value=f; const st=t+i*.09;
      g.gain.setValueAtTime(.0001,st); g.gain.exponentialRampToValueAtTime(.3,st+.01); g.gain.exponentialRampToValueAtTime(.0001,st+.5);
      o.connect(g); g.connect(a.destination); o.start(st); o.stop(st+.5);
    });
  }
  function erro(a){
    const t=a.currentTime;
    [0,.18].forEach(off=>{
      const o=a.createOscillator(),g=a.createGain(); o.type="square"; o.frequency.value=110; const st=t+off;
      g.gain.setValueAtTime(.0001,st); g.gain.exponentialRampToValueAtTime(.3,st+.02); g.gain.setValueAtTime(.3,st+.13); g.gain.exponentialRampToValueAtTime(.0001,st+.16);
      o.connect(g); g.connect(a.destination); o.start(st); o.stop(st+.17);
    });
  }
  /* -------- sons "normais" de partida (discretos, pra dar dinâmica) -------- */
  function pop(a){ // nova rodada / pergunta aparece
    const t=a.currentTime,o=a.createOscillator(),g=a.createGain();
    o.type="sine"; o.frequency.setValueAtTime(520,t); o.frequency.exponentialRampToValueAtTime(920,t+.08);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.22,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+.16);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+.18);
  }
  function chime(a){ // revelação
    const t=a.currentTime;
    [659,988].forEach((f,i)=>{ const o=a.createOscillator(),g=a.createGain(); o.type="sine"; o.frequency.value=f; const st=t+i*.1;
      g.gain.setValueAtTime(.0001,st); g.gain.exponentialRampToValueAtTime(.22,st+.01); g.gain.exponentialRampToValueAtTime(.0001,st+.4);
      o.connect(g); g.connect(a.destination); o.start(st); o.stop(st+.42); });
  }
  function fanfarra(a){ // vitória
    const t=a.currentTime, notes=[523,659,784,1047];
    notes.forEach((f,i)=>{ const st=t+i*.12, o=a.createOscillator(), g=a.createGain(); o.type="triangle"; o.frequency.value=f; const ultimo=i===notes.length-1;
      g.gain.setValueAtTime(.0001,st); g.gain.exponentialRampToValueAtTime(.3,st+.02); g.gain.exponentialRampToValueAtTime(.0001,st+(ultimo?.6:.18));
      o.connect(g); g.connect(a.destination); o.start(st); o.stop(st+.7); });
  }
  function msg(a){ // chat: bem curtinho, só pra sinalizar
    const t=a.currentTime;
    [740,1108].forEach((f,i)=>{
      const o=a.createOscillator(),g=a.createGain(); o.type="sine"; o.frequency.value=f; const st=t+i*.055;
      g.gain.setValueAtTime(.0001,st); g.gain.exponentialRampToValueAtTime(.16,st+.008); g.gain.exponentialRampToValueAtTime(.0001,st+.13);
      o.connect(g); g.connect(a.destination); o.start(st); o.stop(st+.14);
    });
  }
  const SONS = { airhorn, rimshot, trombone, ding, erro, pop, chime, fanfarra, msg };
  function toca(nome){ if(mudo) return; const a=ctx(); if(!a) return; try{ (SONS[nome]||(()=>{}))(a); }catch(e){} }

  /* -------- botõezinhos na lateral -------- */
  function elem(tag, attrs, txt){
    const n=document.createElement(tag);
    if(attrs) for(const k in attrs){ if(k==="class") n.className=attrs[k]; else n.setAttribute(k,attrs[k]); }
    if(txt!=null) n.textContent=txt;
    return n;
  }
  function montar(){
    if(montado || !document.body) return; montado=true;
    const barra=elem("div",{class:"soundboard","aria-label":"Efeitos sonoros"});
    const toggle=elem("button",{class:"sfx-toggle",type:"button","aria-label":"Efeitos sonoros",title:"Efeitos"},"🔊");
    const grupo=elem("div",{class:"sfx-grupo"});
    const lista=[["airhorn","📣","Buzina"],["rimshot","🥁","Ba dum tss"],["trombone","😢","Trombone triste"],["ding","✅","Ding"],["erro","❌","Errou"]];
    lista.forEach(([nome,emo,rot])=>{
      const b=elem("button",{class:"sfx",type:"button","aria-label":rot,title:rot}, emo);
      b.addEventListener("click",()=>toca(nome));
      grupo.appendChild(b);
    });
    toggle.addEventListener("click",()=>{ barra.classList.toggle("aberto"); });
    barra.appendChild(toggle); barra.appendChild(grupo);
    document.body.appendChild(barra);
  }

  return { toca, montar };
})();

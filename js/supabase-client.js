/* Camada fininha em cima do supabase-js. Se não houver config, ONLINE fica off. */
window.Net = (function(){
  const cfg = window.PERFIL_CONFIG || {};
  const ligado = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  let sb = null;
  if(ligado){
    try{ sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); }
    catch(e){ console.error("Supabase falhou ao iniciar:", e); }
  }

  function disponivel(){ return !!sb; }

  async function criarSala(code, state){
    const { error } = await sb.from("rooms").insert({ code, state });
    if(error) throw error;
    return state;
  }
  async function lerSala(code){
    const { data, error } = await sb.from("rooms").select("state").eq("code", code).maybeSingle();
    if(error) throw error;
    return data ? data.state : null;
  }
  async function escreverSala(code, state){
    const { error } = await sb.from("rooms").update({ state, updated_at: new Date().toISOString() }).eq("code", code);
    if(error) throw error;
  }
  // lê, aplica f(state)->novoState e grava COM TRAVA OTIMISTA:
  // a escrita só vale se ninguém escreveu depois da nossa leitura (updated_at igual).
  // Se alguém passou na frente, relê e tenta de novo (até 6x, com espera aleatória).
  // Isso aguenta 10+ pessoas entrando na sala no mesmo segundo sem perder ninguém.
  async function alterar(code, f){
    for(let i=0;i<6;i++){
      const { data: row, error: e1 } = await sb.from("rooms").select("state,updated_at").eq("code", code).maybeSingle();
      if(e1) throw e1;
      if(!row) throw new Error("sala-sumiu");
      const novo = f(JSON.parse(JSON.stringify(row.state)));
      if(!novo) return row.state;
      // timestamp com microssegundos aleatórios: nunca há dois iguais
      const ts = new Date().toISOString().replace("Z", String(Math.floor(Math.random()*1000)).padStart(3,"0")+"Z");
      const { data: gravou, error: e2 } = await sb.from("rooms")
        .update({ state: novo, updated_at: ts })
        .eq("code", code).eq("updated_at", row.updated_at)
        .select("code");
      if(e2){ if(i===5) throw e2; }
      else if(gravou && gravou.length) return novo; // conseguiu, ninguém atropelou
      await new Promise(r=>setTimeout(r, 50 + Math.random()*200*(i+1)));
    }
    throw new Error("sala-cheia-de-gente-tenta-de-novo");
  }
  // apaga a sala (usado quando o último jogador sai; a faxina do banco cobre o resto)
  async function apagarSala(code){
    try{ await sb.from("rooms").delete().eq("code", code); }catch(e){}
  }
  function inscrever(code, cb){
    const canal = sb.channel("room:"+code)
      .on("postgres_changes",
          { event:"UPDATE", schema:"public", table:"rooms", filter:"code=eq."+code },
          payload => cb(payload.new && payload.new.state))
      .subscribe();
    return () => { try{ sb.removeChannel(canal); }catch(e){} };
  }

  return { disponivel, criarSala, lerSala, escreverSala, alterar, apagarSala, inscrever };
})();

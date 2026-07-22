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
  // lê, aplica f(state)->novoState e grava. Uma tentativa de retry em caso de corrida.
  async function alterar(code, f){
    for(let i=0;i<2;i++){
      const atual = await lerSala(code);
      if(!atual) throw new Error("sala-sumiu");
      const novo = f(JSON.parse(JSON.stringify(atual)));
      if(!novo) return atual;
      try{ await escreverSala(code, novo); return novo; }
      catch(e){ if(i===1) throw e; }
    }
  }
  function inscrever(code, cb){
    const canal = sb.channel("room:"+code)
      .on("postgres_changes",
          { event:"UPDATE", schema:"public", table:"rooms", filter:"code=eq."+code },
          payload => cb(payload.new && payload.new.state))
      .subscribe();
    return () => { try{ sb.removeChannel(canal); }catch(e){} };
  }

  return { disponivel, criarSala, lerSala, escreverSala, alterar, inscrever };
})();

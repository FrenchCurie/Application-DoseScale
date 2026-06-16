/* =====================================================================
   FrenchCurie · Relais GMC-500+  (Cloudflare Worker)
   ---------------------------------------------------------------------
   Rôle : recevoir par WiFi les mesures du GMC-500+, garder la dernière
   valeur, et la redonner à ton site en JSON (avec CORS).

   Deux routes :
     • GET /log2.asp?CPM=..&ACPM=..&uSV=..   ← le GMC envoie ici (toutes les 5 min)
     • GET /latest                            ← ton site lit ici

   Stockage : un espace KV nommé  GMC  (clé "latest").
   Option   : variable FORWARD = "1" pour relayer aussi vers GMCmap.
   ===================================================================== */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };

    // --- 1) Lecture par le site ---
    if (url.pathname === "/latest") {
      const data = (await env.GMC.get("latest")) || '{"usv":null,"cpm":null,"ts":null}';
      return new Response(data, { headers: { "Content-Type": "application/json", ...CORS } });
    }

    // --- 2) Réception depuis le GMC-500+ ---
    // Le GMC appelle .../log2.asp?AID=..&GID=..&CPM=15&ACPM=13.2&uSV=0.075
    const p = url.searchParams;
    const cpm  = p.get("CPM");
    const acpm = p.get("ACPM");
    const usv  = p.get("uSV") || p.get("uSv") || p.get("usv");

    if (cpm !== null || usv !== null) {
      const rec = JSON.stringify({
        cpm:  cpm  !== null ? parseFloat(cpm)  : null,
        acpm: acpm !== null ? parseFloat(acpm) : null,
        usv:  usv  !== null ? parseFloat(usv)  : null,
        ts:   Date.now()
      });
      await env.GMC.put("latest", rec);

      // (option) relayer vers GMCmap pour garder ta station sur leur carte
      if (env.FORWARD === "1") {
        ctx.waitUntil(
          fetch("http://www.gmcmap.com" + url.pathname + url.search).catch(() => {})
        );
      }

      // le GMC attend cette réponse exacte pour considérer l'envoi réussi
      return new Response("OK.ERR0", { headers: CORS });
    }

    // --- page par défaut ---
    return new Response("FrenchCurie GMC relay — OK", { headers: CORS });
  }
};

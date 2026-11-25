/* Village Sim ratings server (optional). A Cloudflare Worker with a D1 database.
   It keeps one row per track seed: likes, dislikes, skips. It stores no IP address, no browser id and no user agent.
   The game sends only changes ("this browser liked track 4821 and skipped it once"), and only when the player turned sharing on. */
const MAX_SEED = 999999, JSON_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
const clampInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : null;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: JSON_HEADERS });
    if (req.method === 'POST' && url.pathname === '/rate') {
      let b; try { b = await req.json() } catch (e) { return reply({ error: 'bad json' }, 400) }
      const seed = clampInt(b.seed, 0, MAX_SEED), up = clampInt(b.up, -1, 1), down = clampInt(b.down, -1, 1), skips = clampInt(b.skips, 0, 50), plays = clampInt(b.plays || 0, 0, 5);
      if (seed === null || up === null || down === null || skips === null || plays === null) return reply({ error: 'bad values' }, 400);
      await env.DB.prepare('INSERT INTO tracks (seed, up, down, skips, plays) VALUES (?1, MAX(0, ?2), MAX(0, ?3), ?4, ?5) ON CONFLICT(seed) DO UPDATE SET up = MAX(0, up + ?2), down = MAX(0, down + ?3), skips = skips + ?4, plays = plays + ?5').bind(seed, up, down, skips, plays).run();
      return reply({ ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/top') {
      const rows = await env.DB.prepare('SELECT seed, up, down, skips, plays FROM tracks ORDER BY (up - down) DESC, skips ASC LIMIT 100').all();
      return reply({ tracks: rows.results });
    }
    return reply({ name: 'village-sim ratings', routes: ['POST /rate', 'GET /top'] });
  },
};

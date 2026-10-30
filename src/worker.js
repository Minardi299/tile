import GachBong from '../public/tile.js';

const { design, render, PALETTES } = GachBong;

const key = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clamp = (v, lo, hi, dflt) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
const fail = (status, error) => Response.json({ error }, { status, headers: CORS });

export default {
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== '/api/tile') return fail(404, 'Not found. Use /api/tile?seed=word');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'Use GET');

    const q = url.searchParams;
    const seed = q.get('seed');
    if (!seed) return fail(400, 'Missing "seed"');
    if (seed.length > 200) return fail(400, '"seed" must be 200 characters or fewer');

    let palette;
    if (q.has('palette')) {
      const p = q.get('palette');
      palette = /^\d+$/.test(p) ? +p : PALETTES.findIndex(x => key(x.name) === key(p));
      if (!PALETTES[palette]) return fail(400, `Unknown "palette". Use 0-${PALETTES.length - 1} or a name: ${PALETTES.map(x => x.name).join(', ')}`);
    }

    const d = design(seed, { palette });
    let tiles = clamp(q.get('tiles'), 1, 6, 2);
    if (d.quad && tiles % 2) tiles++;
    const size = clamp(q.get('size'), 16, 1024, 256);
    const worn = ['1', 'true'].includes(q.get('noise'));

    const svg = render(d, { tiles, worn }).replace(/width="[^"]*cm" height="[^"]*cm"/, `width="${size}" height="${size}"`);
    return new Response(req.method === 'HEAD' ? null : svg, {
      headers: { ...CORS, 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
    });
  },
};

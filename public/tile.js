(function (root) {
  // ===== Seeded random =====
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function makeRng(seed) {
    let a = seed;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      range: (lo, hi) => lo + (hi - lo) * next(),
      int: (lo, hi) => lo + Math.floor((hi - lo + 1) * next()),
      pick: arr => arr[Math.floor(arr.length * next())],
      chance: p => next() < p,
    };
  }

  // ===== Palettes =====
  const PALETTES = [
    { name: 'Chợ Lớn', bg: '#d4a03f', inks: ['#b0392b', '#3f7843', '#eee3cc', '#6a2823'] },
    { name: 'Terracotta', bg: '#a9462f', inks: ['#ece1c9', '#d6a640', '#2f2a26'] },
    { name: 'Pagoda', bg: '#e8dec8', inks: ['#76291f', '#c9963a', '#3d6a49', '#262321'] },
    { name: 'Indigo', bg: '#e4dccb', inks: ['#2f4c75', '#8b8a84', '#c59a48', '#1d2738'] },
    { name: 'Jade', bg: '#2f5c47', inks: ['#e6dbc3', '#c99a3d', '#9c3a2b', '#1f2420'] },
    { name: 'Charcoal', bg: '#2c2a27', inks: ['#e3d9c4', '#a53c2b', '#c79f4b', '#6c8a76'] },
    { name: 'Teal', bg: '#e9e0cd', inks: ['#36807d', '#d48870', '#7d786f', '#26302f'] },
    { name: 'Hội An', bg: '#e0b04a', inks: ['#2e5b88', '#efe6d2', '#3c6d45', '#8a2e27'] },
    { name: 'Grey rose', bg: '#9a968d', inks: ['#ebe4d6', '#b45648', '#36322f', '#7e9a86'] },
    { name: 'Blue & white', bg: '#ece6d9', inks: ['#3a5d8e', '#1f3150', '#93aec7', '#c79d50'] },
    { name: 'Garden', bg: '#e5dcc5', inks: ['#3a6a3e', '#b4aa48', '#6d562f', '#a3402e'] },
    { name: 'Oxblood', bg: '#6a2923', inks: ['#e7dcc6', '#cf9f45', '#2d4e3b', '#1e1b19'] },
  ];

  function jitter(hex, rng) {
    const n = parseInt(hex.slice(1), 16), light = rng.range(-8, 8);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255]
      .map(c => Math.max(0, Math.min(255, Math.round(c + light + rng.range(-4, 4)))).toString(16).padStart(2, '0'))
      .join('');
  }

  // ===== Path helpers =====
  const TAU = Math.PI * 2;
  const f = n => +n.toFixed(4);

  function circle(cx, cy, r, ccw) {
    const s = ccw ? 0 : 1, a = `A${f(r)} ${f(r)} 0 1 ${s} `;
    return `M${f(cx - r)} ${f(cy)}${a}${f(cx + r)} ${f(cy)}${a}${f(cx - r)} ${f(cy)}Z`;
  }
  const ring = (cx, cy, r1, r2) => circle(cx, cy, r2) + circle(cx, cy, r1, true);
  const poly = pts => 'M' + pts.map(([x, y]) => f(x) + ' ' + f(y)).join('L') + 'Z';

  // Upper half of each shape as cubic segments, base (0,0) to tip (u,0); the lower half is mirrored.
  const PETALS = {
    almond: [[[0.3, 1.33], [0.7, 1.33], [1, 0]]],
    teardrop: [[[0.18, 0.2], [0.32, 1], [0.62, 1]], [[0.84, 1], [1, 0.55], [1, 0]]],
    spoon: [[[0, 0.45], [0.2, 0.75], [0.5, 0.8]], [[0.8, 0.85], [1, 0.6], [1, 0]]],
    heart: [[[0.12, 0.35], [0.35, 1.05], [0.72, 1]], [[1.05, 0.95], [1.05, 0.25], [0.86, 0]]],
    spade: [[[0.02, 0.6], [0.12, 1], [0.3, 1]], [[0.5, 1], [0.8, 0.45], [1, 0]]],
    fan: [[[0.45, 0.08], [0.85, 0.45], [1, 1]], [[1, 1], [0.82, 0], [0.82, 0]]],
    lozenge: [[[0, 0], [0.5, 1], [0.5, 1]], [[0.5, 1], [1, 0], [1, 0]]],
  };

  function petal(shape, ax, ay, ang, a, len, w) {
    const segs = PETALS[shape], c = Math.cos(ang), s = Math.sin(ang);
    const P = (u, v) => {
      const r = a + u * len, q = v * w;
      return f(ax + c * r - s * q) + ' ' + f(ay + s * r + c * q);
    };
    let d = 'M' + P(0, 0);
    for (const [c1, c2, e] of segs) d += 'C' + P(c1[0], c1[1]) + ' ' + P(c2[0], c2[1]) + ' ' + P(e[0], e[1]);
    for (let i = segs.length - 1; i >= 0; i--) {
      const [c1, c2] = segs[i], e = i ? segs[i - 1][2] : [0, 0];
      d += 'C' + P(c2[0], -c2[1]) + ' ' + P(c1[0], -c1[1]) + ' ' + P(e[0], -e[1]);
    }
    return d + 'Z';
  }

  function rosette(shape, ax, ay, n, ph, a, len, w) {
    let d = '';
    for (let k = 0; k < n; k++) d += petal(shape, ax, ay, ph + (TAU * k) / n, a, len, w);
    return d;
  }

  function dots(ax, ay, rad, m, r, ph) {
    let d = '';
    for (let k = 0; k < m; k++) {
      const t = ph + (TAU * k) / m;
      d += circle(ax + rad * Math.cos(t), ay + rad * Math.sin(t), r);
    }
    return d;
  }

  function star(ax, ay, n, ph, ro, ri) {
    const pts = [];
    for (let k = 0; k < 2 * n; k++) {
      const r = k % 2 ? ri : ro, t = ph + (Math.PI * k) / n;
      pts.push([ax + r * Math.cos(t), ay + r * Math.sin(t)]);
    }
    return poly(pts);
  }

  function scallop(ax, ay, r, n, ph) {
    const h = Math.PI / n, r0 = r / (Math.cos(h) + Math.sin(h) / 0.95), rho = (r0 * Math.sin(h)) / 0.95;
    let d = '';
    for (let k = 0; k <= n; k++) {
      const t = ph + h + 2 * h * k, x = f(ax + r0 * Math.cos(t)), y = f(ay + r0 * Math.sin(t));
      d += k ? `A${f(rho)} ${f(rho)} 0 0 1 ${x} ${y}` : `M${x} ${y}`;
    }
    return d + 'Z';
  }

  const squareRing = (h1, h2) =>
    poly([[-h2, -h2], [h2, -h2], [h2, h2], [-h2, h2]]) + poly([[-h1, -h1], [-h1, h1], [h1, h1], [h1, -h1]]);
  const diamondRing = (k1, k2) =>
    poly([[k2, 0], [0, k2], [-k2, 0], [0, -k2]]) + poly([[k1, 0], [0, -k1], [-k1, 0], [0, k1]]);

  function arm(kind, ax, ay, ang, a, len, w, g) {
    const P = (shape, a2, l2, w2) => petal(shape, ax, ay, ang, a2 - g, l2 + 2 * g, w2 + g);
    const at = t => [ax + Math.cos(ang) * t, ay + Math.sin(ang) * t];
    if (kind === 'spear') return P('almond', a, len * 0.7, w * 0.22) + P('spade', a + len * 0.45, len * 0.55, w);
    if (kind === 'fleur') {
      const [px, py] = at(a + len * 0.22);
      return (
        P('almond', a, len, w * 0.5) +
        petal('teardrop', px, py, ang + 0.75, -g, len * 0.5 + 2 * g, w * 0.5 + g) +
        petal('teardrop', px, py, ang - 0.75, -g, len * 0.5 + 2 * g, w * 0.5 + g) +
        petal('lozenge', px, py, ang + Math.PI / 2, -w * 0.6 - g, w * 1.2 + 2 * g, len * 0.06 + g)
      );
    }
    if (kind === 'dots') {
      let d = '';
      for (let i = 0; i < 3; i++) d += circle(...at(a + (len * (i + 0.5)) / 3), w * (1 - i * 0.22) + g);
      return d;
    }
    return P(kind, a, len, w);
  }

  // ===== Design =====
  // Cell [-1,1]² with floor symmetry p4m: 4-fold centers O (0,0) and K (1,1), 2-fold centers E (1,0).
  function design(seed, { palette } = {}) {
    const h = xmur3(String(seed));
    const rng = makeRng(h());
    const wearSeed = h();
    const quad = rng.chance(0.3);
    // rng.pick runs even when a palette is forced, so the layout stays the same
    const picked = rng.pick(PALETTES);
    const pal = PALETTES[palette] || picked;

    let bg = pal.bg;
    let inks = pal.inks.slice();
    if (rng.chance(0.25)) {
      const i = rng.int(0, inks.length - 1);
      [bg, inks[i]] = [inks[i], bg];
    }
    if (inks.length > 3 && rng.chance(0.35)) inks.splice(rng.int(0, inks.length - 1), 1);
    bg = jitter(bg, rng);
    inks = inks.map(c => jitter(c, rng));
    const all = [bg, ...inks];
    const pick = avoid => {
      const pool = all.filter(c => !avoid.includes(c));
      return rng.pick(pool.length ? pool : inks);
    };

    const els = [];
    const add = (d, fill, sym = 1) => els.push({ d, fill, sym });

    function medallion(ax, ay, R, major) {
      let r = R;
      let under = bg;
      const n = major ? rng.pick([8, 8, 8, 12, 16, 4]) : rng.pick([4, 8, 8]);
      const ph = rng.chance(0.5) ? 0 : Math.PI / n;

      const bands = rng.int(0, major ? 2 : 1);
      for (let i = 0; i < bands; i++) {
        const t = R * rng.range(0.06, 0.12);
        const c = pick([under]);
        add(ring(ax, ay, r - t, r), c);
        if (rng.chance(0.4)) {
          const m = Math.max(8, Math.round((TAU * (r - t / 2)) / (t * 2) / 4) * 4);
          add(dots(ax, ay, r - t / 2, m, t * rng.range(0.24, 0.34), rng.chance(0.5) ? 0 : Math.PI / m), pick([c]));
        } else if (rng.chance(0.5)) {
          const t2 = R * rng.range(0.015, 0.03);
          add(ring(ax, ay, r - t - t2, r - t), pick([c, under]));
          r -= t2;
        }
        r -= t + R * rng.range(0, 0.05);
      }

      const field = rng.chance(major ? 0.55 : 0.45);
      if (field) {
        const c = pick([under]);
        const kind = rng.pick(['disc', 'disc', 'scallop', 'star']);
        if (kind === 'disc') add(circle(ax, ay, r), c);
        else if (kind === 'scallop') add(scallop(ax, ay, r, n, ph), c);
        else add(star(ax, ay, Math.max(n, 8), ph, r, r * 0.82), c);
        under = c;
        r *= kind === 'disc' ? 0.92 : 0.8;
      }

      const rc = r * rng.range(0.16, 0.3);
      const bodies = major
        ? quad ? ['cross', 'cross', 'quatrefoil', 'rosette', 'double', 'star'] : ['rosette', 'rosette', 'double', 'star', 'cross', 'quatrefoil']
        : field ? ['rosette', 'rosette', 'star', 'none'] : ['rosette', 'rosette', 'star'];
      const body = rng.pick(bodies);
      let top = under;

      const whorl = (shape, k, phase, a, len, w) => {
        const g = rng.range(0.018, 0.03);
        const c = pick([under]);
        if (w > 2.5 * g && rng.chance(0.45)) {
          add(rosette(shape, ax, ay, k, phase, a, len, w), c);
          add(rosette(shape, ax, ay, k, phase, a + g, len - 2 * g, w - g), pick([c]));
        } else add(rosette(shape, ax, ay, k, phase, a, len, w), c);
        return c;
      };

      if (body === 'rosette' || body === 'double') {
        const a = rc * 0.4, len = r - a;
        const w = ((Math.PI * (a + len / 2)) / n) * rng.range(0.55, 0.95);
        if (body === 'double') {
          const back = pick([under]);
          add(rosette(rng.pick(Object.keys(PETALS)), ax, ay, n, ph + Math.PI / n, a, len, w * rng.range(0.6, 0.9)), back);
          top = whorl(rng.pick(['almond', 'teardrop', 'spoon', 'heart']), n, ph, a, len * rng.range(0.62, 0.8), w * 0.85);
        } else top = whorl(rng.pick(['almond', 'teardrop', 'spoon', 'heart', 'spade']), n, ph, a, len, w);
      } else if (body === 'star') {
        const k = Math.max(n, 8), ri = r * rng.range(0.5, 0.72);
        top = pick([under]);
        add(star(ax, ay, k, ph, r, ri), top);
        if (rng.chance(0.5)) {
          top = pick([top]);
          add(star(ax, ay, k, ph, r * 0.78, ri * 0.78), top);
        }
      } else if (body === 'cross') {
        const k = n >= 8 && rng.chance(0.4) ? 8 : 4;
        const p = rng.chance(0.5) ? 0 : Math.PI / k;
        top = whorl('fan', k, p, rc * 0.3, r - rc * 0.3, r * (k === 4 ? rng.range(0.32, 0.48) : rng.range(0.18, 0.26)));
      } else if (body === 'quatrefoil') {
        const q = r * rng.range(0.42, 0.55), p = rng.chance(0.5) ? 0 : Math.PI / 4, g = rng.range(0.025, 0.04);
        const lobes = rad => {
          let d = '';
          for (let k = 0; k < 4; k++) d += circle(ax + (r - q) * Math.cos(p + (k * Math.PI) / 2), ay + (r - q) * Math.sin(p + (k * Math.PI) / 2), rad);
          return d;
        };
        top = pick([under]);
        add(lobes(q), top);
        if (rng.chance(0.6)) {
          top = pick([top]);
          add(lobes(q - g), top);
        }
      }

      const cc = pick([under, top]);
      add(circle(ax, ay, rc), cc);
      if (rng.chance(0.7)) add(circle(ax, ay, rc * rng.range(0.35, 0.6)), pick([cc]));
    }

    const mainAtO = quad || rng.chance(0.65);
    const [mx, my] = mainAtO ? [0, 0] : [1, 1];
    const [sx, sy] = mainAtO ? [1, 1] : [0, 0];
    const R1 = rng.range(quad ? 0.6 : 0.5, quad ? 0.98 : 0.9);
    const R2 = rng.range(0.24, Math.min(0.62, Math.SQRT2 - R1 + 0.05));

    if (rng.chance(quad ? 0.2 : 0.4)) {
      const hw = rng.chance(0.4) ? 1 : rng.range(0.8, 0.95), t = rng.range(0.025, 0.07);
      add(squareRing(hw - t, hw), pick([bg]));
      if (rng.chance(0.35)) {
        const gap = rng.range(0.03, 0.06), t2 = rng.range(0.015, 0.03);
        add(squareRing(hw - t - gap - t2, hw - t - gap), pick([bg]));
      }
    }

    if (rng.chance(quad ? 0.2 : 0.3)) {
      const c = pick([bg]), t = rng.range(0.025, 0.06), kind = rng.pick(['diamond', 'xband', 'arcs']);
      if (kind === 'diamond') {
        const k = rng.range(0.85, 1.15);
        add(diamondRing(k - t * Math.SQRT2, k), c);
      } else if (kind === 'xband') {
        const e = Math.SQRT1_2 * t;
        add(poly([[e, -e], [1 + e, 1 - e], [1 - e, 1 + e], [-e, e]]), c, 4);
      } else {
        const rr = rng.range(0.8, 1.05);
        add(ring(sx, sy, rr - t, rr), c);
      }
    }

    const fillerR = R1 < 0.82 && R2 < 0.82 && rng.chance(0.55) ? rng.range(0.08, Math.min(0.24, 0.95 - Math.max(R1, R2))) : 0;
    const armPass = (ang, a, b) => {
      const len = b - a;
      if (len < 0.14) return;
      const kind = rng.pick(['spade', 'almond', 'teardrop', 'spear', 'fleur', 'dots', 'lozenge']);
      const w = Math.min(len * rng.range(0.18, 0.32), 0.2);
      const c = pick([bg]);
      if (rng.chance(0.35)) {
        const g = rng.range(0.018, 0.03);
        add(arm(kind, mx, my, ang, a, len, w, g), c, 4);
        add(arm(kind, mx, my, ang, a, len, w, 0), pick([c]), 4);
      } else add(arm(kind, mx, my, ang, a, len, w, 0), c, 4);
    };
    if (rng.chance(quad ? 0.75 : 0.45)) armPass(mainAtO ? 0 : -Math.PI / 2, R1 * 0.8, 1 - fillerR * 0.6);
    if (rng.chance(0.55)) armPass(mainAtO ? Math.PI / 4 : (-3 * Math.PI) / 4, R1 * 0.8, Math.SQRT2 - R2 * 0.8);

    if (fillerR > 0.07) {
      const c = pick([bg]), kind = rng.pick(['dot', 'lozenge', 'flower']);
      if (kind === 'dot') add(circle(1, 0, fillerR), c, 2);
      else if (kind === 'lozenge') {
        const [lx, ly] = rng.chance(0.5) ? [fillerR, fillerR * 0.6] : [fillerR * 0.6, fillerR];
        add(poly([[1 + lx, 0], [1, ly], [1 - lx, 0], [1, -ly]]), c, 2);
      } else add(rosette('almond', 1, 0, 4, rng.chance(0.5) ? 0 : Math.PI / 4, 0, fillerR, fillerR * 0.32), c, 2);
      if (kind !== 'lozenge' && rng.chance(0.6)) add(circle(1, 0, fillerR * 0.3), pick([c]), 2);
    }

    medallion(sx, sy, R2, false);
    medallion(mx, my, R1, true);

    return { seed: String(seed), quad, palette: pal.name, colors: all, bg, els, wearSeed };
  }

  // ===== Render =====
  const MATS = [[1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1], [0, -1, 1, 0]];

  function render(d, { tiles = 1, worn = true } = {}) {
    const s = d.quad ? 1 : 2, S = 200 / s;
    const x0 = -Math.floor(tiles / 2) * s - (d.quad ? 0 : 1), x1 = x0 + tiles * s;
    const X = x0 * S, W = tiles * 200;
    const cells = [];
    for (let c = Math.ceil((x0 - 2.5) / 2) * 2; c <= x1 + 2.5; c += 2) cells.push(c);
    const area = `x="${X}" y="${X}" width="${W}" height="${W}"`;

    const defs = d.els.map(
      (e, i) =>
        `<path id="p${i}" d="${e.d}"/><g id="e${i}">` +
        MATS.slice(0, e.sym).map((m, k) => `<use xlink:href="#p${i}"${k ? ` transform="matrix(${m.join(' ')} 0 0)"` : ''}/>`).join('') +
        '</g>'
    );
    const layers = d.els.map(
      (e, i) => `<g fill="${e.fill}">` + cells.map(cy => cells.map(cx => `<use xlink:href="#e${i}" x="${cx}" y="${cy}"/>`).join('')).join('') + '</g>'
    );

    let wear = '';
    let filters = '';
    if (worn) {
      const wr = makeRng(d.wearSeed);
      const seedAttr = () => `seed="${wr.int(1, 9999)}"`;
      const fil = (id, freq, octaves, matrix) =>
        `<filter id="${id}" filterUnits="userSpaceOnUse" ${area} color-interpolation-filters="sRGB">` +
        `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" ${seedAttr()}/>` +
        (matrix ? `<feColorMatrix values="${matrix}"/>` : '<feDisplacementMap in="SourceGraphic" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>') +
        '</filter>';
      filters =
        fil('wobble', 0.05, 2) +
        fil('grain', 0.8, 2, '0 0 0 0 0.17 0 0 0 0 0.14 0 0 0 0 0.11 0.6 0 0 0 -0.27') +
        fil('fleck', 0.9, 1, '0 0 0 0 1 0 0 0 0 1 0 0 0 0 0.97 0 2.5 0 0 -1.65') +
        fil('fade', 0.012, 3, '0 0 0 0 1 0 0 0 0 1 0 0 0 0 0.97 0.7 0 0 0 -0.36');
      wear = ['grain', 'fleck', 'fade'].map(id => `<rect ${area} filter="url(#${id})"/>`).join('');
      for (let j = 0; j < tiles; j++)
        for (let i = 0; i < tiles; i++)
          wear += `<rect x="${X + i * 200}" y="${X + j * 200}" width="200" height="200" fill="${wr.chance(0.5) ? '#fff' : '#000'}" fill-opacity="${f(wr.range(0, 0.06))}"/>`;
    }

    let grout = '';
    for (let i = 0; i <= tiles; i++) grout += `M${X + i * 200} ${X}v${W}M${X} ${X + i * 200}h${W}`;

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${X} ${X} ${W} ${W}" width="${tiles * 20}cm" height="${tiles * 20}cm">` +
      `<defs><clipPath id="clip"><rect ${area}/></clipPath>${filters}${defs.join('')}</defs>` +
      `<g clip-path="url(#clip)"><rect ${area} fill="${d.bg}"/>` +
      `<g${worn ? ' filter="url(#wobble)"' : ''}><g transform="scale(${S})">${layers.join('')}</g></g>` +
      wear +
      `<path d="${grout}" fill="none" stroke="#000" stroke-opacity="${worn ? 0.07 : 0.05}" stroke-width="6"/>` +
      `<path d="${grout}" fill="none" stroke="#2b2520" stroke-opacity="0.4" stroke-width="1.6"/>` +
      '</g></svg>'
    );
  }

  const api = { design, render, PALETTES };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GachBong = api;
})(this);

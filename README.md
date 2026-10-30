# Gạch Bông

A website that draws Indochine cement tiles (gạch bông) from any text. The same text always gives the same tile. The site is live at https://tiles.starb.ca.

## Files

- `public/` is the website. Cloudflare serves these files as they are. There is no build step.
  - `index.html` is the page.
  - `tile.js` is the generator. It has no browser code, so it also runs in Node.
  - `favicon.svg` is the tile for the seed "saigon".
  - `og.png` is the 1200 × 630 share image.
- `src/worker.js` is the API. It answers `/api/tile`.
- `wrangler.jsonc` configures the Cloudflare Worker. The Worker serves `/api/*`, and Cloudflare serves `public/` for every other path, on tiles.starb.ca.
- `project.png` is a screenshot for the project grid on starb.ca.

## Run it locally

Run `npx wrangler dev`, then open http://localhost:8787.

You can also open `public/index.html` directly in a browser. In that case, the Copy link button does not work, because the clipboard needs an `http` or `https` page.

## Deploy

1. Log in to Cloudflare (only once): `npx wrangler login`
2. Deploy: `npx wrangler deploy`

The `routes` entry in `wrangler.jsonc` attaches tiles.starb.ca to the Worker. On the first deploy, Cloudflare creates the DNS record for it.

## Add it to starb.ca

1. Copy `project.png` to `Personal-Website/public/projects/tiles.png`.
2. Add this line to `PROJECTS` in `Personal-Website/src/constants/work.js`:

```js
{ title: 'Gạch bông tiles', desc: 'Vietnamese cement tiles drawn from any text you type.', url: 'https://tiles.starb.ca', image: '/projects/tiles.png' },
```

## API

`GET /api/tile` returns an SVG tile for any text. The same text always gives the same tile. All parameters except `seed` are optional.

| Parameter | Default | Meaning |
|---|---|---|
| `seed` | none (required) | The text, up to 200 characters. Use a user name or email. |
| `size` | `256` | Width and height in pixels, from 16 to 1024. |
| `tiles` | `2` | Tiles on each side, from 1 to 6. A four-tile design always gets an even number. |
| `noise` | `0` | Set `1` for the worn look (wobble, grain and flecks). |
| `palette` | from the seed | A number from 0 to 11, or a name such as `jade` or `hoi an`. The shapes stay the same. Only the colors change. |

Example:

```html
<img src="https://tiles.starb.ca/api/tile?seed=minh@example.com&size=128" width="128" height="128">
```

- A wrong value gives a 400 response with a JSON `{ "error": "..." }` message.
- The response has `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=86400`.
- The SVG does not contain the seed, so an email address in the URL does not appear in the image.
- To use the picture as an avatar, store the seed (or the full URL) with the user. Then the picture never changes. Round the corners with CSS (`border-radius: 50%`).

## Use the generator in code

```js
const { design, render } = require('./public/tile.js'); // in the browser: window.GachBong
const d = design('hội an');
const svg = render(d, { tiles: 6, worn: true });
```

- `design(seed, { palette })` returns `{ seed, quad, palette, colors, bg, els, wearSeed }`. `quad` is `true` for a four-tile design. `palette` is an optional index from 0 to 11 that replaces the palette from the seed.
- `render(design, { tiles, worn })` returns an SVG string with `tiles` × `tiles` tiles, 20 cm each. For a four-tile design, use an even number of tiles.

## How it works

The pattern lives on one square cell with the symmetry of a tiled floor (the wallpaper group p4m). The cell has 4-fold centers at its middle and its corners, and 2-fold centers at the middle of each edge. Each shape is drawn once and then repeated by these symmetries. As a result, motifs at the tile edges join with the neighboring tiles. A single tile is one full cell. In a four-tile design, each tile is one quarter of a cell.

A design is a stack of layers: a frame, a lattice, arms, small fillers, a small medallion and the main medallion. Each layer gets a color from one of 12 palettes. A layer never has the same color as the layer under it.

The worn look comes from SVG noise filters. They add a small wobble to the edges, grain, white flecks and faded areas.

## Change the favicon or the share image

- To change the favicon, run:

  ```sh
  node -e "const t=require('./public/tile.js');const d=t.design('saigon');require('fs').writeFileSync('public/favicon.svg',t.render(d,{tiles:d.quad?2:1,worn:false}))"
  ```

- To change the share image, save a new 1200 × 630 screenshot as `public/og.png`. Keep the file name, because the meta tags point to it.

## Animation

`animation/` holds a video that explains the math. It is about 100 seconds long and 1080 × 1920 (9:16), made for Reels. It has no sound.

- `index.html` is the animation. Open it in a browser to watch it. Press Space to pause. Press the left or right arrow to move 2 seconds. Add `?seed=word` to use another word, or `?t=40` to start at 40 seconds.
- `render.cjs` turns the page into `how-it-works.mp4`. It takes one screenshot for each frame, then runs `ffmpeg`.
- `how-it-works.mp4` is the result.

To render again, install `playwright-core`, then run `node render.cjs`. If Playwright cannot find a browser, set `CHROME` to the path of a Chromium file.

The animation does not use drawings made by hand. It runs `public/tile.js` and shows the real numbers, shapes and layers for the seed. The seven parts are the word, the cell, the petal, the ring of petals, the outline, the layers and the floor. The last card shows the address of the site. To change it, edit `END_URL` in `index.html`.

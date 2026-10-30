// Set CHROME to a Chromium path if Playwright cannot find one, and WORKERS to change the page count.
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const FPS = 30;
const out = path.resolve(process.argv[2] || path.join(__dirname, 'how-it-works.mp4'));
const seed = process.argv[3] || '';
const workers = +process.env.WORKERS || 6;
const url = 'file://' + path.join(__dirname, 'index.html') + '?capture' + (seed ? '&seed=' + encodeURIComponent(seed) : '');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gach-frames-'));
  const open = async () => {
    const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
    page.on('pageerror', e => { throw e; });
    await page.goto(url);
    await page.evaluate(() => window.ready);
    return page;
  };
  const pages = await Promise.all(Array.from({ length: workers }, open));
  const frames = Math.ceil((await pages[0].evaluate(() => window.TOTAL)) * FPS);
  console.log(`${frames} frames, ${workers} pages`);

  let next = 0, done = 0;
  await Promise.all(pages.map(async page => {
    for (let i = next++; i < frames; i = next++) {
      await page.evaluate(t => window.seek(t), i / FPS);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.png`) });
      if (++done % 300 === 0) console.log(`${done} / ${frames}`);
    }
  }));
  await browser.close();

  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('wrote ' + out);
})();

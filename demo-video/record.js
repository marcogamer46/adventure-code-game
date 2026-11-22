#!/usr/bin/env node
// record.js — records the tutorial scenes from index.html into demo-video/
// and assembles tutorial.mp4 with burned-in subtitles.
//
// Requires: playwright-core (chromium installed), ffmpeg/ffprobe on PATH.
// Usage:  node demo-video/record.js
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');
const { URL, SCENES } = require('./scenes');
const buildInitScript = require('./overlay');

const DIR = __dirname;
const SCENES_DIR = path.join(DIR, 'scenes');
const FPS = 30, W = 1280, H = 720;
const FINAL = path.join(DIR, 'tutorial.mp4');

const ONLY = process.env.ONLY; // e.g. ONLY=06-learn to run a single scene
const SCENE_LIST = ONLY ? SCENES.filter(s => s.id === ONLY) : SCENES;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ff = (args) => new Promise((res, rej) => {
  const p = spawn('ffmpeg', args, { cwd: DIR });
  let err = '';
  p.stderr.on('data', d => { err += d; });
  p.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg exit ' + code + ': ' + err.slice(-600))));
});

// Capture runs at ~20 fps (JPEG screenshots); feed that as the input framerate
// so 1s of wall-time = 1s of video, then re-time to 30fps on encode.
const CAP_FPS = 20;

function openEncoder(outPath) {
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(CAP_FPS), '-c:v', 'mjpeg', '-i', '-',
    '-an', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-color_range', 'limited', '-r', String(FPS), '-movflags', '+faststart', outPath];
  const enc = spawn('ffmpeg', args);
  enc.stderr.on('data', () => {});
  return enc;
}

function writeFrame(enc, buf) {
  return new Promise(res => {
    if (!enc.stdin.write(buf)) enc.stdin.once('drain', res); else res();
  });
}

async function probeDuration(file) {
  const { execFileSync } = require('child_process');
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of',
    'default=noprint_wrappers=1:nokey=1', file]).toString().trim();
  return parseFloat(out) || 0;
}

const assertSel = async (page, sel, need) => {
  const n = await page.evaluate(s => document.querySelectorAll(s).length, sel);
  if (n < need) throw new Error('element missing: ' + sel + ' (want ' + need + ', got ' + n + ')');
};

// ---------- movement drivers (live off window.__MV injected by overlay) ----------
async function mvOpen(page) {
  const d = await page.evaluate(() => window.__MV.openDir());
  if (d) await page.keyboard.press(d);
}
async function pressWall(page) {
  const d = await page.evaluate(() => window.__MV.wallDir());
  if (d) await page.keyboard.press(d);
}
async function autoCollect(page, m) {
  for (let i = 0; i < m; i++) {
    const d = await page.evaluate(() => { const p = window.__MV.pathToCollect(); return p && p.length ? p[0] : null; });
    if (!d) break;
    await page.keyboard.press(d); await sleep(430);
  }
}
async function autoEngage(page, m) {
  for (let i = 0; i < m; i++) {
    const adj = await page.evaluate(() => window.__MV.adjacentFoe());
    if (adj) { await page.keyboard.press('e'); await sleep(650); return; }
    const d = await page.evaluate(() => { const p = window.__MV.pathToAmbush(); return p && p.length ? p[0] : null; });
    if (!d) break;
    await page.keyboard.press(d); await sleep(430);
  }
}
async function dpadMove(page, m) {
  for (let i = 0; i < m; i++) {
    const pad = await page.evaluate(() => { const d = window.__MV.openDir(); return d ? window.__MV.dirToPad(d) : null; });
    if (!pad) break;
    await page.click('.padbtn[data-d="' + pad + '"]'); await sleep(480);
  }
}
async function awaitOver(page) {
  await page.waitForFunction(() => state && state.over, null, { timeout: 60000 }).catch(() => {});
}

// ---------- scene runner ----------
async function runSteps(sc, page, api) {
  const t0 = Date.now();
  const caps = [];
  const elapsed = () => (Date.now() - t0) / 1000;
  for (let si = 0; si < sc.steps.length; si++) {
    const st = sc.steps[si];
    process.stdout.write('      step ' + si + ' ' + st.a + (st.s ? ' ' + st.s : '') + '\n');
    switch (st.a) {
      case 'goto':
        await page.goto(URL);
        await page.waitForSelector('#board', { timeout: 20000 });
        api.startCapture();
        break;
      case 'wait': await sleep(st.ms); break;
      case 'cap': caps.push({ start: elapsed(), text: st.c }); await sleep(st.w || 1200); break;
      case 'focus': await page.evaluate(() => window.__MV.focus()); await sleep(st.w || 300); break;
      case 'click':
        await assertSel(page, st.s, 1);
        await page.click(st.s); await sleep(st.w || 500);
        break;
      case 'clickN':
        await assertSel(page, st.s, st.i + 1);
        // programmatic click: fires the element's own onclick (e.g. flowClick)
        // without depending on geometry/visibility/playwright actionability
        await page.evaluate(o => {
          const el = document.querySelectorAll(o.sel)[o.i];
          if (!el) return;
          if (typeof el.click === 'function') el.click();
          else if (el.dispatchEvent) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, { sel: st.s, i: st.i });
        await sleep(st.w || 500);
        break;
      case 'select':
        await assertSel(page, st.s, 1);
        await page.selectOption(st.s, st.v); await sleep(st.w || 400);
        break;
      case 'press':
        await page.keyboard.press(st.k); await sleep(st.w || 300); break;
      case 'mvOpen': await mvOpen(page); await sleep(st.w || 400); break;
      case 'pressWall': await pressWall(page); await sleep(st.w || 500); break;
      case 'autoCollect': await autoCollect(page, st.m || 4); await sleep(st.w || 300); break;
      case 'autoEngage': await autoEngage(page, st.m || 5); await sleep(st.w || 300); break;
      case 'dpadMove': await dpadMove(page, st.m || 3); await sleep(st.w || 400); break;
      case 'over': await awaitOver(page); await sleep(st.w || 400); break;
      default: throw new Error('unknown step action: ' + st.a);
    }
  }
  return { caps, elapsedEnd: elapsed() };
}

async function screenshotWithTimeout(page) {
  // Guard against a wedged Chromium screenshot leaving the pump hanging forever.
  return Promise.race([
    page.screenshot({ type: 'jpeg', quality: 85, timeout: 6000 }),
    sleep(7000).then(() => null)
  ]);
}

async function pumpLoop(page, enc, runningRef, result) {
  let fails = 0;
  try {
    while (runningRef.v) {
      const t0 = Date.now();
      const buf = await screenshotWithTimeout(page);
      if (buf == null) {
        fails++;
        if (fails > 10) { result.framesError = '10 consecutive screenshot timeouts'; break; }
        continue;
      }
      fails = 0;
      await writeFrame(enc, buf);
      const dt = Date.now() - t0;
      if (dt < 33) await sleep(33 - dt);
    }
  } catch (e) {
    result.framesError = e.message;
  }
}

async function recordOne(sc, ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  await page.addInitScript(buildInitScript());
  await page.setViewportSize({ width: W, height: H });

  fs.mkdirSync(SCENES_DIR, { recursive: true });
  const tmp = path.join(SCENES_DIR, sc.id + '.tmp.mp4');
  const out = path.join(SCENES_DIR, sc.id + '.mp4');
  const enc = openEncoder(tmp);

  const runningRef = { v: false };
  const frameResult = {};
  let pumpP = null;
  const api = {
    startCapture() { if (runningRef.v) return; runningRef.v = true; pumpP = pumpLoop(page, enc, runningRef, frameResult); },
  };

  let caps, elapsedEnd;
  try {
    const r = await runSteps(sc, page, api);
    caps = r.caps; elapsedEnd = r.elapsedEnd;
    await sleep(sc.tail || 1200);
    runningRef.v = false;
    if (pumpP) await pumpP;
    if (frameResult.framesError) throw new Error('capture error: ' + frameResult.framesError);
    await new Promise((res, rej) => { enc.stdin.end(); enc.on('close', c => c === 0 ? res() : rej(new Error('encoder exit ' + c))); });
    fs.renameSync(tmp, out);
  } catch (e) {
    try { enc.kill(); } catch (_) {}
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  } finally {
    await page.close();
  }

  const dur = await probeDuration(out);
  const scaled = caps.map(c => ({ start: c.start * (dur / Math.max(elapsedEnd, 0.001)), text: c.text }));
  console.log('  scene ' + sc.id + ' recorded  ' + dur.toFixed(2) + 's');
  return { scene: sc.id, dur, caps: scaled };
}

// ---------- SRT building ----------
function splitLines(text) {
  const words = text.split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 42 && cur) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function fmt(t) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60,
        s = Math.floor(ms / 1000) % 60, mm = ms % 1000;
  const p = n => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)},${String(mm).padStart(3, '0')}`;
}

function buildSrt(entries, outPath) {
  // entries: [{t, text}] sorted nondecreasing. Sequential scheduler:
  //   * segments never overlap (start >= previous end)
  //   * each caption duration in [3.4, 5]s (keeps reading speed <=15 cps for
  //     the <=48-char texts used here)
  //   * gaps longer than 5s are covered by repeated copies of the caption
  let n = 0;
  const segs = [];
  const total = entries.length ? Math.max(entries[entries.length - 1].t + 5, 0) : 0;
  let cur = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const start = Math.max(e.t, cur);
    const next = (i + 1 < entries.length) ? entries[i + 1].t : total;
    const gap = next - start;
    if (gap <= 5) {
      const dur = Math.max(gap, 3.4);
      segs.push({ t: start, d: dur, text: e.text });
      cur = start + dur;
    } else if (gap <= 6.8) {
      segs.push({ t: start, d: 5, text: e.text });
      cur = start + 5;
    } else {
      const chunks = Math.max(1, Math.round(gap / 4));
      const cd = gap / chunks;
      for (let k = 0; k < chunks; k++) segs.push({ t: start + k * cd, d: cd, text: e.text });
      cur = start + gap;
    }
  }
  let out = '';
  for (const s of segs) {
    n++;
    out += `${n}\n${fmt(s.t)} --> ${fmt(s.t + s.d)}\n${splitLines(s.text).join('\n')}\n\n`;
  }
  fs.writeFileSync(outPath, out);
  return segs;
}

// ---------- assembly ----------
async function assemble(results) {
  const listPath = path.join(DIR, 'concat.txt');
  fs.writeFileSync(listPath, results.map(r => `file 'scenes/${r.scene}.mp4'`).join('\n'));

  const concatTmp = path.join(DIR, 'concat.tmp.mp4');
  await ff(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', concatTmp]);
  const concat = path.join(DIR, 'concat.mp4');
  fs.renameSync(concatTmp, concat);

  let off = 0; const entries = [];
  for (const r of results) {
    for (const c of r.caps) entries.push({ t: off + c.start, text: c.text });
    off += r.dur;
  }
  const srtPath = path.join(DIR, 'captions.srt');
  const segs = buildSrt(entries, srtPath);

  const style = "FontName=Sans,Fontsize=34,PrimaryColour=&H00FFFFFF,BackColour=&H80000000," +
    "BorderStyle=3,Alignment=2,MarginV=20,Outline=0,Shadow=0";
  await ff(['-y', '-i', concat,
    '-vf', `subtitles=captions.srt:force_style='${style}',format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-color_range', 'limited', '-movflags', '+faststart', '-an', FINAL]);

  const dur = await probeDuration(FINAL);
  console.log('FINAL tutorial.mp4  ' + dur.toFixed(2) + 's, ' + segs.length + ' subtitle segments');
}

// ---------- main ----------
(async () => {
  if (!fs.existsSync(URL.replace('file://', ''))) {
    console.error('index.html not found at ' + URL); process.exit(1);
  }
  const browser = await chromium.launch({ headless: true });
  const mainCtx = await browser.newContext({ viewport: { width: W, height: H } });
  const results = [];
  const capsPath = path.join(SCENES_DIR, 'caps.json');
  try {
    if (process.env.REBUILD_ONLY) {
      // Rebuild captions.srt + re-burn subtitles from already-recorded scenes,
      // using the persisted caption events (no re-recording).
      const saved = JSON.parse(fs.readFileSync(capsPath, 'utf8'));
      for (const sc of SCENE_LIST) {
        const rec = saved[sc.id];
        if (!rec || !fs.existsSync(path.join(SCENES_DIR, sc.id + '.mp4'))) {
          throw new Error('REBUILD_ONLY: missing scene/caps for ' + sc.id);
        }
        results.push({ scene: sc.id, dur: rec.dur, caps: rec.caps });
      }
    } else {
      for (const sc of SCENE_LIST) {
        process.stdout.write('recording ' + sc.id + ' ...\n');
        if (sc.touch) {
          const tctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: false });
          try {
            results.push(await recordOne(sc, tctx));
          } finally {
            await tctx.close();
          }
        } else {
          results.push(await recordOne(sc, mainCtx));
        }
      }
      // persist caption events so later rebuilds can skip recording
      const capMap = {};
      for (const r of results) capMap[r.scene] = { dur: r.dur, caps: r.caps };
      fs.writeFileSync(capsPath, JSON.stringify(capMap));
    }
    await assemble(results);
  } catch (e) {
    console.error('RECORD FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    await mainCtx.close();
    await browser.close();
  }
})();

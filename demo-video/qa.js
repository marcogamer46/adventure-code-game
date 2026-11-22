#!/usr/bin/env node
// qa.js — text-only QA for tutorial.mp4 + captions.srt.
//   * ffprobe: 1280x720, 30fps, H.264 yuv420p, one video stream, no audio,
//     size <100MB
//   * captions.srt: non-overlap, each duration 2.5–5s, <=2 lines, <=42 chars
//     per line, reading speed <=15 cps
//   * sampled frames: non-blank, bright subtitle band, not a duplicate of the
//     previous sample
//   * ffmpeg decode: exit 0 with no errors
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const DIR = __dirname;
const FINAL = path.join(DIR, 'tutorial.mp4');
const SRT = path.join(DIR, 'captions.srt');

const FAILS = [];
const check = (c, l) => { console.log((c ? '  PASS ' : '  FAIL ') + l); if (!c) FAILS.push(l); };

const sh = (cmd, args) => spawnSync(cmd, args, { cwd: DIR, maxBuffer: 64 * 1024 * 1024 });

// ---------- 1. container / codec ----------
let probe = null;
try {
  const out = execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', FINAL]).toString();
  probe = JSON.parse(out);
} catch (e) {
  check(false, 'ffprobe ran on tutorial.mp4: ' + e.message);
}

if (probe) {
  const v = probe.streams.find(s => s.codec_type === 'video');
  const a = probe.streams.find(s => s.codec_type === 'audio');
  const sizeMB = (parseInt(probe.format.size || 0, 10) / 1048576);
  check(v && v.width === 1280 && v.height === 720, 'resolution 1280x720 (got ' + (v ? v.width + 'x' + v.height : 'none') + ')');
  const fps = v ? (v.avg_frame_rate || v.r_frame_rate) : '0/0';
  const [fn, fd] = fps.split('/').map(Number);
  check(v && fd && Math.round(fn / fd) === 30, 'frame rate 30fps (got ' + fps + ')');
  check(v && v.codec_name === 'h264', 'video codec H.264 (got ' + (v && v.codec_name) + ')');
  check(v && v.pix_fmt === 'yuv420p', 'pixel format yuv420p (got ' + (v && v.pix_fmt) + ')');
  check(!a, 'no audio stream');
  check(sizeMB < 100, 'size < 100MB (got ' + sizeMB.toFixed(1) + 'MB)');
}

// ---------- 2. decode errors ----------
const dec = sh('ffmpeg', ['-v', 'error', '-i', FINAL, '-f', 'null', '-']);
check(dec.status === 0, 'ffmpeg decode exit 0 (got ' + dec.status + ')');

// ---------- 3. SRT constraints ----------
function parseSrt(txt) {
  const blocks = txt.trim().split(/\n{2,}/);
  const out = [];
  for (const b of blocks) {
    const lines = b.split('\n');
    const m = lines[1].match(/^(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)$/);
    if (!m) continue;
    const t = (a, b, c, d) => a * 3600 + b * 60 + c + d / 1000;
    out.push({ start: t(+m[1], +m[2], +m[3], +m[4]), end: t(+m[5], +m[6], +m[7], +m[8]), lines: lines.slice(2) });
  }
  return out;
}

const segs = parseSrt(fs.readFileSync(SRT, 'utf8'));
check(segs.length > 0, 'captions.srt has segments (' + segs.length + ')');

let overlapOk = true;
for (let i = 0; i < segs.length; i++) {
  if (i && segs[i].start < segs[i - 1].end - 0.001) { overlapOk = false; console.log('   overlap @' + i); }
}
check(overlapOk, 'subtitle segments do not overlap');

let durOk = true, readOk = true, lineOk = true, lenOk = true;
for (const s of segs) {
  const dur = s.end - s.start;
  if (dur < 2.5 || dur > 5.0001) { durOk = false; console.log('   bad duration ' + dur.toFixed(2) + ' "' + s.lines.join(' / ') + '"'); }
  const text = s.lines.join(' ');
  const cps = text.length / dur;
  if (cps > 15) { readOk = false; console.log('   too fast ' + cps.toFixed(1) + 'cps "' + text + '"'); }
  if (s.lines.length > 2) { lineOk = false; console.log('   >2 lines "' + text + '"'); }
  for (const L of s.lines) if (L.length > 42) { lenOk = false; console.log('   line >42 "' + L + '"'); }
}
check(durOk, 'all durations in [2.5, 5]s');
check(readOk, 'reading speed <=15 cps');
check(lineOk, 'max 2 lines per subtitle');
check(lenOk, 'max 42 chars per line');

// ---------- 4. sampled frames (via PIL) ----------
const pyScript = `
import sys, subprocess, io
from PIL import Image
final = sys.argv[1]
samples = sys.argv[2:]  # times
imgs = []
for t in samples:
    p = subprocess.run(['ffmpeg','-v','error','-ss',t,'-i',final,'-frames:v','1','-f','image2','pipe:1'],
                       capture_output=True)
    if p.returncode != 0:
        imgs.append(None); continue
    imgs.append(Image.open(io.BytesIO(p.stdout)).convert('RGB'))
report = []
for i, im in enumerate(imgs):
    if im is None:
        report.append({'i': i, 'err': True}); continue
    px = im.load(); W,H = im.size
    # luminance variance
    gray = im.convert('L'); hist = gray.histogram()
    n = W*H
    mean = sum(k*v for k,v in enumerate(hist))/n
    var = sum(v*(k-mean)**2 for k,v in enumerate(hist))/n
    # subtitle band: bottom 12%
    band = im.crop((0, int(H*0.86), W, H)).convert('L')
    bp = list(band.getdata())
    bright = sum(1 for x in bp if x > 200)
    report.append({'i': i, 'var': var, 'bright': bright, 'total_band': len(bp)})
# difference between consecutive samples
for i in range(1, len(imgs)):
    if imgs[i] is None or imgs[i-1] is None:
        continue
    a = imgs[i].convert('L').resize((64,40)); b = imgs[i-1].convert('L').resize((64,40))
    pa = list(a.getdata()); pb = list(b.getdata())
    diff = sum(abs(x-y) for x,y in zip(pa,pb)) / len(pa)
    report[i-1]['diff'] = diff
import json
print(json.dumps(report))
`;

const pyFile = path.join(DIR, '_qa_frames.py');
fs.writeFileSync(pyFile, pyScript);

if (!fs.existsSync(FINAL)) {
  console.log('  SKIP frame checks (no tutorial.mp4)');
} else {
  const mid = segs.map(s => ((s.start + s.end) / 2).toFixed(2));
  const step = Math.max(1, Math.floor(mid.length / 15));
  const chosen = [];
  for (let i = 0; i < mid.length; i += step) { chosen.push(mid[i]); if (chosen.length >= 15) break; }
  if (!chosen.length) chosen.push(mid[0]);
  const r = sh('python3', [pyFile, FINAL, ...chosen]);
  if (r.status !== 0) {
    check(false, 'frame extraction ran: ' + r.stderr.toString().slice(-400));
  } else {
    const frames = JSON.parse(r.stdout.toString());
    let blankOk = true, bandOk = true, dupOk = true;
    for (const f of frames) {
      if (f.err) { blankOk = false; continue; }
      if (f.var < 15) { blankOk = false; console.log('   low variance frame ' + f.i + ' var=' + Math.round(f.var)); }
      if (f.bright < 1) { bandOk = false; console.log('   no bright subtitle text frame ' + f.i); }
      if (f.diff !== undefined && f.diff < 0.5) { dupOk = false; console.log('   duplicate frame ' + f.i + ' diff=' + f.diff.toFixed(2)); }
    }
    check(blankOk, 'sampled frames are not blank');
    check(bandOk, 'subtitle band contains bright text pixels');
    check(dupOk, 'sampled frames are not duplicates of the previous sample');
  }
}

fs.unlinkSync(pyFile);

console.log('\n' + (FAILS.length ? '=== ' + FAILS.length + ' CHECKS FAILED ===' : '=== ALL QA CHECKS PASSED ==='));
process.exit(FAILS.length ? 1 : 0);

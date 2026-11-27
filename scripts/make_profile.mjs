// Generates every SVG the profile README uses: the animated coding-agent terminal hero and the
// bento-grid project tiles. All tile text is outlined via opentype.js, and animations use pure
// CSS keyframes so GitHub renders them natively inside <img> tags.
//
//   cd scripts && npm install && npm run build

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets', 'profile');
const CACHE = path.join(HERE, '.cache');
const LOCAL_PORTFOLIO = path.resolve(HERE, '..', '..', 'hoang-portfolio', 'assets');
const RAW_PORTFOLIO = 'https://raw.githubusercontent.com/hoang-IT-eng/hoang-portfolio/main/assets';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const font = (pkg, file) => {
  const b = fs.readFileSync(path.join(HERE, 'node_modules', '@fontsource', pkg, 'files', file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const SANS = font('geist-sans', 'geist-sans-latin-500-normal.woff');
const BOLD = font('geist-sans', 'geist-sans-latin-600-normal.woff');

// Outlined text. `track` is letter spacing in px, `anchor` is start, middle or end.
const width = (f, s, size, track = 0) => f.getAdvanceWidth(s, size) + track * (s.length - 1);
function d(f, s, x, y, size, { anchor = 'start', track = 0 } = {}) {
  const w = width(f, s, size, track);
  const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return f.getPath(s, x0, y, size, { letterSpacing: track / size }).toPathData(size > 30 ? 1 : 2);
}
const text = (f, s, x, y, size, fill, o = {}) =>
  `<path fill="${fill}" d="${d(f, s, x, y, size, o)}"${o.cls ? ` class="${o.cls}"` : ''}/>`;

// A timeline on one clock. Each element gets its own @keyframes, written in seconds.
function clock(T) {
  const rules = [];
  let n = 0;
  return {
    css: () => rules.join(''),
    anim(stops, extra = '') {
      const id = `a${n++}`;
      const frames = stops.map(([t, p, ease]) => {
        const body = [
          p.o !== undefined && `opacity:${p.o}`,
          p.t && `transform:${p.t}`,
          ease && `animation-timing-function:${ease}`,
        ]
          .filter(Boolean)
          .join(';');
        return `${+(t / T * 100).toFixed(3)}%{${body}}`;
      });
      const first = stops[0][1];
      const last = stops[stops.length - 1][1];
      if (stops[0][0] > 0) {
        frames.unshift(
          `0%{${first.o !== undefined ? `opacity:${first.o};` : ''}${first.t ? `transform:${first.t}` : ''}}`
        );
      }
      frames.push(
        `100%{${last.o !== undefined ? `opacity:${last.o};` : ''}${last.t ? `transform:${last.t}` : ''}}`
      );
      rules.push(`@keyframes ${id}{${frames.join('')}}.${id}{animation:${id} ${T}s linear both;${extra}}`);
      return id;
    },
  };
}

/* ------------------------------------------------------------------ hero */

const ART = { cols: 40, rows: 18, size: 9.6, frames: 60, loop: 5 };
const RAMP = '.,-~:;=!*#$@';

function knotFrames() {
  const { cols, rows, frames } = ART;
  const aspect = 0.6;
  const p = 2, q = 3, tube = 0.42, K2 = 7.2, K1 = 15.4;
  const curve = (t) => {
    const r = Math.cos(q * t) + 2.1;
    return [r * Math.cos(p * t), r * Math.sin(p * t), -Math.sin(q * t) * 1.15];
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (v) => {
    const l = Math.hypot(...v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  const pts = [];
  const U = 1500, V = 44, e = 1e-3;
  for (let i = 0; i < U; i++) {
    const t = (i / U) * Math.PI * 2;
    const c = curve(t);
    const T = norm(sub(curve(t + e), curve(t - e)));
    const T2 = norm(sub(curve(t + 2 * e), c));
    const N = norm(sub(T2, T));
    const B = cross(T, N);
    for (let j = 0; j < V; j++) {
      const a = (j / V) * Math.PI * 2;
      const n = [
        N[0] * Math.cos(a) + B[0] * Math.sin(a),
        N[1] * Math.cos(a) + B[1] * Math.sin(a),
        N[2] * Math.cos(a) + B[2] * Math.sin(a),
      ];
      pts.push([c[0] + tube * n[0], c[1] + tube * n[1], c[2] + tube * n[2], ...n]);
    }
  }

  const light = norm([-0.4, 0.8, -1]);
  const out = [];
  for (let f = 0; f < frames; f++) {
    const A = (f / frames) * Math.PI * 2;
    const spin = A / 3;
    const tilt = 0.62 + 0.28 * Math.sin(A);
    const yaw = 0.38 * Math.sin(A + 1.2);
    const cs = Math.cos(spin), ss = Math.sin(spin);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const rot = (x, y, z) => {
      const x1 = x * cs - y * ss, y1 = x * ss + y * cs;
      const y2 = y1 * ct - z * st, z2 = y1 * st + z * ct;
      return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
    };
    const zbuf = new Float32Array(cols * rows);
    const chars = new Array(cols * rows).fill(' ');
    for (const [x, y, z, nx, ny, nz] of pts) {
      const [X, Y, Z] = rot(x, y, z);
      const ooz = 1 / (Z + K2);
      const col = Math.round(cols / 2 + (K1 * X * ooz) / aspect);
      const row = Math.round(rows / 2 - K1 * Y * ooz);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const k = row * cols + col;
      if (ooz <= zbuf[k]) continue;
      zbuf[k] = ooz;
      const [NX, NY, NZ] = rot(nx, ny, nz);
      const lum = NX * light[0] + NY * light[1] + NZ * light[2];
      chars[k] = RAMP[Math.min(RAMP.length - 1, Math.floor(((lum + 1) / 2) ** 1.6 * RAMP.length))];
    }
    const lines = [];
    for (let r = 0; r < rows; r++) lines.push(chars.slice(r * cols, (r + 1) * cols).join(''));
    out.push(lines);
  }
  return out;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tone = (ch) => ('.,-~'.includes(ch) ? 'd' : ':;=!'.includes(ch) ? 'm' : 'h');

function frameText(lines, cls, style) {
  const { size } = ART;
  const adv = size * 0.6;
  let body = '';
  lines.forEach((line, r) => {
    const lead = line.length - line.trimStart().length;
    const s = line.trim();
    if (!s) return;
    let runs = '', cur = null, buf = '';
    for (const ch of s) {
      const t = ch === ' ' ? cur : tone(ch);
      if (t !== cur && buf) {
        runs += `<tspan class="${cur}">${esc(buf)}</tspan>`;
        buf = '';
      }
      cur = t;
      buf += ch;
    }
    if (buf) runs += `<tspan class="${cur}">${esc(buf)}</tspan>`;
    body += `<tspan x="${(lead * adv).toFixed(1)}" y="${((r + 1) * size - 2).toFixed(1)}">${runs}</tspan>`;
  });
  return `<text class="${cls}"${style ? ` style="${style}"` : ''}>${body}</text>`;
}

function hero() {
  const W = 846, H = 378, L = 5, R = 841, TOP = 30;
  const c = clock(5);
  const C = { screen: '#0c0c0c', bar: '#161616', ink: '#ededed', soft: '#a1a1a1', dim: '#6b6b6b', line: '#3a3a3a' };
  const mono = (s) =>
    fs
      .readFileSync(path.join(HERE, 'node_modules', '@fontsource', 'geist-mono', 'files', `geist-mono-latin-${s}-normal.woff2`))
      .toString('base64');
  const BOX = { x: 24, y: 46, w: 798, h: 248 };
  const DIV = 330;
  const show = (at, from = 'translateY(4px)') =>
    c.anim([
      [at, { o: 0, t: from }, 'cubic-bezier(.2,.8,.2,1)'],
      [at + 0.22, { o: 1, t: 'none' }],
    ]);
  const t = (x, y, s, fill, size = 13, extra = '') =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}"${extra}>${esc(s)}</text>`;

  // Spinning 3D ASCII torus knot
  const frames = knotFrames();
  const dt = ART.loop / ART.frames;
  const art = frames
    .map((lines, i) => frameText(lines, i ? 'f' : 'f f0', `animation-delay:${(-(ART.loop - i * dt)).toFixed(3)}s`))
    .join('');
  const artW = ART.cols * ART.size * 0.6, artH = ART.rows * ART.size;
  const small = 1, big = 1.8, cx = W / 2, cy = (H + 8) / 2;
  const slotX = BOX.x + (DIV - BOX.x) / 2 - (artW * small) / 2;
  const slotY = BOX.y + 40;
  const at = (x, y, s) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s})`;
  const centre = at(cx - (artW * big) / 2, cy - (artH * big) / 2, big);
  const deep = at(cx - (artW * 0.04) / 2, cy - (artH * 0.04) / 2, 0.04);
  const land = at(slotX, slotY, small);
  const knot = c.anim(
    [
      [0.45, { o: 0, t: deep }, 'cubic-bezier(.16,1,.3,1)'],
      [1.7, { o: 1, t: centre }],
      [3.2, { o: 1, t: centre }, 'cubic-bezier(.7,0,.25,1)'],
      [3.95, { o: 1, t: land }],
    ],
    'transform-origin:0 0'
  );

  // Starfield warp intro
  let rnd = 7;
  const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  let stars = '', starCss = '';
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2, reach = 360 + rand() * 260;
    const dx = Math.cos(a) * reach, dy = Math.sin(a) * reach * 0.62;
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(0);
    const dur = 0.5 + rand() * 0.55, delay = 0.1 + rand() * dur;
    const streak = i % 3 !== 0;
    const ch = streak ? '-' : ['.', '+', '*'][i % 9 === 0 ? 2 : i % 2];
    const end = streak ? 'scale(5,1.1)' : 'scale(2.4)';
    starCss += `@keyframes w${i}{0%{opacity:0;transform:translate(${cx}px,${cy}px) rotate(${deg}deg) scale(.3)}30%{opacity:1}100%{opacity:0;transform:translate(${(cx + dx).toFixed(0)}px,${(cy + dy).toFixed(0)}px) rotate(${deg}deg) ${end}}}.w${i}{animation:w${i} ${dur.toFixed(2)}s cubic-bezier(.6,0,1,.5) ${delay.toFixed(2)}s ${Math.ceil((3.1 - delay) / dur)} both}`;
    stars += `<text class="w${i}" font-size="14" text-anchor="middle" fill="${i % 4 ? C.soft : C.ink}">${ch}</text>`;
  }
  const warp = c.anim([
    [0, { o: 1 }],
    [2.8, { o: 1 }],
    [3.2, { o: 0 }],
  ]);

  // Window chrome
  const chrome = c.anim([
    [2.85, { o: 0 }],
    [3.15, { o: 1 }],
  ]);
  const dots = [0, 1, 2]
    .map((i) => `<circle cx="${L + 20 + i * 18}" cy="15" r="5.5" fill="#3a3a3a"/>`)
    .join('');
  const titlebar = `<g class="${chrome}"><path d="M${L} 12a12 12 0 0 1 12-12h${R - L - 24}a12 12 0 0 1 12 12v${TOP - 12}H${L}z" fill="${C.bar}"/>${dots}${t(W / 2, 19.5, '~/hoang-IT-eng', C.dim, 12, ' text-anchor="middle"')}</g>`;

  // Welcome panel
  const label = 'hoang-IT-eng';
  const labelW = label.length * 13 * 0.6 + 14;
  const panel = `<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="8" fill="none" stroke="${C.line}" stroke-width="1.2" pathLength="1" class="dr"/>
<g class="${show(3.55, 'none')}"><rect x="${BOX.x + 14}" y="${BOX.y - 8}" width="${labelW}" height="16" fill="${C.screen}"/>${t(BOX.x + 21, BOX.y + 4.5, label, C.soft, 13)}</g>
<path d="M${DIV} ${BOX.y + 22}V${BOX.y + BOX.h - 22}" stroke="${C.line}" stroke-width="1.2" class="${show(3.6, 'scaleY(0)')}" style="transform-origin:${DIV}px ${BOX.y + BOX.h / 2}px"/>`;

  // Left column
  const leftMid = BOX.x + (DIV - BOX.x) / 2;
  const left = `<g class="${show(3.9)}">${t(leftMid, BOX.y + 30, 'Tran Huy Hoang', C.ink, 14.5, ' text-anchor="middle" font-weight="700"')}</g>
<g class="${show(4.0)}">${t(leftMid, BOX.y + BOX.h - 18, 'Ho Chi Minh City, Vietnam', C.dim, 12.5, ' text-anchor="middle"')}</g>`;

  // Right column
  const RX = DIV + 24;
  const rows = [
    ['About', 'h'],
    ['Full-stack & applied-AI engineer.', 'b'],
    ['From WebGL choreography to DB locks & CV.', 'b'],
    [null, 'rule'],
    ['Stack', 'h'],
    ['TypeScript · React · NestJS · .NET · Python', 's'],
    [null, 'gap'],
    ['Elsewhere', 'h'],
    ['hoang-folio.pages.dev · x.com/leontran_o', 's'],
  ];
  let y = BOX.y + 34, right = '';
  rows.forEach(([s, kind], i) => {
    const when = 3.95 + i * 0.055;
    if (kind === 'rule') {
      right += `<path d="M${RX} ${y - 6}H${BOX.x + BOX.w - 24}" stroke="${C.line}" stroke-width="1" class="${show(when, 'scaleX(0)')}" style="transform-origin:${RX}px 0"/>`;
      y += 22;
      return;
    }
    if (kind === 'gap') {
      y += 8;
      return;
    }
    const fill = kind === 'h' ? C.ink : C.soft;
    right += `<g class="${show(when)}">${t(RX, y, s, fill, 13, kind === 'h' ? ' font-weight="700"' : '')}</g>`;
    y += kind === 'h' ? 22 : 20;
  });

  // Prompt bar
  const PY = BOX.y + BOX.h + 14, PH = 38;
  const prompt = `<g class="${show(4.45)}"><rect x="${BOX.x}" y="${PY}" width="${BOX.w}" height="${PH}" rx="6" fill="none" stroke="#575757" stroke-width="1.2"/>
${t(BOX.x + 14, PY + 24, '>', C.ink, 13.5)}<rect x="${BOX.x + 32}" y="${PY + 12}" width="8.1" height="16" fill="${C.ink}" class="bl"/>
${t(BOX.x + 44, PY + 24, 'Try "match my JD against 8 shipped systems"', C.dim, 13.5)}</g>
<g class="${show(4.6)}">${t(BOX.x + 14, PY + PH + 18, '? for shortcuts', C.dim, 12)}</g>`;

  const css = `
@font-face{font-family:GM;font-weight:500;src:url(data:font/woff2;base64,${mono(500)}) format('woff2')}
@font-face{font-family:GM;font-weight:700;src:url(data:font/woff2;base64,${mono(700)}) format('woff2')}
text{font-family:GM,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:500;white-space:pre}
.d{fill:#4d4d4d}.m{fill:#9b9b9b}.h{fill:#f4f4f4}
.f{font-size:${ART.size}px;opacity:0;animation:fr ${ART.loop}s step-end infinite}.f0{opacity:1}
@keyframes fr{0%{opacity:1}${(100 / ART.frames).toFixed(3)}%{opacity:0}100%{opacity:0}}
.dr{stroke-dasharray:1;animation:dr .8s cubic-bezier(.65,0,.35,1) 3.05s both}@keyframes dr{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.bl{animation:bl 1.05s steps(1) infinite}@keyframes bl{50%{opacity:0}}
${starCss}${c.css()}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.intro{display:none}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="A terminal styled like a coding agent CLI. Welcome panel for Tran Huy Hoang, Ho Chi Minh City, Vietnam, with a spinning ASCII torus knot. About: full-stack and applied-AI engineer. Stack: TypeScript, React, NestJS, .NET, Python.">
<title>Tran Huy Hoang</title>
<defs><clipPath id="win"><rect x="${L}" y="0" width="${R - L}" height="${H - 4}" rx="12"/></clipPath></defs>
<style>${css.replace(/\n/g, '')}</style>
<rect x="${L}" y="0" width="${R - L}" height="${H - 4}" rx="12" fill="${C.screen}"/>
<g clip-path="url(#win)">
<g class="intro ${warp}">${stars}</g>
${panel}
<g class="${knot}" style="transform:${land};transform-origin:0 0">${art}</g>
${titlebar}${left}${right}${prompt}
</g>
</svg>`;
}

/* ----------------------------------------------------------------- tiles */

async function readAsset(relPath) {
  const localPath = path.join(LOCAL_PORTFOLIO, relPath);
  if (fs.existsSync(localPath)) return fs.readFileSync(localPath);
  const url = `${RAW_PORTFOLIO}/${relPath}`;
  const file = path.join(CACHE, relPath.replace(/[^a-z0-9.]+/gi, '_'));
  if (!fs.existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(file);
}

async function still(src, w, h, quality = 66) {
  let img = sharp(await readAsset(src.path));
  if (src.crop) {
    img = img.extract({ left: src.crop[0], top: src.crop[1], width: src.crop[2], height: src.crop[3] });
  }
  img = img.resize(w * 2, h * 2, { fit: 'cover', position: src.pos ?? 'centre' });
  const out = await img.webp({ quality }).toBuffer();
  return `data:image/webp;base64,${out.toString('base64')}`;
}

const INK = '#0e0e0e', SOFT = '#a3a3a3';

function slideshow(images, w, h, { hold = 3.0, fade = 0.85, cut = false } = {}) {
  const n = images.length;
  const cycle = cut ? hold * n : (hold + fade) * n;
  let css = '', out = '';
  images.forEach((img, i) => {
    const pct = (s) => +(s / cycle * 100).toFixed(3);
    if (i > 0) {
      const a = i * (cut ? hold : hold + fade);
      const start = cut ? a : a - fade;
      const end = a + hold;
      const f = cut
        ? `0%,${pct(a) - 0.001}%{opacity:0}${pct(a)}%,${pct(end) - 0.001}%{opacity:1}${pct(end)}%,100%{opacity:0}`
        : `0%,${pct(start)}%{opacity:0}${pct(a)}%,${pct(end)}%{opacity:1}${pct(Math.min(end + fade, cycle))}%,100%{opacity:${i === n - 1 ? 1 : 0}}`;
      css += `@keyframes s${i}{${f}}.s${i}{animation:s${i} ${cycle}s linear infinite}`;
    }
    out += `<image href="${img}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${i ? ` class="s${i}"` : ''}/>`;
  });
  return { css, out };
}

function tile({ w, h, plate, name, desc, right, sub, title, big }) {
  return ({ css = '', art }) => {
    const gx = 5, tw = w - gx * 2, th = h - 4, ih = th - plate;
    const nameSize = big ? 21 : 16.5, descSize = big ? 13.5 : 12.2, pad = big ? 16 : 13;
    const y1 = ih + (big ? 25 : 22), y2 = ih + (big ? 44 : 40);
    const rx = tw - pad;
    let side = '';
    if (right?.label) {
      side += text(SANS, right.label, rx, y1 - 0.5, big ? 13.5 : 12, SOFT, { anchor: 'end' });
    }
    if (sub) side += text(SANS, sub, rx, y2, descSize, SOFT, { anchor: 'end' });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">
<title>${title}</title><defs><clipPath id="c"><rect width="${tw}" height="${th}" rx="14"/></clipPath></defs>
<style>${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<g transform="translate(${gx} 0)" clip-path="url(#c)"><rect width="${tw}" height="${th}" fill="${INK}"/>${art(tw, ih)}
${text(BOLD, name, pad, y1, nameSize, '#fff', { track: -0.2 })}${text(SANS, desc, pad, y2, descSize, SOFT)}${side}</g>
</svg>`;
  };
}

/* ------------------------------------------------------------------ main */

const write = (name, svg) => {
  const clean = svg.replace(/\n/g, '');
  fs.writeFileSync(path.join(OUT, name), clean);
  console.log(name.padEnd(24), `${(Buffer.byteLength(clean) / 1024).toFixed(0)} KB`);
};

write('hero.svg', hero());

const BIG = { w: 423, h: 192, plate: 58, big: true };
const SMALL = { w: 211, h: 140, plate: 54, big: false };
const IMG_BIG = [BIG.w - 10, BIG.h - 4 - BIG.plate];
const IMG_SMALL = [SMALL.w - 10, SMALL.h - 4 - SMALL.plate];

// 1. Enigma (big)
{
  const frames = await Promise.all(
    [
      { path: 'projects/fashion/ui.webp', pos: 'centre' },
      { path: 'projects/fashion/live.webp', pos: 'top' },
      { path: 'projects/fashion/admin.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_BIG, 66))
  );
  const s = slideshow(frames, ...IMG_BIG, { hold: 3.2 });
  write(
    'tile-enigma.svg',
    tile({
      ...BIG,
      name: 'Enigma',
      desc: 'Streetwear drops & live auctions',
      right: { label: 'Three.js · NestJS' },
      sub: 'fe-fashion-shop',
      title: 'Enigma: Streetwear drops, anti-snipe live auctions and AI Stylist. React, Three.js, NestJS, PostgreSQL.',
    })({ css: s.css, art: () => s.out })
  );
}

// 2. Supply (big)
{
  const frames = await Promise.all(
    [
      { path: 'projects/office/ui.webp', pos: 'top' },
      { path: 'projects/office/chat.webp', pos: 'top' },
      { path: 'projects/office/admin.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_BIG, 66))
  );
  const s = slideshow(frames, ...IMG_BIG, { hold: 3.4 });
  write(
    'tile-supply.svg',
    tile({
      ...BIG,
      name: 'Supply',
      desc: 'Microservices commerce & GenUI RAG',
      right: { label: 'Next · MSSQL' },
      sub: 'gateway + 2 dbs',
      title: 'Supply: Split API Gateway, Identity and Commerce microservices on SQL Server 2022 with GenUI RAG.',
    })({ css: s.css, art: () => s.out })
  );
}

// 3. Layers (small)
{
  const frames = await Promise.all(
    [
      { path: 'projects/tasks/ui.webp', pos: 'centre' },
      { path: 'projects/tasks/copilot.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_SMALL, 64))
  );
  const s = slideshow(frames, ...IMG_SMALL, { hold: 2.8 });
  write(
    'tile-layers.svg',
    tile({
      ...SMALL,
      name: 'Layers',
      desc: 'Mini-Jira & AI Copilot',
      right: { label: '.NET 8' },
      title: 'Layers: Agile workspace with Clean Architecture C# backend and Hybrid RAG Sprint Copilot.',
    })({ css: s.css, art: () => s.out })
  );
}

// 4. An Roastery (small)
{
  const frames = await Promise.all(
    [
      { path: 'projects/coffee/ui.webp', pos: 'centre' },
      { path: 'projects/coffee/kds.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_SMALL, 64))
  );
  const s = slideshow(frames, ...IMG_SMALL, { hold: 3.0 });
  write(
    'tile-roastery.svg',
    tile({
      ...SMALL,
      name: 'An Roastery',
      desc: 'Hospitality POS & KDS',
      right: { label: 'SignalR' },
      title: 'An Roastery: Live cafe floor map, POS terminal and real-time SignalR Barista KDS.',
    })({ css: s.css, art: () => s.out })
  );
}

// 5. IronLog (small)
{
  const frames = await Promise.all(
    [
      { path: 'projects/gymverse/ui.webp', pos: 'centre' },
      { path: 'projects/gymverse/workout.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_SMALL, 64))
  );
  const s = slideshow(frames, ...IMG_SMALL, { hold: 3.1 });
  write(
    'tile-ironlog.svg',
    tile({
      ...SMALL,
      name: 'IronLog',
      desc: 'Offline gym log & 3D',
      right: { label: 'Kotlin' },
      title: 'IronLog: Offline-first Android workout tracker with Room SQLite and Three.js 3D showcase.',
    })({ css: s.css, art: () => s.out })
  );
}

// 6. Attend (small)
{
  const frames = await Promise.all(
    [
      { path: 'projects/attendance/ui.webp', pos: 'centre' },
      { path: 'projects/attendance/kiosk.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_SMALL, 64))
  );
  const s = slideshow(frames, ...IMG_SMALL, { hold: 2.9 });
  write(
    'tile-attend.svg',
    tile({
      ...SMALL,
      name: 'Attend',
      desc: 'Liveness biometric kiosk',
      right: { label: 'FastAPI' },
      title: 'Attend: Real-time face recognition kiosk with MediaPipe double-blink liveness and Facenet512.',
    })({ css: s.css, art: () => s.out })
  );
}

// 7. Plates (big)
{
  const frames = await Promise.all(
    [
      { path: 'projects/plates/ui.webp', pos: 'centre' },
      { path: 'projects/plates/workbench.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_BIG, 66))
  );
  const s = slideshow(frames, ...IMG_BIG, { hold: 3.3 });
  write(
    'tile-plates.svg',
    tile({
      ...BIG,
      name: 'Plates',
      desc: 'YOLOv8-OBB & EasyOCR ANPR',
      right: { label: 'Python · CV' },
      sub: 'optical telemetry',
      title: 'Plates: End-to-end rotated YOLOv8-OBB license plate detection, rectification and EasyOCR workbench.',
    })({ css: s.css, art: () => s.out })
  );
}

// 8. Folio Studio (big)
{
  const frames = await Promise.all(
    [
      { path: 'projects/folio/ui.webp', pos: 'top' },
      { path: 'projects/folio/site.webp', pos: 'top' },
    ].map((src) => still(src, ...IMG_BIG, 66))
  );
  const s = slideshow(frames, ...IMG_BIG, { hold: 3.5 });
  write(
    'tile-folio.svg',
    tile({
      ...BIG,
      name: 'Folio Studio',
      desc: '3D portfolio & AI JD-Matcher',
      right: { label: 'WebGL · RAG' },
      sub: 'hoang-folio.pages.dev',
      title: 'Folio Studio: Interactive 3D WebGL portfolio and client-side Hybrid RAG JD Matching Concierge.',
    })({ css: s.css, art: () => s.out })
  );
}

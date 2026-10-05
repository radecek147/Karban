/**
 * npm run gen-textures — vygeneruje bitmapové textury rozhraní ve stylu E1 „Pohádková knížka“
 * (papír, malované sukno, akvarelové skvrny, natrhlý okraj papíru, tuš) do `src/assets/textures/`.
 *
 * Všechno je vlastní procedurální práce (žádné stažené obrázky): SVG šum `feTurbulence` (se `stitchTiles`, aby
 * dlaždice navazovaly), nasvícení papíru `feDiffuseLighting`, rozpité okraje skvrn `feDisplacementMap`
 * a natrhlý okraj papíru z periodické funkce (součet sinusovek s celočíselnou frekvencí → bezešvá dlaždice).
 * Vykresluje Chromium z Playwrightu (`chromium.launch()`, stejný jako e2e testy; nic se nestahuje) a ukládá WebP.
 *
 * Proč bitmapy: živé SVG filtry v CSS by prohlížeč přepočítával při každém překreslení (hra musí jet 60 fps).
 * Výstup je deterministický (pevná semínka šumu), opakovaný běh dává stejné soubory. Výsledky se commitují,
 * build na skriptu nezávisí. Původ a licence: ASSETS.md (vlastní dílo, licence projektu).
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/assets/textures');
/** Strop velikosti jednoho souboru (CLAUDE.md kap. 2: výkon; textury se stahují při startu). */
const MAX_BYTES = 120 * 1024;

const PAPER = '#fbf8f1';
const INK = '#1f1a17';

// ─────────────────────────── Vykreslení v prohlížeči ───────────────────────────

interface RasterJob {
  svg: string;
  width: number;
  height: number;
  /** Výřez (x, y, šířka, výška) — prostřední dlaždice z 3 × 3, ať nasvícení na krajích navazuje. */
  crop?: [number, number, number, number];
  /** `image/png` pro mezikroky, `image/webp` pro výstup. */
  type: 'image/png' | 'image/webp';
  quality?: number;
}

/** SVG → `<img>` → `<canvas>` → data URL (běží v prohlížeči). */
async function raster(page: Page, job: RasterJob): Promise<string> {
  return page.evaluate(async (j) => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(j.svg)}`;
    await img.decode();
    const [cx, cy, cw, ch] = j.crop ?? [0, 0, j.width, j.height];
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d není k dispozici');
    ctx.drawImage(img, -cx, -cy, j.width, j.height);
    return canvas.toDataURL(j.type, j.quality);
  }, job);
}

/** Natrhlý okraj papíru: maska (alfa) pásu podél hrany, dlaždice opakovatelná podél hrany. */
async function deckle(
  page: Page,
  opts: { length: number; thick: number; seed: number; side: 'top' | 'bottom' | 'left' | 'right' },
): Promise<string> {
  return page.evaluate((o) => {
    // Deterministický generátor (mulberry32) — stejné semínko, stejný okraj.
    let s = o.seed >>> 0;
    const rnd = (): number => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const L = o.length;
    const T = o.thick;
    // Profil hrany: součet sinusovek s celočíselnou frekvencí → periodický s periodou L (bezešvá dlaždice).
    const waves = Array.from({ length: 150 }, (_, i) => {
      const k = i + 3;
      return { k, a: (rnd() * 2 - 1) / Math.pow(k, 0.62), p: rnd() * Math.PI * 2 };
    });
    const raw = new Float32Array(L);
    for (let x = 0; x < L; x++) {
      let v = 0;
      for (const w of waves) v += w.a * Math.sin((2 * Math.PI * w.k * x) / L + w.p);
      raw[x] = v;
    }
    let max = 0;
    for (const v of raw) max = Math.max(max, Math.abs(v));
    // Vlákna: krátké poloprůhledné „chlupy“ papíru před hranou.
    const fibers = new Float32Array(L);
    for (let x = 0; x < L; x++) fibers[x] = rnd() < 0.18 ? rnd() * 1.6 : 0;
    const amp = T * 0.3;
    const base = T * 0.46;
    const canvas = document.createElement('canvas');
    const horizontal = o.side === 'top' || o.side === 'bottom';
    canvas.width = horizontal ? L : T;
    canvas.height = horizontal ? T : L;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d není k dispozici');
    const data = ctx.createImageData(canvas.width, canvas.height);
    for (let x = 0; x < L; x++) {
      const edge = base + ((raw[x] ?? 0) / max) * amp;
      const fiber = fibers[x] ?? 0;
      for (let d = 0; d < T; d++) {
        // d = vzdálenost od vnější hrany pásu (0 = venku, T = uvnitř papíru).
        const inside = Math.min(1, Math.max(0, d + 0.5 - edge + 0.6));
        const hair = fiber > 0 ? Math.max(0, 1 - (edge - d) / (fiber + 0.8)) * 0.55 : 0;
        const a = Math.max(inside, Math.min(1, hair));
        let px: number;
        let py: number;
        if (o.side === 'top') [px, py] = [x, d];
        else if (o.side === 'bottom') [px, py] = [x, T - 1 - d];
        else if (o.side === 'left') [px, py] = [d, x];
        else [px, py] = [T - 1 - d, x];
        const i = (py * canvas.width + px) * 4;
        data.data[i] = 0;
        data.data[i + 1] = 0;
        data.data[i + 2] = 0;
        data.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL('image/webp', 0.9);
  }, opts);
}

// ─────────────────────────── SVG stavebnice ───────────────────────────

const svgOpen = (w: number, h: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

const region = (w: number, h: number): string =>
  `filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB"`;

/** Výškový šum (alfa) jedné bezešvé dlaždice. */
function heightSvg(size: number, freq: number, octaves: number, seed: number): string {
  return (
    svgOpen(size, size) +
    `<filter id="n" ${region(size, size)}>` +
    `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch"/>` +
    '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"/>' +
    `</filter><rect width="${size}" height="${size}" filter="url(#n)"/></svg>`
  );
}

/**
 * Nasvícený papír: výškový šum z dlaždice opakovaný 3 × 3 (prostřední dlaždice pak na krajích navazuje).
 * `gain` vrací rovnou plochu na plnou barvu (nasvícení pod úhlem 62° ji jinak ztmaví na sin 62° ≈ 0,88).
 */
function litSvg(size: number, heightUrl: string, color: string, surface: number, gain: number): string {
  const big = size * 3;
  return (
    svgOpen(big, big) +
    `<defs><pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
    `<image href="${heightUrl}" width="${size}" height="${size}"/></pattern>` +
    `<filter id="l" ${region(big, big)}>` +
    `<feDiffuseLighting in="SourceAlpha" surfaceScale="${surface}" diffuseConstant="1" lighting-color="${color}">` +
    '<feDistantLight azimuth="45" elevation="62"/></feDiffuseLighting>' +
    `<feComponentTransfer><feFuncR type="linear" slope="${gain}"/><feFuncG type="linear" slope="${gain}"/>` +
    `<feFuncB type="linear" slope="${gain}"/></feComponentTransfer>` +
    `</filter></defs><rect width="${big}" height="${big}" fill="url(#p)" filter="url(#l)"/></svg>`
  );
}

/**
 * Filtr: alfa barevné plochy podle bezešvého šumu. `a' = clamp(slope · šum + intercept) · max`.
 * `table` místo lineárního průběhu vyrobí úzké pásy („okraje zaschlých louží“ akvarelu).
 */
function noiseAlphaFilter(
  id: string,
  size: number,
  o: { freq: number; octaves: number; seed: number; slope?: number; intercept?: number; table?: string },
): string {
  const transfer = o.table
    ? `<feFuncA type="table" tableValues="${o.table}"/>`
    : `<feFuncA type="linear" slope="${o.slope ?? 1}" intercept="${o.intercept ?? 0}"/>`;
  return (
    `<filter id="${id}" ${region(size, size)}>` +
    `<feTurbulence type="fractalNoise" baseFrequency="${o.freq}" numOctaves="${o.octaves}" seed="${o.seed}" stitchTiles="stitch" result="n"/>` +
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="a"/>' +
    `<feComponentTransfer in="a" result="t">${transfer}</feComponentTransfer>` +
    '<feComposite in="SourceGraphic" in2="t" operator="in"/>' +
    '</filter>'
  );
}

// ─────────────────────────── Textury ───────────────────────────

interface Output {
  file: string;
  dataUrl: string;
  note: string;
}

/** Papír (krémový, zrno a jemné teplé skvrny), dlaždice 512 × 512. */
async function paper(page: Page): Promise<Output> {
  const size = 512;
  const height = await raster(page, {
    svg: heightSvg(size, 0.04, 5, 2),
    width: size,
    height: size,
    type: 'image/png',
  });
  const lit = await raster(page, {
    svg: litSvg(size, height, PAPER, 1.25, 1.12),
    width: size * 3,
    height: size * 3,
    crop: [size, size, size, size],
    type: 'image/png',
  });
  const svg =
    svgOpen(size, size) +
    '<defs>' +
    noiseAlphaFilter('warm', size, { freq: 0.006, octaves: 3, seed: 11, slope: 1.6, intercept: -0.62 }) +
    noiseAlphaFilter('fleck', size, { freq: 0.7, octaves: 2, seed: 3, slope: 9, intercept: -6.2 }) +
    '</defs>' +
    `<image href="${lit}" width="${size}" height="${size}"/>` +
    `<rect width="${size}" height="${size}" fill="#e3d2ad" opacity="0.32" filter="url(#warm)"/>` +
    `<rect width="${size}" height="${size}" fill="#8a6a44" opacity="0.18" filter="url(#fleck)"/>` +
    '</svg>';
  const dataUrl = await raster(page, { svg, width: size, height: size, type: 'image/webp', quality: 0.8 });
  return { file: 'paper.webp', dataUrl, note: 'papír, bezešvá dlaždice 512 × 512' };
}

/**
 * Malované sukno (zelená vodovka na papíře: jemné skvrny, světlé květy, slabé zaschlé okraje, zrno), dlaždice
 * 960 × 960 — velká, ať se opakování na monitoru neokouká; nízké frekvence šumu se škálují s velikostí dlaždice.
 */
async function felt(page: Page): Promise<Output> {
  const size = 960;
  const k = 640 / size;
  const height = await raster(page, {
    svg: heightSvg(size, 0.045, 4, 5),
    width: size,
    height: size,
    type: 'image/png',
  });
  const lit = await raster(page, {
    svg: litSvg(size, height, '#808080', 2.2, 1.13),
    width: size * 3,
    height: size * 3,
    crop: [size, size, size, size],
    type: 'image/png',
  });
  const f = (v: number): number => Math.round(v * k * 100000) / 100000;
  const svg =
    svgOpen(size, size) +
    '<defs>' +
    noiseAlphaFilter('dark', size, { freq: f(0.0047), octaves: 3, seed: 31, slope: 2.0, intercept: -0.86 }) +
    noiseAlphaFilter('mid', size, { freq: f(0.011), octaves: 3, seed: 17, slope: 1.8, intercept: -0.78 }) +
    noiseAlphaFilter('light', size, { freq: f(0.0078), octaves: 2, seed: 8, slope: 2.0, intercept: -0.95 }) +
    noiseAlphaFilter('tide', size, {
      freq: f(0.0094),
      octaves: 3,
      seed: 23,
      table: '0 0 0 0 0 0 0 0 0.5 0.08 0 0 0 0 0 0 0 0 0 0',
    }) +
    noiseAlphaFilter('grain', size, { freq: 0.62, octaves: 2, seed: 7, slope: 7, intercept: -4.4 }) +
    '</defs>' +
    `<rect width="${size}" height="${size}" fill="#286b4a"/>` +
    `<rect width="${size}" height="${size}" fill="#164a31" opacity="0.5" filter="url(#dark)"/>` +
    `<rect width="${size}" height="${size}" fill="#1d5a3b" opacity="0.32" filter="url(#mid)"/>` +
    `<rect width="${size}" height="${size}" fill="#4a8f69" opacity="0.28" filter="url(#light)"/>` +
    `<rect width="${size}" height="${size}" fill="#0e3220" opacity="0.2" filter="url(#tide)"/>` +
    `<image href="${lit}" width="${size}" height="${size}" opacity="0.6" style="mix-blend-mode:soft-light"/>` +
    `<rect width="${size}" height="${size}" fill="#0b2a1a" opacity="0.28" filter="url(#grain)"/>` +
    '</svg>';
  const dataUrl = await raster(page, { svg, width: size, height: size, type: 'image/webp', quality: 0.72 });
  return { file: 'felt.webp', dataUrl, note: `sukno, bezešvá dlaždice ${size} × ${size}` };
}

/** Společný tvar akvarelové skvrny (natažený obdélník s rozpitými okraji) — filtr nad bílým obdélníkem. */
function washShapeFilter(w: number, h: number, seed: number, disp: number): string {
  return (
    `<filter id="shape" ${region(w, h)}>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="3" seed="${seed}" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${disp}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${seed + 5}" result="f"/>` +
    '<feDisplacementMap in="d" in2="f" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d2"/>' +
    '<feGaussianBlur in="d2" stdDeviation="0.7" result="shape"/>'
  );
}

/**
 * Akvarelová skvrna pro tlačítka a políčka: maska tvaru (alfa) + tón (poloprůhledná vrstva přes barvu z CSS:
 * tmavší okraj, kde pigment zaschl, světlejší „květy“ a zrnitý pigment). Barvu dodá CSS (`--wash`).
 */
async function wash(page: Page, name: string, w: number, h: number, seed: number): Promise<Output[]> {
  const inset = Math.round(h * 0.11);
  const body = `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="4" fill="#fff"`;
  const shapeSvg =
    svgOpen(w, h) +
    washShapeFilter(w, h, seed, h * 0.13) +
    '</filter>' +
    `${body} filter="url(#shape)"/></svg>`;
  const toneSvg =
    svgOpen(w, h) +
    washShapeFilter(w, h, seed, h * 0.13) +
    // Okraj: tvar minus zmenšený tvar, rozmazaný → tmavý lem.
    '<feMorphology in="shape" operator="erode" radius="2.6" result="er"/>' +
    '<feGaussianBlur in="er" stdDeviation="1.8" result="erb"/>' +
    '<feComposite in="shape" in2="erb" operator="out" result="edge"/>' +
    '<feFlood flood-color="#1c120a" flood-opacity="0.5"/><feComposite in2="edge" operator="in" result="edgeC"/>' +
    // Hustší louže pigmentu (o kousek tmavší) a světlé květy (papír prosvítá) — jemně, ať barva drží.
    `<feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="${seed + 9}" result="lo"/>` +
    '<feColorMatrix in="lo" type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.07  0 0 0 0 0.04  1.1 0 0 0 -0.42" result="pool"/>' +
    '<feComponentTransfer in="pool" result="poolS"><feFuncA type="linear" slope="0.6"/></feComponentTransfer>' +
    '<feComposite in="poolS" in2="erb" operator="in" result="poolC"/>' +
    '<feColorMatrix in="lo" type="matrix" values="0 0 0 0 0.98  0 0 0 0 0.97  0 0 0 0 0.94  0 -1.3 0 0 0.62" result="bloom"/>' +
    '<feComponentTransfer in="bloom" result="bloomS"><feFuncA type="linear" slope="0.5"/></feComponentTransfer>' +
    '<feComposite in="bloomS" in2="erb" operator="in" result="bloomC"/>' +
    // Zrnitý pigment (sotva znatelný).
    `<feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="${seed + 3}" result="g"/>` +
    '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 1.4 -0.66" result="gr"/>' +
    '<feComponentTransfer in="gr" result="grS"><feFuncA type="linear" slope="0.45"/></feComponentTransfer>' +
    '<feComposite in="grS" in2="shape" operator="in" result="grC"/>' +
    '<feMerge><feMergeNode in="poolC"/><feMergeNode in="bloomC"/><feMergeNode in="edgeC"/><feMergeNode in="grC"/></feMerge>' +
    '</filter>' +
    `${body} filter="url(#shape)"/></svg>`;
  const shape = await raster(page, { svg: shapeSvg, width: w, height: h, type: 'image/webp', quality: 0.9 });
  const tone = await raster(page, { svg: toneSvg, width: w, height: h, type: 'image/webp', quality: 0.7 });
  return [
    { file: `${name}-shape.webp`, dataUrl: shape, note: `akvarelová skvrna ${w} × ${h}: maska tvaru` },
    {
      file: `${name}-tone.webp`,
      dataUrl: tone,
      note: `akvarelová skvrna ${w} × ${h}: tón (okraj, květy, zrno)`,
    },
  ];
}

/**
 * Rámeček tuší pro `border-image` (9 dílů, 96 × 96 → okraj 16 px obrázku): čtyři lehce šikmé tahy s přesahem.
 * Linka E3: silný tah štětcem a vedle něj druhý, slabší tah (jako v kresbách, src/ui/art/watercolor.ts `ink`).
 */
async function inkFrame(page: Page): Promise<Output> {
  const s = 96;
  const lines = [
    'M1.6,3.2 C30,2.5 62,3.6 94.6,2.6',
    'M93.2,1.2 C93.8,30 92.8,62 93.4,94.8',
    'M95,93.4 C64,93.9 32,92.8 1.2,93.6',
    'M2.7,95 C2.2,62 3.2,30 2.5,1.4',
  ];
  const svg =
    svgOpen(s, s) +
    `<filter id="w" ${region(s, s)}>` +
    '<feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="5" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    `<g fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" opacity="0.92" filter="url(#w)">` +
    lines.map((d) => `<path d="${d}"/>`).join('') +
    '</g>' +
    `<g fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" opacity="0.5" transform="translate(1 0.7)">` +
    lines.map((d) => `<path d="${d}"/>`).join('') +
    '</g></svg>';
  const dataUrl = await raster(page, { svg, width: s, height: s, type: 'image/webp', quality: 0.95 });
  return { file: 'ink-frame.webp', dataUrl, note: 'rámeček tuší pro border-image, 96 × 96' };
}

/** Linka tuší (oddělovač): lehce zvlněný tah štětcem 512 × 8 s druhým, slabším tahem (linka E3). */
async function inkLine(page: Page): Promise<Output> {
  const w = 512;
  const h = 8;
  const svg =
    svgOpen(w, h) +
    `<filter id="w" ${region(w, h)}>` +
    '<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    `<path d="M3,4.2 C120,3 260,5 380,3.6 C430,3.1 470,4.4 509,3.8" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity="0.85" filter="url(#w)"/>` +
    `<path d="M3,4.2 C120,3 260,5 380,3.6 C430,3.1 470,4.4 509,3.8" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity="0.45" transform="translate(1.2 0.8)"/>` +
    '</svg>';
  const dataUrl = await raster(page, { svg, width: w, height: h, type: 'image/webp', quality: 0.95 });
  return { file: 'ink-line.webp', dataUrl, note: 'linka tuší (oddělovač), 512 × 8' };
}

/**
 * Akvarelová skvrna za nápisem „Karban“ v menu: modrá vodovka s tmavším okrajem a srdíčky (jako rub karty)
 * a uprostřed nepravidelný ovál papíru, na kterém stojí nápis.
 */
async function splash(page: Page): Promise<Output> {
  const w = 760;
  const h = 330;
  const hearts: string[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 14; col++) {
      const x = 52 + col * 50 + (row % 2) * 25;
      const y = 40 + row * 42;
      hearts.push(
        `<path transform="translate(${x} ${y}) scale(0.5)" d="M0,6 C-9,-3 -14,-12 -6,-16 C-2,-18 0,-14 0,-12 C0,-14 2,-18 6,-16 C14,-12 9,-3 0,6Z"/>`,
      );
    }
  }
  const svg =
    svgOpen(w, h) +
    '<defs>' +
    `<filter id="blob" ${region(w, h)}>` +
    '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="12" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="f"/>' +
    '<feDisplacementMap in="d" in2="f" scale="6" xChannelSelector="R" yChannelSelector="G" result="d2"/>' +
    '<feGaussianBlur in="d2" stdDeviation="1" result="shape"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="2" seed="21" result="lo"/>' +
    '<feColorMatrix in="lo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.3 0.2" result="lom"/>' +
    '<feComposite in="shape" in2="lom" operator="in" result="body"/>' +
    '<feMorphology in="shape" operator="erode" radius="3" result="er"/>' +
    '<feGaussianBlur in="er" stdDeviation="2.5" result="erb"/>' +
    '<feComposite in="shape" in2="erb" operator="out" result="edge"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="7" result="g"/>' +
    '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.8 -0.7" result="ga"/>' +
    '<feComposite in="shape" in2="ga" operator="in" result="gr"/>' +
    '<feMerge><feMergeNode in="body"/><feMergeNode in="edge"/><feMergeNode in="edge"/><feMergeNode in="gr"/></feMerge>' +
    '</filter>' +
    `<filter id="paper" ${region(w, h)}>` +
    '<feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="12" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="2" result="pn"/>' +
    `<feDiffuseLighting in="pn" lighting-color="${PAPER}" surfaceScale="1.6" result="lit"><feDistantLight azimuth="45" elevation="62"/></feDiffuseLighting>` +
    '<feComponentTransfer in="lit" result="lit2"><feFuncR type="linear" slope="1.06"/><feFuncG type="linear" slope="1.06"/><feFuncB type="linear" slope="1.06"/></feComponentTransfer>' +
    '<feComposite in="lit2" in2="d" operator="in"/>' +
    '</filter>' +
    `<filter id="soft" ${region(w, h)}><feGaussianBlur stdDeviation="0.6"/></filter>` +
    '</defs>' +
    `<filter id="blobShape" ${region(w, h)}>` +
    '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="12" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="f"/>' +
    '<feDisplacementMap in="d" in2="f" scale="6" xChannelSelector="R" yChannelSelector="G" result="d2"/>' +
    '<feMorphology in="d2" operator="erode" radius="7"/>' +
    '</filter>' +
    `<mask id="inside"><g filter="url(#blobShape)"><rect x="70" y="52" width="620" height="226" rx="70" fill="#fff"/></g></mask>` +
    // Skvrna, srdíčka (jen uvnitř skvrny, jako na rubu karty), ovál papíru.
    `<g filter="url(#blob)"><rect x="70" y="52" width="620" height="226" rx="70" fill="#3d6ab0" fill-opacity="0.86"/></g>` +
    `<g mask="url(#inside)"><g fill="#2a3f7a" fill-opacity="0.42" filter="url(#soft)">${hearts.join('')}</g></g>` +
    `<ellipse cx="${w / 2}" cy="${h / 2 + 4}" rx="262" ry="92" fill="#fff" filter="url(#paper)"/>` +
    '</svg>';
  const dataUrl = await raster(page, { svg, width: w, height: h, type: 'image/webp', quality: 0.82 });
  return { file: 'splash.webp', dataUrl, note: 'akvarelová skvrna za nápisem v menu, 760 × 330' };
}

// ─────────────────────────── Hlavní běh ───────────────────────────

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const outputs: Output[] = [];
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.setContent('<!doctype html><html><body></body></html>');
    // tsx (esbuild, keepNames) obaluje pojmenované funkce pomocníkem `__name` — v prohlížeči ho nahradí identita.
    await page.evaluate('globalThis.__name = (fn) => fn');
    outputs.push(await paper(page));
    outputs.push(await felt(page));
    outputs.push(...(await wash(page, 'wash', 480, 150, 4)));
    outputs.push(...(await wash(page, 'wash-long', 900, 140, 14)));
    outputs.push(await inkFrame(page));
    outputs.push(await inkLine(page));
    outputs.push(await splash(page));
    const sides = [
      ['top', 41],
      ['bottom', 42],
      ['left', 43],
      ['right', 44],
    ] as const;
    for (const [side, seed] of sides) {
      outputs.push({
        file: `edge-${side}.webp`,
        dataUrl: await deckle(page, { length: 512, thick: 24, seed, side }),
        note: `natrhlý okraj papíru (${side}), maska 512 × 24`,
      });
    }
  } finally {
    await browser.close();
  }

  let failed = false;
  for (const o of outputs) {
    const base64 = o.dataUrl.slice(o.dataUrl.indexOf(',') + 1);
    if (!o.dataUrl.startsWith('data:image/webp')) throw new Error(`${o.file}: prohlížeč nevrátil WebP`);
    const file = path.join(OUT, o.file);
    writeFileSync(file, Buffer.from(base64, 'base64'));
    const size = statSync(file).size;
    const tooBig = size > MAX_BYTES;
    failed ||= tooBig;
    console.log(
      `${tooBig ? 'PŘÍLIŠ VELKÉ' : 'ok'}  ${o.file.padEnd(22)} ${(size / 1024).toFixed(1)} kB  — ${o.note}`,
    );
  }
  if (failed) {
    console.error(`Některá textura přesáhla ${MAX_BYTES / 1024} kB.`);
    process.exitCode = 1;
  }
}

await main();

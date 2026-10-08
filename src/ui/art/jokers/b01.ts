/**
 * Obrázky žolíků — dávka 01 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - beer_mat — Pivní tácek: scéna `beerMat` (SCENES['beerMat'])
 *  - hearts_man — Srdcař: portrét `fig-hearts_man` (FIGURES['hearts_man'])
 *  - gravedigger — Hrobník: portrét `fig-gravedigger` (FIGURES['gravedigger'])
 *  - jeweler — Klenotník: portrét `fig-jeweler` (FIGURES['jeweler'])
 *  - crusader — Křižák: portrét `fig-crusader` (FIGURES['crusader'])
 *  - early_bird — Ranní ptáče: portrét `fig-early_bird` (FIGURES['early_bird'])
 *  - night_shift — Noční směna: portrét `fig-night_shift` (FIGURES['night_shift'])
 *  - meteorologist — Meteorolog: portrét `fig-meteorologist` (FIGURES['meteorologist'])
 *  - pe_teacher — Tělocvikář: portrét `fig-pe_teacher` (FIGURES['pe_teacher'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import type { SceneOp } from '../sceneKit';
import { c, rect } from '../sceneKit';

// ─────────────────────────── Pomocné tvary ───────────────────────────

const SKIN = '#f2b48e';
const r1 = (n: number): string => String(Math.round(n * 10) / 10);

/**
 * Posune, zvětší a otočí (stupně, po směru hodinových ručiček) cestu zapsanou jen absolutními příkazy
 * M/L/C/Q/Z v místních souřadnicích kolem 0,0.
 */
function place(d: string, x: number, y: number, s = 1, deg = 0): string {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let out = '';
  let pend: number | null = null;
  for (const t of d.match(/[MLCQZ]|-?\d*\.?\d+/g) ?? []) {
    if (/^[MLCQZ]$/.test(t)) {
      out += t;
      continue;
    }
    const v = Number(t);
    if (pend === null) {
      pend = v;
      continue;
    }
    const px = pend * s;
    const py = v * s;
    out += `${r1(x + px * cos - py * sin)},${r1(y + px * sin + py * cos)} `;
    pend = null;
  }
  return out.trim();
}

/** Srdce (výška ~36 při s = 1). */
const HEART =
  'M0,16 C-10,8 -20,0 -20,-8 C-20,-16 -14,-20 -9,-20 C-4,-20 -1,-17 0,-13 C1,-17 4,-20 9,-20 C14,-20 20,-16 20,-8 C20,0 10,8 0,16 Z';
/** Pik / lopata (hrot nahoře, stopka dole na y 20). */
const SPADE =
  'M0,-20 C-6,-11 -20,-5 -20,5 C-20,12 -14,15 -9,15 C-5,15 -2,13 -1,11 L-4,20 L4,20 L1,11 C2,13 5,15 9,15 C14,15 20,12 20,5 C20,-5 6,-11 0,-20 Z';
/** Čtyřcípá jiskra. */
const STAR4 = 'M0,-10 Q1.5,-1.5 10,0 Q1.5,1.5 0,10 Q-1.5,1.5 -10,0 Q-1.5,-1.5 0,-10 Z';

/** Kříže (♣) jako jedna cesta — kreslit bez obrysu (překryvy kruhů). */
function club(x: number, y: number, s: number): string {
  return [
    c(x, y - 8 * s, 7.5 * s),
    c(x - 8.5 * s, y + 4 * s, 7.5 * s),
    c(x + 8.5 * s, y + 4 * s, 7.5 * s),
    place('M-1.6,4 L-4.5,17 L4.5,17 L1.6,4 Z', x, y, s),
  ].join(' ');
}

/** Hladká uzavřená křivka bodů (Catmull-Rom → kubické Bézierovy křivky). */
function smooth(pts: readonly (readonly [number, number])[]): string {
  const n = pts.length;
  const p = (i: number): readonly [number, number] => pts[(i + n) % n]!;
  let d = `M${r1(p(0)[0])},${r1(p(0)[1])} `;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    d +=
      `C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])},${r1(p2[1])} `;
  }
  return d + 'Z';
}

const bez = (q: readonly number[], t: number): number => {
  const u = 1 - t;
  return u * u * u * q[0]! + 3 * u * u * t * q[1]! + 3 * u * t * t * q[2]! + t * t * t * q[3]!;
};

/** Horní okraj trupu portrétu (BUST z figureKit) v bodě x — pro pruhy a vzory na oblečení. */
function bustTop(x: number): number {
  if (x >= 100 && x <= 150) return 210;
  if (x <= 44 || x >= 206) return 284;
  const X = x < 100 ? [44, 48, 70, 100] : [150, 180, 202, 206];
  const Y = x < 100 ? [284, 240, 218, 210] : [210, 218, 240, 284];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (bez(X, m) < x) lo = m;
    else hi = m;
  }
  return bez(Y, lo);
}

/** Svislý pruh oblečení mezi x0 a x1 (shora sleduje obrys ramen). */
const bustStripe = (x0: number, x1: number): string =>
  `M${r1(x0)},${r1(bustTop(x0) + 1.5)} L${r1(x1)},${r1(bustTop(x1) + 1.5)} L${r1(x1)},284 L${r1(x0)},284 Z`;

/** Stín na pravé straně trupu (figureKit ho kreslí pod oblečení — po vlastních vzorech ho opakujeme). */
const BUST_SHADOW: SceneOp = [
  'h',
  'M150,210 C180,218 202,240 206,284 L178,284 C176,252 168,228 150,210 Z',
  45,
];

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
function hand(x: number, y: number, deg = 0): SceneOp[] {
  return [
    ['f', SKIN, c(x, y, 11, 9), 1.8],
    ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', x, y, 1, deg), 1.1],
  ];
}

// ─────────────────────────── Pivní tácek ───────────────────────────

/** Vroubkovaný okraj kartonového tácku (elipsa s vlnkami). */
function scallop(cx: number, cy: number, rx: number, ry: number, n: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const am = ((i + 0.5) / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    if (i === 0) d += `M${r1(cx + rx * Math.cos(a0))},${r1(cy + ry * Math.sin(a0))} `;
    d +=
      `Q${r1(cx + rx * 1.035 * Math.cos(am))},${r1(cy + ry * 1.06 * Math.sin(am))} ` +
      `${r1(cx + rx * Math.cos(a1))},${r1(cy + ry * Math.sin(a1))} `;
  }
  return d + 'Z';
}

/** Čárky na tácku: skupiny po pěti (čtyři a přeškrtnutí) — „každá čárka se počítá“. */
function tally(x: number, y: number, strokes: number, strike: boolean): string {
  let d = '';
  for (let i = 0; i < strokes; i++) d += `M${x + i * 6.5 + 1},${y} L${x + i * 6.5},${y + 17} `;
  if (strike) d += `M${x - 4},${y + 14} L${x + 24},${y + 2}`;
  return d.trim();
}

// Pivní tácek: vroubkovaný tácek s čárkami, vrchní tužkou přidává další, půllitr a štos dalších tácků.
const BEER_MAT: SceneOp[] = [
  // Hospoda: zakouřená zeď, tmavé dřevěné obložení, stůl.
  ['f', '#f6e3a1', rect(16, 16, 218, 268), 0],
  ['f', '#8c5632', rect(16, 96, 218, 62), 1.4],
  ['l', 'M16,104 H234 M52,104 V158 M96,104 V158 M140,104 V158 M184,104 V158 M228,104 V158', 0.9],
  ['f', '#c99a62', 'M16,158 H234 V284 H16 Z', 1.6],
  ['l', 'M16,174 C60,170 100,178 150,172 M170,168 C196,166 216,170 234,168', 0.9],
  // Smaltované světlo nad stolem.
  ['l', 'M192,16 L192,34', 1.4],
  ['f', '#2f6b3a', 'M170,52 C170,40 180,33 192,33 C204,33 214,40 214,52 Z', 1.6],
  ['f', '#fffaf0', 'M184,52 C184,58 200,58 200,52 Z', 1.2],
  ['l', 'M180,62 L176,70 M192,64 L192,73 M204,62 L208,70', 1],
  // Štos dalších tácků vzadu na stole.
  ['f', '#fffaf0', c(208, 176, 22, 6), 1.2],
  ['f', '#fffaf0', c(208, 171, 22, 6), 1.2],
  ['f', '#fffaf0', c(208, 166, 22, 6), 1.2],
  ['s', '#d7442c', c(208, 166, 16, 4), 2],
  // Tácek: vroubkovaný karton, červený kruh, ozdobná linka.
  ['f', '#fffaf0', scallop(125, 232, 107, 48, 46), 2.2],
  ['s', '#d7442c', c(125, 232, 96, 40), 5],
  ['l', c(125, 232, 89, 35), 0.8],
  // Půllitr s důlky (tuplák) a hladinkou, pěna přetéká přes okraj.
  ['f', '#e9b030', 'M98,112 L152,112 L149,214 C147,222 103,222 101,214 Z', 2.4],
  [
    'f',
    '#f2cf4a',
    [111, 125, 139]
      .flatMap((x) => [134, 156, 178, 198].map((y) => c(x - (x - 125) * 0.012 * (y - 112) * 0.25, y, 5.6, 8)))
      .join(' '),
    0.8,
  ],
  [
    'f',
    '#fffaf0',
    `${c(118, 145, 1.8)} ${c(133, 167, 2.2)} ${c(117, 188, 1.6)} ${c(132, 208, 1.8)} ${c(126, 124, 1.6)}`,
    0.8,
  ],
  ['f', '#fffaf0', 'M104,120 L108,120 L107,206 L104,204 Z', 0],
  ['h', 'M140,116 L152,112 L149,214 C147,218 144,220 140,221 Z', 0],
  ['f', '#bcd6e6', 'M101,208 L149,208 L148,216 C146,225 104,225 102,216 Z', 1.6],
  ['f', '#bcd6e6', 'M150,124 C184,120 188,192 148,196 L149,182 C172,178 172,138 151,138 Z', 2.2],
  [
    'f',
    '#fffaf0',
    'M90,112 C84,94 98,82 110,88 C116,74 136,72 142,84 C152,78 166,88 162,108 C162,114 156,118 150,116 L100,116 C94,118 90,116 90,112 Z',
    2.4,
  ],
  ['f', '#fffaf0', 'M100,114 C96,122 97,132 101,136 C105,132 105,122 104,114 Z', 1.6],
  ['l', `${c(112, 100, 1.6)} ${c(141, 94, 1.3)} ${c(150, 106, 1.4)}`, 0.9],
  // Čárky od vrchního na přední straně tácku: tři pětky a rozdělaná čtvrtá.
  [
    'l',
    `${tally(50, 238, 4, true)} ${tally(84, 241, 4, true)} ${tally(118, 242, 4, true)} ${tally(152, 241, 2, false)}`,
    1.9,
  ],
  // Ruka vrchního (černý rukáv, bílá manžeta) s ohryzanou tužkou dělá další čárku.
  ['f', 'dark', 'M204,242 L240,230 L240,284 L212,274 Z', 0],
  ['f', '#fffaf0', 'M198,244 L208,240 L215,266 L204,270 Z', 1.4],
  ['f', SKIN, 'M176,252 C172,240 184,232 196,236 C206,240 210,254 206,264 C200,272 184,272 180,264 Z', 1.8],
  ['l', 'M181,258 C185,256 189,258 191,262 M186,265 C190,264 194,266 195,269', 1],
  ['f', '#f2cf4a', place('M9,-3.4 L44,-3.4 L44,3.4 L9,3.4 Z', 165, 258, 1, -42), 1.3],
  ['f', '#f2b38c', place('M0,0 L9,-3.4 L9,3.4 Z', 165, 258, 1, -42), 1],
  ['f', 'dark', place('M0,0 L3.4,-1.3 L3.4,1.3 Z', 165, 258, 1, -42), 0],
  ['f', '#9a958a', place('M44,-3.8 L48,-3.8 L48,3.8 L44,3.8 Z', 165, 258, 1, -42), 1],
  ['f', '#e88a9a', place('M48,-3.8 L54,-3.8 L54,3.8 L48,3.8 Z', 165, 258, 1, -42), 1.3],
  ['f', SKIN, place('M-7,0 C-7,-5 7,-5 7,0 C7,5 -7,5 -7,0 Z', 186, 243, 1, -42), 1.4],
];

// ─────────────────────────── Srdcař ───────────────────────────

/** Domek s okenicemi s vyřezanými srdíčky. */
function heartHouse(x: number, w: number, top: number, wall: string, roof: string): SceneOp[] {
  const wx = x + w / 2 - 11;
  const wy = top + 22;
  return [
    ['f', wall, `M${x},206 L${x},${top} L${x + w},${top} L${x + w},206 Z`, 1.4],
    ['f', roof, `M${x - 6},${top + 2} L${x + w / 2},${top - 32} L${x + w + 6},${top + 2} Z`, 1.4],
    ['f', '#bcd6e6', rect(wx, wy, 22, 26), 1.2],
    ['l', `M${wx + 11},${wy} V${wy + 26} M${wx},${wy + 12} H${wx + 22}`, 1],
    ['f', '#5d9a3e', `${rect(wx - 11, wy - 2, 10, 30)} ${rect(wx + 23, wy - 2, 10, 30)}`, 1.2],
    ['f', 'dark', `${place(HEART, wx - 6, wy + 9, 0.17)} ${place(HEART, wx + 28, wy + 9, 0.17)}`, 0],
  ];
}

const BUNTING = [46, 78, 96, 88, 156, 88, 208, 70];
const buntingAt = (t: number): [number, number] => [
  bez([BUNTING[0]!, BUNTING[2]!, BUNTING[4]!, BUNTING[6]!], t),
  bez([BUNTING[1]!, BUNTING[3]!, BUNTING[5]!, BUNTING[7]!], t),
];
const buntingHearts = (ts: readonly number[]): string =>
  ts
    .map((t) => {
      const [x, y] = buntingAt(t);
      return place(HEART, x, y + 7, 0.27);
    })
    .join(' ');

// ─────────────────────────── Hrobník ───────────────────────────

const SHOVEL_X = 200;
const SHOVEL_Y = 96;
const SHOVEL_DEG = 13;
const shovel = (d: string, s = 1): string => place(d, SHOVEL_X, SHOVEL_Y, s, SHOVEL_DEG);
/** Bod na násadě lopaty (místní y od středu listu). */
const onShovel = (ly: number): [number, number] => {
  const a = (SHOVEL_DEG * Math.PI) / 180;
  return [SHOVEL_X - ly * Math.sin(a), SHOVEL_Y + ly * Math.cos(a)];
};
const [GRIP_X, GRIP_Y] = onShovel(150);

// ─────────────────────────── Křižák ───────────────────────────

/** Kroužková košile: drobné obloučky v kápi (mezi obrysem hlavy a otvorem pro obličej). */
function mailRings(): string {
  let d = '';
  for (let y = 102; y <= 180; y += 6) {
    for (let x = 88 + ((y / 6) % 2) * 3; x <= 162; x += 6) {
      const outer = ((x - 125) / 35) ** 2 + ((y - 142) / 44) ** 2 < 0.86;
      const face = ((x - 125) / 27) ** 2 + ((y - 158) / 34) ** 2 < 1.08;
      if (outer && !face && y < 182) d += `M${x - 2},${y} Q${x},${y + 2.2} ${x + 2},${y} `;
    }
  }
  return d.trim();
}

/** Spolubojovník v pozadí: hrncová přilba, bílý plášť s červeným křížem, kopí s praporcem. */
function companion(cx: number, top: number, s: number, lanceX: number, flagDir: number): SceneOp[] {
  const p = (d: string): string => place(d, cx, top, s);
  const fx = lanceX + flagDir * 28 * s;
  return [
    ['f', '#8c5632', rect(lanceX - 2 * s, top - 82 * s, 4 * s, 170 * s), 1],
    ['f', '#fffaf0', `M${lanceX},${top - 80 * s} L${fx},${top - 72 * s} L${lanceX},${top - 64 * s} Z`, 1.2],
    [
      'f',
      '#d7442c',
      `M${lanceX + flagDir * 5 * s},${top - 73.5 * s} L${lanceX + flagDir * 15 * s},${top - 72 * s} L${lanceX + flagDir * 5 * s},${top - 70.5 * s} Z`,
      0,
    ],
    ['f', '#fffaf0', p('M-28,82 C-26,56 -16,46 0,44 C16,46 26,56 28,82 Z'), 1.6],
    [
      'f',
      '#d7442c',
      p('M-4,52 L4,52 L4,60 L12,60 L12,66 L4,66 L4,82 L-4,82 L-4,66 L-12,66 L-12,60 L-4,60 Z'),
      1,
    ],
    ['f', '#9a958a', p('M-12,46 L-12,10 C-12,0 12,0 12,10 L12,46 Z'), 1.6],
    ['f', 'dark', p('M-10,20 L10,20 L10,23 L-10,23 Z'), 0],
    ['l', p('M0,27 L0,40 M-5,33 L5,33'), 0.9],
  ];
}

// ─────────────────────────── Ranní ptáče ───────────────────────────

/** Paprsky vycházejícího slunce (klíny od středu ven). */
function sunRays(cx: number, cy: number, n: number): string {
  let d = '';
  for (let k = 0; k < n; k++) {
    const a0 = Math.PI + ((k + 0.25) / n) * Math.PI;
    const a1 = Math.PI + ((k + 0.75) / n) * Math.PI;
    d += `M${cx},${cy} L${r1(cx + 320 * Math.cos(a0))},${r1(cy + 320 * Math.sin(a0))} L${r1(cx + 320 * Math.cos(a1))},${r1(cy + 320 * Math.sin(a1))} Z `;
  }
  return d.trim();
}

// ─────────────────────────── Meteorolog ───────────────────────────

/** Obrys republiky na mapě počasí (zjednodušený, u/v 0–1 → okno karty). */
const CZ: readonly (readonly [number, number])[] = (
  [
    [0.0, 0.3],
    [0.07, 0.24],
    [0.15, 0.19],
    [0.23, 0.12],
    [0.3, 0.08],
    [0.33, 0.0],
    [0.37, 0.06],
    [0.42, 0.02],
    [0.46, 0.09],
    [0.52, 0.12],
    [0.58, 0.1],
    [0.62, 0.17],
    [0.64, 0.27],
    [0.69, 0.21],
    [0.73, 0.15],
    [0.78, 0.23],
    [0.85, 0.29],
    [0.91, 0.31],
    [0.96, 0.37],
    [1.0, 0.46],
    [0.95, 0.55],
    [0.88, 0.66],
    [0.8, 0.76],
    [0.72, 0.86],
    [0.66, 0.92],
    [0.58, 0.86],
    [0.5, 0.82],
    [0.43, 0.88],
    [0.37, 0.98],
    [0.3, 0.94],
    [0.22, 0.8],
    [0.13, 0.68],
    [0.07, 0.56],
    [0.03, 0.42],
  ] as const
).map(([u, v]) => [20 + 210 * u, 64 + 128 * v] as const);

/** Mráček (šířka ~44 při s = 1, střed dole uprostřed). */
const CLOUD = 'M-20,0 C-28,0 -28,-12 -18,-12 C-18,-22 -4,-24 0,-16 C4,-26 20,-24 20,-12 C28,-12 28,0 20,0 Z';

/** Plusové body padající z mraku („přeháňky bodů“). */
const pluses = (pts: readonly (readonly [number, number])[]): string =>
  pts
    .map(([x, y]) =>
      place(
        'M-1.6,-5 L1.6,-5 L1.6,-1.6 L5,-1.6 L5,1.6 L1.6,1.6 L1.6,5 L-1.6,5 L-1.6,1.6 L-5,1.6 L-5,-1.6 L-1.6,-1.6 Z',
        x,
        y,
      ),
    )
    .join(' ');

// ─────────────────────────── Tělocvikář ───────────────────────────

/** Žák v řadě: hlava, tričko (nebo svetr), trenky/kalhoty, nohy. */
function pupils(): SceneOp[] {
  const kids = [
    [166, 120],
    [182, 128],
    [198, 136],
    [214, 148],
  ] as const;
  const heads: string[] = [];
  const hair: string[] = [];
  const arms: string[] = [];
  const shirts: string[] = [];
  const shorts: string[] = [];
  const legs: string[] = [];
  for (const [cx, top] of kids) {
    const h = 200 - top;
    const sy = top + 12;
    const sh = h * 0.32;
    const by = sy + sh + h * 0.13;
    heads.push(c(cx, top + 6, 5.5));
    hair.push(`M${cx - 5.5},${top + 5} C${cx - 5},${top - 1} ${cx + 5},${top - 1} ${cx + 5.5},${top + 5} Z`);
    if (cx === 214) continue;
    arms.push(`${rect(cx - 9, sy + 5, 3, sh + 2)} ${rect(cx + 6, sy + 5, 3, sh + 2)}`);
    shirts.push(
      `M${cx - 5},${sy} L${cx + 5},${sy} L${cx + 9.5},${sy + 4} L${cx + 8},${sy + 9} L${cx + 6},${sy + 8} L${cx + 6},${sy + sh} ` +
        `L${cx - 6},${sy + sh} L${cx - 6},${sy + 8} L${cx - 8},${sy + 9} L${cx - 9.5},${sy + 4} Z`,
    );
    shorts.push(`M${cx - 6},${sy + sh} L${cx + 6},${sy + sh} L${cx + 6.5},${by} L${cx - 6.5},${by} Z`);
    legs.push(`M${cx - 3},${by} L${cx - 3},200 M${cx + 3},${by} L${cx + 3},200`);
  }
  return [
    ['f', SKIN, `${heads.join(' ')} ${arms.join(' ')}`, 1],
    ['f', '#5a3418', hair.join(' '), 0.8],
    ['f', '#fffaf0', shirts.join(' '), 1],
    ['f', '#22365c', shorts.join(' '), 1],
    ['l', legs.join(' '), 1.3],
    // Poslední v řadě je v civilu (červený svetr, dlouhé kalhoty) a mává omluvenkou.
    ['f', '#2f5fa8', 'M208,180 L220,180 L221,200 L215,200 L214,188 L213,200 L207,200 Z', 1],
    ['f', '#d7442c', 'M207,160 L221,160 L221,181 L207,181 Z', 1],
    ['l', 'M220,164 L227,150', 1.4],
    ['f', '#fffaf0', place('M-6,-8 L6,-8 L6,8 L-6,8 Z', 227, 140, 1, 12), 1],
    ['l', place('M-3.5,-4 L3.5,-4 M-3.5,0 L3.5,0 M-3.5,4 L2,4', 227, 140, 1, 12), 0.6],
  ];
}

// ─────────────────────────── Portréty ───────────────────────────

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  // Srdcař: perníkové srdce na dlani, peněženka v náprsní kapse, svetr, okenice i fáborky se srdíčky.
  hearts_man: {
    bg: '#f3c7c0',
    motif: 'none',
    body: '#b8302a',
    hatColor: '#d7442c',
    prop: undefined,
    backdrop: [
      ['f', '#9a958a', 'M16,206 H234 V284 H16 Z', 1.4],
      ['l', 'M16,222 H234 M40,206 V222 M80,206 V222 M180,206 V222 M220,206 V222', 0.8],
      ...heartHouse(16, 50, 104, '#f6e3a1', '#8c5632'),
      ...heartHouse(184, 50, 96, '#d9d2c2', '#5a3418'),
      ['l', `M${BUNTING.slice(0, 2).join(',')} C${BUNTING.slice(2).join(' ')}`, 1],
      ['f', '#d7442c', buntingHearts([0.08, 0.3, 0.7, 0.92]), 1],
      ['f', '#fffaf0', buntingHearts([0.19, 0.81]), 1],
    ],
    outfit: [
      ['s', '#fffaf0', 'M56,250 C90,246 160,246 194,250', 2],
      ['s', '#fffaf0', 'M48,276 C90,272 160,272 202,276', 2],
      ['f', '#fffaf0', [62, 82, 102, 125, 148, 168].map((x) => place(HEART, x, 263, 0.24)).join(' '), 0.8],
      // Peněženka v náprsní kapse.
      ['f', '#8c5632', 'M74,224 L96,221 L97,238 L75,240 Z', 1.4],
      ['l', 'M76,229 L96,226', 0.8],
      ['f', '#b8302a', 'M70,232 L100,232 L100,250 C92,253 78,253 70,250 Z', 1.4],
      ['l', 'M72,236 L98,236', 0.7],
      BUST_SHADOW,
    ],
    extra: [
      // Dlaň a na ní perníkové srdce s polevou.
      [
        'f',
        SKIN,
        'M162,262 C162,252 176,249 188,251 C200,249 212,253 212,261 C208,269 168,271 162,262 Z',
        1.8,
      ],
      ['l', 'M197,253 L197,259 M204,254 L204,260', 1],
      ['f', '#d7442c', place(HEART, 187, 225, 1.4), 2.2],
      ['s', '#fffaf0', place(HEART, 187, 225, 1.1), 1.8],
      ['f', '#fffaf0', place(HEART, 187, 223, 0.42), 0.8],
      ['f', SKIN, 'M162,259 C155,253 157,245 163,246 C168,247 169,254 168,259 Z', 1.6],
      ['l', 'M216,204 L224,198 M220,216 L230,215 M207,193 L211,185', 1.2],
    ],
  },

  // Hrobník: lopata s listem ve tvaru piky, hřbitov za soumraku (náhrobek s pikou, vrána, svíčky, rov).
  gravedigger: {
    bg: '#6b4a9e',
    motif: 'none',
    body: '#5b5850',
    hatColor: '#2f3542',
    prop: undefined,
    backdrop: [
      ['f', '#e88a9a', 'M16,150 C80,140 170,146 234,138 L234,200 L16,200 Z', 0],
      ['f', '#f6e3a1', c(60, 78, 13), 1.4],
      [
        'f',
        '#fffaf0',
        [
          [100, 60],
          [150, 44],
          [130, 76],
          [36, 110],
          [226, 50],
        ]
          .map(([x, y]) => place(STAR4, x!, y!, 0.28))
          .join(' '),
        0,
      ],
      ['f', '#2f6b3a', 'M78,200 C66,170 68,130 79,104 C90,130 92,170 80,200 Z', 1.4],
      ['f', '#2f6b3a', 'M172,200 C160,172 162,136 173,112 C184,136 186,172 174,200 Z', 1.4],
      ['f', '#5d9a3e', 'M16,200 C70,190 170,196 234,188 L234,284 L16,284 Z', 1.6],
      // Náhrobek s pikou a vránou.
      ['f', '#d9d2c2', 'M22,214 L22,168 C22,152 52,152 52,168 L52,214 Z', 1.6],
      ['f', 'dark', place(SPADE, 37, 182, 0.34), 0],
      ['f', '#9a958a', rect(17, 210, 40, 8), 1.2],
      [
        'f',
        'dark',
        'M26,152 L18,148 L24,156 C28,160 40,160 44,154 C48,152 50,148 48,144 C46,140 40,140 38,144 C34,146 30,148 26,152 Z',
        0,
      ],
      ['f', '#9a958a', 'M48,144 L55,146 L48,148 Z', 0.8],
      ['f', '#fffaf0', c(44.5, 144.5, 1), 0],
      ['l', 'M34,158 L33,163 M39,158 L39,163', 1],
      // Kříž a svíčky (červené hřbitovní lampičky).
      [
        'f',
        '#5b5850',
        'M206,206 L206,166 L196,166 L196,158 L206,158 L206,146 L214,146 L214,158 L224,158 L224,166 L214,166 L214,206 Z',
        1.4,
      ],
      // Čerstvě vykopaný rov před křížem.
      ['f', '#8c5632', 'M156,222 C164,204 196,196 234,200 L234,224 Z', 1.4],
      ['f', '#5a3418', `${c(184, 210, 3)} ${c(204, 206, 2.4)} ${c(222, 212, 2.6)} ${c(170, 216, 2)}`, 0.8],
      ['f', '#d7442c', 'M58,204 L66,204 L67,214 L57,214 Z M200,196 L208,196 L209,206 L199,206 Z', 1],
      ['f', '#9a958a', 'M58,201 L66,201 L66,204 L58,204 Z M200,193 L208,193 L208,196 L200,196 Z', 0.8],
      [
        'f',
        '#f2cf4a',
        'M62,193 C60,196 60,199 62,199 C64,199 64,196 62,193 Z M204,185 C202,188 202,191 204,191 C206,191 206,188 204,185 Z',
        0.8,
      ],
    ],
    outfit: [
      ['f', '#8c5632', 'M68,238 L90,235 L92,255 L70,258 Z', 1.2],
      ['l', 'M70,242 l4,0 M70,250 l4,0 M86,239 l4,0 M87,249 l4,0 M76,236 l0,4 M82,256 l0,-4', 0.8],
    ],
    extra: [
      // Lopata: násada, list ve tvaru piky (s hlínou), objímka; ruka na násadě.
      ['f', '#c99a62', shovel('M-3.5,24 L3.5,24 L3.5,240 L-3.5,240 Z'), 1.4],
      ['f', '#d9d2c2', shovel(SPADE, 1.35), 2.2],
      ['s', '#fffaf0', shovel('M-13,4 C-13,-2 -9,-8 -5,-12', 1.35), 2],
      [
        'f',
        '#8c5632',
        shovel('M-19,6 C-17,1 -12,0 -10,4 C-7,3 -5,7 -8,10 C-10,14 -17,13 -19,6 Z', 1.35),
        0.8,
      ],
      ['f', '#9a958a', shovel('M-5,18 L5,18 L4.5,40 L-4.5,40 Z'), 1.4],
      ['f', SKIN, c(GRIP_X, GRIP_Y, 11, 9), 1.8],
      ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', GRIP_X, GRIP_Y, 1, SHOVEL_DEG), 1.1],
    ],
  },

  // Klenotník: lupa se zvětšeným okem, briliant v pinzetě, perly, prsten v krabičce, tapeta s káry.
  jeweler: {
    bg: '#cbb8e3',
    motif: 'none',
    body: '#2f3542',
    collar: 'shirt',
    glasses: false,
    prop: undefined,
    backdrop: [
      [
        'f',
        '#fffaf0',
        Array.from({ length: 7 }, (_, row) =>
          Array.from({ length: 9 }, (_, col) =>
            place(
              'M0,-6 C1,-3 3,-1 4.5,0 C3,1 1,3 0,6 C-1,3 -3,1 -4.5,0 C-3,-1 -1,-3 0,-6 Z',
              26 + col * 26 + (row % 2) * 13,
              34 + row * 26,
            ),
          ),
        )
          .flat()
          .join(' '),
        0,
      ],
      // Poprsí s perlami.
      ['f', '#22365c', 'M20,198 C20,180 30,172 42,168 L44,136 L60,132 L62,168 C74,172 84,180 84,198 Z', 1.6],
      [
        'f',
        '#fffaf0',
        Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (0.05 + (0.9 * i) / 8);
          return c(52 - 12 * Math.cos(a), 152 + 18 * Math.sin(a), 2.4);
        }).join(' '),
        0.8,
      ],
      ['f', '#d7442c', place('M0,-5 L4,0 L0,6 L-4,0 Z', 52, 176), 1],
      // Police s otevřenou krabičkou s prstenem.
      ['f', '#8c5632', rect(168, 120, 66, 6), 1.2],
      ['f', '#b8302a', 'M186,104 L212,104 L214,88 L188,88 Z', 1.4],
      ['f', '#b8302a', rect(186, 104, 26, 16), 1.4],
      ['f', '#22365c', rect(190, 106, 18, 6), 0.8],
      ['s', '#e9b030', c(199, 104, 5.5, 4), 2.4],
      ['f', '#9fd0c4', place('M0,-5 L4,0 L0,4 L-4,0 Z', 199, 98), 1],
      // Pult s vitrínou.
      ['f', '#8c5632', 'M16,206 H234 V284 H16 Z', 1.4],
      ['f', '#bcd6e6', 'M16,196 H234 V206 H16 Z', 1.4],
    ],
    outfit: [
      // Fialová vesta, motýlek, zlatý řetízek od kapesních hodinek.
      ['f', '#6b4a9e', 'M98,214 L125,252 L152,214 L160,284 L90,284 Z', 1.6],
      ['f', '#e9b030', `${c(125, 262, 2.4)} ${c(125, 274, 2.4)}`, 0.8],
      ['s', '#e9b030', 'M125,262 C131,272 142,272 147,262', 1.8],
      ['l', 'M142,262 L152,261', 1],
      ['f', '#d7442c', 'M111,218 L125,224 L139,218 L139,232 L125,226 L111,232 Z', 1.3],
      BUST_SHADOW,
    ],
    extra: [
      // Hodinářská lupa se zvětšeným okem.
      ['f', 'dark', c(114, 152, 11.5), 0],
      ['f', '#bcd6e6', c(114, 152, 8), 1.2],
      ['f', 'dark', c(114, 152, 4.4), 0],
      ['f', '#fffaf0', c(111.5, 149.5, 1.6), 0],
      // Pinzeta s briliantem.
      ['l', 'M183,252 L171,211 M187,252 L201,211', 2.4],
      ['s', '#d9d2c2', 'M183,252 L171,211 M187,252 L201,211', 1.4],
      ...hand(185, 258),
      ['f', '#9fd0c4', 'M168,208 L176,196 L196,196 L204,208 L186,234 Z', 2],
      ['l', 'M168,208 L204,208 M176,196 L181,208 L186,196 L191,208 L196,196 M181,208 L186,234 L191,208', 0.9],
      ['f', '#fffaf0', 'M178,200 L182,199 L180,205 Z', 0],
      [
        'f',
        '#fffaf0',
        `${place(STAR4, 216, 190, 0.9)} ${place(STAR4, 158, 192, 0.6)} ${place(STAR4, 212, 228, 0.5)}`,
        1,
      ],
    ],
  },

  // Křižák (♣ = kříže): kroužková kápě, štít s křížovým znakem, za ním spolubojovníci s praporci.
  crusader: {
    bg: '#bcd6e6',
    motif: 'none',
    body: '#fffaf0',
    hat: 'hood',
    hatColor: '#9a958a',
    prop: undefined,
    backdrop: [
      ['f', '#f6e3a1', 'M16,178 C60,162 100,170 140,162 C180,154 210,164 234,158 L234,284 L16,284 Z', 1.4],
      ['f', '#e9b030', 'M16,196 C70,186 120,196 170,188 C200,184 220,188 234,186 L234,284 L16,284 Z', 1.2],
      ['l', 'M150,40 q5,-5 10,0 q5,-5 10,0 M176,58 q4,-4 8,0 q4,-4 8,0', 1.1],
      ...companion(48, 140, 1, 70, -1),
      ...companion(202, 134, 0.9, 224, -1),
    ],
    outfit: [
      // Kroužkový límec přes ramena a červený kříž na plášti.
      [
        'f',
        '#9a958a',
        'M100,210 L150,210 C166,214 178,222 186,234 C160,241 90,241 64,234 C72,222 84,214 100,210 Z',
        1.6,
      ],
      [
        'l',
        'M78,226 q2,2 4,0 M88,222 q2,2 4,0 M98,226 q2,2 4,0 M108,230 q2,2 4,0 M140,230 q2,2 4,0 M150,226 q2,2 4,0 M160,222 q2,2 4,0 M170,226 q2,2 4,0 M84,232 q2,2 4,0 M164,232 q2,2 4,0',
        0.7,
      ],
      [
        'f',
        '#d7442c',
        'M117,242 L133,242 L133,254 L153,254 L153,266 L133,266 L133,284 L117,284 L117,266 L97,266 L97,254 L117,254 Z',
        1.4,
      ],
      BUST_SHADOW,
    ],
    extra: [
      ['l', mailRings(), 0.6],
      // Štít s křížovým znakem (♣).
      ['f', '#fffaf0', 'M160,202 L218,202 L218,228 C218,250 202,264 189,274 C176,264 160,250 160,228 Z', 2.4],
      ['s', '#d7442c', 'M165,207 L213,207 L213,228 C213,247 199,259 189,268 C179,259 165,247 165,228 Z', 4],
      ['f', 'dark', club(189, 234, 1.05), 0],
      ['h', 'M189,202 L218,202 L218,228 C218,250 202,264 189,274 Z', 0],
    ],
  },

  // Ranní ptáče: východ slunce, kohout na plotě, ptáček na hlavě, pruhované pyžamo a puntíkatý hrnek.
  early_bird: {
    bg: '#f6e3a1',
    motif: 'none',
    body: '#fffaf0',
    collar: 'plain',
    hat: undefined,
    hairColor: '#8c5632',
    prop: undefined,
    backdrop: [
      ['f', '#f3c7c0', rect(16, 16, 218, 70), 0],
      ['f', '#f2cf4a', sunRays(180, 194, 11), 0],
      ['f', '#ef8a2e', c(180, 194, 30), 2],
      ['f', '#5d9a3e', 'M16,196 C60,184 110,192 150,188 C190,184 214,190 234,186 L234,284 L16,284 Z', 1.6],
      ['l', 'M16,214 C70,206 160,212 234,204 M16,236 C80,228 160,234 234,226', 0.9],
      ['l', 'M178,58 q5,-5 10,0 q5,-5 10,0 M202,76 q4,-4 8,0 q4,-4 8,0', 1.2],
      // Plot s kokrhajícím kohoutem.
      ['f', '#c99a62', 'M18,176 L94,182 L94,188 L18,182 Z M18,194 L94,198 L94,204 L18,200 Z', 1.2],
      [
        'f',
        '#c99a62',
        'M38,214 L38,166 L42,160 L46,166 L46,214 Z M64,214 L64,168 L68,162 L72,168 L72,214 Z M88,214 L88,172 L92,166 L96,172 L96,214 Z',
        1.3,
      ],
      ['i', 'rooster', 14, 112, 52, '#d7442c'],
      ['l', 'M68,114 l8,-5 M70,122 l9,-1 M69,130 l8,3', 1.2],
    ],
    outfit: [
      ['f', SKIN, 'M108,210 L125,236 L142,210 Z', 1.2],
      ['f', '#6fa0c8', [56, 74, 92, 150, 168, 186].map((x) => bustStripe(x, x + 7)).join(' '), 0],
      ['f', '#6fa0c8', 'M110,240 L117,240 L117,284 L110,284 Z M133,240 L140,240 L140,284 L133,284 Z', 0],
      ['f', '#fffaf0', 'M100,210 L125,238 L113,246 L94,214 Z', 1.4],
      ['f', '#fffaf0', 'M150,210 L125,238 L137,246 L156,214 Z', 1.4],
      ['s', '#2f5fa8', 'M98,214 L114,242 M152,214 L136,242', 1.6],
      ['f', '#2f5fa8', `${c(125, 252, 2.6)} ${c(125, 268, 2.6)}`, 0.8],
      ['l', 'M125,242 L125,284', 0.9],
      BUST_SHADOW,
    ],
    extra: [
      // Ptáček na hlavě.
      ['f', '#8c5632', 'M114,104 L103,100 L106,109 Z', 1],
      ['f', '#8c5632', c(124, 106, 12, 8), 1.4],
      ['f', '#f6e3a1', 'M118,110 C122,114 130,114 134,108 C130,112 122,112 118,110 Z', 0],
      ['f', '#8c5632', c(136, 99, 6), 1.4],
      ['f', '#ef8a2e', 'M141,97 L149,99 L141,102 Z', 1],
      ['f', 'dark', c(137.5, 98, 1.2), 0],
      ['l', 'M116,104 C120,100 126,100 130,104 M121,113 L120,117 M128,113 L129,117', 1],
      // Puntíkatý hrnek s kouřící kávou.
      ['l', 'M180,206 C176,200 184,196 180,190 M191,206 C187,200 195,196 191,190', 1.2],
      ['f', '#d7442c', 'M204,218 C216,218 216,238 202,238 L202,233 C210,233 210,223 204,223 Z', 1.6],
      ['f', '#d7442c', 'M172,212 L204,212 L202,244 C202,248 174,248 174,244 Z', 2],
      [
        'f',
        '#fffaf0',
        `${c(180, 222, 2.4)} ${c(194, 220, 2.4)} ${c(187, 231, 2.4)} ${c(179, 239, 2.2)} ${c(197, 238, 2.2)}`,
        0,
      ],
      ['f', '#5a3418', c(188, 213, 15, 3.4), 1.2],
      ...hand(188, 250),
    ],
  },

  // Noční směna: vrátný dřímá ve vrátnici, hodiny ukazují dvě, za oknem jde šéf s baterkou na kontrolu.
  night_shift: {
    bg: '#d9d2c2',
    motif: 'none',
    body: '#3b4f78',
    hatColor: '#22365c',
    mood: 'o',
    prop: undefined,
    backdrop: [
      ['f', '#2f8077', rect(16, 186, 218, 98), 0],
      ['l', 'M16,186 H234', 1.2],
      // Okno do noci.
      ['f', '#fffaf0', rect(34, 60, 182, 122), 1.6],
      ['f', '#22365c', rect(42, 68, 166, 106), 1.2],
      [
        'f',
        '#fffaf0',
        [
          [56, 80],
          [96, 74],
          [150, 78],
          [118, 92],
          [170, 100],
          [52, 112],
        ]
          .map(([x, y]) => place(STAR4, x!, y!, 0.3))
          .join(' '),
        0,
      ],
      ['f', '#f2cf4a', 'M190,76 A14,14 0 1,0 202,100 A11,11 0 1,1 190,76 Z', 1.2],
      ['f', '#9a958a', `${c(58, 96, 5)} ${c(50, 88, 6)} ${c(46, 78, 5)}`, 1],
      [
        'f',
        '#5b5850',
        'M42,174 L42,148 L56,138 L56,148 L70,138 L70,148 L84,138 L84,148 L96,140 L96,174 Z M62,142 L62,102 L70,102 L70,142 Z',
        1.2,
      ],
      ['f', '#5b5850', 'M150,174 L150,150 L208,150 L208,174 Z', 1.2],
      [
        'f',
        '#f2cf4a',
        `${rect(46, 154, 6, 6)} ${rect(60, 154, 6, 6)} ${rect(74, 162, 6, 6)} ${rect(156, 156, 6, 6)} ${rect(170, 156, 6, 6)} ${rect(156, 164, 6, 6)}`,
        0.6,
      ],
      // Šéf s baterkou jde na kontrolu.
      ['f', '#f6e3a1', 'M190,154 L164,148 L166,172 Z', 0],
      [
        'f',
        'dark',
        `${c(196, 146, 4)} M190,174 L191,152 C192,150 200,150 201,152 L202,174 Z M190,142 L202,142 L202,139 L199,139 L199,136 L193,136 L193,139 L190,139 Z`,
        0,
      ],
      ['f', '#fffaf0', 'M118,60 L132,60 L132,182 L118,182 Z M34,118 L216,118 L216,124 L34,124 Z', 1],
      // Hodiny: dvě po půlnoci.
      ['f', '#fffaf0', c(206, 38, 14), 1.8],
      ['s', '#d7442c', c(206, 38, 12), 1.6],
      ['l', 'M206,28 L206,31 M216,38 L213,38 M206,48 L206,45 M196,38 L199,38', 1],
      ['l', 'M206,38 L206,28.5 M206,38 L211.5,34.8', 1.4],
    ],
    outfit: [
      ['f', '#e9b030', 'M88,238 L102,238 L102,248 C102,254 95,258 95,258 C95,258 88,254 88,248 Z', 1.2],
      ['f', '#d7442c', place(STAR4, 95, 247, 0.4), 0],
    ],
    extra: [
      // Dřímá: zavřená víčka, kruhy pod očima.
      [
        'f',
        SKIN,
        'M107.5,152.5 C107.5,145 120.5,145 120.5,152.5 Z M129.5,152.5 C129.5,145 142.5,145 142.5,152.5 Z',
        1.3,
      ],
      ['l', 'M108,159 C111,162 117,162 120,159 M130,159 C133,162 139,162 142,159', 0.9],
      // Víčko termosky s čajem.
      ['l', 'M182,208 C178,202 186,198 182,192 M193,208 C189,202 197,198 193,192', 1.2],
      ['f', '#d9d2c2', 'M176,216 L200,216 L197,246 L179,246 Z', 1.8],
      ['f', '#8c5632', c(188, 216, 12, 3), 1],
      ['l', 'M177,224 L199,224 M178,238 L198,238', 0.9],
      ...hand(188, 250),
      // Termoska na stole.
      ['f', '#9a958a', 'M24,222 L44,222 L44,212 C44,207 24,207 24,212 Z', 1.6],
      ['f', '#d7442c', 'M22,230 C22,224 26,222 34,222 C42,222 46,224 46,230 L46,284 L22,284 Z', 1.8],
      ['f', '#fffaf0', rect(22, 240, 24, 14), 1.2],
    ],
  },

  // Meteorolog: mapa republiky, polojasno, z mraku prší body (plusy), ukazovátko a teploměr s dílky.
  meteorologist: {
    bg: '#6fa0c8',
    motif: 'none',
    body: '#22365c',
    prop: undefined,
    backdrop: [
      ['f', '#5d9a3e', smooth(CZ), 1.8],
      ['f', '#d7442c', c(89, 111, 3), 1],
      ['l', c(89, 111, 6), 0.8],
      // Polojasno.
      ['l', 'M52,86 L52,80 M66,92 L71,88 M72,106 L78,106 M38,92 L33,88 M32,106 L26,106 M38,120 L33,124', 1.4],
      ['f', '#f2cf4a', c(52, 106, 13), 1.6],
      ['f', '#fffaf0', place(CLOUD, 66, 130, 0.85), 1.6],
      // Mrak s přeháňkami bodů.
      ['f', '#d9d2c2', place(CLOUD, 198, 118, 1.05), 1.6],
      [
        'f',
        '#f2cf4a',
        pluses([
          [184, 132],
          [200, 140],
          [214, 130],
          [190, 154],
          [208, 158],
          [178, 170],
        ]),
        0.8,
      ],
      // Teploměr.
      ['f', '#fffaf0', 'M26,246 L26,190 C26,184 36,184 36,190 L36,246 Z', 1.4],
      ['f', '#d7442c', rect(29, 198, 4, 48), 0],
      ['f', '#d7442c', c(31, 250, 7), 1.4],
      ['l', 'M37,198 h5 M37,210 h5 M37,222 h5 M37,234 h5', 1],
    ],
    outfit: [
      ['f', '#fffaf0', 'M150,243 L155,234 L159,240 L163,232 L166,242 Z', 1],
      ['l', 'M147,243 L169,241', 1.1],
    ],
    extra: [
      ['f', '#8c5632', place('M-2,0 L2,0 L1.2,-122 L-1.2,-122 Z', 186, 252, 1, 8), 1],
      ['f', '#fffaf0', place('M-1.4,-112 L1.4,-112 L1.2,-124 L-1.2,-124 Z', 186, 252, 1, 8), 1],
      ...hand(186, 254, 8),
    ],
  },

  // Tělocvikář: šusťáková souprava, píšťalka, stopky, žebřiny a žáci v řadě (poslední s omluvenkou).
  pe_teacher: {
    bg: '#bcd6e6',
    motif: 'none',
    body: '#2f5fa8',
    mood: 'o',
    prop: { icon: 'stopwatch', color: '#d9d2c2' },
    backdrop: [
      // Parkety s čarou hřiště.
      ['f', '#c99a62', 'M16,200 H234 V284 H16 Z', 1.4],
      ['l', 'M16,236 H234 M16,262 H234 M40,200 V236 M100,236 V262 M180,200 V236 M200,262 V284', 0.7],
      ['s', '#d7442c', 'M16,214 L234,214', 2.6],
      // Žebřiny.
      ['f', '#c99a62', Array.from({ length: 11 }, (_, i) => rect(20, 60 + i * 13, 62, 3.5)).join(' '), 0.8],
      ['f', '#c99a62', `${rect(18, 52, 6, 148)} ${rect(47, 52, 6, 148)} ${rect(76, 52, 6, 148)}`, 1.2],
      // Šplhací lana.
      ['f', '#f6e3a1', `${rect(88, 16, 5, 84)} ${rect(157, 16, 5, 78)}`, 1],
      ['f', '#f6e3a1', `${c(90.5, 102, 4.5, 5)} ${c(159.5, 96, 4.5, 5)}`, 1],
      [
        'l',
        'M88,30 l5,-4 M88,44 l5,-4 M88,58 l5,-4 M88,72 l5,-4 M88,86 l5,-4 M157,30 l5,-4 M157,44 l5,-4 M157,58 l5,-4 M157,72 l5,-4',
        0.7,
      ],
      // Basketbalový koš.
      ['f', '#fffaf0', rect(178, 28, 48, 34), 1.6],
      ['s', '#d7442c', rect(192, 42, 20, 14), 2],
      [
        'l',
        'M192,66 L195,86 M199,67 L200,88 M205,67 L204,88 M212,66 L209,86 M193,76 L211,76 M195,84 L209,84',
        0.8,
      ],
      ['s', '#ef8a2e', c(202, 66, 11, 3), 2.6],
      ...pupils(),
    ],
    outfit: [
      // Pruhy na rukávech, zip.
      ['s', '#fffaf0', 'M98,213 C78,220 62,240 57,284 M152,213 C172,220 188,240 193,284', 4],
      ['s', '#d7442c', 'M104,216 C86,224 72,244 67,284 M146,216 C164,224 178,244 183,284', 4],
      ['l', 'M125,226 L125,284', 1.2],
      ['f', '#d9d2c2', rect(122, 228, 6, 10), 1],
      BUST_SHADOW,
    ],
    extra: [
      // Šňůrka a píšťalka v puse.
      ['s', '#d7442c', 'M146,184 C152,196 150,206 141,214 M106,184 C106,196 108,206 111,214', 1.6],
      ['f', '#d9d2c2', c(143, 182, 7.5), 1.6],
      ['f', '#d9d2c2', 'M121,173 L140,174 L140,181 L121,182 Z', 1.4],
      ['f', 'dark', rect(132, 174, 4, 2.4), 0],
      ['l', 'M154,172 l6,-3 M155,180 l7,0 M154,188 l6,3', 1.1],
    ],
  },
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  beerMat: BEER_MAT,
};

/**
 * Obrázky žolíků — dávka 11 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - tour_guide — Turistický průvodce: portrét `fig-tour_guide` (FIGURES['tour_guide'])
 *  - spartakiada — Spartakiáda: portrét `fig-spartakiada` (FIGURES['spartakiada'])
 *  - voucher_privatization — Kupónová privatizace: nová scéna `j-voucher_privatization` (SCENES['j-voucher_privatization'])
 *  - spa_guest — Lázeňský host: portrét `fig-spa_guest` (FIGURES['spa_guest'])
 *  - brass_band — Dechovka: portrét `fig-brass_band` (FIGURES['brass_band'])
 *  - charles_bridge — Karlův most: scéna `karluvMost` (SCENES['karluvMost'])
 *  - d1_motorway — Dálnice D1: scéna `d1` (SCENES['d1'])
 *  - exchange_office — Směnárna: nová scéna `j-exchange_office` (SCENES['j-exchange_office'])
 *  - new_years_eve — Silvestr: scéna `silvestr` (SCENES['silvestr'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import { figure } from '../figureKit';
import type { SceneOp } from '../sceneKit';
import { c, rect } from '../sceneKit';

// ─────────────────────────── Pomocné tvary ───────────────────────────

const SKIN = '#f2b38c';
const INK = '#1a1714';
const n1 = (n: number): number => Math.round(n * 10) / 10;
const r1 = (n: number): string => String(n1(n));

/** Více tvarů jedné barvy v jedné cestě. */
const join = (parts: readonly string[]): string => parts.join(' ');

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
const hand = (x: number, y: number): SceneOp[] => [
  ['f', SKIN, c(x, y, 11, 9), 1.8],
  ['l', `M${x - 9},${y - 3} l18,0 M${x - 9},${y + 3} l18,0`, 1.1],
];

/** Paprsky po obvodu kruhu (jedna cesta). */
function ticks(cx: number, cy: number, ra: number, rb: number, n: number, a0 = 0): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.PI * 2 * i) / n;
    d += `M${r1(cx + Math.cos(a) * ra)},${r1(cy + Math.sin(a) * ra)} L${r1(cx + Math.cos(a) * rb)},${r1(cy + Math.sin(a) * rb)} `;
  }
  return d.trim();
}

/** Čtyřcípá jiskra. */
const star4 = (x: number, y: number, r: number): string =>
  `M${x},${r1(y - r)} Q${r1(x + r * 0.16)},${r1(y - r * 0.16)} ${r1(x + r)},${y} ` +
  `Q${r1(x + r * 0.16)},${r1(y + r * 0.16)} ${x},${r1(y + r)} Q${r1(x - r * 0.16)},${r1(y + r * 0.16)} ${r1(x - r)},${y} ` +
  `Q${r1(x - r * 0.16)},${r1(y - r * 0.16)} ${x},${r1(y - r)} Z`;

/** Bod na kvadratické křivce p0 → p1 (řídicí) → p2. */
function quad(
  p0: readonly [number, number],
  p1: readonly [number, number],
  p2: readonly [number, number],
  t: number,
): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

/** Hlavičky dvou osminových not spojených trámcem (♫) — zvlášť od nožiček kvůli vinutí cest. */
const noteHeads = (x: number, y: number, s: number): string =>
  `${c(n1(x - 6 * s), n1(y + 10 * s), n1(4.4 * s), n1(3.2 * s))} ${c(n1(x + 8 * s), n1(y + 8 * s), n1(4.4 * s), n1(3.2 * s))}`;
/** Nožičky a trámec osminových not (♫). */
const noteStems = (x: number, y: number, s: number): string =>
  `${rect(x - 2.6 * s, y - 8 * s, 1.8 * s, 18 * s)} ${rect(x + 11.4 * s, y - 10 * s, 1.8 * s, 18 * s)} ` +
  `M${r1(x - 2.6 * s)},${r1(y - 8 * s)} L${r1(x + 13.2 * s)},${r1(y - 10.5 * s)} L${r1(x + 13.2 * s)},${r1(y - 5.5 * s)} L${r1(x - 2.6 * s)},${r1(y - 3 * s)} Z`;

/** Obdélník relativními příkazy (úsporný zápis pro stovky malých tvarů). */
const box = (x: number, y: number, w: number, h: number): string =>
  `M${r1(x)},${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`;
/** Kruh relativními příkazy (úsporný zápis pro stovky malých tvarů). */
const dot = (x: number, y: number, r: number): string =>
  `M${r1(x - r)},${r1(y)}a${r1(r)},${r1(r)} 0 1,0 ${r1(2 * r)},0a${r1(r)},${r1(r)} 0 1,0 ${r1(-2 * r)},0Z`;

/** Malý smrček (trojúhelník se zubem). */
const spruce = (x: number, y: number, s: number): string =>
  `M${x},${r1(y - 16 * s)} L${r1(x + 6 * s)},${r1(y - 6 * s)} L${r1(x + 3 * s)},${r1(y - 6 * s)} ` +
  `L${r1(x + 8 * s)},${y} L${r1(x - 8 * s)},${y} L${r1(x - 3 * s)},${r1(y - 6 * s)} L${r1(x - 6 * s)},${r1(y - 6 * s)} Z`;

// ─────────────────────────── Turistický průvodce ───────────────────────────

/** Směrovka rozcestníku (bílá deska se šipkou) — `dir` 1 doprava, −1 doleva. */
function signBoard(x0: number, x1: number, y: number, dir: 1 | -1, h = 11): string {
  return dir === 1
    ? `M${x0},${y} H${x1 - 6} L${x1},${y + h / 2} L${x1 - 6},${y + h} H${x0} Z`
    : `M${x1},${y} H${x0 + 6} L${x0},${y + h / 2} L${x0 + 6},${y + h} H${x1} Z`;
}

// Turistický průvodce: rozcestník se čtyřmi barvami značek a pátou směrovkou do hospody, deštník nad hlavou, skupinka za ní.
const TOUR_BACKDROP: SceneOp[] = [
  [
    'f',
    '#fffaf0',
    'M100,62 C98,52 110,46 118,51 C122,42 138,42 141,52 C150,50 156,60 149,65 L106,66 C99,66 97,64 100,62 Z',
    1.3,
  ],
  // Vzdálený hřeben s lesem a příhradovou rozhlednou.
  ['f', '#9fd0c4', 'M16,150 C50,132 90,120 130,118 C170,116 204,126 234,138 L234,214 L16,214 Z', 1.4],
  [
    'f',
    '#2f6b3a',
    join([
      spruce(26, 150, 0.8),
      spruce(38, 145, 0.9),
      spruce(52, 140, 0.8),
      spruce(186, 130, 0.8),
      spruce(200, 134, 0.9),
      spruce(214, 137, 0.8),
      spruce(226, 141, 0.9),
    ]),
    1,
  ],
  [
    'l',
    'M158,122 L163,94 M174,122 L169,94 M159,116 L172,108 M173,116 L160,108 M161,104 L171,98 M171,104 L162,98',
    1.2,
  ],
  ['f', '#c99a62', rect(159, 88, 14, 6), 1.1],
  ['f', '#d7442c', 'M156,88 L166,79 L176,88 Z', 1.1],
  ['l', 'M166,79 L166,70', 1],
  ['f', '#d7442c', 'M166,70 L174,72.5 L166,75 Z', 0.6],
  // Bližší louka s pěšinou.
  ['f', '#5d9a3e', 'M16,190 C60,174 110,172 150,180 C190,188 214,180 234,174 L234,284 L16,284 Z', 1.4],
  ['s', '#f3e8cf', 'M234,196 C206,200 196,186 170,190', 3.4],
  // Rozcestník: sloupek se stříškou a směrovky se značkami.
  ['f', '#9a958a', rect(37, 96, 6, 124), 1.3],
  ['f', '#5b5850', 'M33,97 L47,97 L45,90 L35,90 Z', 1.1],
  [
    'f',
    '#fffaf0',
    join([
      signBoard(30, 82, 100, 1),
      signBoard(18, 50, 115, -1),
      signBoard(30, 82, 130, 1),
      signBoard(18, 50, 145, -1),
      signBoard(30, 86, 161, 1, 15),
    ]),
    1.2,
  ],
  ['f', '#d7442c', rect(60, 104, 14, 3.4), 0],
  ['f', '#2f5fa8', rect(25, 119, 14, 3.4), 0],
  ['f', '#5d9a3e', rect(60, 134, 14, 3.4), 0],
  ['f', '#e9b030', rect(25, 149, 14, 3.4), 0],
  ['l', 'M34,105.5 h18 M34,135.5 h18 M41,120.5 h6 M41,150.5 h6', 0.8],
  // Skupina turistů v kloboučcích jde za průvodkyní (jeden fotí).
  ['f', '#2f5fa8', 'M46,216 C46,204 50,200 55,200 C60,200 64,204 64,216 Z', 1.1],
  ['f', '#e9b030', 'M60,218 C60,206 64,202 69,202 C74,202 78,206 78,218 Z', 1.1],
  ['f', SKIN, `${c(55, 193, 5.4)} ${c(69, 195, 5.4)}`, 1.1],
  ['f', '#fffaf0', 'M47,191 C48,183 62,183 63,191 Z M61,193 C62,185 76,185 77,193 Z', 1],
  [
    'f',
    INK,
    `${c(53, 193, 0.9)} ${c(57, 193, 0.9)} ${c(67, 195, 0.9)} ${c(71, 195, 0.9)} ${rect(64, 205, 9, 6)}`,
    0,
  ],
  ['f', '#bcd6e6', c(68.5, 208, 1.8), 0],
  // Pátá směrovka: půllitr s pěnou.
  ['f', '#f2cf4a', 'M58,166 L70,166 L69,177 L59,177 Z', 1.1],
  ['f', '#fffaf0', 'M57,167 C56,162 61,161 63,163 C65,160 71,161 71,166 Z', 1],
  ['l', 'M70,168 c4,0 4,6 0,6', 1],
];

const TOUR_OUTFIT: SceneOp[] = [
  // Zip bundy, popruh batohu a jmenovka na šňůrce se značkou.
  ['l', 'M125,218 L125,284', 1.4],
  ['l', 'M122,226 h6 M122,234 h6 M122,242 h6 M122,264 h6 M122,272 h6 M122,280 h6', 0.8],
  ['f', '#22365c', 'M74,232 L90,218 L102,284 L84,284 Z', 1.4],
  ['f', '#9a958a', rect(82, 246, 12, 8), 1],
  ['s', '#22365c', 'M112,212 L117,244 M138,212 L133,244', 2.6],
  ['f', '#fffaf0', rect(113, 242, 24, 19), 1.3],
  ['f', '#d7442c', rect(117, 247, 16, 4), 0],
  ['l', 'M118,256 h14', 0.8],
];

const TOUR_EXTRA: SceneOp[] = [
  // Náhlavní souprava s mikrofonem.
  ['l', 'M96,154 C90,108 160,108 154,154', 1.8],
  ['f', INK, `${c(96, 157, 4, 6)} ${c(154, 157, 4, 6)}`, 0],
  ['l', 'M96,162 C96,173 100,179 107,181', 1.4],
  ['f', INK, c(108, 181, 2.6), 0],
  // Zvednutý deštník s praporkem.
  ['l', 'M194,92 L196,126 M194,58 L194,38', 2.6],
  ['f', '#d7442c', 'M194,38 L214,43 L194,48 Z', 1.1],
  [
    'f',
    '#f2cf4a',
    'M158,94 C160,70 176,58 194,58 C212,58 228,70 230,94 Q221,88 212,94 Q203,88 194,94 Q185,88 176,94 Q167,88 158,94 Z',
    1.8,
  ],
  [
    'f',
    '#2f5fa8',
    'M194,58 C178,60 162,72 158,94 Q167,88 176,94 Q180,70 194,58 Z M194,58 Q197,76 194,94 Q203,88 212,94 Q208,70 194,58 Z',
    1.2,
  ],
  ['f', '#d7442c', 'M160,224 C174,200 180,172 184,146 L206,147 C205,176 201,208 198,246 Z', 2],
  ['h', 'M196,146 L206,147 C205,176 201,208 198,246 L186,238 C190,210 194,176 196,146 Z', 45],
  ['f', '#b8302a', 'M183,149 L207,150 L207,141 L184,140 Z', 1.4],
  ['f', SKIN, c(196, 132, 10, 9), 1.8],
  ['l', 'M188,129 l15,0 M188,135 l15,0', 1.1],
];

// ─────────────────────────── Spartakiáda ───────────────────────────

/** Cvičenci na ploše: řady úplně stejných postaviček s rukama nad hlavou do V, vpředu větší (perspektiva). */
function gymnasts(): SceneOp[] {
  const arms: string[] = [];
  const heads: string[] = [];
  const tops: string[] = [];
  const shorts: string[] = [];
  let y = 108;
  for (let row = 0; row < 10; row++) {
    const s = 0.45 + row * 0.07;
    const dx = 10 * s + 4.5;
    for (let x = 19 + (row % 2) * (dx / 2); x < 232; x += dx) {
      arms.push(
        `M${r1(x - 5.5 * s)},${r1(y - 7 * s)}L${r1(x)},${r1(y + 0.5 * s)}L${r1(x + 5.5 * s)},${r1(y - 7 * s)}`,
      );
      heads.push(dot(x, y - 3.4 * s, 1.9 * s));
      tops.push(box(x - 2.2 * s, y - 1.2 * s, 4.4 * s, 5.4 * s));
      shorts.push(box(x - 2.2 * s, y + 4.2 * s, 4.4 * s, 2.4 * s));
    }
    y += 12 * s + 2;
  }
  return [
    ['l', join(arms), 0.9],
    ['f', '#fffaf0', join(tops), 0],
    ['f', '#22365c', join(shorts), 0],
    ['f', SKIN, join(heads), 0],
  ];
}

/** Hlediště: řady hlav po barvách. */
function standsCrowd(y0: number, rows: number, step: number): SceneOp[] {
  const colors = ['#d7442c', '#fffaf0', '#22365c', '#f2cf4a', '#f2b38c'] as const;
  const groups = new Map<string, string[]>();
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * step;
    for (let i = 0, x = 20 + (row % 2) * 4; x < 232; i++, x += 8) {
      const col = colors[(i * 3 + row * 2) % colors.length]!;
      const list = groups.get(col) ?? [];
      list.push(dot(x, y, 2.9));
      groups.set(col, list);
    }
  }
  return [...groups].map(([col, list]): SceneOp => ['f', col, join(list), 0.5]);
}

// Spartakiáda: cvičenka s obručemi v rukou nad hlavou, za ní stovky stejných cvičenců v tomtéž pohybu, natáčí to televize.
const SPARTA_BACKDROP: SceneOp[] = [
  ['f', '#d9d2c2', rect(16, 40, 218, 62), 1.4],
  ['l', 'M16,56 H234 M16,72 H234 M16,88 H234', 0.8],
  ...standsCrowd(47, 6, 8.6),
  ['f', '#5d9a3e', rect(16, 102, 218, 182), 1.4],
  ['s', '#fffaf0', 'M16,104 H234', 2.4],
  ...gymnasts(),
  // Televizní kamera na stativu (červené světélko — „pro televizi“).
  ['l', 'M162,78 L154,96 M162,78 L170,96 M162,78 L162,97', 1.4],
  ['f', '#5b5850', rect(150, 58, 26, 20), 1.6],
  ['f', '#9a958a', rect(170, 52, 8, 6), 1.1],
  ['f', INK, c(150, 68, 8), 1.2],
  ['f', '#bcd6e6', c(150, 68, 4.5), 0.8],
  ['f', '#d7442c', c(172, 63, 2.4), 0.6],
];

const SPARTA_OUTFIT: SceneOp[] = [
  // Tílko: holá ramena, výstřih a pruh přes hruď.
  ['f', SKIN, 'M44,284 C48,240 70,218 100,210 L106,210 C98,230 92,256 90,284 Z', 1.6],
  ['f', SKIN, 'M206,284 C202,240 180,218 150,210 L144,210 C152,230 158,256 160,284 Z', 1.6],
  ['f', SKIN, 'M105,210 C110,228 140,228 145,210 Z', 1.4],
  ['f', '#d7442c', 'M92,250 L158,250 L159,261 L91,261 Z', 1.2],
  ['f', '#22365c', 'M91,264 L159,264 L160,270 L90,270 Z', 1],
];

const SPARTA_EXTRA: SceneOp[] = [
  // Ruce nad hlavou do V, v každé obruč.
  ['f', SKIN, 'M60,250 C55,212 50,170 46,128 L60,125 C66,166 74,206 84,234 Z', 1.8],
  ['f', SKIN, 'M190,250 C195,212 200,170 204,128 L190,125 C184,166 176,206 166,234 Z', 1.8],
  ['h', 'M190,250 C195,212 200,170 204,128 L198,127 C194,170 188,210 180,242 Z', 45],
  ['l', `${c(48, 97, 22)} ${c(202, 97, 22)}`, 5.6],
  ['s', '#d7442c', `${c(48, 97, 22)} ${c(202, 97, 22)}`, 3.2],
  ['s', '#fffaf0', 'M31,86 l4,-5 M48,75 l5,1 M219,86 l-4,-5 M202,75 l-5,1', 2],
  ['f', SKIN, `${c(53, 120, 9, 10)} ${c(197, 120, 9, 10)}`, 1.8],
];

// ─────────────────────────── Kupónová privatizace ───────────────────────────

/** Kupóny na stránce knížky (mřížka 3 × 2); `torn` = vytržené (zbude jen zoubkovaný okraj). */
function couponPage(
  x0: number,
  y0: number,
  torn: readonly number[],
): { full: string[]; marks: string[]; stubs: string[]; dots: string[] } {
  const full: string[] = [];
  const marks: string[] = [];
  const stubs: string[] = [];
  const dots: string[] = [];
  const w = 28;
  const h = 22;
  for (let i = 0; i < 6; i++) {
    const x = x0 + (i % 3) * (w + 3);
    const y = y0 + Math.floor(i / 3) * (h + 3);
    if (torn.includes(i)) {
      let d = `M${x},${y}`;
      for (let k = 1; k <= 7; k++) d += ` L${r1(x + (k * w) / 7 - w / 14)},${y + (k % 2 ? 2.5 : 0)}`;
      stubs.push(d + ` L${x + w},${y}`);
    } else {
      full.push(rect(x, y, w, h));
      marks.push(`${c(x + 8, y + 11, 4.2)} M${x + 15},${y + 8} h9 M${x + 15},${y + 13} h6`);
      for (let k = 2; k < w; k += 4) dots.push(c(x + k, y + h + 1.5, 0.7));
    }
  }
  return { full, marks, stubs, dots };
}

const LEFT_PAGE = couponPage(31, 206, [4]);
const RIGHT_PAGE = couponPage(131, 206, [0, 1, 3]);

// Kupónová privatizace: z fabriky vede tunel k moři, jachta s pytlem peněz odplouvá, vpředu vytrhaná kupónová knížka.
const VOUCHER: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  // Moře se zapadajícím sluncem, jachta s pytlem peněz a palma.
  ['f', '#f2cf4a', c(194, 108, 13), 1.3],
  ['f', '#6fa0c8', rect(150, 108, 84, 20), 1.3],
  ['l', 'M156,122 h8 M206,120 h12 M176,125 h8', 0.9],
  ['f', '#f6e3a1', rect(150, 128, 84, 12), 1.2],
  ['f', '#fffaf0', 'M179,82 L179,108 L196,108 Z M177,87 L177,108 L164,108 Z', 1.2],
  ['l', 'M178,80 L178,110', 1.3],
  ['f', '#d7442c', 'M161,110 L196,110 L191,118 L166,118 Z', 1.3],
  ['f', '#c99a62', 'M168,110 C163,110 163,102 168,101 C167,99 171,99 170,101 C175,102 175,110 170,110 Z', 1],
  ['l', 'M166,103 l4,0', 0.8],
  ['s', '#8c5632', 'M222,138 C220,124 218,110 222,94', 4],
  [
    'f',
    '#2f6b3a',
    'M222,94 C214,86 204,88 198,94 C206,92 214,92 222,96 Z M222,94 C230,86 240,88 244,94 C236,92 228,92 222,96 Z M222,94 C218,84 210,80 204,80 C212,84 218,88 221,96 Z M222,94 C228,84 234,80 238,80 C232,86 226,90 223,96 Z',
    1.1,
  ],
  ['f', '#8c5632', `${c(219, 98, 2.4)} ${c(225, 98, 2.4)}`, 0.6],
  // Fabrika: pilová střecha, okna (jedno rozbité), vrata a komíny s kouřem, co táhne k moři.
  ['f', '#d9d2c2', `${c(112, 34, 7, 5)} ${c(128, 31, 8, 6)} ${c(145, 29, 9, 6)} ${c(162, 28, 9, 6)}`, 1.2],
  ['f', '#b8302a', `${rect(98, 40, 10, 44)} ${rect(116, 50, 10, 34)}`, 1.4],
  ['f', '#fffaf0', `${rect(98, 46, 10, 4)} ${rect(116, 56, 10, 4)}`, 0],
  [
    'f',
    '#9a958a',
    'M22,94 L22,80 L48,94 Z M48,94 L48,80 L74,94 Z M74,94 L74,80 L100,94 Z M100,94 L100,80 L126,94 Z M126,94 L126,80 L146,94 Z',
    1.3,
  ],
  ['f', '#d9d2c2', rect(22, 94, 124, 46), 1.6],
  ['f', '#2f5fa8', join([30, 50, 90, 110, 130].map((x) => rect(x, 103, 11, 13))), 1.1],
  ['l', 'M92,105 L98,113 L96,116', 0.9],
  ['f', '#8c5632', rect(62, 118, 20, 22), 1.3],
  ['l', 'M72,118 V140', 1],
  // Řez zemí: tunel z fabriky až na pláž, vozík plný zlaťáků jede po kolejích.
  ['f', '#c99a62', rect(16, 140, 218, 58), 1.4],
  ['s', '#5d9a3e', 'M16,141 H150', 2.4],
  [
    'l',
    'M16,154 C24,151 30,157 36,155 M224,158 C228,156 230,160 234,158 M20,196 C60,192 120,198 160,194',
    0.8,
  ],
  [
    'f',
    '#5a3418',
    'M40,140 L40,182 C40,190 46,192 54,192 L194,192 C202,192 208,186 208,178 L208,140 L190,140 L190,164 L58,164 L58,140 Z',
    1.4,
  ],
  ['s', '#9a958a', 'M50,187 H200', 1.6],
  ['l', 'M62,187 v4 M76,187 v4 M90,187 v4 M150,187 v4 M164,187 v4 M178,187 v4', 1],
  ['s', '#c99a62', 'M84,172 h14 M80,178 h18 M86,184 h12', 1.4],
  ['f', '#9a958a', 'M106,170 L140,170 L136,184 L110,184 Z', 1.3],
  [
    'f',
    '#f2cf4a',
    `M106,170 C108,162 138,162 140,170 Z ${c(116, 165, 3.4)} ${c(126, 163, 3.4)} ${c(134, 166, 3.4)}`,
    1,
  ],
  ['f', INK, `${c(114, 185, 3)} ${c(132, 185, 3)}`, 0],
  // Ústí tunelu na pláži a stopa ztracených zlaťáků k jachtě.
  ['f', '#9a958a', 'M184,140 L184,133 C184,123 214,123 214,133 L214,140 Z', 1.4],
  ['f', '#5a3418', 'M190,140 L190,134 C190,128 208,128 208,134 L208,140 Z', 1.1],
  ['f', '#f2cf4a', `${c(179, 137, 2.4, 1.6)} ${c(171, 135, 2.4, 1.6)} ${c(163, 133, 2.2, 1.5)}`, 0.8],
  // Kupónová knížka.
  ['f', '#22365c', rect(22, 199, 206, 62), 1.8],
  ['f', '#fffaf0', `${rect(26, 202, 98, 56)} ${rect(126, 202, 98, 56)}`, 1.3],
  ['l', 'M125,202 V258', 1.4],
  ['f', '#c6dcae', join([...LEFT_PAGE.full, ...RIGHT_PAGE.full]), 1],
  ['l', join([...LEFT_PAGE.marks, ...RIGHT_PAGE.marks, ...LEFT_PAGE.stubs, ...RIGHT_PAGE.stubs]), 0.8],
  ['f', INK, join([...LEFT_PAGE.dots, ...RIGHT_PAGE.dots]), 0],
  // Napůl vytržený kupón (ohnutý nahoru) a razítko.
  ['f', '#c6dcae', 'M132,232 L160,226 L165,247 L137,253 Z', 1.2],
  ['l', `${c(141, 241, 4)} M148,236 l9,-2`, 0.8],
  ['s', '#d7442c', c(206, 244, 13), 2.2],
  ['s', '#d7442c', c(206, 244, 8.5), 1],
  ['f', '#d7442c', star4(206, 244, 5.5), 0],
];

// ─────────────────────────── Lázeňský host ───────────────────────────

/** Mřížka (diagonální vroubky) uvnitř kruhu — vzor na oplatce. */
function waferGrid(cx: number, cy: number, r: number, step: number): string {
  let d = '';
  for (let k = -r; k <= r; k += step) {
    // Úsečky x − y = k a x + y = k (posunuté do středu), oříznuté kruhem.
    for (const sgn of [1, -1]) {
      const half = Math.sqrt(Math.max(0, r * r - (k * k) / 2));
      const mx = k / 2;
      const my = (-sgn * k) / 2;
      const ux = Math.SQRT1_2;
      const uy = sgn * Math.SQRT1_2;
      d += `M${r1(cx + mx - ux * half)},${r1(cy + my - uy * half)} L${r1(cx + mx + ux * half)},${r1(cy + my + uy * half)} `;
    }
  }
  return d.trim();
}

// Lázeňský host: pán se slamákem na kolonádě u pramene, v rukou lázeňský pohárek a oplatka.
const SPA_BACKDROP: SceneOp[] = [
  // Park za kolonádou.
  [
    'f',
    '#5d9a3e',
    'M16,150 C20,126 40,118 52,128 C60,110 84,112 90,128 L160,128 C166,110 192,108 200,124 C212,114 232,120 234,134 L234,206 L16,206 Z',
    1.3,
  ],
  // Střecha kolonády.
  ['f', '#fffaf0', rect(16, 52, 218, 16), 1.6],
  ['l', 'M16,58 H234', 0.8],
  ['f', '#2f6b3a', rect(16, 68, 218, 8), 1.4],
  [
    'l',
    'M24,64 v4 M36,64 v4 M48,64 v4 M60,64 v4 M72,64 v4 M84,64 v4 M96,64 v4 M108,64 v4 M120,64 v4 M132,64 v4 M144,64 v4 M156,64 v4 M168,64 v4 M180,64 v4 M192,64 v4 M204,64 v4 M216,64 v4 M228,64 v4',
    0.8,
  ],
  // Krajkové oblouky a litinové sloupy.
  ['s', '#2f6b3a', 'M28,108 Q52,80 76,108 M76,108 Q125,68 174,108 M174,108 Q198,80 222,108', 3],
  ['l', 'M40,90 L40,78 M52,86 L52,77 M64,90 L64,78 M188,90 L188,78 M200,86 L200,77 M212,90 L212,78', 0.9],
  ['f', '#2f6b3a', join([28, 76, 174, 222].map((x) => rect(x - 3.5, 76, 7, 132))), 1.3],
  [
    'f',
    '#2f6b3a',
    join(
      [28, 76, 174, 222].map(
        (x) =>
          `M${x - 8},84 L${x + 8},84 L${x + 4},76 L${x - 4},76 Z M${x - 7},208 L${x + 7},208 L${x + 5},200 L${x - 5},200 Z`,
      ),
    ),
    1.2,
  ],
  // Dlažba.
  ['f', '#f3e8cf', rect(16, 208, 218, 76), 1.4],
  [
    'f',
    '#9a958a',
    join(
      [0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((i) => [
        rect(16 + i * 26, 208, 13, 12),
        rect(29 + i * 26, 220, 13, 12),
      ]),
    ),
    0.8,
  ],
  // Pramen: kamenná mísa, z trubky teče a stoupá pára.
  ['f', '#9a958a', 'M42,206 L46,192 L58,192 L62,206 Z', 1.3],
  ['f', '#d9d2c2', 'M32,186 C32,198 72,198 72,186 Z', 1.4],
  ['f', '#9fd0c4', c(52, 186, 20, 4), 1.2],
  ['s', '#5b5850', 'M60,150 L60,160 L54,160', 3],
  ['s', '#9fd0c4', 'M54,162 C52,170 52,178 52,184', 2.4],
  ['l', 'M44,146 C40,138 48,132 44,124 M54,140 C50,132 58,126 54,118', 1.1],
  // Palma v kbelíku.
  ['f', '#c99a62', 'M202,206 L206,186 L228,186 L232,206 Z', 1.3],
  [
    'f',
    '#2f6b3a',
    'M217,186 C210,172 202,166 196,168 C204,172 210,180 215,188 Z M217,186 C226,170 234,164 240,166 C232,170 226,178 219,188 Z M217,186 C214,166 216,152 222,146 C222,158 220,172 218,188 Z',
    1.1,
  ],
];

const SPA_OUTFIT: SceneOp[] = [
  // Klopy lněného saka a lázeňská knížka s červeným křížkem v náprsní kapse.
  ['l', 'M108,212 L120,248 L112,284 M142,212 L130,248 L138,284', 1.4],
  ['f', '#fffaf0', 'M139,237 L157,235 L159,255 L141,257 Z', 1.2],
  ['f', '#d7442c', `${rect(147.4, 240, 2.8, 9)} ${rect(144.2, 243.1, 9, 2.8)}`, 0],
  ['f', '#f3e8cf', 'M134,250 L166,247 L167,268 L135,268 Z', 1.4],
  ['l', 'M135,254 L166,251', 0.8],
];

const SPA_EXTRA: SceneOp[] = [
  // Obří lázeňská oplatka v levé ruce.
  ['f', '#f6e3a1', c(72, 218, 25), 1.8],
  ['l', waferGrid(72, 218, 21, 6), 0.7],
  ['s', '#c99a62', c(72, 218, 22), 2],
  ['f', '#f6e3a1', c(72, 218, 8), 1],
  ...hand(76, 244),
  // Porcelánový lázeňský pohárek: dutým uchem zdola se pije jako brčkem, modrý dekor, pára.
  ['l', 'M180,221 C190,221 195,214 195,204 C195,196 193,190 189,185', 8],
  ['s', '#fffaf0', 'M180,221 C190,221 195,214 195,204 C195,196 193,190 189,185', 4.6],
  ['f', '#fffaf0', c(188.6, 184.4, 3.2, 2.2), 1.2],
  ['f', '#fffaf0', 'M153,194 C148,210 152,227 168,227 C184,227 188,210 183,194 Z', 1.8],
  ['f', '#fffaf0', c(168, 194, 15, 4.4), 1.4],
  ['f', '#9fd0c4', c(168, 194, 11.5, 2.6), 0.8],
  ['s', '#2f5fa8', 'M152,205 Q160,209 168,205 Q176,201 184,205', 1.8],
  ['f', '#2f5fa8', `${c(160, 215, 2.2)} ${c(168, 218, 2.2)} ${c(176, 215, 2.2)}`, 0],
  ['l', 'M162,186 C158,180 166,176 162,168 M174,186 C170,180 178,176 174,168', 1.1],
  ...hand(168, 230),
];

// ─────────────────────────── Dechovka ───────────────────────────

const BUNTING_P0 = [36, 104] as const;
const BUNTING_P1 = [130, 142] as const;
const BUNTING_P2 = [234, 100] as const;
const BUNTING_COLORS = ['#d7442c', '#f2cf4a', '#5d9a3e', '#fffaf0'] as const;

/** Praporky na šňůře přes náves (trojúhelníčky po barvách). */
function bunting(): SceneOp[] {
  const groups = new Map<string, string[]>();
  for (let i = 0; i < 14; i++) {
    const t0 = 0.04 + i * 0.07;
    const a = quad(BUNTING_P0, BUNTING_P1, BUNTING_P2, t0);
    const b = quad(BUNTING_P0, BUNTING_P1, BUNTING_P2, t0 + 0.05);
    const col = BUNTING_COLORS[i % BUNTING_COLORS.length]!;
    const list = groups.get(col) ?? [];
    list.push(
      `M${r1(a[0])},${r1(a[1])} L${r1(b[0])},${r1(b[1])} L${r1((a[0] + b[0]) / 2)},${r1((a[1] + b[1]) / 2 + 11)} Z`,
    );
    groups.set(col, list);
  }
  return [
    [
      'l',
      `M${BUNTING_P0[0]},${BUNTING_P0[1]} Q${BUNTING_P1[0]},${BUNTING_P1[1]} ${BUNTING_P2[0]},${BUNTING_P2[1]}`,
      1,
    ],
    ...[...groups].map(([col, list]): SceneOp => ['f', col, join(list), 1]),
  ];
}

// Dechovka: muzikant s heligonem na návsi s májkou, ze zvonu létají třikrát tytéž noty, soused zpívá s pivem.
const BRASS_BACKDROP: SceneOp[] = [
  // Chalupy.
  ['f', '#f6e3a1', rect(16, 128, 64, 88), 1.6],
  ['f', '#d7442c', 'M10,130 L47,94 L86,130 Z', 1.6],
  ['f', '#bcd6e6', `${rect(26, 146, 14, 16)} ${rect(56, 146, 14, 16)}`, 1.2],
  ['l', 'M33,146 v16 M26,154 h14 M63,146 v16 M56,154 h14', 0.9],
  ['f', '#fffaf0', rect(184, 150, 50, 66), 1.6],
  ['f', '#8c5632', 'M178,152 L210,122 L242,152 Z', 1.6],
  ['f', '#bcd6e6', rect(196, 166, 14, 16), 1.2],
  // Májka s věncem a stuhami.
  ['l', 'M36,58 L36,216', 5.4],
  ['s', '#fffaf0', 'M36,60 L36,215', 3],
  ['f', '#2f6b3a', 'M36,52 L26,72 L31,72 L24,84 L48,84 L41,72 L46,72 Z', 1.3],
  ['s', '#2f6b3a', c(36, 94, 10, 3), 3],
  ['s', '#d7442c', 'M30,96 C28,104 32,110 28,118', 2],
  ['s', '#f2cf4a', 'M36,97 C34,106 38,112 35,122', 2],
  ['s', '#2f5fa8', 'M42,96 C44,104 40,110 44,118', 2],
  ...bunting(),
  // Dlažba návsi.
  ['f', '#d9d2c2', rect(16, 214, 218, 70), 1.4],
  [
    'l',
    'M22,226 q6,-4 12,0 M44,232 q6,-4 12,0 M18,246 q6,-4 12,0 M200,228 q6,-4 12,0 M214,244 q6,-4 12,0',
    0.9,
  ],
  // Soused už zpívá s půllitrem v ruce (otevřená pusa).
  ['f', '#5d9a3e', 'M46,232 C46,214 54,208 64,208 C74,208 82,214 82,232 Z', 1.4],
  ['f', SKIN, c(64, 196, 9, 10), 1.4],
  ['f', '#5a3418', 'M55,192 C55,180 73,180 73,192 C68,188 60,188 55,192 Z', 1.1],
  ['l', 'M59,194 l3,-1 M66,193 l3,1', 1],
  ['f', INK, c(64, 201, 2.4, 3), 0],
  ['f', '#f2cf4a', 'M44,196 L54,196 L53,210 L45,210 Z', 1.1],
  ['f', '#fffaf0', 'M43,197 C42,192 47,191 49,193 C51,190 56,191 55,197 Z', 0.9],
];

const BRASS_OUTFIT: SceneOp[] = [
  // Epoleta se střapci a zlatá šňůra.
  ['f', '#e9b030', 'M64,228 L90,214 L96,224 L70,238 Z', 1.3],
  ['l', 'M70,238 l-2,8 M76,235 l-2,8 M82,232 l-2,8 M88,229 l-2,8', 1],
  ['s', '#f2cf4a', 'M84,226 C86,250 100,258 112,242 M84,226 C88,262 104,268 114,252', 2.4],
];

const BRASS_EXTRA: SceneOp[] = [
  // Heligon: smyčka přes rameno a hruď, ventily, ozvučník nad ramenem.
  ['l', 'M181,140 C183,170 192,196 178,212 C150,232 102,256 56,290', 17],
  ['s', '#e9b030', 'M181,140 C183,170 192,196 178,212 C150,232 102,256 56,290', 13],
  ['s', '#f6e3a1', 'M178,150 C180,174 186,194 172,210 C146,228 104,250 66,280', 2.4],
  ['f', '#e9b030', 'M174,150 C172,126 160,110 148,96 L222,96 C210,110 192,126 188,150 Z', 1.8],
  ['f', '#e9b030', c(185, 95, 38, 14), 2],
  ['f', '#c99a62', c(185, 95, 31, 9.5), 1.2],
  // Ventily a ruka na nich, nátrubek k puse.
  ['l', 'M148,240 C150,214 140,196 132,186', 7],
  ['s', '#e9b030', 'M148,240 C150,214 140,196 132,186', 4.4],
  ['f', '#e9b030', c(129, 183, 5, 3.4), 1.2],
  ['f', '#e9b030', `${rect(140, 232, 7, 24)} ${rect(150, 228, 7, 24)} ${rect(160, 224, 7, 24)}`, 1.2],
  ['f', '#fffaf0', `${rect(140, 226, 7, 4)} ${rect(150, 222, 7, 4)} ${rect(160, 218, 7, 4)}`, 1],
  ...hand(156, 242),
  // Pořád tatáž melodie: třikrát stejné noty ze zvonu.
  ['f', INK, join([noteStems(160, 52, 1), noteStems(126, 62, 0.85), noteStems(98, 78, 0.7)]), 0],
  ['f', INK, join([noteHeads(160, 52, 1), noteHeads(126, 62, 0.85), noteHeads(98, 78, 0.7)]), 0],
];

// ─────────────────────────── Karlův most ───────────────────────────

/** Gotická mostecká věž: tmavá stanová střecha s nárožními věžičkami, ochoz, okna a lomená brána u mostovky. */
function bridgeTower(x: number, w: number, top: number): SceneOp[] {
  const cx = x + w / 2;
  const win = (y: number): string =>
    `M${cx - 4},${y + 12} L${cx - 4},${y + 5} C${cx - 4},${y} ${cx + 4},${y} ${cx + 4},${y + 5} L${cx + 4},${y + 12} Z`;
  return [
    ['f', '#9a958a', rect(x, top + 40, w, 134 - top), 1.8],
    [
      'f',
      '#22365c',
      `M${x - 3},${top + 42} L${cx},${top} L${x + w + 3},${top + 42} Z M${x - 2},${top + 42} L${x - 2},${top + 26} L${x + 3},${top + 42} Z M${x + w + 2},${top + 42} L${x + w + 2},${top + 26} L${x + w - 3},${top + 42} Z`,
      1.6,
    ],
    ['f', '#c99a62', rect(x - 3, top + 40, w + 6, 6), 1.2],
    [
      'f',
      '#5b5850',
      `M${x + 9},174 L${x + 9},158 C${x + 9},146 ${x + w - 9},146 ${x + w - 9},158 L${x + w - 9},174 Z ${win(top + 52)} ${win(top + 74)}`,
      1.2,
    ],
    ['l', `M${cx},${top} L${cx},${top - 8}`, 1.2],
  ];
}

/** Barokní socha na podstavci (silueta světce v rouchu). */
const statue = (x: number): string =>
  `M${x - 9},148 C${x - 8},138 ${x - 7},130 ${x - 4},122 L${x + 4},122 C${x + 7},130 ${x + 8},138 ${x + 9},148 Z ${c(x, 116, 4.6)}`;

const JACKETS = ['#d7442c', '#2f5fa8', '#f2cf4a', '#5d9a3e', '#fffaf0'] as const;
const HAIRS = ['#5a3418', '#1a1714', '#f2cf4a', '', '#8c5632', '#1a1714', ''] as const;
const LIFT = [0, -2.5, 1, -1, 2, -3, 0.5, -1.5, 1.5] as const;

/** Tisíc turistů za zábradlím: různě vysocí, bundy a vlasy po barvách (jedna cesta na barvu). */
function tourists(): SceneOp[] {
  const bodies = new Map<string, string[]>();
  const hairs = new Map<string, string[]>();
  const heads: string[] = [];
  for (let i = 0, x = 68; x <= 184; i++, x += 6.4) {
    const hx = n1(x);
    const y = 154 + LIFT[i % LIFT.length]!;
    const jacket = JACKETS[(i * 2) % JACKETS.length]!;
    const bl = bodies.get(jacket) ?? [];
    bl.push(
      `M${r1(hx - 4.6)},170 C${r1(hx - 4.6)},${r1(y + 4)} ${r1(hx + 4.6)},${r1(y + 4)} ${r1(hx + 4.6)},170 Z`,
    );
    bodies.set(jacket, bl);
    heads.push(dot(hx, y, 3.5));
    const hair = HAIRS[i % HAIRS.length]!;
    if (hair) {
      const hl = hairs.get(hair) ?? [];
      hl.push(
        `M${r1(hx - 3.6)},${r1(y - 0.4)} C${r1(hx - 3.6)},${r1(y - 5.2)} ${r1(hx + 3.6)},${r1(y - 5.2)} ${r1(hx + 3.6)},${r1(y - 0.4)} Z`,
      );
      hairs.set(hair, hl);
    }
  }
  return [
    ...[...bodies].map(([col, list]): SceneOp => ['f', col, join(list), 1]),
    ['f', SKIN, join(heads), 0.9],
    ...[...hairs].map(([col, list]): SceneOp => ['f', col, join(list), 0.7]),
  ];
}

// Karlův most: dvě mostecké věže na obou koncích, sochy na zábradlí, lucerna a dav turistů; Hradčany v západu slunce, labutě.
const KARLUV_MOST: SceneOp[] = [
  ['f', '#f6e3a1', rect(16, 16, 218, 268), 0],
  ['f', '#f3c7c0', rect(16, 16, 218, 64), 0],
  ['f', '#f2cf4a', c(100, 120, 17), 1.4],
  ['l', 'M104,56 l5,4 l5,-4 M124,44 l4,3 l4,-3 M150,62 l5,4 l5,-4', 1.1],
  // Hradčany: dlouhý palác, katedrála se dvěma štíhlými věžemi a velká věž s bání.
  [
    'f',
    '#cbb8e3',
    'M58,144 L58,124 L64,118 L190,118 L190,144 Z M126,118 L126,104 L132,104 L139,72 L146,104 L148,104 L154,77 L160,104 L164,104 L164,118 Z M166,118 L166,96 L170,96 L170,89 C170,80 182,80 182,89 L182,96 L186,96 L186,118 Z',
    1.4,
  ],
  ['l', 'M176,81 L176,73 M66,127 h54 M66,134 h54 M168,127 h18 M168,134 h18 M130,108 h30', 0.8],
  ['f', '#8a8f2e', 'M16,156 C60,146 100,140 140,142 C180,144 210,138 234,136 L234,176 L16,176 Z', 1.4],
  // Vltava s odleskem slunce.
  ['f', '#6fa0c8', rect(16, 212, 218, 72), 1.4],
  ['s', '#f2cf4a', 'M142,234 h16 M138,242 h24 M144,250 h12', 2.2],
  ['l', 'M24,256 c8,-3 16,3 24,0 M178,252 c8,-3 16,3 24,0', 1],
  // Most: oblouky, ledolamy a zrcadlení oblouků ve vodě.
  ['f', '#c99a62', rect(16, 174, 218, 38), 1.8],
  [
    'f',
    '#6fa0c8',
    'M16,212 L16,196 C26,190 40,194 44,212 Z M70,212 C70,188 112,188 112,212 Z M138,212 C138,188 180,188 180,212 Z M206,212 C210,194 224,190 234,196 L234,212 Z',
    1.4,
  ],
  [
    'f',
    '#2f5fa8',
    'M70,212 C70,232 112,232 112,212 Z M138,212 C138,232 180,232 180,212 Z M16,212 C26,224 40,224 44,212 Z M206,212 C212,224 226,224 234,218 Z',
    0,
  ],
  [
    'f',
    '#c99a62',
    'M44,212 L57,224 L70,212 Z M112,212 L125,224 L138,212 Z M180,212 L193,224 L206,212 Z',
    1.2,
  ],
  [
    'l',
    'M16,184 H234 M30,174 v10 M58,174 v10 M86,174 v10 M114,174 v10 M142,174 v10 M170,174 v10 M198,174 v10 M226,174 v10 M44,184 v12 M125,184 v12 M193,184 v12',
    0.7,
  ],
  // Mostecké věže na obou koncích.
  ...bridgeTower(18, 44, 58),
  ...bridgeTower(188, 44, 54),
  // Tisíc turistů: deštník průvodkyně a tyč na selfie.
  ...tourists(),
  ['l', 'M106,152 L106,138 M147,151 L141,134', 1.1],
  ['f', '#f2cf4a', 'M96,140 C96,130 116,130 116,140 Q111,137 106,140 Q101,137 96,140 Z', 1.1],
  ['f', INK, rect(137, 128, 5, 7), 0],
  // Kamenné zábradlí a na něm sochy: světec s křížem a Nepomuk se zlatým křížem a svatozáří z pěti hvězd.
  ['f', '#d9d2c2', rect(62, 164, 126, 10), 1.4],
  ['f', '#d9d2c2', `${rect(76, 146, 16, 18)} ${rect(158, 146, 16, 18)}`, 1.3],
  ['l', 'M76,151 h16 M158,151 h16', 0.8],
  ['f', '#22365c', `${statue(84)} ${statue(166)}`, 1.3],
  ['l', 'M72,146 L72,100 M66,107 h12 M79,130 L72,127', 1.8],
  ['l', 'M158,142 L171,122 M165,123.8 L171.8,128.2', 3.6],
  ['s', '#f2cf4a', 'M158,142 L171,122 M165,123.8 L171.8,128.2', 1.6],
  [
    'f',
    '#f2cf4a',
    join(
      [-2, -1, 0, 1, 2].map((i) =>
        star4(n1(166 + 11 * Math.sin(i * 0.6)), n1(116 - 11 * Math.cos(i * 0.6)), 2.9),
      ),
    ),
    0.5,
  ],
  // Lucerna.
  ['l', 'M125,164 L125,130', 2.2],
  ['f', '#f2cf4a', 'M119,130 L131,130 L129,118 L121,118 Z', 1.3],
  ['f', '#22365c', 'M118,119 L132,119 L125,111 Z', 1],
  // Labutě.
  [
    'f',
    '#fffaf0',
    'M40,244 C40,252 58,252 62,244 C56,246 50,246 46,242 C46,236 48,232 44,230 C40,230 40,234 42,236 C43,240 42,242 40,244 Z M74,252 C74,258 90,258 94,252 C88,254 82,254 79,250 C79,245 81,242 77,240 C73,240 73,244 75,245 C76,248 75,250 74,252 Z',
    1.1,
  ],
  ['f', '#ef8a2e', 'M40,231 l-4,1.5 l4,1.5 Z M73,241 l-4,1.5 l4,1.5 Z', 0.6],
];

// ─────────────────────────── Dálnice D1 ───────────────────────────

/** Auto zezadu v koloně (střed x, spodek y, šířka w), svítí brzdová světla. */
function carRear(x: number, y: number, w: number, body: string): SceneOp[] {
  const h = w * 0.62;
  const k = w / 80;
  return [
    [
      'f',
      INK,
      `${rect(n1(x - w * 0.42), y - 4 * k, 9 * k, 6 * k)} ${rect(n1(x + w * 0.42 - 9 * k), y - 4 * k, 9 * k, 6 * k)}`,
      0,
    ],
    [
      'f',
      body,
      `M${r1(x - w / 2)},${r1(y - 4 * k)} L${r1(x - w / 2)},${r1(y - h * 0.55)} L${r1(x - w * 0.36)},${r1(y - h)} L${r1(x + w * 0.36)},${r1(y - h)} L${r1(x + w / 2)},${r1(y - h * 0.55)} L${r1(x + w / 2)},${r1(y - 4 * k)} Z`,
      Math.max(1, 1.8 * k),
    ],
    [
      'f',
      '#bcd6e6',
      `M${r1(x - w * 0.4)},${r1(y - h * 0.6)} L${r1(x - w * 0.31)},${r1(y - h * 0.92)} L${r1(x + w * 0.31)},${r1(y - h * 0.92)} L${r1(x + w * 0.4)},${r1(y - h * 0.6)} Z`,
      Math.max(0.8, 1.2 * k),
    ],
    [
      'f',
      '#d7442c',
      `${rect(n1(x - w * 0.47), n1(y - h * 0.48), 12 * k, 7 * k)} ${rect(n1(x + w * 0.47 - 12 * k), n1(y - h * 0.48), 12 * k, 7 * k)}`,
      Math.max(0.6, k),
    ],
    ['f', '#fffaf0', rect(n1(x - 9 * k), n1(y - h * 0.4), 18 * k, 6 * k), Math.max(0.5, 0.8 * k)],
  ];
}

// Dálnice D1: zúžení do jednoho pruhu, kolona s brzdovými světly až k obzoru, dělník s lopatou a předjíždějící hlemýžď.
const D1: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  [
    'f',
    '#fffaf0',
    'M150,54 C148,44 160,38 168,43 C172,34 188,34 191,44 C200,42 206,52 199,57 L156,58 C149,58 147,56 150,54 Z',
    1.3,
  ],
  // Pole a stromořadí na obzoru.
  ['f', '#c6dcae', rect(16, 112, 218, 172), 1.2],
  ['f', '#2f6b3a', join([24, 40, 56, 72, 88, 160, 176, 192, 208, 224].map((x) => c(x, 108, 9, 7))), 1.1],
  ['f', '#5d9a3e', 'M16,150 L104,120 L16,120 Z M234,150 L146,120 L234,120 Z', 0],
  // Vozovka z betonových panelů.
  ['f', '#d9d2c2', 'M112,112 L138,112 L234,250 L234,284 L16,284 L16,250 Z', 1.6],
  [
    'l',
    'M111,118 L139,118 M106,126 L144,126 M100,136 L150,136 M92,149 L158,149 M81,166 L169,166 M66,188 L184,188 M45,218 L205,218 M19,256 L231,256',
    0.8,
  ],
  [
    'f',
    '#9a958a',
    'M150,196 C156,192 168,194 166,200 C162,204 152,202 150,196 Z M60,232 C70,226 86,230 80,238 C72,242 58,240 60,232 Z',
    1,
  ],
  // Přerušovaná dělicí čára a žlutá provizorní.
  [
    'f',
    '#fffaf0',
    'M124,116 L126,116 L126.4,124 L123.6,124 Z M123.3,132 L126.7,132 L127.2,144 L122.8,144 Z M122.2,156 L127.8,156 L128.6,174 L121.4,174 Z M120.6,190 L129.4,190 L130.6,216 L119.4,216 Z M118.2,236 L131.8,236 L133.4,272 L116.6,272 Z',
    0.8,
  ],
  ['s', '#f2cf4a', 'M110,284 C112,240 118,190 126,150 C128,136 130,124 131,112', 3],
  // Svodidla.
  ['l', 'M112,112 L16,240 M138,112 L234,236', 2.4],
  [
    'l',
    'M100,128 v6 M86,146 v8 M68,170 v10 M44,202 v12 M150,128 v6 M164,146 v8 M182,170 v10 M206,202 v12',
    1.4,
  ],
  // Hlemýžď předjíždí po svodidle.
  ['f', '#c99a62', 'M26,226 C24,232 30,236 40,234 L46,234 L44,230 Z', 1],
  ['f', '#e9b030', c(34, 222, 7), 1.2],
  ['l', 'M34,222 m-3,0 a3,3 0 1,0 6,0 a5,5 0 1,0 -9,1', 0.9],
  ['l', 'M44,231 l3,-6 M46,232 l5,-4', 0.9],
  // Kolona v jediném volném pruhu (od obzoru dopředu).
  ...carRear(133, 120, 12, '#2f5fa8'),
  ...carRear(137, 132, 18, '#fffaf0'),
  ...carRear(143, 150, 28, '#e9b030'),
  ...carRear(152, 180, 44, '#5d9a3e'),
  ...carRear(172, 246, 84, '#d7442c'),
  // Uzavřený pruh: kužely, dělník s lopatou.
  [
    'f',
    '#ef8a2e',
    join([
      'M118,128 L121,120 L124,128 Z',
      'M112,142 L116,131 L120,142 Z',
      'M102,162 L107,148 L112,162 Z',
      'M86,192 L93,173 L100,192 Z',
      'M58,240 L68,212 L78,240 Z',
    ]),
    1,
  ],
  [
    'f',
    '#fffaf0',
    join([
      'M104.6,156 L109.4,156 L110.3,159 L103.7,159 Z',
      'M89.3,183 L96.7,183 L98,187 L88,187 Z',
      'M62.6,226 L73.4,226 L75.2,231 L60.8,231 Z',
    ]),
    0,
  ],
  ['l', 'M66,196 L58,232', 1.6],
  ['f', '#9a958a', 'M53,232 L63,232 L60,240 L55,240 Z', 1],
  ['f', '#ef8a2e', 'M60,214 L60,190 C60,184 76,184 76,190 L76,214 Z', 1.3],
  ['l', 'M60,200 h16', 1.6],
  ['f', SKIN, c(68, 179, 6), 1.2],
  ['f', '#f2cf4a', 'M61,177 C61,168 75,168 75,177 Z', 1.1],
  ['l', 'M65,180 l3,0 M70,180 l3,0', 0.9],
  ['f', '#22365c', 'M62,214 L74,214 L74,232 L70,232 L68,220 L66,232 L62,232 Z', 1.1],
  // Výstražná značka „zúžení vozovky“.
  ['l', 'M206,128 L206,96', 2],
  ['f', '#d7442c', 'M206,60 L226,96 L186,96 Z', 1.4],
  ['f', '#fffaf0', 'M206,69 L219,92 L193,92 Z', 0.8],
  ['l', 'M201,90 L201,78 M211,90 L211,84 L207,79 L207,76', 1.6],
];

// ─────────────────────────── Směnárna ───────────────────────────

/** Fasáda kolem obloukového okna (díra opačným vinutím). */
const FACADE = 'M16,16 H234 V284 H16 Z M70,236 H180 V147 A55,55 0 0,0 70,147 Z';

/** Barvy praporků v řádcích kurzovní tabule (horní / dolní pruh). */
const RATE_FLAGS = [
  ['#d7442c', '#fffaf0'],
  ['#2f5fa8', '#f2cf4a'],
  ['#5d9a3e', '#fffaf0'],
  ['#f2cf4a', '#d7442c'],
  ['#fffaf0', '#2f5fa8'],
  ['#d7442c', '#5d9a3e'],
] as const;

/** Kurzovní tabule: řádky s praporkem a překlápěcími číslicemi. */
function rateRows(): SceneOp[] {
  const flags = new Map<string, string[]>();
  const digits: string[] = [];
  const seams: string[] = [];
  RATE_FLAGS.forEach(([top, bottom], i) => {
    const y = 106 + i * 19;
    for (const [col, d] of [
      [top, rect(25, y, 11, 4.5)],
      [bottom, rect(25, y + 4.5, 11, 4.5)],
    ] as const) {
      const list = flags.get(col) ?? [];
      list.push(d);
      flags.set(col, list);
    }
    for (let k = 0; k < 3; k++) {
      digits.push(rect(40 + k * 7.5, y - 1, 6, 11));
      seams.push(`M${40 + k * 7.5},${y + 4.5} h6`);
    }
  });
  return [
    ['f', '#22365c', rect(20, 96, 46, 124), 1.6],
    ...[...flags].map(([col, list]): SceneOp => ['f', col, join(list), 0.8]),
    ['f', '#f6e3a1', join(digits), 0.7],
    ['l', join(seams), 0.6],
  ];
}

const CASHIER_SPEC: FigureSpec = {
  bg: '#2f8077',
  motif: 'none',
  body: '#fffaf0',
  collar: 'vest',
  accent: '#22365c',
  hair: 'part',
  hairColor: '#1a1714',
  hat: 'band',
  hatColor: '#5d9a3e',
  mood: 'grin',
  outfit: [
    ['f', '#d7442c', 'M121,214 L129,214 L131,240 L125,248 L119,240 Z', 1.4],
    ['f', '#f2cf4a', join([c(125, 222, 1.4), c(126, 232, 1.4), c(124, 241, 1.4)]), 0],
    ['s', '#e9b030', 'M140,250 C146,258 156,260 164,254', 1.6],
  ],
};

// Směnárna: ulízaný směnárník za okýnkem, cedule „0 %*“, pod lupou drobné písmo s blechou; za štos bankovek dvě mince.
const EXCHANGE: SceneOp[] = [
  ...figure(CASHIER_SPEC),
  // Štítek proti světlu, knírek, zlatý zub.
  ['f', '#5d9a3e', 'M94,136 L156,136 C152,148 98,148 94,136 Z', 1.4],
  ['s', INK, 'M114,169 C120,166 130,166 136,169', 1.6],
  ['f', '#f2cf4a', rect(127, 173, 5, 5), 0.8],
  // Odlesky skla.
  ['s', '#fffaf0', 'M74,206 L94,184 M76,222 L102,194 M160,140 L176,122', 2.6],
  // Fasáda s oknem.
  ['f', '#f6e3a1', FACADE, 1.8],
  ['s', '#8c5632', 'M70,236 V147 A55,55 0 0,1 180,147 V236', 4],
  ...rateRows(),
  // Cedule „0 %*“.
  ['f', '#2f6b3a', rect(92, 26, 136, 52), 1.8],
  ['s', '#e9b030', rect(96, 30, 128, 44), 1.4],
  ['s', '#f2cf4a', c(124, 52, 11, 16), 6],
  ['s', '#f2cf4a', 'M146,68 L166,36', 4.4],
  ['s', '#f2cf4a', `${c(147, 41, 4.5)} ${c(165, 63, 4.5)}`, 3],
  ['s', '#fffaf0', 'M182,38 v12 M176,41 l12,6 M176,47 l12,-6', 2],
  ['l', 'M178,64 h36 M178,68 h30', 0.5],
  // Drobné písmo a lupa s blechou.
  ['f', '#fffaf0', rect(188, 96, 40, 124), 1.4],
  [
    'l',
    'M192,102 h32 M192,106 h30 M192,110 h32 M192,114 h28 M192,118 h32 M192,122 h30 M192,126 h32 M192,130 h26 M192,134 h32 M192,138 h30 M192,200 h32 M192,204 h28 M192,208 h32 M192,212 h24',
    0.45,
  ],
  ['l', 'M216,184 L228,202', 6],
  ['f', '#bcd6e6', c(206, 168, 18), 2],
  ['l', 'M192,160 h28 M190,176 h32', 1.6],
  ['f', '#8c5632', `${c(206, 168, 5.5, 4)} ${c(199, 166, 3)}`, 1],
  ['l', 'M202,172 l-4,6 M206,172 l0,7 M210,171 l4,6 M203,164 l-3,-5 M209,164 l3,-5 M197,164 l-4,-4', 0.9],
  // Pult s miskou, dvě mince zpátky a štos bankovek od zákazníka.
  ['f', '#c99a62', rect(62, 230, 126, 10), 1.6],
  ['f', '#8c5632', 'M104,236 C104,248 146,248 146,236 Z', 1.2],
  ['f', '#f2cf4a', `${c(116, 236, 6, 2.6)} ${c(130, 238, 6, 2.6)}`, 1],
  ['f', '#5d9a3e', 'M150,236 L204,226 L210,248 L156,258 Z', 1.4],
  ['f', '#c6dcae', 'M146,242 L200,232 L206,254 L152,264 Z', 1.4],
  ['l', `${c(176, 248, 5)} M156,248 l6,-1 M192,242 l6,-1`, 0.8],
  ['f', '#22365c', 'M206,270 L196,248 L234,236 L234,270 Z', 1.6],
  ...hand(200, 248),
];

// ─────────────────────────── Silvestr ───────────────────────────

/** Ohňostroj: barevné paprsky s jiskrami na koncích. */
function burst(cx: number, cy: number, r: number, n: number, color: string, a0 = 0): SceneOp[] {
  const sparks: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.PI * 2 * i) / n;
    sparks.push(c(n1(cx + Math.cos(a) * (r + 4)), n1(cy + Math.sin(a) * (r + 4)), 1.8));
  }
  return [
    ['s', color, ticks(cx, cy, r * 0.25, r, n, a0), 2.2],
    ['f', color, join(sparks), 0.6],
  ];
}

// Silvestr: půlnoc na věžních hodinách, ohňostroj nad paneláky, špunt od sektu letí, přípitek a přeškrtaná předsevzetí.
const SILVESTR: SceneOp[] = [
  ['f', '#22365c', rect(16, 16, 218, 268), 0],
  [
    'f',
    '#fffaf0',
    join([c(100, 34, 1.2), c(222, 40, 1.4), c(30, 70, 1.2), c(208, 160, 1.2), c(40, 150, 1.4)]),
    0,
  ],
  // Ohňostroje a stopy raket.
  ['s', '#f2cf4a', 'M150,206 C146,160 160,110 168,76', 1.2],
  ['s', '#e88a9a', 'M90,210 C92,170 96,140 98,112', 1.2],
  ...burst(168, 70, 34, 16, '#f2cf4a'),
  ...burst(98, 104, 22, 12, '#e88a9a', 0.2),
  ...burst(208, 128, 16, 10, '#9fd0c4'),
  ...burst(48, 112, 14, 9, '#fffaf0', 0.3),
  ['f', '#fffaf0', join([c(168, 70, 4), c(98, 104, 3), c(208, 128, 2.4)]), 0.8],
  // Paneláky s okny a věž s hodinami.
  ['f', '#5b5850', `${rect(16, 170, 56, 114)} ${rect(178, 176, 56, 108)}`, 1.6],
  [
    'f',
    '#f2cf4a',
    join([
      ...[0, 1, 2, 3]
        .flatMap((r) => [0, 1, 2].map((k) => rect(22 + k * 17, 178 + r * 16, 9, 8)))
        .filter((_, i) => i % 4 !== 1),
      ...[0, 1, 2, 3]
        .flatMap((r) => [0, 1, 2].map((k) => rect(184 + k * 17, 184 + r * 16, 9, 8)))
        .filter((_, i) => i % 3 !== 2),
    ]),
    0.8,
  ],
  ['f', '#9a958a', 'M104,284 L104,134 L146,134 L146,284 Z', 1.8],
  ['f', '#5b5850', 'M100,136 L125,96 L150,136 Z', 1.6],
  ['l', 'M125,96 L125,84 M104,186 H146', 1.2],
  ['f', '#f2cf4a', c(125, 84, 3), 0.8],
  ['f', '#f6e3a1', c(125, 159, 16), 1.8],
  ['l', `${ticks(125, 159, 12.5, 15, 12)} M125,159 L125,146 M125,159 L125.6,149`, 1.3],
  ['f', INK, c(125, 159, 1.8), 0],
  // Konfety a serpentýny.
  [
    'f',
    '#d7442c',
    join([
      'M66,60 l6,-2 l1,4 l-6,2 Z',
      'M200,96 l6,2 l-1,4 l-6,-2 Z',
      'M130,128 l5,-3 l2,4 l-5,3 Z',
      'M36,200 l6,1 l-1,4 l-6,-1 Z',
    ]),
    0.6,
  ],
  [
    'f',
    '#9fd0c4',
    join(['M140,40 l6,2 l-1,4 l-6,-2 Z', 'M86,150 l5,3 l-2,4 l-5,-3 Z', 'M222,190 l6,-1 l1,4 l-6,1 Z']),
    0.6,
  ],
  [
    'f',
    '#f2cf4a',
    join(['M58,170 l5,-3 l2,4 l-5,3 Z', 'M188,150 l6,1 l-1,4 l-6,-1 Z', 'M112,60 l6,-1 l1,4 l-6,1 Z']),
    0.6,
  ],
  ['s', '#d7442c', 'M20,214 C34,200 26,226 44,216 C58,208 52,232 70,222', 1.8],
  ['s', '#f2cf4a', 'M234,212 C220,202 226,226 208,218 C196,212 198,234 184,226', 1.8],
  // Stůl s ubrusem.
  ['f', '#fffaf0', 'M16,228 L234,228 L234,284 L16,284 Z', 1.6],
  ['l', 'M16,238 H234', 0.8],
  // Seznam předsevzetí, přeškrtaný.
  ['f', '#f6e3a1', 'M22,234 L58,230 L61,258 L25,262 Z', 1.2],
  ['l', 'M28,239 l26,-3 M29,247 l26,-3 M30,255 l22,-2', 0.9],
  ['s', '#d7442c', 'M26,243 L58,231 M27,251 L59,239 M28,259 L58,247', 1.4],
  // Skleničky si ťukají.
  [
    'f',
    '#bcd6e6',
    'M76,192 L96,192 C96,208 88,214 86,214 C84,214 76,208 76,192 Z M116,186 L136,190 C134,206 124,212 122,211 C120,210 114,204 116,186 Z',
    1.4,
  ],
  [
    'f',
    '#f2cf4a',
    'M77,198 L95,198 C94,208 88,212 86,212 C84,212 78,208 77,198 Z M116,192 L135,195 C133,205 125,209 123,209 C121,208 116,202 116,192 Z',
    0,
  ],
  ['l', 'M86,214 L86,234 M78,236 h16 M122,211 L120,232 M112,234 h16', 1.6],
  ['f', '#fffaf0', star4(106, 182, 7), 0.8],
  ['l', 'M100,174 l-3,-4 M106,172 l0,-5 M112,174 l3,-4', 1.1],
  // Lahev sektu a vystřelený špunt s pěnou.
  [
    'f',
    '#2f6b3a',
    'M162,238 L162,192 C162,180 170,176 172,164 L172,148 L184,148 L184,164 C186,176 194,180 194,192 L194,238 Z',
    2,
  ],
  ['f', '#f2cf4a', 'M170,148 L186,148 L186,136 L170,136 Z', 1.4],
  ['f', '#fffaf0', 'M166,202 L190,202 L190,222 L166,222 Z', 1.2],
  ['f', '#d7442c', c(178, 212, 5), 0.8],
  [
    'f',
    '#fffaf0',
    'M170,136 C164,124 172,116 178,122 C182,112 194,116 190,128 C194,132 190,138 186,136 Z',
    1.3,
  ],
  ['f', '#c99a62', 'M196,88 L206,84 L212,98 L202,102 Z', 1.4],
  ['l', 'M190,112 l6,-8 M184,106 l2,-10 M198,118 l8,-4', 1.2],
];

// ─────────────────────────── Export ───────────────────────────

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  tour_guide: {
    bg: '#bcd6e6',
    motif: 'none',
    body: '#d7442c',
    collar: 'plain',
    female: true,
    hair: 'bob',
    hairColor: '#8c5632',
    mood: 'grin',
    prop: undefined,
    backdrop: TOUR_BACKDROP,
    outfit: TOUR_OUTFIT,
    extra: TOUR_EXTRA,
  },
  spartakiada: {
    bg: '#bcd6e6',
    motif: 'none',
    body: '#fffaf0',
    collar: 'plain',
    female: true,
    hair: 'bob',
    hairColor: '#5a3418',
    hat: 'band',
    hatColor: '#d7442c',
    mood: 'grin',
    prop: undefined,
    backdrop: SPARTA_BACKDROP,
    outfit: SPARTA_OUTFIT,
    extra: SPARTA_EXTRA,
  },
  spa_guest: {
    bg: '#c6dcae',
    motif: 'none',
    body: '#f3e8cf',
    collar: 'bow',
    accent: '#22365c',
    hair: 'bald',
    hairColor: '#d9d2c2',
    beard: 'walrus',
    beardColor: '#d9d2c2',
    hat: 'straw',
    hatColor: '#f6e3a1',
    hatAccent: '#22365c',
    mood: 'smile',
    prop: undefined,
    backdrop: SPA_BACKDROP,
    outfit: SPA_OUTFIT,
    extra: SPA_EXTRA,
  },
  brass_band: {
    bg: '#bcd6e6',
    motif: 'none',
    body: '#22365c',
    collar: 'uniform',
    accent: '#d7442c',
    hair: 'short',
    hairColor: '#5a3418',
    hat: 'cap',
    hatColor: '#22365c',
    hatAccent: '#e9b030',
    beard: 'walrus',
    beardColor: '#5a3418',
    mood: 'o',
    redNose: true,
    prop: undefined,
    backdrop: BRASS_BACKDROP,
    outfit: BRASS_OUTFIT,
    extra: BRASS_EXTRA,
  },
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  'j-voucher_privatization': VOUCHER,
  karluvMost: KARLUV_MOST,
  d1: D1,
  'j-exchange_office': EXCHANGE,
  silvestr: SILVESTR,
};

/**
 * Obrázky žolíků — dávka 10 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - social_bubble — Sociální bublina: nová scéna `j-social_bubble` (SCENES['j-social_bubble'])
 *  - snowman — Sněhulák: scéna `snehulak` (SCENES['snehulak'])
 *  - mushroom_picker — Sběrač hub: portrét `fig-mushroom_picker` (FIGURES['mushroom_picker'])
 *  - impersonator — Napodobitel: portrét `fig-impersonator` (FIGURES['impersonator'])
 *  - innkeeper — Hostinský: scéna `hostinsky` (SCENES['hostinsky'])
 *  - grandmas_chest — Babiččina truhla: scéna `truhla` (SCENES['truhla'])
 *  - beer_sommelier — Pivní sommelier: portrét `fig-beer_sommelier` (FIGURES['beer_sommelier'])
 *  - archivist — Archivář: portrét `fig-archivist` (FIGURES['archivist'])
 *  - fair_magician — Kouzelník z pouti: portrét `fig-fair_magician` (FIGURES['fair_magician'])
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

const SKIN = '#f2b48e';
const INK = '#1a1714';
const r1 = (n: number): string => String(Math.round(n * 10) / 10);

/** Srdíčko se středem x,y (šířka ~2,4 s). */
const heart = (x: number, y: number, s: number): string =>
  `M${r1(x)},${r1(y + s * 0.9)} C${r1(x - s * 1.2)},${r1(y + s * 0.1)} ${r1(x - s * 1.1)},${r1(y - s * 0.9)} ` +
  `${r1(x - s * 0.5)},${r1(y - s * 0.9)} C${r1(x - s * 0.15)},${r1(y - s * 0.9)} ${r1(x)},${r1(y - s * 0.6)} ` +
  `${r1(x)},${r1(y - s * 0.45)} C${r1(x)},${r1(y - s * 0.6)} ${r1(x + s * 0.15)},${r1(y - s * 0.9)} ` +
  `${r1(x + s * 0.5)},${r1(y - s * 0.9)} C${r1(x + s * 1.1)},${r1(y - s * 0.9)} ${r1(x + s * 1.2)},${r1(y + s * 0.1)} ` +
  `${r1(x)},${r1(y + s * 0.9)} Z`;

/** Pik (♠) se středem x,y (výška ~2 s). */
const spade = (x: number, y: number, s: number): string =>
  `M${r1(x)},${r1(y - s)} C${r1(x - s * 0.3)},${r1(y - s * 0.5)} ${r1(x - s)},${r1(y - s * 0.2)} ${r1(x - s)},${r1(y + s * 0.3)} ` +
  `C${r1(x - s)},${r1(y + s * 0.7)} ${r1(x - s * 0.4)},${r1(y + s * 0.8)} ${r1(x - s * 0.1)},${r1(y + s * 0.5)} ` +
  `L${r1(x - s * 0.3)},${r1(y + s)} L${r1(x + s * 0.3)},${r1(y + s)} L${r1(x + s * 0.1)},${r1(y + s * 0.5)} ` +
  `C${r1(x + s * 0.4)},${r1(y + s * 0.8)} ${r1(x + s)},${r1(y + s * 0.7)} ${r1(x + s)},${r1(y + s * 0.3)} ` +
  `C${r1(x + s)},${r1(y - s * 0.2)} ${r1(x + s * 0.3)},${r1(y - s * 0.5)} ${r1(x)},${r1(y - s)} Z`;

/** Kapka vody (špička nahoře). */
const tear = (x: number, y: number, s = 1): string =>
  `M${x},${y} C${r1(x - 4 * s)},${r1(y + 7 * s)} ${r1(x - 2.5 * s)},${r1(y + 12 * s)} ${x},${r1(y + 12 * s)} ` +
  `C${r1(x + 2.5 * s)},${r1(y + 12 * s)} ${r1(x + 4 * s)},${r1(y + 7 * s)} ${x},${y} Z`;

/** Čtyřcípá jiskra / hvězdička. */
const star4 = (x: number, y: number, r: number): string =>
  `M${x},${r1(y - r)} Q${r1(x + r * 0.16)},${r1(y - r * 0.16)} ${r1(x + r)},${y} ` +
  `Q${r1(x + r * 0.16)},${r1(y + r * 0.16)} ${x},${r1(y + r)} Q${r1(x - r * 0.16)},${r1(y + r * 0.16)} ${r1(x - r)},${y} ` +
  `Q${r1(x - r * 0.16)},${r1(y - r * 0.16)} ${x},${r1(y - r)} Z`;

/** Paprsky po obvodu kruhu (tahy tuší). */
function ticks(cx: number, cy: number, ra: number, rb: number, n: number, a0 = 0): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.PI * 2 * i) / n;
    d += `M${r1(cx + Math.cos(a) * ra)},${r1(cy + Math.sin(a) * ra)} L${r1(cx + Math.cos(a) * rb)},${r1(cy + Math.sin(a) * rb)} `;
  }
  return d.trim();
}

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
const hand = (x: number, y: number): SceneOp[] => [
  ['f', SKIN, c(x, y, 11, 9), 1.8],
  ['l', `M${x - 9},${y - 3} l18,0 M${x - 9},${y + 3} l18,0`, 1.1],
];

/** Více tvarů jedné barvy v jedné cestě. */
const join = (parts: readonly string[]): string => parts.join(' ');

// ─────────────────────────── Sociální bublina ───────────────────────────

interface CrowdRow {
  readonly y: number;
  readonly s: number;
  readonly xs: readonly number[];
}

/** Řada stejných lidiček (stejný účes, stejné tričko se srdcem, stejný úsměv) — po barvách v jedné cestě. */
function crowdRow(row: CrowdRow, bottom: number): SceneOp[] {
  const { y, s, xs } = row;
  const k = (n: number): string => r1(n * s);
  const bodies = xs.map(
    (x) =>
      `M${r1(x - 20 * s)},${bottom} L${r1(x - 20 * s)},${r1(y + 26 * s)} C${r1(x - 20 * s)},${r1(y + 17 * s)} ` +
      `${r1(x - 11 * s)},${r1(y + 13 * s)} ${x},${r1(y + 13 * s)} C${r1(x + 11 * s)},${r1(y + 13 * s)} ` +
      `${r1(x + 20 * s)},${r1(y + 17 * s)} ${r1(x + 20 * s)},${r1(y + 26 * s)} L${r1(x + 20 * s)},${bottom} Z`,
  );
  const hair = xs.map(
    (x) =>
      `M${r1(x - 12.5 * s)},${r1(y + 3 * s)} C${r1(x - 15 * s)},${r1(y - 17 * s)} ${r1(x + 15 * s)},${r1(y - 17 * s)} ` +
      `${r1(x + 12.5 * s)},${r1(y + 3 * s)} C${r1(x + 10 * s)},${r1(y - 4 * s)} ${r1(x + 2 * s)},${r1(y - 6 * s)} ` +
      `${r1(x - 4 * s)},${r1(y - 3 * s)} C${r1(x - 8 * s)},${r1(y - 3 * s)} ${r1(x - 11 * s)},${r1(y)} ${r1(x - 12.5 * s)},${r1(y + 3 * s)} Z`,
  );
  return [
    ['f', '#d7442c', join(bodies), 1.3],
    ['f', '#fffaf0', join(xs.map((x) => heart(x, y + 29 * s, 4.6 * s))), 0.8],
    ['f', SKIN, join(xs.map((x) => c(x, y, 11.5 * s, 12.5 * s))), 1.3],
    ['f', '#e9b030', join(hair), 1.1],
    [
      'f',
      INK,
      join(xs.flatMap((x) => [c(x - 4.4 * s, y + 1.5 * s, 1.5 * s), c(x + 4.4 * s, y + 1.5 * s, 1.5 * s)])),
      0,
    ],
    ['l', join(xs.map((x) => `M${r1(x - 5 * s)},${r1(y + 6 * s)} q${k(5)},${k(4)} ${k(10)},0`)), 1],
  ];
}

/** Bublinka s textem (zaoblená, ocásek dolů) se středem x,y. */
const balloon = (x: number, y: number, w: number, h: number): string =>
  `M${x - w / 2 + 3},${y - h / 2} H${x + w / 2 - 3} Q${x + w / 2},${y - h / 2} ${x + w / 2},${y - h / 2 + 3} ` +
  `V${y + h / 2 - 3} Q${x + w / 2},${y + h / 2} ${x + w / 2 - 3},${y + h / 2} H${x + 2} L${x - 3},${y + h / 2 + 5} ` +
  `L${x - 3},${y + h / 2} H${x - w / 2 + 3} Q${x - w / 2},${y + h / 2} ${x - w / 2},${y + h / 2 - 3} ` +
  `V${y - h / 2 + 3} Q${x - w / 2},${y - h / 2} ${x - w / 2 + 3},${y - h / 2} Z`;

// Sociální bublina: mýdlová bublina nad sídlištěm a v ní dav úplně stejných lidiček (stejný účes, stejné
// tričko se srdcem ♥, všichni říkají totéž); jediný jiný (♠, palec dolů) stojí venku — „kdo nesouhlasí, ten tu není“.
const SOCIAL_BUBBLE: SceneOp[] = [
  ['f', '#2f5fa8', rect(16, 16, 218, 268), 0],
  // Sídliště v noci: paneláky s rozsvícenými okny.
  ['f', '#22365c', `${rect(16, 172, 44, 112)} ${rect(168, 196, 30, 88)} ${rect(198, 160, 36, 124)}`, 1.4],
  [
    'l',
    'M16,190 H60 M16,208 H60 M16,226 H60 M16,244 H60 M16,262 H60 M198,178 H234 M198,196 H234 M198,214 H234 M198,232 H234',
    0.8,
  ],
  [
    'f',
    '#f2cf4a',
    `${rect(22, 194, 8, 9)} ${rect(44, 212, 8, 9)} ${rect(22, 248, 8, 9)} ${rect(34, 176, 8, 9)} ${rect(206, 164, 8, 9)} ${rect(220, 200, 8, 9)} ${rect(176, 202, 8, 9)}`,
    0.8,
  ],
  // Lajky a srdíčka stoupají z bubliny.
  ['i', 'thumb-up', 184, 30, 34, '#fffaf0'],
  [
    'f',
    '#e88a9a',
    `${heart(170, 66, 5)} ${heart(226, 52, 4.5)} ${heart(214, 92, 4)} ${heart(160, 40, 3.6)}`,
    1,
  ],
  // Bublina (průhledná): výplň, dav uvnitř, dno s odleskem, duhový lem a obrys.
  ['f', '#bcd6e6', c(114, 146, 88), 0],
  ...crowdRow({ y: 102, s: 0.85, xs: [84, 114, 144] }, 206),
  ...crowdRow({ y: 130, s: 0.9, xs: [72, 100, 128, 156] }, 206),
  ...crowdRow({ y: 162, s: 1.05, xs: [76, 114, 152] }, 206),
  ['f', '#fffaf0', join([balloon(88, 77, 22, 15), balloon(114, 75, 22, 15), balloon(140, 77, 22, 15)]), 1.1],
  ['f', '#d7442c', join([heart(88, 77, 4.2), heart(114, 75, 4.2), heart(140, 77, 4.2)]), 0.7],
  ['f', '#6fa0c8', 'M44.5,200 C90,207 140,207 183.5,200 A88,88 0 0,1 44.5,200 Z', 0],
  ['l', 'M44.5,200 C90,207 140,207 183.5,200', 0.8],
  ['s', '#e88a9a', 'M197,166 A84,84 0 0,1 170,211', 3],
  ['s', '#9fd0c4', 'M188,104 A85,85 0 0,1 199,148', 3],
  ['s', '#fffaf0', 'M42,122 A76,76 0 0,1 84,76', 5],
  ['f', '#fffaf0', `${c(58, 104, 3.4, 2.4)} ${c(172, 196, 3, 2)}`, 0.6],
  ['l', c(114, 146, 88), 2.4],
  // Ten jiný: tmavé tričko s pikem, rozcuchaný, zamračený, palec dolů.
  ['f', '#5b5850', 'M190,268 L190,254 C190,245 199,240 210,240 C221,240 230,245 230,254 L230,268 Z', 1.6],
  ['f', '#fffaf0', spade(210, 255, 5.5), 0.8],
  ['f', SKIN, c(210, 226, 11.5, 12.5), 1.6],
  [
    'f',
    '#5a3418',
    'M198,225 L198,215 L203,219 L205,211 L209,217 L213,210 L215,217 L220,213 L222,225 C218,218 202,218 198,225 Z',
    1.2,
  ],
  ['f', INK, `${c(205.5, 227, 1.5)} ${c(214.5, 227, 1.5)}`, 0],
  ['l', 'M203,223 l5,1.5 M217,223 l-5,1.5 M205,234 q5,-4 10,0', 1.1],
  [
    'f',
    '#fffaf0',
    'M200,182 H230 Q233,182 233,185 V201 Q233,204 230,204 H214 L208,211 L208,204 H203 Q200,204 200,201 V185 Q200,182 203,182 Z',
    1.2,
  ],
  ['i', 'thumb-down', 207, 184, 18, '#d7442c'],
];

// ─────────────────────────── Sněhulák ───────────────────────────

// Sněhulák: přichází jaro — samolibé sluníčko, z koulí kape, pod ním louže, hrnec mu sjíždí z hlavy,
// mrkev povadla, ze sněhu vykukují sněženky a zajíc už si brousí zuby na mrkev („zbude jen mrkev“).
const SNOWMAN: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  // Sluníčko — viník.
  ['l', ticks(194, 54, 24, 33, 12, 0.13), 1.8],
  ['f', '#f2cf4a', c(194, 54, 19), 2],
  ['l', 'M184,52 q4,-4 8,0 M197,52 q4,-4 8,0 M186,60 q8,7 16,0', 1.4],
  ['f', '#e8603a', `${c(182, 60, 3)} ${c(206, 60, 3)}`, 0],
  // Poslední mráček odchází.
  [
    'f',
    '#fffaf0',
    'M28,84 C26,74 38,68 46,74 C50,64 68,64 70,74 C80,72 84,84 76,88 L34,89 C26,89 24,86 28,84 Z',
    1.3,
  ],
  // Tající sníh, prosakující tráva, sněženky.
  ['f', '#fffaf0', 'M16,204 C70,190 170,198 234,190 L234,284 L16,284 Z', 1.6],
  [
    'f',
    '#5d9a3e',
    'M16,250 C26,236 58,234 72,244 C64,258 28,262 16,256 Z M178,250 C190,238 222,236 234,242 L234,262 C214,264 190,262 178,250 Z',
    1.3,
  ],
  ['l', 'M192,250 q2,-12 -2,-20 M206,248 q1,-14 4,-22 M220,250 q-1,-10 2,-16', 1.2],
  ['f', '#fffaf0', `${tear(190, 230, 0.9)} ${tear(210, 226, 0.9)} ${tear(222, 234, 0.8)}`, 1.1],
  ['f', '#5d9a3e', `${c(190, 230, 2.2)} ${c(210, 226, 2.2)} ${c(222, 234, 2)}`, 0.8],
  // Koště za zády.
  ['f', '#8c5632', 'M172,254 L200,130 L206,131 L178,255 Z', 1.6],
  [
    'f',
    '#c99a62',
    'M193,136 C183,122 183,102 189,88 C195,100 209,108 221,110 C217,122 211,130 205,136 Z',
    1.6,
  ],
  [
    'l',
    'M195,132 L187,102 M199,132 L195,96 M202,132 L207,104 M205,132 L217,114 M189,102 l-6,-8 M195,96 l1,-9 M217,114 l8,-3',
    1.1,
  ],
  // Louže.
  ['f', '#6fa0c8', c(122, 256, 92, 9), 1.4],
  ['l', 'M44,258 h14 M182,254 h16 M200,260 h10', 1],
  // Spodní koule.
  ['f', '#fffaf0', c(122, 220, 52, 40), 2.4],
  ['h', 'M148,186 C170,198 178,220 174,242 C166,254 154,259 140,260 C160,242 164,212 148,186 Z', -45],
  // Prostřední koule; stéká na spodní.
  [
    'f',
    '#fffaf0',
    'M90,184 C90,200 96,204 99,204 C102,204 104,198 104,188 Z M140,188 C140,202 145,208 148,208 C151,208 152,200 152,186 Z',
    1.4,
  ],
  ['f', '#fffaf0', c(122, 160, 37, 30), 2.4],
  ['h', 'M144,137 C159,147 163,164 157,180 C151,186 144,189 136,190 C150,176 152,155 144,137 Z', -45],
  // Hlava; stéká na prostřední.
  [
    'f',
    '#fffaf0',
    'M100,124 C100,138 104,142 107,142 C110,142 111,136 111,128 Z M132,128 C132,136 134,146 137,146 C140,146 142,138 142,126 Z',
    1.4,
  ],
  ['f', '#fffaf0', c(122, 110, 27, 24), 2.4],
  // Knoflíky z uhlí.
  ['f', INK, `${c(122, 154, 3.4)} ${c(122, 172, 3.4)} ${c(122, 210, 3.6)} ${c(122, 230, 3.6)}`, 0],
  // Šála.
  ['f', '#d7442c', 'M95,128 C110,138 134,138 151,128 L153,140 C134,150 110,150 93,140 Z', 1.8],
  ['f', '#d7442c', 'M136,140 L144,176 L156,172 L148,138 Z', 1.6],
  ['l', 'M106,134 L104,145 M120,137 L120,148 M138,136 L140,146 M140,153 L150,150 M142,163 L153,160', 1.6],
  ['l', 'M145,176 l-1,5 M149,175 l0,5 M153,174 l1,5', 1.1],
  // Obličej: uhlíky, smutná pusa, povadlá mrkev.
  ['f', INK, `${c(112, 104, 3.2)} ${c(133, 104, 3.2)}`, 0],
  [
    'f',
    INK,
    `${c(108, 126, 1.8)} ${c(114, 123, 1.8)} ${c(121, 122, 1.8)} ${c(128, 123, 1.8)} ${c(134, 126, 1.8)}`,
    0,
  ],
  ['f', '#ef8a2e', 'M120,110 C130,110 146,115 156,125 C144,122 130,119 120,117 Z', 1.5],
  ['l', 'M131,113 l-1,5 M141,116 l-1,4', 1],
  // Kapky padají.
  [
    'f',
    '#6fa0c8',
    `${tear(98, 208, 0.8)} ${tear(150, 214, 0.8)} ${tear(112, 148, 0.7)} ${tear(158, 132, 0.7)}`,
    1,
  ],
  // Hrnec sjíždí z hlavy.
  ['f', '#d7442c', 'M98,92 L100,61 L141,55 L148,85 Z', 2.2],
  ['f', '#fffaf0', `${c(110, 75, 3)} ${c(124, 69, 3)} ${c(136, 77, 3)} ${c(118, 83, 2.5)}`, 0.8],
  ['f', '#d7442c', 'M92,93 L151,83 L152,89 L93,99 Z', 1.8],
  ['l', 'M141,63 C152,61 156,69 148,75', 1.6],
  // Ruce z větviček: levá povadlá, pravá drží koště.
  ['l', 'M88,164 L60,180 M70,174 l-5,-9 M66,177 l-7,6', 2],
  ['l', 'M156,154 L196,136 M180,143 l2,-10 M187,140 l9,1', 2],
  // Zajíc v trávě už čeká na mrkev.
  ['i', 'rabbit', 16, 200, 46, '#c99a62'],
];

// ─────────────────────────── Sběrač hub ───────────────────────────

/** Smrk: tři patra větví (jedna cesta). */
const spruce = (x: number, top: number, bottom: number, hw: number): string => {
  const h = bottom - top;
  const tier = (t0: number, t1: number, w: number): string =>
    `M${x},${r1(top + h * t0)} L${r1(x + w)},${r1(top + h * t1)} L${r1(x - w)},${r1(top + h * t1)} Z`;
  return `${tier(0, 0.45, hw * 0.55)} ${tier(0.22, 0.72, hw * 0.8)} ${tier(0.45, 1, hw)}`;
};

// Sběrač hub: babka houbařka v šátku a šusťákovce, ráno v mlžném smrkovém lese; koš plný hřibů, nožík v kapse,
// na pařezu rostou václavky („rostou tam, kde něco zmizelo“) a vpředu muchomůrka, kterou nebere.
const MUSHROOM_BACKDROP: SceneOp[] = [
  // Vzdálené smrky v mlze.
  ['f', '#5d9a3e', `${spruce(84, 92, 200, 22)} ${spruce(170, 84, 200, 24)} ${spruce(126, 64, 200, 22)}`, 1.3],
  [
    'f',
    '#fffaf0',
    'M16,170 C60,160 100,176 140,168 C180,160 210,170 234,164 L234,184 C200,190 170,178 130,186 C90,194 50,180 16,188 Z',
    0,
  ],
  // Blízké smrky po stranách.
  ['f', '#8c5632', `${rect(36, 196, 8, 22)} ${rect(206, 200, 8, 20)}`, 1.2],
  ['f', '#2f6b3a', `${spruce(40, 52, 204, 34)} ${spruce(210, 44, 208, 34)}`, 1.6],
  // Mech a jehličí.
  ['f', '#5d9a3e', 'M16,216 C70,206 170,212 234,206 L234,284 L16,284 Z', 1.4],
  ['l', 'M24,232 l6,-3 M40,244 l5,2 M196,228 l6,-2 M214,240 l5,3 M60,226 l6,-2', 1],
  // Pařez s václavkami.
  ['f', '#8c5632', 'M18,222 L20,192 L58,192 L60,222 C46,228 30,228 18,222 Z', 1.6],
  ['f', '#f6e3a1', c(39, 192, 19, 5), 1.4],
  ['l', `${c(39, 192, 11, 3)} M38,200 L37,220 M50,200 L51,218`, 0.9],
  [
    'f',
    '#fffaf0',
    'M50,194 L52,186 L55,186 L56,194 Z M28,194 L29,185 L32,185 L33,194 Z M58,208 L62,202 L64,204 L60,210 Z',
    1,
  ],
  ['f', '#e9b030', `${c(53.5, 185, 7, 3.6)} ${c(30.5, 184, 6, 3.2)} ${c(64, 201, 5.5, 3)}`, 1.2],
];

const MUSHROOM_OUTFIT: SceneOp[] = [
  ['l', 'M125,244 L125,284', 1.2],
  // Kapsa s nožíkem.
  ['f', '#c99a62', 'M86,236 L92,226 L96,228 L92,240 Z', 1.2],
  ['f', '#d9d2c2', 'M92,226 L100,214 L102,216 L96,228 Z', 1],
  ['f', '#8a8f2e', 'M76,238 L104,238 L104,258 L78,258 Z', 1.4],
  ['l', 'M78,244 L104,244', 0.9],
];

const MUSHROOM_EXTRA: SceneOp[] = [
  // Koš: ucho, hřiby (bílé nožičky, hnědé klobouky), proutěný koš s okrajem.
  ['s', '#8c5632', 'M146,226 C146,150 208,150 208,226', 6],
  [
    'f',
    '#fffaf0',
    'M172,222 C168,210 170,200 174,196 L188,196 C192,200 194,210 190,222 Z M150,222 C148,214 150,208 152,206 L162,206 C164,208 166,214 164,222 Z M196,222 C195,216 196,212 198,210 L206,210 C208,212 209,216 208,222 Z',
    1.3,
  ],
  [
    'f',
    '#8c5632',
    'M161,200 C161,180 201,180 201,200 C190,204 172,204 161,200 Z M144,208 C144,194 170,194 170,208 C162,211 152,211 144,208 Z M191,212 C191,201 213,201 213,212 C206,214 198,214 191,212 Z',
    1.6,
  ],
  ['f', '#c99a62', `${c(172, 188, 5, 2.4)} ${c(152, 200, 3.4, 1.8)} ${c(198, 205, 3, 1.5)}`, 0],
  ['f', '#c99a62', 'M140,224 L214,224 L204,284 L150,284 Z', 2],
  ['l', 'M144,238 C170,242 190,242 211,238 M146,252 C170,256 190,256 208,252', 1],
  ['l', 'M156,226 L158,284 M170,226 L171,284 M184,226 L184,284 M198,226 L196,284', 0.8],
  ['f', '#8c5632', 'M136,218 L218,218 L216,229 L138,229 Z', 1.6],
  // Muchomůrka vpředu (tu nebere).
  ['f', '#fffaf0', 'M28,268 C28,256 30,248 32,242 L42,242 C44,248 46,256 46,268 Z', 1.4],
  ['f', '#fffaf0', 'M28,250 C32,254 42,254 46,250 L46,254 C42,258 32,258 28,254 Z', 1],
  ['f', '#d7442c', 'M18,244 C18,224 56,224 56,244 C46,248 28,248 18,244 Z', 1.8],
  ['f', '#fffaf0', `${c(28, 236, 2.6)} ${c(38, 230, 2.4)} ${c(48, 237, 2.6)} ${c(36, 240, 1.8)}`, 0.6],
];

// ─────────────────────────── Napodobitel ───────────────────────────

/** Proužky duhové klopy (zvenku dovnitř), zrcadlené podle středu postavy. */
function rainbowLapels(): SceneOp[] {
  const bands: readonly [number, number, string][] = [
    [-16, -11, '#d7442c'],
    [-11, -6, '#f2cf4a'],
    [-6, -1, '#2f8077'],
  ];
  const one = (a: number, b: number, mirror: boolean): string => {
    const X = (x: number): string => r1(mirror ? 250 - x : x);
    return (
      `M${X(108 + a)},212 L${X(123 + a)},245 L${X(112 + a)},284 L${X(112 + b)},284 L${X(123 + b)},245 ` +
      `L${X(108 + b)},212 Z`
    );
  };
  return bands.map(([a, b, col]) => ['f', col, `${one(a, b, false)} ${one(a, b, true)}`, 1]);
}

// Napodobitel: bavič na jevišti kulturáku (opona, reflektor, mikrofon) v saku s duhovými klopami (duhová edice);
// přes obličej si přidržuje masku cizí tváře — babičky s trvalou — a vlastní knír má nalepený nakřivo.
const IMPERSONATOR_BACKDROP: SceneOp[] = [
  // Kužel reflektoru a prkna jeviště.
  ['f', '#f6e3a1', 'M102,30 L148,30 L214,284 L36,284 Z', 0],
  ['f', '#c99a62', 'M16,246 H234 V284 H16 Z', 1.4],
  ['l', 'M16,256 H234 M50,246 L46,284 M200,246 L204,284', 0.9],
  // Opona po stranách a nahoře.
  [
    'f',
    '#b8302a',
    'M16,30 L62,30 C54,90 62,170 50,284 L16,284 Z M234,30 L188,30 C196,90 188,170 200,284 L234,284 Z',
    1.8,
  ],
  [
    'l',
    'M30,40 C26,120 34,200 28,284 M44,40 C42,120 46,200 40,284 M220,40 C224,120 216,200 222,284 M206,40 C208,120 204,200 210,284',
    1,
  ],
  [
    'f',
    '#d7442c',
    'M16,16 H234 V40 C222,52 206,52 194,40 C182,52 166,52 154,40 C142,52 126,52 114,40 C102,52 86,52 74,40 C62,52 46,52 34,40 C28,46 22,48 16,46 Z',
    1.6,
  ],
  ['s', '#e9b030', 'M16,30 H234', 2.4],
  // Všechny hlasy: zpěv, knír, rtěnka.
  ['f', '#fffaf0', join([balloon(92, 80, 28, 20), balloon(125, 66, 28, 20), balloon(158, 80, 28, 20)]), 1.3],
  [
    'f',
    INK,
    `${c(88, 85, 3.4, 2.6)} M115,68 C118,62 123,62 125,65 C127,62 132,62 135,68 C131,70 127,69 125,67 C123,69 119,70 115,68 Z`,
    0,
  ],
  ['l', 'M91,85 L91,73 L98,75', 1.4],
  ['f', '#d7442c', 'M150,80 C153,76 156,77 158,78 C160,77 163,76 166,80 C162,85 154,85 150,80 Z', 1],
  // Mikrofon na stojanu.
  ['s', '#5b5850', 'M68,190 L68,262', 4],
  ['l', 'M56,262 L80,262', 2.4],
];

const IMPERSONATOR_EXTRA: SceneOp[] = [
  ['f', '#5b5850', 'M60,168 C60,156 76,156 76,168 L76,184 C76,192 60,192 60,184 Z', 1.8],
  ['l', 'M60,170 H76 M60,176 H76 M64,160 V190 M72,160 V190', 0.8],
  // Nalepený knír nakřivo.
  [
    'f',
    INK,
    'M109,171 C113,163 120,163 124,166 C129,160 137,158 144,160 C140,167 132,169 126,168 C120,173 113,174 109,171 Z',
    1.3,
  ],
  // Maska cizí tváře na tyčce: babička s trvalou, brýle, rtěnka.
  ['s', '#8c5632', 'M184,166 L190,240', 3.6],
  [
    'f',
    '#cbb8e3',
    `${c(170, 116, 8)} ${c(184, 110, 9)} ${c(198, 116, 8)} ${c(166, 130, 7)} ${c(202, 130, 7)}`,
    1.4,
  ],
  ['f', '#f3c7c0', c(184, 140, 19, 24), 2],
  ['f', '#cbb8e3', `${c(174, 120, 7)} ${c(186, 117, 7)} ${c(196, 122, 6)}`, 1.2],
  ['l', `${c(176, 138, 6)} ${c(192, 138, 6)} M182,138 L186,138`, 1.4],
  ['f', INK, `${c(176, 138, 2)} ${c(192, 138, 2)}`, 0],
  ['f', '#d7442c', 'M176,154 C180,151 188,151 192,154 C188,159 180,159 176,154 Z', 1],
  ['f', '#e88a9a', `${c(171, 149, 3.5)} ${c(197, 149, 3.5)}`, 0],
  ...hand(190, 240),
];

// ─────────────────────────── Hostinský ───────────────────────────

// Hostinský: za výčepem s obložením, na stěně paroží a police s půllitry; točí pivo na hladinku přesně po rysku
// a vedle už stojí natočený půllitr na tácku — „u mě se nic nevylévá“.
const ANTLERS =
  'M196,74 C188,60 180,52 168,44 M184,58 L176,64 M178,50 L174,38 M204,74 C212,60 220,52 232,44 M216,58 L224,64 M222,50 L226,38';

const INNKEEPER: SceneOp[] = figure({
  bg: '#f6e3a1',
  motif: 'none',
  body: '#fffaf0',
  collar: 'vest',
  accent: '#2f6b3a',
  hair: 'bald',
  hairColor: '#9a958a',
  beard: 'walrus',
  beardColor: '#5b5850',
  redNose: true,
  mood: 'smile',
  backdrop: [
    // Dřevěné obložení a lišta.
    ['f', '#8c5632', rect(16, 132, 218, 152), 1.4],
    ['l', 'M48,140 V284 M84,140 V284 M166,140 V284 M202,140 V284', 0.9],
    ['f', '#5a3418', rect(16, 126, 218, 8), 1.2],
    // Police s půllitry dnem vzhůru.
    ['f', '#5a3418', rect(20, 100, 76, 6), 1.2],
    [
      'f',
      '#bcd6e6',
      'M26,100 L28,76 L44,76 L46,100 Z M52,100 L54,76 L70,76 L72,100 Z M78,100 L80,76 L94,76 L94,100 Z',
      1.3,
    ],
    ['l', 'M46,84 c6,0 6,10 0,10 M72,84 c6,0 6,10 0,10', 1.1],
    // Paroží na štítku.
    ['l', ANTLERS, 9],
    ['s', '#f3e8cf', ANTLERS, 4.5],
    // Hodiny (zavíračka se blíží).
    ['f', '#fffaf0', c(132, 64, 15), 1.8],
    ['l', `${ticks(132, 64, 11, 13.5, 12)} M132,64 L132,54 M132,64 L139,68`, 1.1],
    ['f', '#c99a62', 'M188,72 C188,64 212,64 212,72 L212,88 C212,98 188,98 188,88 Z', 1.6],
    ['f', '#5a3418', `${c(196, 76, 3)} ${c(204, 76, 3)}`, 0.8],
  ],
  extra: [
    // Pípa: sloup, kohout, páka, ruka na páce.
    ['f', '#d9d2c2', rect(172, 180, 16, 58), 1.8],
    ['f', '#d9d2c2', c(180, 180, 12, 6), 1.6],
    ['f', '#d9d2c2', 'M172,190 L162,190 L162,206 L168,206 L168,196 L172,196 Z', 1.4],
    ['f', INK, 'M176,176 L171,148 L179,147 L183,176 Z', 1.2],
    ...hand(175, 146),
    // Pivo teče do půllitru — hladinka přesně po rysku.
    ['s', '#e9b030', 'M165,206 L165,214', 2],
    ['f', '#e9b030', 'M150,212 L178,212 L176,238 L152,238 Z', 1.8],
    ['f', '#fffaf0', 'M150,212 L178,212 L177.5,219 L150.5,219 Z', 1],
    ['l', 'M152,222 L176,222', 0.8],
    // Pult.
    ['f', '#c99a62', rect(16, 236, 218, 10), 1.8],
    ['f', '#8c5632', rect(16, 246, 218, 38), 1.6],
    ['l', 'M52,246 V284 M94,246 V284 M136,246 V284 M178,246 V284 M220,246 V284', 0.9],
    ['s', '#e9b030', 'M16,258 H234', 3],
    // Natočený půllitr na tácku s čárkami.
    ['f', '#fffaf0', c(64, 238, 26, 4), 1.2],
    ['s', '#d7442c', c(64, 238, 22, 3), 1.4],
    ['f', '#bcd6e6', 'M78,204 C94,204 94,228 77,228 L77,222 C86,222 86,210 78,210 Z', 1.6],
    ['f', '#e9b030', 'M50,198 L78,198 L76,237 L52,237 Z', 2],
    ['f', '#f2cf4a', `${c(58, 212, 3, 5)} ${c(70, 212, 3, 5)} ${c(58, 226, 3, 5)} ${c(70, 226, 3, 5)}`, 0.7],
    [
      'f',
      '#fffaf0',
      'M46,200 C42,190 50,184 56,188 C60,180 72,182 74,188 C80,186 86,194 81,200 C70,203 56,203 46,200 Z',
      1.8,
    ],
  ],
});

// ─────────────────────────── Babiččina truhla ───────────────────────────

// Babiččina truhla: půda pod krovem, kulaté okénko a sluneční paprsek s prachem; malovaná truhla s tulipány
// je otevřená a vykukuje z ní všechno „na později“: med, povidla, kalendář s pranostikami, úřední razítko, klubko.
const GRANDMAS_CHEST: SceneOp[] = [
  ['f', '#f3e8cf', rect(16, 16, 218, 268), 0],
  // Krov: šikmé podbití a krokve.
  ['f', '#8c5632', 'M16,16 L118,16 L16,162 Z M234,16 L132,16 L234,162 Z', 0],
  [
    'l',
    'M16,40 L35,16 M16,70 L56,16 M16,100 L77,16 M16,130 L98,16 M234,40 L215,16 M234,70 L194,16 M234,100 L173,16 M234,130 L152,16',
    0.9,
  ],
  ['s', '#5a3418', 'M118,16 L16,162 M132,16 L234,162', 9],
  // Okénko a paprsek s prachem.
  ['f', '#f6e3a1', 'M112,74 L138,74 L186,206 L74,206 Z', 0],
  ['f', '#8c5632', c(125, 60, 20), 1.8],
  ['f', '#bcd6e6', c(125, 60, 14), 1.4],
  ['l', 'M111,60 H139 M125,46 V74', 1.6],
  [
    'f',
    '#fffaf0',
    `${c(104, 112, 1.6)} ${c(142, 124, 1.4)} ${c(120, 98, 1.2)} ${c(150, 150, 1.6)} ${c(96, 150, 1.3)}`,
    0.6,
  ],
  // Pavouk na niti.
  ['l', 'M170,74 L170,100 M165,98 l-4,-3 M165,102 l-5,1 M175,98 l4,-3 M175,102 l5,1', 0.9],
  ['f', INK, c(170, 101, 3.5), 0],
  // Věnec cibule a svazek bylinek (babské rady) z krokví.
  ['l', 'M34,66 L34,128', 1.2],
  ['f', '#e9b030', `${c(30, 82, 6, 7)} ${c(39, 94, 6, 7)} ${c(29, 106, 6, 7)} ${c(38, 118, 6, 7)}`, 1.3],
  ['l', 'M30,75 l0,-3 M39,87 l0,-3 M29,99 l0,-3 M38,111 l0,-3', 1],
  ['l', 'M214,62 L214,82', 1.1],
  [
    'f',
    '#5d9a3e',
    'M214,82 C204,92 202,106 206,116 L210,104 L212,118 L216,104 L220,116 C224,106 222,92 214,82 Z',
    1.3,
  ],
  ['s', '#d7442c', 'M209,86 L219,86', 2.4],
  // Podlaha z prken.
  ['f', '#c99a62', rect(16, 232, 218, 52), 1.4],
  [
    'l',
    'M16,248 H234 M16,266 H234 M60,232 L54,248 M150,248 L146,266 M200,232 L198,248 M90,266 L86,284 M190,266 L192,284',
    0.9,
  ],
  // Víko (zevnitř červené s ornamentem).
  ['f', '#d7442c', 'M46,170 L60,106 L190,106 L204,170 Z', 2.2],
  ['l', 'M58,164 L68,114 L182,114 L192,164', 1],
  ['f', '#f2cf4a', heart(140, 119, 6), 1.2],
  // Co se nevyhazuje.
  ['f', '#bcd6e6', 'M60,176 L60,140 L88,140 L88,176 Z', 1.6],
  ['f', '#e9b030', 'M62,176 L62,150 L86,150 L86,176 Z', 0],
  ['f', '#d7442c', 'M56,140 L92,140 L90,130 C82,124 66,124 58,130 Z', 1.4],
  ['l', 'M58,136 L90,136', 1.2],
  ['f', '#fffaf0', rect(92, 116, 32, 46), 1.6],
  ['f', '#d7442c', rect(92, 116, 32, 10), 1.2],
  ['l', 'M96,134 H120 M96,142 H120 M96,150 H120 M104,128 V158 M112,128 V158', 0.7],
  ['f', '#bcd6e6', 'M126,176 L126,144 L152,144 L152,176 Z', 1.6],
  ['f', '#8e3b6e', 'M128,176 L128,152 L150,152 L150,176 Z', 0],
  ['f', '#fffaf0', 'M122,144 L156,144 L156,136 C148,130 130,130 122,136 Z', 1.4],
  ['l', 'M122,140 L156,140', 1],
  ['f', '#8c5632', c(166, 126, 8), 1.4],
  ['f', '#c99a62', rect(162, 133, 8, 20), 1.3],
  ['f', '#5a3418', rect(154, 152, 24, 10), 1.4],
  ['f', '#d7442c', rect(154, 162, 24, 6), 1.2],
  ['f', '#e88a9a', c(192, 162, 13), 1.6],
  [
    'l',
    'M182,154 C188,160 196,164 204,164 M180,162 C188,168 196,170 202,172 M184,170 L208,134 M196,172 L214,142',
    1.1,
  ],
  // Truhla: lem, čelo s malovanými tulipány, kování, zámek.
  ['f', '#2f5fa8', rect(40, 172, 170, 84), 2.4],
  ['f', '#22365c', rect(36, 166, 178, 12), 1.8],
  ['f', '#22365c', `${rect(44, 256, 18, 8)} ${rect(188, 256, 18, 8)}`, 1.4],
  ['f', '#f3e8cf', `${c(84, 216, 30, 26)} ${c(166, 216, 30, 26)}`, 1.4],
  ['l', 'M84,236 L84,214 M166,236 L166,214', 1.4],
  [
    'f',
    '#5d9a3e',
    'M84,232 C76,226 68,228 64,232 C70,238 78,236 84,232 Z M84,232 C92,226 100,228 104,232 C98,238 90,236 84,232 Z M166,232 C158,226 150,228 146,232 C152,238 160,236 166,232 Z M166,232 C174,226 182,228 186,232 C180,238 172,236 166,232 Z',
    1.1,
  ],
  [
    'f',
    '#d7442c',
    'M76,214 C70,204 74,196 78,200 C80,192 88,192 90,200 C94,196 98,204 92,214 Z M158,214 C152,204 156,196 160,200 C162,192 170,192 172,200 C176,196 180,204 174,214 Z',
    1.2,
  ],
  [
    'f',
    '#9a958a',
    'M40,178 L54,178 L40,192 Z M210,178 L196,178 L210,192 Z M40,256 L40,242 L54,256 Z M210,256 L210,242 L196,256 Z',
    1,
  ],
  ['f', '#e9b030', 'M116,190 L134,190 L134,210 L116,210 Z', 1.4],
  ['f', INK, 'M125,196 C121,196 121,202 124,202 L123,206 L127,206 L126,202 C129,202 129,196 125,196 Z', 0],
  ['h', 'M180,172 L210,172 L210,256 L188,256 Z', 0],
  // Háčkovaná dečka přes okraj.
  [
    'f',
    '#fffaf0',
    'M52,166 L96,166 L96,180 Q92,186 88,180 Q84,186 80,180 Q76,186 72,180 Q68,186 64,180 Q60,186 56,180 Q52,186 52,180 Z',
    1.2,
  ],
  ['f', '#22365c', `${c(60, 172, 1.4)} ${c(70, 172, 1.4)} ${c(80, 172, 1.4)} ${c(90, 172, 1.4)}`, 0],
];

// ─────────────────────────── Pivní sommelier ───────────────────────────

/** Měděná varná pánev s kopulí, okénkem a nýty (x0–x1, dno 240). */
function kettle(x0: number, x1: number, top: number, pipeX: number): SceneOp[] {
  const mid = (x0 + x1) / 2;
  const pipe = `M${pipeX},${top + 8} L${pipeX},62 L${pipeX + (pipeX < 125 ? 30 : -30)},62`;
  return [
    ['l', pipe, 10],
    ['s', '#ef8a2e', pipe, 6],
    [
      'f',
      '#ef8a2e',
      `M${x0},244 L${x0},${top + 34} C${x0 + 8},${top} ${x1 - 8},${top} ${x1},${top + 34} L${x1},244 Z`,
      2,
    ],
    ['f', '#e8603a', rect(x0, top + 32, x1 - x0, 10), 1.4],
    ['f', INK, join([0.15, 0.38, 0.62, 0.85].map((t) => c(x0 + (x1 - x0) * t, top + 37, 1.3))), 0],
    ['f', '#bcd6e6', c(mid, top + 70, 11), 1.6],
    ['l', `M${mid - 6},${top + 66} L${mid + 2},${top + 62}`, 1],
  ];
}

/** Chmelová šištice (svěšená). */
const hop = (x: number, y: number): string =>
  `M${x},${y - 6} C${x + 6},${y - 4} ${x + 6},${y + 6} ${x},${y + 11} C${x - 6},${y + 6} ${x - 6},${y - 4} ${x},${y - 6} Z`;

// Pivní sommelier: ve varně mezi měděnými pánvemi pod chmelovou girlandou, motýlek a vesta, na řetízku degustační
// mistička; zvedá tulipánovou sklenici proti světlu a na prkénku má čtyři vzorky — ležák, polotmavé, tmavé
// a řezané; u čtvrtého už přetéká pěna (a nos rudne).
const SOMMELIER_HOPS: [number, number][] = [
  [104, 46],
  [130, 54],
  [156, 56],
  [182, 52],
  [208, 44],
];

const SOMMELIER_BACKDROP: SceneOp[] = [
  ['l', 'M16,100 H234 M16,140 H234 M16,180 H234 M60,100 V220 M100,100 V140 M150,100 V140 M190,100 V220', 0.6],
  ...kettle(16, 82, 120, 42),
  ...kettle(168, 234, 116, 206),
  ['s', '#2f6b3a', 'M88,34 C130,62 190,60 234,32', 2.4],
  ['f', '#5d9a3e', join(SOMMELIER_HOPS.map(([x, y]) => hop(x, y))), 1.3],
  ['l', join(SOMMELIER_HOPS.map(([x, y]) => `M${x - 3},${y} l6,0 M${x - 3},${y + 4} l6,0`)), 0.8],
  [
    'f',
    '#2f6b3a',
    'M116,48 C112,40 120,34 124,40 C126,32 136,36 132,44 Z M170,56 C166,48 174,42 178,48 C180,40 190,44 186,52 Z',
    1.1,
  ],
];

const SOMMELIER_OUTFIT: SceneOp[] = [
  // Řetízek s degustační mističkou a motýlek.
  ['s', '#e9b030', 'M112,214 C110,232 118,242 125,244 C132,242 140,232 138,214', 1.6],
  ['f', '#d9d2c2', 'M117,246 C117,256 133,256 133,246 Z', 1.3],
  ['l', 'M120,249 C122,251 128,251 130,249', 0.8],
  ['f', '#d7442c', 'M110,216 L125,224 L140,216 L140,232 L125,224 L110,232 Z', 1.4],
];

/** Vzorek piva na prkénku: sklenička, barva piva, pěna. */
function sample(x: number, beer: string, foam: string): SceneOp[] {
  return [
    ['f', beer, `M${x - 9},224 L${x + 9},224 L${x + 7},250 L${x - 7},250 Z`, 1.6],
    ['f', '#fffaf0', foam, 1.3],
  ];
}

const SOMMELIER_EXTRA: SceneOp[] = [
  // Tulipánová sklenice proti světlu.
  [
    'f',
    '#bcd6e6',
    'M174,146 C166,162 166,190 178,200 C184,205 192,205 198,200 C210,190 210,162 202,146 Z',
    2,
  ],
  [
    'f',
    '#e9b030',
    'M170,166 C168,184 172,196 180,201 C185,204 191,204 196,201 C204,196 208,184 206,166 Z',
    0,
  ],
  [
    'f',
    '#fffaf0',
    'M169,167 C170,159 178,157 184,160 C188,155 198,156 200,161 C206,160 208,165 207,167 Z',
    1.2,
  ],
  ['s', '#fffaf0', 'M174,172 C172,182 174,190 178,195', 2],
  ['l', 'M174,146 C166,162 166,190 178,200 C184,205 192,205 198,200 C210,190 210,162 202,146', 1.8],
  ['f', '#bcd6e6', 'M186,204 L190,204 L190,228 L186,228 Z', 1.4],
  ['f', '#bcd6e6', c(188, 229, 12, 3), 1.4],
  ...hand(188, 218),
  // Degustační prkénko se čtyřmi vzorky: ležák, polotmavé, tmavé, řezané (s přetékající pěnou).
  ['f', '#8c5632', 'M20,250 L108,250 L108,260 L20,260 Z M108,252 L122,252 L122,258 L108,258 Z', 1.6],
  ...sample(32, '#f2cf4a', 'M22,226 C22,218 42,218 42,226 Z'),
  ...sample(53, '#ef8a2e', 'M43,226 C43,217 63,217 63,226 Z'),
  ...sample(74, '#5a3418', 'M64,226 C62,216 86,216 84,226 Z'),
  ['f', '#5a3418', 'M86,238 L104,238 L102,250 L88,250 Z', 1.6],
  ['f', '#f2cf4a', 'M86,224 L104,224 L103,238 L87,238 Z', 1.6],
  [
    'f',
    '#fffaf0',
    'M81,226 C77,218 83,208 91,212 C93,202 107,204 107,214 C113,214 115,222 109,226 L107,238 C105,240 104,236 104,230 L86,230 C85,236 83,238 82,234 Z',
    1.4,
  ],
];

// ─────────────────────────── Archivář ───────────────────────────

/** Řada archivních krabic na polici (šířky a barvy), mezera = chybějící originál. */
const SHELF_ROWS: readonly { y: number; boxes: readonly (readonly [number, string])[] }[] = [
  {
    y: 70,
    boxes: [
      [26, '#f3e8cf'],
      [24, '#c99a62'],
      [28, '#9a958a'],
      [26, '#f3e8cf'],
      [24, '#c99a62'],
      [28, '#f3e8cf'],
      [26, '#9a958a'],
      [28, '#c99a62'],
    ],
  },
  {
    y: 124,
    boxes: [
      [28, '#9a958a'],
      [26, '#f3e8cf'],
      [24, '#c99a62'],
      [26, '#f3e8cf'],
      [28, '#9a958a'],
      [24, '#c99a62'],
      [0, ''],
      [26, '#f3e8cf'],
    ],
  },
  {
    y: 178,
    boxes: [
      [24, '#c99a62'],
      [28, '#f3e8cf'],
      [26, '#9a958a'],
      [28, '#c99a62'],
      [24, '#f3e8cf'],
      [26, '#9a958a'],
      [28, '#c99a62'],
      [24, '#f3e8cf'],
    ],
  },
];

/** Regály plné krabic: krabice po barvách v jedné cestě, štítky a úchyty taky. */
function shelves(): SceneOp[] {
  const byColor = new Map<string, string[]>();
  const labels: string[] = [];
  const holes: string[] = [];
  const boards: string[] = [];
  for (const row of SHELF_ROWS) {
    let x = 18;
    for (const [w, col] of row.boxes) {
      if (w === 0) {
        x += 26;
        continue;
      }
      const top = row.y - 40;
      const list = byColor.get(col) ?? [];
      list.push(rect(x, top, w - 2, 40));
      byColor.set(col, list);
      labels.push(rect(x + 4, top + 8, w - 10, 9));
      holes.push(c(x + (w - 2) / 2, top + 30, 2.6, 1.8));
      x += w;
    }
    boards.push(rect(16, row.y, 218, 6));
  }
  const ops: SceneOp[] = [];
  for (const [col, list] of byColor) ops.push(['f', col, join(list), 1.1]);
  ops.push(['f', '#fffaf0', join(labels), 0.7]);
  ops.push(['f', INK, join(holes), 0]);
  ops.push(['f', '#8c5632', join(boards), 1.3]);
  return ops;
}

// Archivář: mezi regály s krabicemi (na regálu číslo 47 jedna krabice chybí — „regál mlčí“), pod zelenou lampou;
// šedý plášť, rukávník, tužky v kapse, kartotéka; drží spis i jeho kopii přes modrý kopírák (kopíruje souseda).
const ARCHIVIST_BACKDROP: SceneOp[] = [
  ...shelves(),
  // Chybějící krabice: jen prach a obrys.
  ['l', 'M178,84 h22 v40 h-22 Z', 0.6],
  // Smaltovaná cedulka 47 pod polici.
  ['f', '#fffaf0', rect(176, 130, 26, 15), 1.3],
  ['l', 'M184,133 L180,140 L187,140 M185.5,134 L185.5,143 M191,133 L198,133 L193,143', 1.3],
  // Lampa.
  ['l', 'M125,16 L125,30', 1.4],
  ['f', '#2f6b3a', 'M106,48 C106,37 114,30 125,30 C136,30 144,37 144,48 Z', 1.6],
  ['f', '#f6e3a1', 'M118,48 C118,54 132,54 132,48 Z', 1.2],
];

const ARCHIVIST_OUTFIT: SceneOp[] = [['l', 'M108,212 L118,248 L114,284 M142,212 L132,248 L136,284', 1.3]];

const ARCHIVIST_EXTRA: SceneOp[] = [
  // Tužka za uchem.
  ['f', '#f2cf4a', 'M148,146 L168,132 L171,136 L151,150 Z', 1.2],
  ['f', '#e88a9a', 'M168,132 L172,129 L175,133 L171,136 Z', 1],
  ['f', '#c99a62', 'M148,146 L143,151 L151,150 Z', 0.9],
  // Kopie (vzadu), kopírák, originál s tkanicí a štítkem.
  ['f', '#c99a62', 'M152,184 L202,178 L208,230 L158,236 Z', 1.8],
  ['f', '#2f5fa8', 'M148,188 L198,182 L203,226 L153,232 Z', 1],
  ['f', '#fffaf0', 'M146,190 L196,184 L200,224 L150,230 Z', 1],
  ['f', '#c99a62', 'M142,194 L192,188 L198,240 L148,246 Z', 2],
  ['s', '#d7442c', 'M167,191 L173,243', 2.2],
  ['f', '#fffaf0', 'M152,204 L182,200 L184,216 L154,220 Z', 1.2],
  ['i', 'jester-hat', 160, 199, 18, '#6b4a9e'],
  // Rukávník a ruka.
  ['f', INK, 'M162,252 L184,244 L204,266 L178,268 Z', 1],
  ...hand(174, 246),
  // Kartotéka s lístky.
  [
    'f',
    '#fffaf0',
    'M38,236 L40,218 L52,218 L52,236 Z M54,236 L56,214 L66,214 L66,236 Z M70,236 L70,220 L84,220 L84,236 Z',
    1.2,
  ],
  ['f', '#8c5632', 'M30,232 L104,232 L104,284 L30,284 Z', 1.8],
  ['f', '#c99a62', rect(36, 238, 62, 24), 1.4],
  ['f', '#e9b030', rect(56, 242, 22, 9), 1.1],
  ['l', 'M60,254 C60,260 74,260 74,254', 1.6],
];

// ─────────────────────────── Kouzelník z pouti ───────────────────────────

/** Pruhovaná lambrekýna stanu: střídavé cípy (barva podle sudé / liché). */
function valance(odd: boolean): string {
  const w = 218 / 8;
  const parts: string[] = [];
  for (let i = odd ? 1 : 0; i < 8; i += 2) {
    const x0 = 16 + i * w;
    const x1 = x0 + w;
    parts.push(`M${r1(x0)},16 L${r1(x1)},16 L${r1(x1)},40 Q${r1((x0 + x1) / 2)},56 ${r1(x0)},40 Z`);
  }
  return join(parts);
}

/** Žárovky na šňůře (kvadratická křivka 16,64 → 125,82 → 234,64). */
const BULBS = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92].map((t) => {
  const u = 1 - t;
  return [u * u * 16 + 2 * u * t * 125 + t * t * 234, u * u * 64 + 2 * u * t * 82 + t * t * 64] as const;
});

// Kouzelník z pouti: v poutním stanu se žárovkami a hvězdami, cylindr a plášť s vysokým červeným límcem;
// hůlka jiskří, z převráceného klobouku vykukuje králík, z rukávu leze eso ♠ a z kapsy čouhá cizí stovka.
const MAGICIAN_BACKDROP: SceneOp[] = [
  [
    'f',
    '#f2cf4a',
    join([star4(42, 108, 7), star4(200, 98, 8), star4(218, 160, 6), star4(28, 160, 5), star4(150, 88, 4)]),
    0.9,
  ],
  ['f', '#d7442c', valance(false), 1.4],
  ['f', '#fffaf0', valance(true), 1.4],
  ['l', 'M16,64 Q125,100 234,64', 1.1],
  [
    'f',
    '#f2cf4a',
    join(BULBS.map(([x, y]) => c(Math.round(x * 10) / 10, Math.round(y * 10) / 10 + 5, 4.5, 5.5))),
    1.1,
  ],
  // Vysoký límec pláště za hlavou.
  [
    'f',
    '#d7442c',
    'M86,214 C70,186 64,152 72,126 C88,146 100,168 110,190 L140,190 C150,168 162,146 178,126 C186,152 180,186 164,214 Z',
    2,
  ],
  ['l', 'M84,200 C78,180 76,160 78,140 M166,200 C172,180 174,160 172,140', 1],
];

const MAGICIAN_OUTFIT: SceneOp[] = [
  // Červená podšívka na klopách pláště a kapsa s cizí stovkou.
  [
    'f',
    '#d7442c',
    'M100,212 L112,240 L100,284 L86,284 C88,250 92,228 100,212 Z M150,212 L138,240 L150,284 L164,284 C162,250 158,228 150,212 Z',
    1.4,
  ],
];

const MAGICIAN_EXTRA: SceneOp[] = [
  // Z rukávu leze cizí stovka a eso, hůlka jiskří.
  ['f', '#5d9a3e', 'M70,244 L90,226 L104,240 L84,258 Z', 1.2],
  ['l', c(87, 242, 4.5), 0.9],
  ['f', '#fffaf0', 'M74,236 L90,232 L96,254 L80,258 Z', 1.3],
  ['f', INK, spade(85, 245, 4), 0],
  ['s', INK, 'M68,230 L36,176', 4],
  ['s', '#fffaf0', 'M40,183 L35,174', 4],
  ['f', '#f2cf4a', join([star4(30, 164, 8), star4(48, 158, 5), star4(22, 184, 4)]), 1],
  ...hand(66, 232),
  // Převrácený cylindr s králíkem.
  ['f', INK, c(188, 196, 24, 6), 1.4],
  [
    'f',
    '#fffaf0',
    'M176,184 C168,164 168,144 174,134 C180,144 182,164 182,182 Z M196,182 C196,162 200,144 208,136 C212,148 208,166 202,184 Z',
    1.6,
  ],
  [
    'f',
    '#e88a9a',
    'M176,178 C172,164 172,150 174,144 C177,152 178,166 179,178 Z M199,178 C200,164 203,152 206,146 C207,154 205,168 201,178 Z',
    0,
  ],
  ['f', '#fffaf0', c(188, 186, 14, 11), 1.8],
  ['f', INK, `${c(183, 183, 1.8)} ${c(193, 183, 1.8)}`, 0],
  ['f', '#e88a9a', c(188, 189, 2.4, 1.8), 0.8],
  ['l', 'M180,191 l-8,-1 M180,193 l-8,2 M196,191 l8,-1 M196,193 l8,2', 0.7],
  ['f', '#22365c', 'M164,198 L170,250 L206,250 L212,198 Z', 2],
  ['f', '#d7442c', 'M165,204 L211,204 L210,212 L166,212 Z', 1.2],
  ['l', 'M162,198 C170,203 206,203 214,198', 1.8],
  ...hand(188, 254),
];

// ─────────────────────────── Export ───────────────────────────

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  mushroom_picker: {
    bg: '#c6dcae',
    motif: 'none',
    body: '#8a8f2e',
    collar: 'shirt',
    female: true,
    hair: 'none',
    hat: 'scarf',
    hatColor: '#2f5fa8',
    mood: 'grin',
    prop: undefined,
    backdrop: MUSHROOM_BACKDROP,
    outfit: MUSHROOM_OUTFIT,
    extra: MUSHROOM_EXTRA,
  },
  impersonator: {
    bg: '#22365c',
    motif: 'none',
    body: '#2f3542',
    collar: 'bow',
    accent: '#d7442c',
    hair: 'part',
    hairColor: '#2f2a26',
    beard: undefined,
    mood: 'sly',
    prop: undefined,
    backdrop: IMPERSONATOR_BACKDROP,
    outfit: rainbowLapels(),
    extra: IMPERSONATOR_EXTRA,
  },
  beer_sommelier: {
    bg: '#f3e8cf',
    motif: 'none',
    body: '#22365c',
    collar: 'vest',
    accent: '#c99a62',
    hair: 'part',
    hairColor: '#9a958a',
    beard: 'goatee',
    beardColor: '#9a958a',
    redNose: true,
    mood: 'sly',
    prop: undefined,
    backdrop: SOMMELIER_BACKDROP,
    outfit: SOMMELIER_OUTFIT,
    extra: SOMMELIER_EXTRA,
  },
  archivist: {
    bg: '#d9d2c2',
    motif: 'none',
    body: '#9a958a',
    collar: 'tie',
    accent: '#22365c',
    hair: 'bald',
    hairColor: '#d9d2c2',
    glasses: true,
    beard: 'beard',
    beardColor: '#d9d2c2',
    mood: 'flat',
    prop: undefined,
    backdrop: ARCHIVIST_BACKDROP,
    outfit: ARCHIVIST_OUTFIT,
    extra: ARCHIVIST_EXTRA,
  },
  fair_magician: {
    bg: '#6b4a9e',
    motif: 'none',
    body: '#22365c',
    collar: 'bow',
    accent: '#f2cf4a',
    hatColor: '#22365c',
    hatAccent: '#d7442c',
    prop: undefined,
    backdrop: MAGICIAN_BACKDROP,
    outfit: MAGICIAN_OUTFIT,
    extra: MAGICIAN_EXTRA,
  },
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  'j-social_bubble': SOCIAL_BUBBLE,
  snehulak: SNOWMAN,
  hostinsky: INNKEEPER,
  truhla: GRANDMAS_CHEST,
};

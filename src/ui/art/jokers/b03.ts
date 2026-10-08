/**
 * Obrázky žolíků — dávka 03 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - tobacconist — Trafikant: portrét `fig-tobacconist` (FIGURES['tobacconist'])
 *  - ticket_inspector — Revizor: portrét `fig-ticket_inspector` (FIGURES['ticket_inspector'])
 *  - doorman — Vrátný: portrét `fig-doorman` (FIGURES['doorman'])
 *  - goldsmith — Pozlacovač: portrét `fig-goldsmith` (FIGURES['goldsmith'])
 *  - paver — Dlaždič: portrét `fig-paver` (FIGURES['paver'])
 *  - postman — Pošťák: portrét `fig-postman` (FIGURES['postman'])
 *  - grocer — Hokynář: portrét `fig-grocer` (FIGURES['grocer'])
 *  - grill_dad — Táta u grilu: portrét `fig-grill_dad` (FIGURES['grill_dad'])
 *  - teacher — Učitelka: portrét `fig-teacher` (FIGURES['teacher'])
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

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
function hand(x: number, y: number, deg = 0): SceneOp[] {
  return [
    ['f', SKIN, c(x, y, 11, 9), 1.8],
    ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', x, y, 1, deg), 1.1],
  ];
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

/** Čtyřcípá jiskra. */
const STAR4 = 'M0,-10 Q1.5,-1.5 10,0 Q1.5,1.5 0,10 Q-1.5,1.5 -10,0 Q-1.5,-1.5 0,-10 Z';
/** Pěticípá hvězdička (poloměr 10). */
const STAR5 =
  'M0,-10 L2.4,-3.3 L9.5,-3.1 L3.9,1.3 L5.9,8.1 L0,4.1 L-5.9,8.1 L-3.9,1.3 L-9.5,-3.1 L-2.4,-3.3 Z';
/** Srdíčko (výška ~36 při s = 1). */
const HEART =
  'M0,16 C-10,8 -20,0 -20,-8 C-20,-16 -14,-20 -9,-20 C-4,-20 -1,-17 0,-13 C1,-17 4,-20 9,-20 C14,-20 20,-16 20,-8 C20,0 10,8 0,16 Z';
/** Korunka (šířka 22, výška 14, střed dole uprostřed). */
const CROWN = 'M-11,0 L-11,-11 L-5.5,-5 L0,-14 L5.5,-5 L11,-11 L11,0 Z';

/** Číslice psané křídou (výška 10, šířka ~7, počátek vlevo nahoře). */
const DIGITS: Readonly<Record<string, string>> = {
  '0': 'M3.5,0 C-1,0 -1,10 3.5,10 C8,10 8,0 3.5,0 Z',
  '1': 'M1,2.2 L4,0 L4,10',
  '2': 'M0,2.6 C0,-0.6 7,-0.8 7,3 C7,6 0,8 0,10 L7.5,10',
  '4': 'M5.5,10 L5.5,0 L0,6.6 L7.6,6.6',
  '6': 'M6,0.4 C2,0.4 0,4 0,7 C0,10.6 6.6,10.6 6.6,7 C6.6,4 1,4 0,7',
  '7': 'M0,0 L7,0 L2.5,10',
  '8': 'M3.5,0 C0,0 0,4.6 3.5,4.6 C7,4.6 7,0 3.5,0 Z M3.5,4.6 C-0.6,4.6 -0.6,10 3.5,10 C7.6,10 7.6,4.6 3.5,4.6 Z',
};
/** Řádek číslic křídou od bodu x, y (velikost s = výška / 10). */
const chalk = (text: string, x: number, y: number, s: number, gap = 1.6): string =>
  [...text]
    .map((ch, i) => (DIGITS[ch] ? place(DIGITS[ch], x + i * 7 * s * gap, y, s) : ''))
    .filter(Boolean)
    .join(' ');

/** Pult přes spodek obrázku (postava stojí za ním): deska, hrana a svislá prkna. */
function counter(top: number, wood: string, edge: string): SceneOp[] {
  return [
    ['f', wood, rect(16, top + 6, 218, 284 - top - 6), 1.8],
    ['h', rect(16, top + 6, 218, 8), 0],
    ['f', edge, rect(16, top, 218, 7), 1.6],
    ['l', `M64,${top + 8} V284 M120,${top + 8} V284 M176,${top + 8} V284`, 0.8],
  ];
}

// ─────────────────────────── Trafikant ───────────────────────────

/** Markýza trafiky: střídavé pruhy s obloučky dole. */
function awning(): SceneOp[] {
  const w = 218 / 9;
  const stripe = (i: number): string => {
    const x0 = 16 + i * w;
    const x1 = x0 + w;
    return `M${r1(x0)},16 L${r1(x1)},16 L${r1(x1)},54 C${r1(x1 - w * 0.2)},63 ${r1(x0 + w * 0.2)},63 ${r1(x0)},54 Z`;
  };
  const idx = [...Array(9).keys()];
  return [
    [
      'f',
      '#d7442c',
      idx
        .filter((i) => i % 2 === 0)
        .map(stripe)
        .join(' '),
      1.4,
    ],
    [
      'f',
      '#fffaf0',
      idx
        .filter((i) => i % 2 === 1)
        .map(stripe)
        .join(' '),
      1.4,
    ],
  ];
}

/** Krabičky cigaret na polici (x levých hran, horní hrana y). */
const packs = (xs: readonly number[], y: number): string => xs.map((x) => rect(x, y, 9, 18)).join(' ');
const packBands = (xs: readonly number[], y: number): string =>
  xs.map((x) => rect(x + 1, y + 3, 7, 3)).join(' ');

/** Noviny v ruce (místní souřadnice kolem středu, natočené). */
const PAPER = { x: 186, y: 214, deg: 8 } as const;
const paper = (d: string): string => place(d, PAPER.x, PAPER.y, 1, PAPER.deg);

// ─────────────────────────── Revizor ───────────────────────────

/** Řetízek z oček podél kvadratické křivky. */
function chain(
  p0: readonly [number, number],
  p1: readonly [number, number],
  p2: readonly [number, number],
  n: number,
): string {
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push(
      c(
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        2.1,
        1.6,
      ),
    );
  }
  return out.join(' ');
}

/** Kartička figury (král, dáma, kluk) s korunkou, nožkami a znakem barvy. */
function cardFolk(xs: readonly number[], y: number): SceneOp[] {
  return [
    [
      'l',
      xs
        .map((x) => `M${x + 3},${y + 16} L${x + 2},${y + 22} M${x + 8},${y + 16} L${x + 10},${y + 22}`)
        .join(' '),
      1.1,
    ],
    ['f', '#fffaf0', xs.map((x) => rect(x, y, 11, 16)).join(' '), 1.1],
    ['f', '#f2cf4a', xs.map((x) => place(CROWN, x + 5.5, y, 0.42)).join(' '), 0.7],
    [
      'f',
      '#d7442c',
      xs
        .filter((_, i) => i !== 1)
        .map((x) => place(HEART, x + 5.5, y + 8.5, 0.13))
        .join(' '),
      0,
    ],
    [
      'f',
      'dark',
      xs
        .filter((_, i) => i === 1)
        .map((x) => c(x + 5.5, y + 8.5, 2.2))
        .join(' '),
      0,
    ],
  ];
}

// ─────────────────────────── Vrátný ───────────────────────────

/** Klíč visící na háčku (hlava s očkem nahoře na 0,0). */
const KEY =
  'M0,-3.6 C-2.4,-3.6 -3.6,-1.8 -3.6,0 C-3.6,2 -2.4,3.2 -1,3.6 L-1,15 L-1,15 L1,15 L1,13 L3,13 L3,11 L1,11 L1,9.6 L3,9.6 L3,7.6 L1,7.6 L1,3.6 C2.4,3.2 3.6,2 3.6,0 C3.6,-1.8 2.4,-3.6 0,-3.6 Z';
/** Otevřená dlaň „Stůj!“ (zápěstí dole na y +20, palec vlevo). */
const PALM =
  'M-9,20 L-11,6 C-15,2 -19,-2 -22,-7 C-24,-11 -19,-14 -16,-11 L-11,-5 L-11,-25 C-11,-30 -5,-30 -5,-25 L-5,-29 C-5,-34 1,-34 1,-29 L1,-27 C1,-32 7,-32 7,-27 L7,-21 C7,-25 12,-25 12,-21 L12,4 C12,12 10,16 9,20 Z';

// ─────────────────────────── Pozlacovač ───────────────────────────

/** Štětec v ruce (místní souřadnice: ruka na 0,0, štětec míří nahoru). */
const BRUSH = { x: 186, y: 252, deg: 22 } as const;
const brush = (d: string): string => place(d, BRUSH.x, BRUSH.y, 1, BRUSH.deg);
const leaf = (x: number, y: number, deg: number): string => place('M-5,-4 L5,-5 L6,4 L-4,5 Z', x, y, 1, deg);

// ─────────────────────────── Dlaždič ───────────────────────────

/**
 * Mozaiková dlažba v perspektivě (úběžník na obzoru za hlavou): kostky k obzoru menší a spáry se sbíhají;
 * tmavé kostky tvoří vlnu jako pražská mozaika.
 */
function mosaic(): SceneOp[] {
  const HZ = 150;
  const VX = 125;
  const K = 0.105;
  const rows = 11;
  const uFar = 1 / (197 - HZ);
  const uNear = 1 / (284 - HZ);
  const rowY = (i: number): number => HZ + 1 / (uFar - ((uFar - uNear) * i) / rows);
  const light: string[] = [];
  const dark: string[] = [];
  for (let i = 0; i < rows; i++) {
    const y0 = rowY(i);
    const y1 = rowY(i + 1);
    const off = i % 2 ? 0.5 : 0;
    for (let j = -60; j <= 60; j++) {
      const xs = (y: number, t: number): number => VX + (j + off + t) * K * (y - HZ);
      // Kostka zmenšená ke středu (spára), okraje oříznuté na okno obrázku.
      const sh = 0.13;
      const ya = y0 + (y1 - y0) * sh;
      const yb = y1 - (y1 - y0) * sh;
      const q = [xs(ya, sh), xs(ya, 1 - sh), xs(yb, 1 - sh), xs(yb, sh)].map((x) =>
        Math.min(234, Math.max(16, x)),
      );
      if (q[1]! - q[0]! < 1 || q[2]! - q[3]! < 1) continue;
      const wave = 5 + 2.4 * Math.sin(j * 0.42);
      (Math.abs(i - wave) < 0.8 ? dark : light).push(
        `M${r1(q[0]!)},${r1(ya)} L${r1(q[1]!)},${r1(ya)} L${r1(q[2]!)},${r1(yb)} L${r1(q[3]!)},${r1(yb)} Z`,
      );
    }
  }
  return [
    ['f', '#9a958a', rect(16, 196, 218, 88), 1.4],
    ['f', '#d9d2c2', light.join(' '), 0.5],
    ['f', '#5b5850', dark.join(' '), 0.5],
  ];
}

/** Hromada žulových kostek (levý dolní roh, před postavou): po řadách boky, vršky a čela. */
function cubePile(): SceneOp[] {
  const rows = [[18, 31, 44, 57], [24.5, 37.5, 50.5], [31, 44], [37.5]];
  return rows.flatMap((xs, r): SceneOp[] => {
    const y = 271 - r * 13;
    return [
      [
        'f',
        '#5b5850',
        xs
          .map((x) => `M${x + 13},${y} L${x + 17},${y - 4} L${x + 17},${y + 9} L${x + 13},${y + 13} Z`)
          .join(' '),
        1,
      ],
      [
        'f',
        '#d9d2c2',
        xs.map((x) => `M${x},${y} L${x + 4},${y - 4} L${x + 17},${y - 4} L${x + 13},${y} Z`).join(' '),
        1,
      ],
      ['f', '#9a958a', xs.map((x) => rect(x, y, 13, 13)).join(' '), 1.3],
    ];
  });
}

/** Dlaždičské kladivo v ruce (místní souřadnice: ruka na 0,0, násada nahoru). */
const HAMMER = { x: 186, y: 256, deg: 14 } as const;
const hammer = (d: string): string => place(d, HAMMER.x, HAMMER.y, 1, HAMMER.deg);

// ─────────────────────────── Pošťák ───────────────────────────

const LETTER = { x: 188, y: 222, deg: -10 } as const;
const letter = (d: string): string => place(d, LETTER.x, LETTER.y, 1, LETTER.deg);

/** Domovní schránky 3 × 3 (levé horní rohy). */
const BOXES = [0, 1, 2].flatMap((r) => [0, 1, 2].map((k) => [22 + k * 25, 66 + r * 32] as const));

// ─────────────────────────── Táta u grilu ───────────────────────────

/** Buřt s naříznutými konci (místní, délka 28). */
const SAUSAGE = 'M-14,-4 C-14,-8 14,-8 14,-4 L14,4 C14,8 -14,8 -14,4 Z';
const SAUSAGE_CUTS = 'M-14,-3 L-10,0 L-14,3 M14,-3 L10,0 L14,3';

/** Steak (místní, ~36 × 22). */
const STEAK = 'M-18,-3 C-18,-11 4,-14 13,-9 C19,-5 20,5 12,9 C2,13 -18,9 -18,-3 Z';

/** Obracečka v ruce (místní souřadnice: ruka na 0,0, čepel nahoře). */
const SPAT = { x: 194, y: 222, deg: 24 } as const;
const spat = (d: string): string => place(d, SPAT.x, SPAT.y, 1, SPAT.deg);

// ─────────────────────────── Úpravy portrétů ───────────────────────────

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  // Trafikant: v okénku stánku s markýzou, regály cigaret, časopisy na kolíčcích, losy a teploměr; bez ptaní
  // hlásí předpověď (bublina se sluncem a mrakem), noviny v ruce, cigareta za uchem, štos novin na pultu.
  tobacconist: {
    bg: '#2f6b3a',
    motif: 'none',
    body: '#8c5632',
    accent: '#22365c',
    mood: 'sly',
    prop: undefined,
    backdrop: [
      // Okénko s regály.
      ['f', '#f6e3a1', rect(50, 62, 150, 200), 2],
      ['f', '#c99a62', `${rect(50, 104, 150, 6)} ${rect(50, 150, 150, 6)}`, 1.2],
      ['f', '#d7442c', packs([54, 84, 167], 86), 1],
      ['f', '#fffaf0', packs([64, 177], 86), 1],
      ['f', '#22365c', packs([74, 157, 187], 86), 1],
      ['f', '#fffaf0', packBands([54, 84, 167, 74, 157, 187], 86), 0],
      ['f', '#d7442c', packBands([64, 177], 86), 0],
      // Časopisy na spodní polici.
      ['f', '#6fa0c8', rect(54, 138, 38, 12), 1.1],
      ['f', '#e88a9a', rect(58, 129, 30, 9), 1.1],
      // Losy na provázku.
      ['l', 'M66,156 L66,162', 1],
      ['f', '#f2cf4a', rect(57, 162, 18, 60), 1.2],
      ['l', 'M57,177 h18 M57,192 h18 M57,207 h18', 0.7],
      ['f', '#d7442c', [169.5, 184.5, 199.5, 214.5].map((y) => place(STAR5, 66, y, 0.45)).join(' '), 0],
      // Časopisy na kolíčcích po stranách a teploměr.
      ['f', '#e88a9a', rect(20, 74, 26, 34), 1.3],
      ['f', '#6fa0c8', rect(20, 120, 26, 34), 1.3],
      ['f', '#f2cf4a', rect(204, 74, 26, 34), 1.3],
      ['f', '#fffaf0', `${rect(22, 77, 22, 6)} ${rect(22, 123, 22, 6)} ${rect(206, 77, 22, 6)}`, 0],
      ['f', '#f2b38c', `${c(33, 96, 6)} ${c(217, 96, 6)}`, 1],
      ['l', 'M24,136 h18 M24,141 h18 M24,146 h12', 0.8],
      ['f', '#9a958a', `${rect(30, 70, 6, 7)} ${rect(30, 116, 6, 7)} ${rect(214, 70, 6, 7)}`, 0.9],
      ['f', '#fffaf0', 'M29,172 C29,168 37,168 37,172 L37,226 L29,226 Z', 1.3],
      ['f', '#d7442c', `${rect(31.5, 192, 3, 36)} ${c(33, 230, 6.5)}`, 1.2],
      ['l', 'M37,180 h-3 M37,190 h-3 M37,200 h-3 M37,210 h-3 M37,220 h-3', 0.8],
      ...awning(),
      // Bublina s předpovědí: slunce za mrakem a přeháňky.
      [
        'f',
        '#fffaf0',
        'M174,114 L216,114 C223,114 228,119 228,126 L228,148 C228,155 223,160 216,160 L180,160 L158,174 L168,159 C164,157 162,153 162,148 L162,126 C162,119 167,114 174,114 Z',
        1.8,
      ],
      ['f', '#f2cf4a', c(181, 130, 7), 1.2],
      ['l', 'M168,130 L171,130 M172,121 L174,123 M181,117 L181,120 M190,121 L188,123', 1.2],
      [
        'f',
        '#bcd6e6',
        place(
          'M-14,6 C-20,6 -20,-2 -14,-3 C-14,-10 -4,-12 -1,-6 C2,-12 12,-11 12,-3 C18,-3 19,6 13,6 Z',
          204,
          138,
          1.05,
        ),
        1.3,
      ],
      ['s', '#2f5fa8', 'M196,149 L194,155 M204,149 L202,155 M212,149 L210,155', 2],
    ],
    extra: [
      // Cigareta za uchem.
      ['s', '#fffaf0', 'M101,146 L89,142', 4],
      ['s', '#ef8a2e', 'M89,142 L84.5,140.5', 4],
      ...counter(240, '#c99a62', '#8c5632'),
      // Štos novin a miska na drobné.
      ['f', '#fffaf0', 'M22,232 L84,232 L86,241 L22,241 Z', 1.2],
      ['f', '#f3e8cf', 'M24,226 L82,226 L84,232 L22,232 Z', 1.2],
      ['f', '#fffaf0', 'M26,220 L80,220 L82,226 L24,226 Z', 1.2],
      ['l', 'M30,224 h20 M30,236 h30 M60,229 h16', 0.7],
      ['s', '#d7442c', 'M54,219 L55,241', 1.6],
      ['f', '#9a958a', c(108, 240, 15, 4.5), 1.2],
      ['f', '#e9b030', `${c(103, 237, 3.2, 2.2)} ${c(111, 236, 3.2, 2.2)}`, 0.8],
      // Noviny v ruce.
      ['f', '#fffaf0', paper('M-26,-34 L26,-34 L26,34 L-26,34 Z'), 1.8],
      ['f', 'dark', paper('M-22,-30 L22,-30 L22,-22 L-22,-22 Z'), 0],
      ['f', '#bcd6e6', paper('M4,-17 L22,-17 L22,0 L4,0 Z'), 1],
      ['f', '#f2cf4a', paper('M10,-9 C10,-13 16,-13 16,-9 C16,-5 10,-5 10,-9 Z'), 0.7],
      [
        'l',
        paper(
          'M0,-18 L0,34 M-22,-16 L-4,-16 M-22,-11 L-4,-11 M-22,-6 L-4,-6 M-22,-1 L-4,-1 M-22,4 L-8,4 M-22,12 L-4,12 M-22,17 L-4,17 M-22,22 L-10,22 M4,6 L22,6 M4,11 L22,11 M4,16 L22,16 M4,21 L16,21',
        ),
        0.8,
      ],
      ...hand(181, 250, 8),
    ],
  },

  // Revizor: v civilu (kožená bunda, knír, potutelný úsměv) svírá v pěsti odznak na řetízku; tramvaj s madly,
  // tyčí a označovačem, za oknem vystupují král, dáma a kluk; v kapse proštípnutá jízdenka.
  ticket_inspector: {
    bg: '#f3e8cf',
    motif: 'none',
    body: '#5a3418',
    collar: 'shirt',
    hat: undefined,
    hair: 'part',
    mood: 'sly',
    prop: undefined,
    backdrop: [
      // Okna (vlevo ubíhající město, vpravo zastávka s figurami).
      ['f', '#bcd6e6', `${rect(22, 94, 72, 80)} ${rect(156, 94, 72, 80)}`, 2.4],
      ['l', 'M22,106 H94 M156,106 H228', 1.6],
      [
        'f',
        '#d9d2c2',
        'M22,174 L22,134 L36,134 L36,122 L52,122 L52,140 L66,140 L66,128 L80,128 L80,138 L94,138 L94,174 Z',
        1,
      ],
      ['l', 'M26,114 L46,114 M54,118 L84,118 M40,148 h6 M58,152 h6 M72,146 h6', 0.8],
      ['f', '#9a958a', rect(156, 162, 72, 12), 1],
      ['l', 'M220,162 L220,124', 1.4],
      ['f', '#d7442c', c(220, 120, 6), 1.2],
      ['f', '#fffaf0', rect(216, 118.5, 8, 3), 0],
      ...cardFolk([166, 182, 198], 140),
      // Madlo s poutky.
      ['f', '#e9b030', rect(16, 60, 218, 5), 1.2],
      ['s', '#5b5850', 'M100,65 L100,80 M150,65 L150,80 M206,65 L206,80', 3],
      ['s', '#2f3542', `${c(100, 86, 6)} ${c(150, 86, 6)} ${c(206, 86, 6)}`, 2.4],
      // Stěna pod okny.
      ['f', '#d7442c', rect(16, 178, 218, 106), 1.6],
      ['f', '#f3e8cf', rect(16, 186, 218, 5), 0],
      // Tyč s označovačem.
      ['f', '#e9b030', rect(30, 65, 8, 219), 1.4],
      ['f', '#f6e3a1', 'M29,170 L40,170 L40,190 L29,190 Z', 1],
      ['f', 'dark', `${c(32.5, 176, 1)} ${c(36.5, 180, 1)} ${c(32.5, 184, 1)}`, 0],
      ['f', '#ef8a2e', 'M24,186 C24,183 26,182 28,182 L42,182 C44,182 46,183 46,186 L46,220 L24,220 Z', 1.6],
      ['f', 'dark', rect(28, 188, 14, 3), 0],
      ['f', '#5d9a3e', c(35, 210, 2.6), 0.9],
    ],
    outfit: [
      // Límec kožené bundy, zip a kapsa s proštípnutou jízdenkou.
      ['f', '#8c5632', 'M100,210 L114,238 L104,242 L86,218 Z M150,210 L136,238 L146,242 L164,218 Z', 1.6],
      ['l', 'M125,244 L125,284', 1.2],
      ['f', '#f6e3a1', place('M-6,-9 L6,-9 L6,5 L3,8 L-6,8 Z', 81, 238, 1, -14), 1],
      ['l', place('M-4,-5 L4,-5 M-4,-2 L2,-2 M-4,3 L3,3', 81, 238, 1, -14), 0.7],
      ['l', 'M70,242 L94,239 L95,256 L71,258 Z', 1.1],
    ],
    extra: [
      // Ruka zvednutá s odznakem na řetízku.
      // Rukáv, zlatý řetízek k náprsní kapse, odznak s tramvají a pěst, která ho svírá za spodní okraj.
      ['f', '#5a3418', 'M168,284 L174,214 L198,212 L204,284 Z', 2],
      ['f', '#fffaf0', 'M174,214 L198,212 L198.6,220 L174,222 Z', 1.3],
      ['l', 'M173,190 C156,202 148,230 150,262', 3.4],
      ['s', '#e9b030', 'M173,190 C156,202 148,230 150,262', 1.8],
      ['l', chain([168, 196], [153, 222], [150, 258], 6), 0.7],
      ['f', '#e9b030', c(186, 182, 16, 19), 2.2],
      ['l', c(186, 182, 12.5, 15.5), 1.1],
      ['l', 'M186,169 L182,164 L190,164', 1],
      ['f', '#d7442c', 'M178,178 C178,170 194,170 194,178 L194,193 L178,193 Z', 1.2],
      ['f', '#fffaf0', rect(180.5, 175, 11, 6), 0.8],
      ['f', '#f2cf4a', `${c(181.5, 188, 1.6)} ${c(190.5, 188, 1.6)}`, 0.5],
      ['s', '#fffaf0', 'M174,174 C175,169 178,166 182,165', 1.6],
      ...hand(186, 205),
    ],
  },

  // Vrátný: zvednutá dlaň „Dál ne!“, za zády tabule s klíči a nástěnka s fotkami povolených figur (král, dáma)
  // a přeškrtnutou fotkou tebe; hodiny nad vrátnicí, na pultu telefon a hrnek kafe.
  doorman: {
    bg: '#f3e8cf',
    motif: 'none',
    body: '#5b5850',
    hairColor: '#9a958a',
    beardColor: '#9a958a',
    hatColor: '#5b5850',
    hatAccent: '#e9b030',
    mood: 'flat',
    prop: undefined,
    backdrop: [
      ['f', '#9fd0c4', rect(16, 168, 218, 116), 0],
      ['s', '#2f8077', 'M16,168 L234,168', 3],
      // Hodiny.
      ['f', '#fffaf0', c(125, 48, 14), 1.8],
      ['l', 'M125,48 L125,39 M125,48 L132,51 M125,36 v2 M137,48 h-2 M125,60 v-2 M113,48 h2', 1.3],
      // Tabule s klíči.
      ['f', '#c99a62', rect(24, 64, 62, 94), 1.6],
      ['l', [72, 102, 132].flatMap((y) => [32, 45, 58, 71].map((x) => `M${x},${y} l0,4`)).join(' '), 1.2],
      [
        'f',
        '#e9b030',
        [
          [32, 72],
          [58, 72],
          [71, 72],
          [32, 102],
          [45, 102],
          [58, 102],
          [45, 132],
          [58, 132],
          [71, 132],
        ]
          .map(([x, y]) => place(KEY, x!, y! + 9))
          .join(' '),
        0.9,
      ],
      [
        'f',
        '#d7442c',
        [
          [32, 72],
          [71, 72],
          [45, 102],
          [58, 132],
        ]
          .map(([x, y]) => rect(x! + 3, y! + 9, 5, 8))
          .join(' '),
        0.8,
      ],
      // Nástěnka: povolené figury a přeškrtnutý ty.
      ['f', '#8c5632', rect(160, 62, 68, 82), 1.6],
      ['f', '#c99a62', rect(165, 67, 58, 72), 0.8],
      ['f', '#fffaf0', `${rect(170, 72, 17, 23)} ${rect(194, 74, 17, 23)} ${rect(178, 104, 24, 28)}`, 1.1],
      ['f', '#f2cf4a', `${place(CROWN, 178.5, 88, 0.6)} ${place(CROWN, 202.5, 88, 0.45)}`, 0.8],
      ['f', '#d7442c', place(HEART, 202.5, 93, 0.12), 0],
      ['f', '#f2b38c', c(190, 116, 5.5), 1],
      ['f', '#6b4a9e', 'M181,132 C181,124 199,124 199,132 Z', 1],
      ['s', '#d7442c', 'M176,102 L204,134 M204,102 L176,134', 3],
      ['f', '#2f5fa8', `${c(178.5, 72, 2)} ${c(202.5, 74, 2)} ${c(190, 104, 2)}`, 0.7],
    ],
    extra: [
      // Přísně stažené obočí.
      ['l', 'M106,139 L121,144 M144,139 L129,144', 2],
      // Zvednutá ruka.
      ['f', '#5b5850', 'M172,256 L180,214 L204,214 L200,256 Z', 2],
      ['s', '#e9b030', 'M180.6,222 L202.6,222', 2.4],
      ['f', SKIN, place(PALM, 192, 194, 1.05), 1.8],
      ['l', place('M-5,-25 L-5,-8 M1,-27 L1,-8 M7,-21 L7,-8 M-8,6 C-2,10 4,10 9,4', 192, 194, 1.05), 1],
      ...counter(240, '#8c5632', '#c99a62'),
      // Telefon a hrnek s kafem.
      ['i', 'rotary-phone', 16, 200, 44, '#d7442c'],
      ['f', '#fffaf0', 'M66,224 L82,224 L81,241 L67,241 Z', 1.4],
      ['l', 'M82,228 C88,228 88,236 81,236 M71,218 C68,214 74,210 71,206 M77,218 C74,214 80,210 77,206', 1.1],
    ],
  },

  // Pozlacovač: plochý štětec se zlatem a poletující plátky zlata; dílna, kde je pozlacené úplně všechno —
  // rám obrazu, zahradní trpaslík i pěna na pivu; na stěně dlouhý účet, na stole napůl pozlacená karta.
  goldsmith: {
    bg: '#2f8077',
    motif: 'none',
    body: '#5a3418',
    hat: 'beret',
    hatColor: '#22365c',
    prop: undefined,
    backdrop: [
      // Pozlacený rám s krajinkou.
      ['f', '#e9b030', rect(22, 58, 68, 82), 2],
      ['l', rect(28, 64, 56, 70), 1],
      ['f', '#bcd6e6', rect(32, 68, 48, 62), 1.4],
      ['f', '#f2cf4a', c(68, 82, 6), 1],
      ['f', '#5d9a3e', 'M32,130 L32,112 C44,104 56,108 66,114 C72,110 76,110 80,112 L80,130 Z', 1],
      ['f', '#e9b030', `${c(22, 58, 5)} ${c(90, 58, 5)} ${c(22, 140, 5)} ${c(90, 140, 5)}`, 1.2],
      // Police: pozlacený trpaslík a půllitr (i s pěnou).
      ['f', '#8c5632', rect(158, 110, 76, 7), 1.4],
      ['f', '#e9b030', 'M168,110 C168,100 172,94 181,94 C190,94 194,100 194,110 Z', 1.4],
      ['f', '#e9b030', 'M174,90 C174,103 188,103 188,90 C185,94 177,94 174,90 Z', 1.2],
      ['f', '#e9b030', c(181, 88, 7), 1.2],
      ['f', '#e9b030', 'M172,85 C174,74 178,66 188,58 C186,68 190,78 190,85 Z', 1.4],
      ['f', 'dark', `${c(178, 87, 1)} ${c(184, 87, 1)}`, 0],
      ['f', '#e9b030', rect(203, 90, 18, 20), 1.4],
      ['l', 'M221,94 C228,94 228,106 221,106', 1.4],
      ['f', '#e9b030', 'M201,92 C200,86 206,85 208,88 C210,84 216,84 218,87 C223,86 224,91 222,93 Z', 1.2],
      // Dlouhý účet na hřebíku.
      ['f', '#fffaf0', 'M30,150 L50,150 L50,226 L46,230 L42,226 L38,230 L34,226 L30,230 Z', 1.2],
      [
        'l',
        'M33,156 h14 M33,162 h10 M33,168 h14 M33,174 h12 M33,180 h14 M33,186 h9 M33,192 h14 M33,198 h11 M33,204 h14',
        0.7,
      ],
      ['s', '#e9b030', 'M32,214 L48,214', 3],
      ['f', '#9a958a', c(40, 148, 2), 0.8],
      [
        'f',
        '#fffaf0',
        [
          [200, 70],
          [230, 82],
          [100, 64],
          [60, 150],
        ]
          .map(([x, y]) => place(STAR4, x!, y!, 0.45))
          .join(' '),
        0,
      ],
    ],
    outfit: [
      [
        'f',
        '#e9b030',
        [
          c(104, 252, 2.4),
          c(140, 262, 2),
          c(118, 272, 2.6),
          c(150, 246, 1.8),
          c(80, 262, 2),
          c(170, 250, 2),
        ].join(' '),
        0.6,
      ],
      ['f', 'cloud', 'M110,250 L140,250 L139,266 L111,266 Z', 1.2],
    ],
    extra: [
      // Pracovní stůl: polštářek s plátkem zlata a karta, která je napůl zlatá.
      ['f', '#8c5632', rect(16, 264, 218, 20), 1.8],
      ['f', '#c99a62', rect(16, 258, 218, 8), 1.6],
      ['f', '#5a3418', 'M22,251 L70,251 L72,259 L20,259 Z', 1.4],
      ['f', '#e9b030', 'M30,248 L48,246 L50,253 L32,255 Z', 1],
      ['f', '#fffaf0', place('M-11,-16 L11,-16 L11,16 L-11,16 Z', 90, 242, 1, -8), 1.4],
      ['f', '#e9b030', place('M0,-16 L11,-16 L11,16 L0,16 Z', 90, 242, 1, -8), 1.2],
      ['f', '#d7442c', place(HEART, 90, 242, 0.32, -8), 0.8],
      // Štětec a plátky zlata.
      ['f', '#c99a62', brush('M-3,10 L3,10 L3,-50 L-3,-50 Z'), 1.4],
      ['f', '#d9d2c2', brush('M-6,-50 L6,-50 L6,-62 L-6,-62 Z'), 1.4],
      ['f', '#5a3418', brush('M-7,-62 L7,-62 L10,-80 L-10,-80 Z'), 1.4],
      ['f', '#e9b030', brush('M-9,-74 L9,-74 L10,-84 L-10,-84 Z'), 1.2],
      ...hand(BRUSH.x, BRUSH.y, BRUSH.deg),
      [
        'f',
        '#e9b030',
        [leaf(224, 152, 20), leaf(196, 146, -15), leaf(222, 202, 35), leaf(170, 172, 10)].join(' '),
        1,
      ],
      ['f', '#fffaf0', `${place(STAR4, 210, 132, 0.6)} ${place(STAR4, 232, 172, 0.4)}`, 0],
    ],
  },

  // Dlaždič: oranžová reflexní vesta, kladivo a pražská mozaika s vlnkou, hromada kostek, zábrana — a nad dlažbou
  // už čeká lžíce bagru, ať to můžou zase rozkopat.
  paver: {
    bg: '#bcd6e6',
    motif: 'street',
    collar: 'plain',
    prop: undefined,
    outfit: [
      // Rozepnutá oranžová reflexní vesta (ať se neslévá se žlutou přilbou) se stříbrnými pruhy.
      [
        'f',
        '#ef8a2e',
        'M70,284 L74,236 C80,222 90,214 100,212 L111,212 L119,284 Z M180,284 L176,236 C170,222 160,214 150,212 L139,212 L131,284 Z',
        1.8,
      ],
      ['l', 'M76,238 L113,238 M137,238 L174,238 M74,252 L115,252 M135,252 L176,252', 5.4],
      ['s', '#d9d2c2', 'M76,238 L113,238 M137,238 L174,238 M74,252 L115,252 M135,252 L176,252', 3.4],
    ],
    backdrop: [
      ...mosaic(),
      // Zábrana.
      ['l', 'M26,182 L24,200 M74,182 L76,200', 1.6],
      ['f', '#fffaf0', rect(20, 172, 60, 10), 1.3],
      [
        'f',
        '#d7442c',
        'M22,172 L30,172 L24,182 L20,182 Z M38,172 L46,172 L40,182 L32,182 Z M54,172 L62,172 L56,182 L48,182 Z M70,172 L78,172 L72,182 L64,182 Z',
        0,
      ],
      ['l', rect(20, 172, 60, 10), 1.3],
      // Bagr: výložník, násada a lžíce nad dlažbou.
      ['f', '#e9b030', 'M234,74 L205,39 L195,49 L234,94 Z', 1.6],
      ['f', '#e9b030', 'M205,45 L195,101 L185,99 L195,43 Z', 1.6],
      ['f', '#5b5850', c(200, 44, 5), 1.2],
      ['l', 'M226,72 L204,48', 1.6],
      ['f', '#e9b030', 'M180,96 L204,98 C206,112 202,122 192,128 L170,128 L176,120 Z', 1.6],
      [
        'f',
        '#5b5850',
        'M170,128 L166,135 L175,128 Z M178,128 L174,135 L183,128 Z M186,128 L182,135 L191,128 Z',
        1,
      ],
      ['f', '#8c5632', `${c(178, 142, 2.2)} ${c(186, 150, 1.8)} ${c(180, 158, 1.5)}`, 0.7],
    ],
    extra: [
      ...cubePile(),
      // Kladivo.
      ['f', '#c99a62', hammer('M-3,8 L3,8 L3.5,-66 L-3.5,-66 Z'), 1.4],
      ['f', '#9a958a', hammer('M-26,-72 L-16,-80 L20,-80 L20,-64 L-16,-64 Z'), 1.8],
      ['f', '#5b5850', hammer('M16,-81 L22,-81 L22,-63 L16,-63 Z'), 1.4],
      ...hand(HAMMER.x, HAMMER.y, HAMMER.deg),
    ],
  },

  // Pošťák: chodba paneláku — přecpané schránky, dveře s lístečkem „nikdo nebyl doma“; plná brašna a v ruce
  // otevřená obálka, ze které kouká bankovka (peníze za každou otevřenou obálku); na čepici obálka.
  postman: {
    bg: '#f3e8cf',
    motif: 'none',
    body: '#2f5fa8',
    hatColor: '#2f5fa8',
    prop: undefined,
    backdrop: [
      ['f', '#c6dcae', rect(16, 150, 218, 72), 0],
      ['s', '#2f6b3a', 'M16,150 L234,150', 2.4],
      ['f', '#d9d2c2', rect(16, 222, 218, 62), 1.4],
      [
        'f',
        '#9a958a',
        [c(30, 240, 1.5), c(60, 262, 1.2), c(196, 272, 1.5), c(220, 250, 1.2), c(40, 276, 1.2)].join(' '),
        0,
      ],
      // Schránky.
      ['f', '#9a958a', BOXES.map(([x, y]) => rect(x, y, 22, 30)).join(' '), 1.2],
      ['f', 'dark', BOXES.map(([x, y]) => rect(x + 4, y + 6, 14, 3)).join(' '), 0],
      ['f', '#fffaf0', BOXES.map(([x, y]) => rect(x + 5, y + 18, 12, 5)).join(' '), 0.7],
      [
        'f',
        '#fffaf0',
        [BOXES[0]!, BOXES[5]!, BOXES[7]!]
          .map(([x, y]) => `M${x + 5},${y + 8} L${x + 6},${y - 3} L${x + 18},${y - 1} L${x + 17},${y + 8} Z`)
          .join(' '),
        1,
      ],
      [
        'f',
        '#f2cf4a',
        `M${BOXES[1]![0] + 4},${BOXES[1]![1] + 8} L${BOXES[1]![0] + 2},${BOXES[1]![1] - 6} L${BOXES[1]![0] + 14},${BOXES[1]![1] - 8} L${BOXES[1]![0] + 17},${BOXES[1]![1] + 8} Z`,
        1,
      ],
      ['f', '#f2cf4a', 'M24,236 L44,232 L47,242 L27,246 Z', 1],
      // Dveře bytu s lístečkem.
      ['f', '#8c5632', rect(166, 52, 60, 170), 1.8],
      ['l', rect(172, 58, 48, 164), 0.8],
      ['f', '#fffaf0', rect(186, 76, 20, 7), 0.9],
      ['f', 'dark', c(196, 98, 2.4), 0],
      ['f', '#e9b030', 'M172,150 L186,150 L186,154 L172,154 Z', 1],
      ['f', '#f2cf4a', 'M182,114 L210,112 L211,134 L183,136 Z', 1.2],
      ['l', 'M186,120 L206,119 M186,125 L204,124 M186,130 L198,129', 0.8],
      ['f', '#fffaf0', 'M179,112 L188,111 L188,116 L179,117 Z M204,110 L213,109 L213,114 L204,115 Z', 0.6],
    ],
    outfit: [
      // Brašna přes rameno, z ní obálky a balíček.
      ['s', '#5a3418', 'M152,212 L94,250', 8],
      ['f', '#fffaf0', 'M56,252 L60,232 L78,234 L74,252 Z M80,248 L88,231 L104,235 L98,250 Z', 1.1],
      ['f', '#c99a62', 'M94,246 L98,228 L112,230 L110,246 Z', 1.1],
      ['f', '#8c5632', 'M48,250 L112,242 L116,284 L50,284 Z', 1.8],
      ['f', '#5a3418', 'M47,250 L113,242 L114,264 L49,270 Z', 1.6],
      ['f', '#e9b030', rect(76, 258, 10, 8), 1],
    ],
    extra: [
      // Obálka na čepici.
      ['f', '#fffaf0', rect(118.5, 111.5, 13, 9), 1],
      ['l', 'M118.5,111.5 L125,117 L131.5,111.5', 0.8],
      // Otevřená obálka s bankovkou a mincí.
      ['f', '#f3e8cf', letter('M-23,-15 L0,-32 L23,-15 Z'), 1.4],
      ['f', '#5d9a3e', letter('M-16,-26 L16,-26 L16,0 L-16,0 Z'), 1.2],
      ['f', '#c6dcae', letter('M-5,-17 C-5,-22 5,-22 5,-17 C5,-12 -5,-12 -5,-17 Z'), 0.8],
      ['f', '#fffaf0', letter('M-23,-15 L23,-15 L23,15 L-23,15 Z'), 1.8],
      ['l', letter('M-23,15 L0,-1 L23,15 M-23,-15 L-6,-2 M23,-15 L6,-2'), 1],
      ['f', '#d7442c', letter('M11,-11 L19,-11 L19,-2 L11,-2 Z'), 0.8],
      ['f', '#fffaf0', `${place(STAR4, 210, 188, 0.7)} ${place(STAR4, 170, 196, 0.5)}`, 0.8],
      ['l', 'M184,190 L182,184 M192,188 L193,182 M200,190 L203,185', 1.1],
      ...hand(184, 240, -10),
    ],
  },

  // Hokynář: krámek s regály (okurky ve sklenicích, pytel mouky, plechovky), na tabuli křídou banán
  // a v týdnu zakroužkovaný čtvrtek; na pultu bedýnka jablek s cenovkou a váha s bramborami, tužka za uchem.
  grocer: {
    bg: '#f6e3a1',
    motif: 'none',
    body: '#2f5fa8',
    prop: undefined,
    backdrop: [
      [
        'f',
        '#8c5632',
        [rect(16, 104, 76, 6), rect(160, 104, 74, 6), rect(16, 156, 76, 6), rect(160, 156, 74, 6)].join(' '),
        1.2,
      ],
      // Okurky ve sklenicích.
      [
        'f',
        '#c6dcae',
        [24, 46, 68]
          .map((x) => `M${x},104 L${x},84 C${x},80 ${x + 18},80 ${x + 18},84 L${x + 18},104 Z`)
          .join(' '),
        1.2,
      ],
      ['f', '#5d9a3e', [24, 46, 68].flatMap((x) => [c(x + 6, 94, 3, 7), c(x + 12, 95, 3, 7)]).join(' '), 0.6],
      ['f', '#d7442c', [24, 46, 68].map((x) => rect(x + 1, 76, 16, 5)).join(' '), 1],
      // Pytel mouky a bochník.
      [
        'f',
        '#d9d2c2',
        'M24,156 C20,146 22,138 30,134 C27,128 32,123 37,128 L51,128 C56,123 61,128 58,134 C66,138 68,146 64,156 Z',
        1.3,
      ],
      ['l', 'M33,133 C40,136 48,136 55,133', 1.2],
      ['s', '#2f5fa8', 'M28,146 L60,146', 2.4],
      ['f', '#c99a62', 'M66,156 C64,144 88,142 90,156 Z', 1.2],
      ['l', 'M72,148 l4,-3 M80,147 l4,-3', 0.9],
      // Tabule: banán a týden se zakroužkovaným čtvrtkem.
      ['f', '#8c5632', rect(162, 48, 66, 52), 1.6],
      ['f', '#2f6b3a', rect(166, 52, 58, 44), 1],
      ['s', '#f2cf4a', 'M176,64 C178,78 194,84 208,76', 4],
      ['l', 'M175,62 L177,66', 1.4],
      [
        's',
        '#fffaf0',
        'M172,88 l0,4 M178,88 l0,4 M184,88 l0,4 M190,88 l0,4 M196,88 l0,4 M202,88 l0,4 M208,88 l0,4',
        1.6,
      ],
      ['s', '#e88a9a', c(190, 90, 4.5), 1.4],
      // Salám a pletenec česneku u stropu.
      ['l', 'M98,26 L156,26 M112,26 L112,32 M140,26 L140,30', 1.4],
      ['f', '#b8302a', 'M106,36 C106,30 118,30 118,36 L117,74 C117,80 107,80 107,74 Z', 1.4],
      ['f', '#fffaf0', [c(110, 44, 1.3), c(114, 52, 1.2), c(110, 60, 1.3), c(114, 68, 1.2)].join(' '), 0],
      ['l', 'M108,40 C112,42 116,40 117,38', 1],
      [
        'f',
        '#fffaf0',
        [c(140, 38, 6, 5.5), c(136, 48, 6, 5.5), c(144, 57, 6, 5.5), c(139, 67, 6, 5.5)].join(' '),
        1.2,
      ],
      ['l', 'M140,33 L140,36 M136,43 L136,45 M144,52 L144,54 M139,62 L139,64', 1],
      // Plechovky vpravo dole.
      ['f', '#d7442c', `${rect(166, 134, 14, 22)} ${rect(198, 134, 14, 22)}`, 1.1],
      ['f', '#2f5fa8', `${rect(182, 134, 14, 22)} ${rect(214, 134, 14, 22)}`, 1.1],
      ['f', '#fffaf0', [166, 182, 198, 214].map((x) => rect(x + 2, 141, 10, 6)).join(' '), 0],
    ],
    extra: [
      // Tužka za uchem.
      ['s', '#f2cf4a', 'M144,135 L166,147', 3.6],
      ['f', '#f3c7c0', place('M0,-1.8 L5,0 L0,1.8 Z', 166, 147, 1, 28), 0.6],
      ...counter(244, '#c99a62', '#8c5632'),
      // Bedýnka jablek s cenovkou.
      [
        'f',
        '#d7442c',
        [
          c(28, 228, 7),
          c(42, 226, 7),
          c(56, 227, 7),
          c(70, 229, 7),
          c(35, 218, 6.5),
          c(49, 217, 6.5),
          c(63, 219, 6.5),
        ].join(' '),
        1.2,
      ],
      [
        'f',
        '#fffaf0',
        [c(26, 225, 1.6), c(40, 223, 1.6), c(33, 215, 1.5), c(47, 214, 1.5), c(61, 216, 1.5)].join(' '),
        0,
      ],
      ['l', 'M62,214 L62,198', 1],
      ['f', '#fffaf0', rect(62, 196, 15, 9), 1],
      ['l', 'M65,200 h9', 0.9],
      ['f', '#c99a62', rect(20, 228, 58, 18), 1.4],
      ['l', 'M20,234 h58 M20,240 h58', 0.8],
      // Váha s bramborami.
      ['f', '#d7442c', 'M188,246 L216,246 L212,222 L192,222 Z', 1.6],
      ['f', '#fffaf0', c(202, 206, 16), 2],
      ['l', 'M202,192 l0,3 M191,196 l2,2 M213,196 l-2,2 M188,206 l3,0 M216,206 l-3,0 M202,206 L210,197', 1.1],
      ['f', 'dark', c(202, 206, 2), 0],
      ['l', 'M202,190 L202,184', 2],
      ['f', '#9a958a', 'M178,180 L226,180 L221,187 L183,187 Z', 1.4],
      [
        'f',
        '#c99a62',
        [c(190, 175, 7, 5.5), c(204, 174, 7.5, 6), c(216, 176, 6, 5), c(198, 167, 6, 5)].join(' '),
        1.2,
      ],
      ['f', '#8c5632', [c(188, 174, 1), c(205, 172, 1), c(199, 166, 1)].join(' '), 0],
    ],
  },

  // Táta u grilu: za grilem s buřty a steakem, obracečkou právě jednou otáčí maso vysoko ve vzduchu; zástěra
  // se srdíčkem, brýle na čele, pot na pleši, kouř nad chatou a půllitr na poličce grilu.
  grill_dad: {
    bg: '#bcd6e6',
    motif: 'cabin',
    collar: 'apron',
    prop: undefined,
    backdrop: [
      [
        'f',
        '#d9d2c2',
        smooth([
          [84, 240],
          [84, 220],
          [78, 204],
          [86, 186],
          [78, 168],
          [88, 150],
          [80, 132],
          [92, 116],
          [88, 98],
          [96, 84],
          [86, 68],
          [70, 66],
          [58, 58],
          [42, 64],
          [32, 80],
          [38, 96],
          [52, 100],
          [46, 116],
          [58, 132],
          [52, 150],
          [64, 168],
          [58, 186],
          [68, 204],
          [64, 220],
          [72, 240],
        ]),
        1.3,
      ],
      [
        'l',
        'M54,76 C46,80 48,90 58,90 M72,78 C78,82 78,90 72,92 M66,140 C60,146 64,154 72,154 M70,196 C66,202 70,208 76,208',
        1,
      ],
    ],
    outfit: [
      // Zástěra „nejlepší táta“ se srdíčkem.
      ['f', 'cloud', 'M106,214 L144,214 L148,248 L102,248 Z', 1.6],
      ['f', '#d7442c', place(HEART, 125, 229, 0.36), 1],
    ],
    extra: [
      // Brýle na čele a kapka potu.
      ['f', '#2f3542', `${c(113, 131, 8, 5)} ${c(137, 131, 8, 5)}`, 1.2],
      ['l', 'M121,130 L129,130 M105,131 L99,140 M145,131 L151,140', 1.2],
      ['f', '#6fa0c8', 'M150,124 C146,130 147,134 150,134 C153,134 154,130 150,124 Z', 1],
      // Půllitr na odkládací poličce grilu.
      ['f', '#8c5632', rect(16, 238, 36, 6), 1.4],
      ['l', 'M38,222 C47,222 47,234 38,234', 2.6],
      ['f', '#f2cf4a', 'M21,214 L39,214 L38,238 L22,238 Z', 1.6],
      ['l', 'M26,219 L26,234 M30,219 L30,234 M34,219 L34,234', 0.8],
      ['f', '#fffaf0', 'M19,217 C16,211 21,207 25,209 C27,205 34,205 36,209 C41,208 43,214 40,217 Z', 1.3],
      // Gril.
      ['f', '#ef8a2e', 'M56,240 L210,240 L222,258 L44,258 Z', 1.8],
      ['f', '#d7442c', [c(76, 252, 8, 3), c(120, 254, 10, 3), c(176, 251, 9, 3)].join(' '), 0],
      [
        'l',
        'M52,246 L213,246 M48,252 L218,252 M74,240 L68,258 M98,240 L94,258 M122,240 L120,258 M150,240 L150,258 M180,240 L182,258',
        1,
      ],
      ['f', '#2f3542', 'M44,258 L222,258 L214,284 L52,284 Z', 2],
      ['l', 'M60,268 h142', 0.8],
      // Buřty a steak.
      [
        'f',
        '#b8302a',
        [
          place(SAUSAGE, 70, 245, 1, -6),
          place(SAUSAGE, 100, 251, 1, 5),
          place(SAUSAGE, 160, 247, 1, -3),
        ].join(' '),
        1.3,
      ],
      [
        'l',
        [
          place(SAUSAGE_CUTS, 70, 245, 1, -6),
          place(SAUSAGE_CUTS, 100, 251, 1, 5),
          place(SAUSAGE_CUTS, 160, 247, 1, -3),
        ].join(' '),
        0.9,
      ],
      ['f', '#8c5632', 'M116,244 C116,238 138,236 140,242 C142,250 120,254 116,244 Z', 1.3],
      ['l', 'M122,240 L118,250 M130,238 L126,251 M137,240 L134,249', 0.9],
      [
        'l',
        'M70,232 C66,228 74,224 70,220 M100,234 C96,230 104,226 100,222 M164,232 C160,228 168,224 164,220',
        1,
      ],
      // Ruka s obracečkou a steak ve vzduchu.
      ['f', SKIN, 'M180,258 L186,226 L204,228 L200,258 Z', 1.8],
      ['l', 'M188,240 l3,-2 M192,248 l3,-2 M187,252 l3,-2', 0.8],
      ['f', '#5a3418', spat('M-3,8 L3,8 L3,-34 L-3,-34 Z'), 1.4],
      ['f', '#d9d2c2', spat('M-9,-34 L9,-34 L11,-56 L-11,-56 Z'), 1.6],
      ['l', spat('M-4,-40 L-4,-51 M0,-40 L0,-51 M4,-40 L4,-51'), 1],
      ...hand(SPAT.x, SPAT.y, SPAT.deg),
      ['f', '#f3e8cf', place(STEAK, 207, 70, 1.18, 28), 1.6],
      ['f', '#8c5632', place(STEAK, 208, 71, 1, 28), 1],
      ['l', place('M-8,-8 L-12,6 M0,-10 L-4,8 M8,-9 L4,7', 208, 71, 1, 28), 1.1],
      ['l', 'M222,158 C231,136 229,112 220,96 M212,154 C219,138 219,122 213,108', 1.3],
    ],
  },

  // Učitelka: u tabule se sudými čísly (2 4 6 8 10) a přeškrtnutou sedmičkou, ukazovátko, tužky v drdolu,
  // brož; na katedře žákovská s červenou jedničkou s hvězdičkou a jablko.
  teacher: {
    bg: '#f6e3a1',
    motif: 'none',
    body: '#6b4a9e',
    collar: 'shirt',
    mood: 'smile',
    prop: undefined,
    backdrop: [
      ['f', '#8c5632', rect(22, 54, 206, 122), 1.8],
      ['f', '#2f6b3a', rect(28, 60, 194, 110), 1.2],
      // Řada sudých čísel přes celou tabuli nad hlavou, pod ní fajfka a vpravo přeškrtnutá lichá sedmička.
      [
        's',
        '#fffaf0',
        [
          chalk('2', 38, 66, 2),
          chalk('4', 72, 66, 2),
          chalk('6', 106, 66, 2),
          chalk('8', 140, 66, 2),
          chalk('10', 172, 66, 2, 1.25),
        ].join(' '),
        3,
      ],
      ['s', '#fffaf0', chalk('7', 198, 112, 2), 3],
      ['s', '#e88a9a', 'M192,134 L218,110', 2.6],
      ['s', '#fffaf0', 'M40,124 L52,138 L76,108', 3],
      ['f', '#c99a62', rect(20, 174, 210, 6), 1.2],
      ['f', '#fffaf0', `${rect(42, 170, 10, 4)} ${rect(58, 170, 7, 4)}`, 0.6],
      ['f', '#f2cf4a', rect(196, 166, 18, 8), 1],
    ],
    outfit: [
      ['f', '#e9b030', c(100, 228, 4.5), 1.2],
      ['f', '#d7442c', c(100, 228, 2), 0],
      ['l', 'M106,214 L116,284 M144,214 L134,284', 1.1],
    ],
    extra: [
      // Tužky v drdolu.
      ['s', '#f2cf4a', 'M110,96 L144,108', 3.6],
      ['f', '#f3c7c0', place('M0,-1.8 L5,0 L0,1.8 Z', 144, 108, 1, 19), 0.6],
      // Katedra se žákovskou a jablkem.
      ['f', '#8c5632', rect(16, 264, 218, 20), 1.8],
      ['f', '#c99a62', rect(16, 258, 218, 8), 1.6],
      ['f', '#2f5fa8', 'M20,259 L56,252 L92,258 L92,262 L56,256 L20,263 Z', 1.2],
      ['f', '#fffaf0', 'M22,258 L24,238 L56,234 L56,254 Z M56,254 L56,234 L88,238 L90,258 Z', 1.2],
      ['l', 'M27,242 L52,239 M27,247 L52,244 M27,252 L46,250', 0.7],
      ['s', '#d7442c', 'M66,242 L70,239 L70,252', 2.2],
      ['f', '#d7442c', place(STAR5, 80, 242, 0.5), 0.6],
      [
        'f',
        '#d7442c',
        place(
          'M110,252 C100,252 98,240 104,236 C107,234 110,235 112,236 C114,235 117,234 120,236 C126,240 124,252 114,252 Z',
          0,
          6,
        ),
        1.4,
      ],
      ['l', 'M112,242 L113,236', 1.2],
      ['f', '#5d9a3e', 'M113,237 C116,232 121,232 123,235 C120,238 116,238 113,237 Z', 0.8],
      // Ukazovátko k sudým číslům.
      ['s', '#c99a62', 'M193,244 L178,86', 3.4],
      ['s', '#2f3542', 'M179.4,100 L178,86', 3.4],
      ...hand(193, 238),
    ],
  },
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {};

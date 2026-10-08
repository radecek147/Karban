/**
 * Obrázky žolíků — dávka 08 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - glassblower — Sklář: portrét `fig-glassblower` (FIGURES['glassblower'])
 *  - notary_public — Notář: portrét `fig-notary_public` (FIGURES['notary_public'])
 *  - witch — Čarodějnice: portrét `fig-witch` (FIGURES['witch'])
 *  - water_goblin — Vodník: scéna `vodnik` (SCENES['vodnik'])
 *  - will_o_wisp — Bludička: portrét `fig-will_o_wisp` (FIGURES['will_o_wisp'])
 *  - noon_witch — Polednice: portrét `fig-noon_witch` (FIGURES['noon_witch'])
 *  - klekanice — Klekánice: portrét `fig-klekanice` (FIGURES['klekanice'])
 *  - parish_priest — Pan farář: portrét `fig-parish_priest` (FIGURES['parish_priest'])
 *  - seer — Vědma: portrét `fig-seer` (FIGURES['seer'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import { c, rect } from '../sceneKit';
import type { SceneOp } from '../sceneKit';
import { VODNIK } from '../scenes2';

const SKIN = '#f2b48e';
const INK = '#1a1714';
const PAPER = '#fffaf0';
const RED = '#d7442c';
const GOLD = '#e9b030';
const YELLOW = '#f2cf4a';
const NAVY = '#22365c';
const WOOD = '#c99a62';
const BROWN = '#8c5632';

const f1 = (n: number): string => n.toFixed(1);

/** Otočený obdélník (karta, list papíru) se středem (cx, cy). */
function quad(cx: number, cy: number, w: number, h: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => `${f1(cx + x! * cos - y! * sin)},${f1(cy + x! * sin + y! * cos)}`);
  return `M${pts.join(' L')} Z`;
}

/** Srdíčko se středem (x, y). */
const heart = (x: number, y: number, s: number): string =>
  `M${x},${y + s} C${x - s * 1.4},${y} ${x - s},${y - s * 1.1} ${x},${y - s * 0.35} C${x + s},${y - s * 1.1} ${x + s * 1.4},${y} ${x},${y + s} Z`;

/** Čtyřcípá jiskra. */
const spark = (x: number, y: number, r: number): string => {
  const k = r * 0.26;
  return `M${x},${y - r} L${x + k},${y - k} L${x + r},${y} L${x + k},${y + k} L${x},${y + r} L${x - k},${y + k} L${x - r},${y} L${x - k},${y - k} Z`;
};

/** Kapka. */
const tear = (x: number, y: number, s = 1): string =>
  `M${x},${y} C${x - 4 * s},${y + 7 * s} ${x - 2.5 * s},${y + 12 * s} ${x},${y + 12 * s} C${x + 2.5 * s},${y + 12 * s} ${x + 4 * s},${y + 7 * s} ${x},${y} Z`;

/** Srpek měsíce (rohy nahoře a dole, vypouklý doleva). */
const crescent = (cx: number, cy: number, r: number): string =>
  `M${cx},${cy - r} A${r},${r} 0 1,0 ${cx},${cy + r} A${f1(r * 1.25)},${f1(r * 1.25)} 0 0,1 ${cx},${cy - r} Z`;

/** Bod v otočené soustavě se středem (cx, cy) — čáry na listině a podobně. */
function local(cx: number, cy: number, deg: number): (x: number, y: number) => string {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (x, y) => `${f1(cx + x * cos - y * sin)},${f1(cy + x * sin + y * cos)}`;
}

/** Hvězdičky (křížky) na obloze. */
const stars = (pts: readonly (readonly [number, number])[]): string =>
  pts.map(([x, y]) => `M${x - 3},${y} h6 M${x},${y - 3} v6`).join(' ');

/** Chuchvalec (vlna ovce, oblak páry): elipsa z obloučků. */
function fluff(cx: number, cy: number, rx: number, ry: number, n: number): string {
  let d = '';
  let px = 0;
  let py = 0;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) d += `M${f1(x)},${f1(y)}`;
    else {
      const r = Math.hypot(x - px, y - py) * 0.58;
      d += ` A${f1(r)},${f1(r)} 0 0,1 ${f1(x)},${f1(y)}`;
    }
    px = x;
    py = y;
  }
  return `${d} Z`;
}

/** Ruka (pěst) jako v figureKit: dlaň a dva prsty. */
function hand(x: number, y: number, skin = SKIN): SceneOp[] {
  return [
    ['f', skin, c(x, y, 11, 9), 1.8],
    ['l', `M${x - 9},${y - 3} l18,0 M${x - 9},${y + 3} l18,0`, 1.1],
  ];
}

/** Hrací karta se srdcem (otočená). */
function heartCard(cx: number, cy: number, deg: number, s = 1): SceneOp[] {
  return [
    ['f', PAPER, quad(cx, cy, 18 * s, 25 * s, deg), 1.3],
    ['f', RED, heart(cx, cy, 4.2 * s), 0.8],
  ];
}

/** Ovečka (tělo z chuchvalců, černá hlava, nožky); `dir` 1 = hlavou doprava. */
function sheep(x: number, y: number, s: number, dir: 1 | -1): SceneOp[] {
  const hx = x + dir * 17 * s;
  return [
    [
      'l',
      `M${x - 9 * s},${y + 8 * s} v${11 * s} M${x - 3 * s},${y + 9 * s} v${11 * s} M${x + 5 * s},${y + 9 * s} v${11 * s} M${x + 11 * s},${y + 8 * s} v${11 * s}`,
      1.8 * s,
    ],
    ['f', PAPER, fluff(x, y, 17 * s, 11 * s, 11), 1.5],
    ['f', 'dark', c(hx, y - 3 * s, 6 * s, 7.5 * s), 0],
    ['f', 'dark', c(hx - dir * 6 * s, y - 7 * s, 4 * s, 2.2 * s), 0],
    ['f', PAPER, c(hx + dir * 2 * s, y - 5 * s, 1.4 * s), 0],
    ['f', PAPER, fluff(hx - dir * 1 * s, y - 10 * s, 5 * s, 3 * s, 6), 1],
  ];
}

/** Uzel šátku pod bradou: zaoblené cípy přes ostré cípy ze stavebnice. */
function knot(col: string): SceneOp[] {
  return [
    [
      'f',
      col,
      'M119,189 C112,194 104,202 101,210 C108,210 117,205 123,198 Z M131,189 C138,194 146,202 149,210 C142,210 133,205 127,198 Z',
      1.4,
    ],
    ['f', col, c(125, 193, 6, 5), 1.4],
  ];
}

/** Kostnatý křivý prst lomený přes klouby `pts` (kořen … špička), zúžený z šířky w0 na w1. */
function finger(pts: readonly (readonly [number, number])[], w0: number, w1: number): string {
  const n = pts.length;
  const left: string[] = [];
  const right: string[] = [];
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)]!;
    const [bx, by] = pts[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    left.push(`${f1(x + nx * w)},${f1(y + ny * w)}`);
    right.unshift(`${f1(x - nx * w)},${f1(y - ny * w)}`);
  });
  return `M${left.join(' L')} L${right.join(' L')} Z`;
}

/* ---------------------------------------------------------------- Sklář */

/** Cihly pece. */
function bricks(x0: number, x1: number, y0: number, y1: number, step: number): string {
  let d = '';
  for (let row = 0, y = y0; y <= y1; row++, y += step) {
    d += `M${x0},${y} H${x1} `;
    for (let x = x0 + 8 + (row % 2) * 12; x < x1; x += 24) d += `M${x},${y} V${Math.min(y + step, y1)} `;
  }
  return d.trim();
}

const GLASSBLOWER: Partial<FigureSpec> = {
  bg: '#f6e3a1',
  motif: 'none',
  body: '#6fa0c8',
  collar: 'plain',
  hair: 'short',
  hairColor: '#5a3418',
  beard: undefined,
  hat: 'band',
  hatColor: RED,
  mood: 'o',
  prop: undefined,
  backdrop: [
    // Sklářská pec z cihel s rozžhaveným ústím.
    ['f', BROWN, rect(32, 62, 20, 30), 1.4],
    ['f', '#b8302a', 'M16,214 L16,100 C30,84 76,84 90,100 L90,214 Z', 1.8],
    ['l', bricks(16, 90, 112, 206, 16), 0.8],
    [
      'f',
      '#d9d2c2',
      'M22,206 L22,162 C22,126 84,126 84,162 L84,206 L77,206 L77,162 C77,136 29,136 29,162 L29,206 Z',
      1.4,
    ],
    ['f', '#ef8a2e', 'M29,206 L29,162 C29,136 77,136 77,162 L77,206 Z', 1.2],
    [
      'f',
      YELLOW,
      'M33,206 C31,188 40,180 42,168 C47,180 50,172 53,158 C57,172 62,176 64,166 C70,180 74,192 73,206 Z',
      0,
    ],
    ['f', PAPER, 'M44,206 C44,196 50,190 53,182 C56,190 62,196 62,206 Z', 0],
    // Police s foukaným sklem: váza, láhev a skleněná karta; pod ní vánoční baňky.
    ['f', WOOD, rect(150, 100, 84, 7), 1.4],
    ['l', 'M160,107 L166,116 M224,107 L218,116', 1.2],
    ['f', '#2f5fa8', 'M160,100 C152,92 154,82 162,78 L162,70 L170,70 L170,78 C178,82 180,92 172,100 Z', 1.4],
    [
      'f',
      '#5d9a3e',
      'M182,100 L182,84 C182,79 186,77 187,74 L187,62 L193,62 L193,74 C194,77 198,79 198,84 L198,100 Z',
      1.4,
    ],
    ['f', '#bcd6e6', quad(216, 85, 20, 28, 8), 1.3],
    ['s', PAPER, 'M209,78 L214,94', 2],
    ['f', RED, heart(217, 86, 4.5), 0.8],
    ['l', 'M192,107 V120 M216,107 V114', 1],
    ['f', RED, c(192, 129, 9), 1.4],
    ['f', GOLD, c(216, 121, 7), 1.3],
    ['f', GOLD, rect(189, 118, 6, 3), 0.8],
    ['s', PAPER, 'M187,126 C188,123 190,122 192,122', 1.6],
    // Střepy na zemi (štěstí sklářům).
    ['f', '#bcd6e6', 'M20,246 L28,240 L30,251 Z M30,258 L39,250 L40,261 Z M18,258 L23,254 L25,261 Z', 0.8],
  ],
  outfit: [
    // Kožená zástěra s náprsenkou a propálenou skvrnou.
    ['s', '#5a3418', 'M96,232 L106,211 M154,232 L144,211', 4],
    ['f', BROWN, 'M90,230 L160,230 L165,284 L85,284 Z', 1.8],
    ['f', '#5a3418', 'M110,242 L140,242 L139,258 L111,258 Z', 1.2],
    ['l', 'M113,245 L137,245', 0.8],
  ],
  extra: [
    // Nafouknuté tváře a knír.
    ['f', SKIN, c(104, 167, 11, 10), 1.6],
    ['f', SKIN, c(146, 167, 11, 10), 1.6],
    ['f', 'blush', c(104, 169, 7), 0],
    ['f', 'blush', c(146, 169, 7), 0],
    [
      'f',
      '#5a3418',
      'M110,171 C115,165 121,166 125,169 C129,166 135,165 140,171 C136,175 130,174 125,172 C120,174 114,175 110,171 Z',
      1.3,
    ],
    // Sklářská píšťala s rozžhavenou baňkou.
    ['s', '#5b5850', 'M127,179 L190,232', 4.5],
    ...hand(166, 212),
    ['f', '#ef8a2e', c(199, 240, 15, 14), 1.8],
    ['f', YELLOW, c(195, 236, 8, 7), 0],
    ['f', PAPER, c(192, 233, 3), 0],
    ['l', 'M214,222 c3,-4 -1,-7 2,-11 M222,236 c3,-4 -1,-7 2,-11 M204,214 c3,-4 -1,-7 2,-11', 1],
    // Pot na čele.
    ['f', '#6fa0c8', tear(97, 120, 0.8), 1],
    ['f', '#6fa0c8', tear(158, 128, 0.7), 1],
  ],
};

/* ---------------------------------------------------------------- Notář */

/** Listina notáře: otočená soustava a řádky textu. */
const DOC = local(84, 230, -7);
const DOC_XY = (x: number, y: number): [number, number] => {
  const [px, py] = DOC(x, y).split(',').map(Number);
  return [px!, py!];
};
const DOC_LINES = [
  [-22, 18, -28],
  [-22, 22, -20],
  [-22, 12, -12],
  [-22, 20, -4],
]
  .map(([x1, x2, y]) => `M${DOC(x1!, y!)} L${DOC(x2!, y!)}`)
  .join(' ');

const NOTARY: Partial<FigureSpec> = {
  bg: '#f6e3a1',
  motif: 'none',
  body: NAVY,
  collar: 'tie',
  accent: '#8e3b6e',
  hair: 'part',
  hairColor: '#9a958a',
  glasses: true,
  mood: 'flat',
  prop: undefined,
  backdrop: [
    // Úřední sokl olejovou barvou.
    ['f', '#9fd0c4', rect(16, 196, 218, 88), 0],
    ['l', 'M16,196 H234', 1.4],
    // Police se šanony.
    ['f', NAVY, `${rect(20, 98, 12, 52)} ${rect(46, 98, 12, 52)}`, 1.3],
    ['f', RED, rect(33, 102, 12, 48), 1.3],
    ['f', '#5d9a3e', rect(59, 100, 12, 50), 1.3],
    ['f', GOLD, 'M72,150 L80,104 L92,106 L84,150 Z', 1.3],
    [
      'f',
      PAPER,
      `${rect(22, 108, 8, 14)} ${rect(35, 110, 8, 14)} ${rect(48, 108, 8, 14)} ${rect(61, 110, 8, 14)}`,
      0.8,
    ],
    ['f', INK, `${c(26, 138, 2.4)} ${c(39, 138, 2.4)} ${c(52, 138, 2.4)} ${c(65, 138, 2.4)}`, 0],
    ['f', WOOD, rect(16, 150, 78, 6), 1.4],
    // Nástěnné hodiny: za dvě minuty úřední hodiny končí.
    ['f', PAPER, c(198, 76, 20), 2],
    ['l', 'M198,59 v4 M198,89 v4 M181,76 h4 M211,76 h4', 1.2],
    ['l', 'M198,76 L196,62 M198,76 L189,70', 1.8],
    ['f', INK, c(198, 76, 2), 0],
    // Diplom v rámu s pečetí.
    ['f', BROWN, rect(176, 108, 44, 34), 1.4],
    ['f', PAPER, rect(180, 112, 36, 26), 1],
    ['l', 'M185,118 h26 M185,123 h20 M185,128 h24', 0.8],
    ['f', RED, c(209, 133, 3.5), 0.8],
  ],
  extra: [
    // Listina se zlatou pečetí a stuhami, v ruce.
    ['f', PAPER, quad(84, 230, 60, 74, -7), 1.6],
    ['l', DOC_LINES, 1],
    ['l', `M${DOC(-22, 12)} c4,-8 8,4 12,-4 c3,-6 6,4 10,-2`, 1.3],
    ['s', RED, c(...DOC_XY(14, -22), 6), 1.4],
    [
      'f',
      RED,
      `M${DOC(9, 14)} L${DOC(3, 30)} L${DOC(9, 27)} L${DOC(13, 31)} Z M${DOC(15, 14)} L${DOC(21, 30)} L${DOC(16, 28)} L${DOC(12, 31)} Z`,
      1.2,
    ],
    ['f', GOLD, fluff(...DOC_XY(12, 10), 10, 10, 12), 1.4],
    ['f', '#c08a1e', c(...DOC_XY(12, 10), 5), 0.8],
    ...hand(55, 234),
    // Razítko v pravé ruce.
    ['f', '#5a3418', rect(170, 224, 34, 10), 1.6],
    ['f', RED, rect(172, 234, 30, 5), 1.2],
    ['f', WOOD, 'M182,224 L192,224 L190,206 L184,206 Z', 1.4],
    ['f', WOOD, c(187, 199, 9, 8), 1.6],
    ...hand(187, 212),
    // Poplatek: sloupek mincí.
    ['f', GOLD, c(214, 256, 11, 4), 1.2],
    ['f', GOLD, c(214, 250, 11, 4), 1.2],
    ['f', GOLD, c(214, 244, 11, 4), 1.2],
  ],
};

/* ---------------------------------------------------------------- Čarodějnice */

const WITCH: Partial<FigureSpec> = {
  bg: '#cbb8e3',
  motif: 'none',
  body: '#6b4a9e',
  collar: 'plain',
  hairColor: '#9a958a',
  hatColor: NAVY,
  hatAccent: '#6b4a9e',
  skin: '#d9d2c2',
  prop: undefined,
  backdrop: [
    // Měsíc a hvězdy.
    ['f', '#ffd34d', crescent(204, 62, 20), 1.6],
    [
      'l',
      stars([
        [150, 40],
        [228, 104],
        [100, 60],
        [30, 96],
      ]),
      1.3,
    ],
    // Kopec s ohněm: pálení čarodějnic (slaměná figurína na tyči).
    ['f', '#2f6b3a', 'M16,198 C60,178 104,186 140,192 C180,182 212,188 234,182 L234,284 L16,284 Z', 1.6],
    ['l', 'M50,198 L50,120', 1.6],
    ['f', '#e4c46a', 'M42,146 L58,146 L54,128 L46,128 Z', 1.2],
    ['f', '#e4c46a', c(50, 123, 5), 1.1],
    ['f', NAVY, 'M42,121 L58,121 L50,104 Z', 1.1],
    [
      'f',
      '#ef8a2e',
      'M30,198 C26,180 36,172 38,160 C44,172 46,164 50,150 C54,164 60,170 62,158 C70,172 74,184 70,198 Z',
      1.3,
    ],
    ['f', YELLOW, 'M38,198 C36,186 42,180 44,172 C48,180 52,176 54,168 C58,178 64,186 62,198 Z', 0],
    ['f', YELLOW, `${spark(30, 146, 3)} ${spark(68, 140, 3)} ${spark(60, 120, 2.5)}`, 0],
  ],
  outfit: [
    // Záplaty na šatech.
    ['f', GOLD, quad(80, 243, 16, 14, -8), 1.2],
    ['l', 'M71,238 l4,2 M71,246 l4,0 M85,236 l-1,4 M88,247 l-4,0', 1],
    ['f', '#2f8077', quad(111, 252, 14, 12, 6), 1.2],
    ['l', 'M104,248 l4,1 M117,246 l-1,4 M115,258 l-1,-4', 1],
  ],
  extra: [
    // Skobovitý nos s bradavicí.
    [
      'f',
      '#d9d2c2',
      'M124,146 C118,156 112,166 118,170 C122,172 128,170 129,166 C127,160 127,152 124,146 Z',
      1.6,
    ],
    ['f', BROWN, c(118, 162, 2), 0],
    // Kotel s lektvarem, z něhož se vynořuje úřední razítko.
    ['f', '#5b5850', 'M152,224 C150,252 166,262 190,262 C214,262 230,252 228,224 Z', 1.8],
    ['f', '#5d9a3e', c(190, 224, 38, 8), 1.8],
    ['f', '#c6dcae', `${c(166, 220, 4)} ${c(213, 218, 5)} ${c(222, 206, 3)} ${c(160, 206, 3)}`, 1],
    ['f', '#5a3418', 'M178,214 L204,210 L205,220 L179,224 Z', 1.4],
    ['f', RED, 'M179,224 L205,220 L205,223 L179,227 Z', 0.8],
    ['f', WOOD, 'M186,212 L196,211 L193,196 L188,196 Z', 1.3],
    ['f', WOOD, c(190, 190, 8, 7), 1.5],
    ['f', YELLOW, `${spark(170, 192, 5)} ${spark(209, 199, 3.5)}`, 1],
    // Čerstvě orazítkovaný úřední papír v páře.
    ['f', PAPER, quad(214, 164, 24, 30, 12), 1.3],
    ['l', 'M206,154 L222,157 M205,160 L218,163 M204,166 L214,168', 0.9],
    ['s', RED, c(216, 173, 5.5), 1.5],
    ['f', RED, spark(216, 173, 2.6), 0],
    // Černá kočka.
    ['f', 'dark', 'M22,266 C20,246 28,232 40,230 C52,232 60,246 58,266 Z', 0],
    ['f', 'dark', `${c(40, 222, 12, 11)} M30,216 L28,202 L38,212 Z M50,216 L52,202 L42,212 Z`, 0],
    ['l', 'M57,256 C70,254 72,240 64,234', 3],
    ['f', YELLOW, `${c(35, 221, 2.6, 2)} ${c(45, 221, 2.6, 2)}`, 0],
  ],
};

/* ---------------------------------------------------------------- Vodník */

const VODNIK_SCENE: readonly SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  // Protější břeh a rybník.
  ['f', '#5d9a3e', 'M16,186 C60,176 120,182 160,178 C200,174 220,178 234,176 L234,204 L16,204 Z', 1.4],
  ['f', '#6fa0c8', 'M16,200 C70,196 170,202 234,198 L234,284 L16,284 Z', 1.4],
  ['l', 'M28,218 c10,-3 20,3 30,0 M180,224 c10,-3 20,3 30,0 M30,244 c10,-3 20,3 30,0', 1],
  // Smuteční vrba nad rybníkem (vodník na ní rád sedává).
  ['f', BROWN, 'M22,204 L26,150 C28,138 34,128 42,120 L50,124 C44,136 42,160 46,204 Z', 1.6],
  [
    'f',
    '#8a8f2e',
    'M16,54 C40,40 76,44 88,66 C94,80 90,100 84,112 C82,128 80,140 78,150 C74,140 72,128 70,120 C68,140 66,160 62,172 C58,160 56,140 54,124 C52,146 50,166 46,180 C42,166 40,146 40,128 C38,146 34,164 30,176 C26,162 26,142 26,126 C24,140 20,152 16,160 Z',
    1.4,
  ],
  [
    'l',
    'M30,70 C28,96 30,120 30,150 M46,64 C44,96 46,130 46,160 M62,64 C62,96 62,130 62,156 M76,72 C76,96 76,120 77,138',
    0.9,
  ],
  // Rákosí s orobincem vpravo.
  ['f', 'reed', 'M226,284 C224,224 220,180 214,130 C210,180 212,236 214,284 Z', 1.4],
  ['f', 'reed', 'M206,284 C204,240 196,200 186,168 C194,210 196,246 196,284 Z', 1.4],
  ['l', 'M214,134 L214,102', 1.4],
  ['f', 'wood2', 'M210,134 C206,120 208,106 214,102 C220,106 222,120 218,134 Z', 1.4],
  // Leknín s žábou na hladině.
  ['f', '#5d9a3e', 'M52,230 C36,230 34,218 52,216 C68,216 72,228 58,230 L54,223 Z', 1.2],
  ['f', '#8a8f2e', 'M44,218 C42,210 50,206 52,212 C56,206 64,210 60,218 Z', 1.2],
  ['f', PAPER, `${c(47, 210, 2.4)} ${c(57, 210, 2.4)}`, 0.8],
  ['f', INK, `${c(47, 210, 1)} ${c(57, 210, 1)}`, 0],
  // Vodník (kabát, hlava, cylindr) z původní scény.
  ...VODNIK.slice(10, 17),
  ...VODNIK.slice(19, 36),
  // Fajfka v koutku.
  ['s', BROWN, 'M112,181 L98,189', 3],
  ['f', BROWN, 'M90,181 L100,181 L99,195 C98,198 92,198 91,195 Z', 1.3],
  ['l', 'M95,175 c-3,-4 3,-6 0,-10', 1],
  // Hrníček na dušičky v ruce, z něj bublinky.
  ['f', 'cloud', 'M166,196 C170,184 194,184 198,196 Z', 1.6],
  ['f', 'cloud', c(182, 182, 3.5), 1.4],
  ['f', 'cloud', 'M166,196 L198,196 L193,226 C191,232 173,232 171,226 Z', 1.8],
  ['f', 'blue', `${c(176, 208, 3)} ${c(188, 212, 3)} ${c(182, 220, 2.5)}`, 0],
  ['f', 'vskin', 'M162,230 C168,222 196,222 202,230 C200,242 166,242 162,230 Z', 1.6],
  ['l', 'M168,232 l28,0', 1],
  ['f', '#bcd6e6', `${c(172, 172, 3)} ${c(164, 160, 2.4)} ${c(172, 150, 1.8)}`, 1],
  // Voda až po pás a v ní zahozené srdcové karty.
  [
    'f',
    '#6fa0c8',
    'M16,240 C40,234 60,244 90,238 C120,232 150,244 180,238 C200,234 220,240 234,236 L234,284 L16,284 Z',
    1.6,
  ],
  ...heartCard(46, 250, -18),
  ...heartCard(112, 254, 12),
  ...heartCard(206, 252, -6),
  [
    'l',
    'M28,260 c8,-3 16,3 24,0 M98,264 c8,-3 16,3 24,0 M194,262 c8,-3 16,3 24,0 M140,250 c8,-3 16,3 24,0 M70,248 c6,-2 10,2 16,0',
    1,
  ],
];

/* ---------------------------------------------------------------- Bludička */

const WISP: Partial<FigureSpec> = {
  bg: NAVY,
  motif: 'none',
  body: '#bcd6e6',
  hairColor: '#f6e3a1',
  skin: PAPER,
  prop: undefined,
  backdrop: [
    // Záře kolem bludičky.
    ['f', '#2f8077', c(125, 158, 70, 74), 0],
    [
      'l',
      stars([
        [110, 40],
        [176, 52],
        [214, 96],
        [30, 110],
      ]),
      1.2,
    ],
    // Suchý strom.
    [
      'f',
      '#5b5850',
      'M22,212 L28,150 C22,132 18,120 16,116 L20,114 C26,124 30,132 32,140 C36,126 44,116 54,110 L56,114 C46,122 40,134 38,150 L40,212 Z',
      1.5,
    ],
    ['l', 'M30,128 L20,98 M44,118 L58,96 M50,113 L64,112', 1.6],
    // Rozcestník, který ukazuje všude.
    ['l', 'M210,214 L210,124', 2.2],
    ['f', WOOD, 'M188,130 L222,130 L230,136 L222,142 L188,142 Z', 1.4],
    ['f', WOOD, 'M232,152 L198,152 L190,158 L198,164 L232,164 Z', 1.4],
    ['f', WOOD, 'M192,176 L222,170 L226,180 L196,186 Z', 1.4],
    // Bažina, mlha a odlesky.
    ['f', '#2f6b3a', 'M16,206 C60,198 100,206 125,202 C160,198 200,206 234,200 L234,284 L16,284 Z', 1.6],
    ['f', '#2f8077', 'M150,232 C170,226 220,228 234,232 L234,246 C210,250 170,248 150,242 Z', 1.2],
    [
      'f',
      '#bcd6e6',
      'M16,190 C50,184 80,194 110,190 L110,196 C80,200 50,192 16,198 Z M160,194 C190,188 210,196 234,192 L234,198 C210,202 190,196 160,200 Z',
      0,
    ],
    // Bludné světýlka.
    ['f', '#f6e3a1', `${c(62, 146, 9)} ${c(178, 92, 8)} ${c(40, 176, 6)} ${c(194, 196, 7)}`, 0],
    ['f', YELLOW, `${c(62, 146, 4)} ${c(178, 92, 3.5)} ${c(40, 176, 3)} ${c(194, 196, 3)}`, 1],
    // Bota, která v bažině zůstala.
    // Klobouk poutníka, který šel za světýlkem.
    ['f', '#2f8077', 'M16,230 C30,226 56,228 66,234 C56,242 30,244 16,242 Z', 1.2],
    ['f', BROWN, c(38, 235, 16, 4), 1.3],
    ['f', BROWN, 'M28,235 C28,224 48,224 48,235 Z', 1.3],
    ['f', RED, 'M28.5,231 L47.5,231 L48,234 L28,234 Z', 0.8],
    ['l', 'M18,244 c6,-2 10,2 16,0 M44,244 c6,-2 10,2 16,0', 1],
  ],
  outfit: [
    // Lehké šaty s vlnkami.
    ['l', 'M70,262 c8,-6 16,6 24,0 M156,262 c8,-6 16,6 24,0', 1],
  ],
  extra: [
    // Věneček z bahenních kvítků.
    [
      'f',
      PAPER,
      `${c(104, 128, 4.5)} ${c(114, 120, 4.5)} ${c(125, 117, 4.5)} ${c(136, 120, 4.5)} ${c(146, 128, 4.5)}`,
      1.1,
    ],
    [
      'f',
      YELLOW,
      `${c(104, 128, 1.8)} ${c(114, 120, 1.8)} ${c(125, 117, 1.8)} ${c(136, 120, 1.8)} ${c(146, 128, 1.8)}`,
      0,
    ],
    // Lucernička se září.
    [
      's',
      YELLOW,
      'M188,212 L188,198 M168,226 L156,226 M208,226 L220,226 M174,208 L166,200 M202,208 L210,200 M174,246 L166,254 M202,246 L210,254',
      2,
    ],
    ['l', 'M180,206 C180,196 196,196 196,206', 1.6],
    ['f', INK, 'M176,206 L200,206 L198,212 L178,212 Z', 1.2],
    ['f', YELLOW, 'M178,212 L198,212 L196,242 L180,242 Z', 1.4],
    ['l', 'M188,212 L188,242 M179,226 L197,226', 1],
    ['f', PAPER, 'M188,218 C185,224 186,230 188,232 C190,230 191,224 188,218 Z', 0],
    ['f', INK, 'M176,242 L200,242 L198,248 L178,248 Z', 1.2],
    ['s', INK, c(188, 194, 3), 1.4],
  ],
};

/* ---------------------------------------------------------------- Polednice */

/** Kostkovaný ubrus (červené čtverce). */
function checks(y0: number, size: number): string {
  let d = '';
  for (let row = 0, y = y0; y < 284; row++, y += size)
    for (let x = 16 + (row % 2) * size; x < 234; x += size * 2)
      d += `${rect(x, y, Math.min(size, 234 - x), Math.min(size, 284 - y))} `;
  return d.trim();
}

/** Paprsky slunce (trojúhelníky po obvodu). */
function rays(cx: number, cy: number, r1: number, r2: number, n: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const w = Math.PI / n / 1.6;
    const p = (ang: number, r: number): string =>
      `${f1(cx + Math.cos(ang) * r)},${f1(cy + Math.sin(ang) * r)}`;
    d += `M${p(a - w, r1)} L${p(a, r2)} L${p(a + w, r1)} Z `;
  }
  return d.trim();
}

const NOON_WITCH: Partial<FigureSpec> = {
  bg: '#f6e3a1',
  motif: 'none',
  body: BROWN,
  hatColor: '#5b5850',
  skin: WOOD,
  mood: 'sly',
  prop: undefined,
  backdrop: [
    // Slunce jako hodiny: obě ručičky na dvanáctce.
    ['f', '#ef8a2e', rays(194, 66, 24, 36, 14), 1.2],
    ['f', GOLD, c(194, 66, 24), 1.8],
    ['f', PAPER, c(194, 66, 16), 1.4],
    ['l', 'M194,52 v3 M194,77 v3 M180,66 h3 M205,66 h3 M201,54 l-1.5,2.5 M187,54 l1.5,2.5', 1],
    ['l', 'M194,66 L194,53 M194,66 L194,58', 2.2],
    ['f', INK, c(194, 66, 2), 0],
    // Vesnický kostelík (zvoní poledne).
    ['f', '#9a958a', 'M16,192 C40,184 70,186 96,190 C140,184 190,188 234,184 L234,200 L16,200 Z', 0],
    ['f', PAPER, rect(30, 140, 18, 52), 1.4],
    ['f', '#b8302a', 'M27,142 L39,116 L51,142 Z', 1.4],
    ['l', 'M39,116 L39,106 M35,110 h8', 1.2],
    ['f', GOLD, 'M35,160 C35,152 43,152 43,160 L44,164 L34,164 Z', 1],
    ['l', 'M52,150 c4,4 4,10 0,14 M56,146 c6,6 6,16 0,22', 1],
    ['f', PAPER, rect(48, 168, 34, 24), 1.3],
    ['f', '#b8302a', 'M45,170 L65,154 L85,170 Z', 1.3],
    // Zralé pole se snopy.
    ['f', GOLD, 'M16,196 C60,188 120,194 160,190 C200,186 220,190 234,188 L234,284 L16,284 Z', 1.6],
    [
      'l',
      'M24,224 l3,-10 M36,220 l3,-10 M48,226 l3,-10 M190,214 l3,-10 M206,222 l3,-10 M220,214 l3,-10',
      1.2,
    ],
    [
      'f',
      '#f2cf4a',
      'M198,198 L204,180 L196,166 L205,171 L210,160 L215,171 L224,166 L216,180 L222,198 Z',
      1.3,
    ],
    ['f', '#c08a1e', 'M202,180 L218,180 L218,184 L202,184 Z', 0.8],
    ['l', 'M206,196 L208,186 M214,196 L212,186 M210,170 L210,178', 0.9],
  ],
  extra: [
    ...knot('#5b5850'),
    // Vrásky kolem očí.
    ['l', 'M104,150 l-4,-2 M104,155 l-4,1 M146,150 l4,-2 M146,155 l4,1 M114,184 c4,3 18,3 22,0', 1],
    // Křivá berla.
    ['s', '#5a3418', 'M187,238 L190,140 C190,126 206,124 208,136', 5],
    ...hand(189, 198, WOOD),
    // Stůl s kostkovaným ubrusem: polévka a hned po ní hlavní chod.
    ['f', PAPER, rect(16, 236, 218, 48), 1.6],
    ['f', RED, checks(236, 12), 0],
    ['l', 'M16,236 H234', 1.6],
    ['f', PAPER, 'M48,224 C48,244 62,252 80,252 C98,252 112,244 112,224 Z', 1.6],
    ['s', '#2f5fa8', 'M52,234 C64,240 96,240 108,234', 2],
    ['f', GOLD, c(80, 224, 32, 6), 1.4],
    ['f', '#f6e3a1', `${c(70, 223, 3, 1.6)} ${c(84, 225, 3, 1.6)} ${c(92, 222, 2.4, 1.4)}`, 0.7],
    ['s', '#9a958a', 'M96,222 L110,198', 3],
    ['l', 'M66,212 c-4,-6 4,-10 0,-16 M80,210 c-4,-6 4,-10 0,-16', 1.1],
    ['f', PAPER, c(176, 248, 38, 10), 1.6],
    ['f', '#ef8a2e', 'M148,250 C160,244 192,244 204,250 C194,256 158,256 148,250 Z', 1],
    ['f', '#f6e3a1', `${c(160, 242, 9, 6)} ${c(176, 240, 9, 6)} ${c(192, 243, 9, 6)}`, 1.2],
    ['l', 'M156,240 l2,0 M164,244 l2,0 M172,238 l2,0 M180,242 l2,0 M188,241 l2,0 M196,245 l2,0', 1.4],
  ],
};

/* ---------------------------------------------------------------- Klekánice */

/** Korunka v okně (doma jsou všichni králové). */
const crown = (x: number, y: number): string =>
  `M${x - 4},${y + 3} L${x - 4},${y - 2} L${x - 2},${y} L${x},${y - 3} L${x + 2},${y} L${x + 4},${y - 2} L${x + 4},${y + 3} Z`;

const KLEKANICE: Partial<FigureSpec> = {
  bg: '#6b4a9e',
  motif: 'none',
  body: '#d9d2c2',
  hatColor: '#d9d2c2',
  skin: '#bcd6e6',
  prop: undefined,
  backdrop: [
    // Soumrak: pruh večerní oblohy, srpek a hvězdy.
    ['f', '#e88a9a', 'M16,150 C70,144 180,146 234,140 L234,210 L16,210 Z', 0],
    ['f', '#ffd34d', crescent(204, 60, 18), 1.5],
    [
      'l',
      stars([
        [110, 44],
        [160, 60],
        [226, 108],
        [92, 82],
      ]),
      1.2,
    ],
    // Kostel se zvonicí — zvoní klekání.
    ['f', '#9a958a', 'M28,206 L28,96 L56,96 L56,206 Z', 1.6],
    ['f', NAVY, 'M24,98 L42,58 L60,98 Z', 1.6],
    ['l', 'M42,58 L42,46 M38,50 h8', 1.2],
    ['f', INK, 'M34,128 L34,114 C34,106 50,106 50,114 L50,128 Z', 1.2],
    ['f', GOLD, 'M36,124 C36,114 48,114 48,124 L50,128 L34,128 Z', 1.2],
    ['f', GOLD, c(42, 130, 2), 0.8],
    ['l', 'M62,108 c6,6 6,16 0,22 M68,102 c10,10 10,24 0,34', 1.3],
    // Vesnice: v rozsvícených oknech už jsou doma i králové.
    ['f', NAVY, 'M160,206 L160,172 L184,152 L208,172 L208,206 Z', 1.5],
    ['f', NAVY, 'M200,206 L200,180 L218,164 L236,180 L236,206 Z', 1.5],
    ['f', YELLOW, `${rect(168, 178, 14, 12)} ${rect(188, 178, 14, 12)} ${rect(212, 184, 12, 11)}`, 1.2],
    ['f', INK, `${crown(175, 185)} ${crown(195, 185)} ${crown(218, 190)}`, 0],
    ['f', '#2f6b3a', 'M16,206 C70,198 180,204 234,200 L234,284 L16,284 Z', 1.4],
  ],
  extra: [
    // Propadlé oči, ve tmě svítí.
    ['f', NAVY, `${c(114, 151, 7.5, 6.5)} ${c(136, 151, 7.5, 6.5)}`, 0],
    ['f', YELLOW, `${c(115, 152, 2.4)} ${c(137, 152, 2.4)}`, 0],
    // Dlouhá kostnatá ruka s drápky natažená po těch, kdo nejsou doma.
    [
      'f',
      '#bcd6e6',
      `${finger(
        [
          [70, 218],
          [58, 196],
          [60, 178],
        ],
        5.5,
        3,
      )} ${finger(
        [
          [76, 215],
          [70, 190],
          [75, 172],
        ],
        5.5,
        3,
      )} ${finger(
        [
          [83, 215],
          [87, 190],
          [82, 172],
        ],
        5.5,
        3,
      )} ${finger(
        [
          [89, 219],
          [101, 199],
          [98, 182],
        ],
        5.5,
        3,
      )} ${finger(
        [
          [91, 229],
          [103, 225],
          [109, 216],
        ],
        5.5,
        3,
      )}`,
      1.4,
    ],
    ['f', '#bcd6e6', c(80, 226, 12, 11), 1.6],
    [
      'f',
      'dark',
      'M61.6,178.2 L60.5,173.5 L58.4,177.8 Z M76.5,172.4 L76.2,167.7 L73.5,171.6 Z M83.5,171.6 L80.8,167.7 L80.5,172.4 Z M99.6,181.7 L97.2,177.6 L96.4,182.3 Z M110.3,216.9 L111.5,212.3 L107.7,215.1 Z',
      0,
    ],
    [
      'l',
      'M55.7,196.6 L60.3,195.4 M67.6,190.1 L72.4,189.9 M84.6,190.1 L89.4,189.9 M98.7,198.4 L103.3,199.6 M101.6,223.1 L104.4,226.9',
      1,
    ],
  ],
};

/* ---------------------------------------------------------------- Pan farář */

const PRIEST: Partial<FigureSpec> = {
  bg: '#bcd6e6',
  motif: 'none',
  body: INK,
  hairColor: '#d9d2c2',
  prop: undefined,
  backdrop: [
    // Obláček, kopce a barokní kostel s cibulovou bání.
    ['f', PAPER, fluff(186, 62, 22, 9, 9), 1.3],
    ['f', '#c6dcae', 'M16,170 C60,150 110,160 150,166 C190,156 214,160 234,156 L234,200 L16,200 Z', 1.4],
    ['f', PAPER, rect(24, 98, 26, 98), 1.6],
    ['f', '#2f6b3a', 'M37,62 C26,66 22,78 30,86 L26,98 L48,98 L44,86 C52,78 48,66 37,62 Z', 1.6],
    ['l', 'M37,62 L37,50 M33,54 h8', 1.2],
    ['f', GOLD, c(37, 114, 6), 1.2],
    ['f', INK, 'M33,136 L33,128 C33,122 41,122 41,128 L41,136 Z', 0],
    ['f', PAPER, 'M50,196 L50,140 L84,140 L84,196 Z', 1.6],
    ['f', '#b8302a', 'M48,142 L58,124 L86,124 L86,142 Z', 1.4],
    ['f', INK, 'M60,170 L60,158 C60,152 70,152 70,158 L70,170 Z', 0],
    ['f', '#5d9a3e', 'M16,196 C60,188 120,194 160,190 C200,186 220,190 234,188 L234,284 L16,284 Z', 1.6],
    // Ovečky na pastvě; ta nejlesklejší má zlatý zvonek.
    ...sheep(182, 202, 0.7, -1),
  ],
  outfit: [
    // Řada knoflíků na klerice a zlatý křížek.
    ['f', '#5b5850', `${c(125, 262, 2)} ${c(125, 272, 2)} ${c(125, 282, 2)}`, 0.8],
    [
      'f',
      GOLD,
      'M122,230 L128,230 L128,236 L134,236 L134,242 L128,242 L128,254 L122,254 L122,242 L116,242 L116,236 L122,236 Z',
      1.2,
    ],
  ],
  extra: [
    // Pastýřská hůl.
    ['s', WOOD, 'M212,262 L213,132 C213,112 192,110 190,124 C189,132 196,134 198,130', 5],
    ...hand(213, 204),
    ...sheep(38, 234, 1, 1),
    ['f', RED, fluff(32, 236, 5, 5, 8), 1],
    ['f', YELLOW, spark(24, 216, 4), 0.8],
    ...sheep(212, 242, 0.85, -1),
    ['s', RED, 'M192,240 C194,246 200,248 204,244', 2],
    ['f', GOLD, 'M194,248 C194,242 202,242 202,248 L204,254 L192,254 Z', 1.1],
    ['f', YELLOW, `${spark(184, 252, 5)} ${spark(224, 222, 4)} ${spark(206, 258, 3)}`, 0.8],
  ],
};

/* ---------------------------------------------------------------- Vědma */

/** Třásně ubrusu a čelenka z mincí. */
const FRINGE = Array.from(
  { length: 28 },
  (_, i) => `M${16 + i * 8},240 L${20 + i * 8},248 L${24 + i * 8},240 Z`,
).join(' ');
const COIN_BAND = [-20, -10, 0, 10, 20]
  .map((dx) => c(125 + dx, 129 + Math.abs(dx) * 0.22 + (dx * dx) / 80, 3.6))
  .join(' ');

const SEER: Partial<FigureSpec> = {
  bg: '#cbb8e3',
  motif: 'none',
  body: RED,
  hairColor: '#5a3418',
  hatColor: '#6b4a9e',
  prop: undefined,
  backdrop: [
    // Stan věštírny: závěsy s hvězdami a třásněmi.
    ['f', NAVY, 'M16,16 L86,16 C76,96 54,150 16,196 Z', 1.6],
    ['f', NAVY, 'M234,16 L164,16 C174,96 196,150 234,196 Z', 1.6],
    [
      'f',
      GOLD,
      `${spark(30, 120, 4)} ${spark(56, 76, 4)} ${spark(40, 160, 3)} ${spark(206, 60, 4)} ${spark(194, 112, 4)} ${spark(220, 150, 3)}`,
      0.8,
    ],
    ['s', GOLD, 'M86,16 C76,96 54,150 16,196 M164,16 C174,96 196,150 234,196', 2.4],
    ['l', 'M125,22 L125,46', 1],
    ['f', '#ffd34d', crescent(128, 58, 12), 1.3],
  ],
  extra: [
    ...knot('#6b4a9e'),
    // Čelenka z mincí a velké náušnice.
    ['f', GOLD, COIN_BAND, 1],
    ['s', GOLD, `${c(98, 182, 5)} ${c(152, 182, 5)}`, 2],
    // Stůl s ubrusem a třásněmi, na něm Dvojice a svíčka.
    ['f', '#8e3b6e', rect(16, 240, 218, 44), 1.6],
    ['f', GOLD, spark(180, 254, 4), 0.8],
    ['f', GOLD, FRINGE, 1],
    ...heartCard(38, 248, -10, 1.1),
    ...heartCard(60, 250, 8, 1.1),
    ['f', PAPER, rect(204, 200, 12, 42), 1.4],
    ['f', YELLOW, 'M210,182 C204,192 206,198 210,198 C214,198 216,192 210,182 Z', 1.2],
    ['l', 'M210,198 v2 M204,206 c2,4 2,6 0,8', 1],
    // Křišťálová koule: v ní déšť a Dvojice.
    ['f', GOLD, 'M104,242 L146,242 L154,258 L96,258 Z', 1.6],
    ['f', '#bcd6e6', c(125, 218, 27), 2],
    [
      'f',
      PAPER,
      'M110,212 C108,206 116,202 120,206 C122,200 132,200 134,206 C140,204 144,212 138,214 L114,215 C110,215 108,214 110,212 Z',
      1.1,
    ],
    ['l', 'M116,220 l-2,5 M124,220 l-2,5 M132,220 l-2,5', 1.2],
    ['f', PAPER, `${quad(119, 234, 8, 11, -8)} ${quad(130, 234, 8, 11, 8)}`, 0.9],
    ['f', RED, `${heart(119, 234, 2)} ${heart(130, 234, 2)}`, 0],
    ['s', PAPER, 'M106,206 C108,198 114,194 120,193', 2],
    ...hand(97, 230),
    ...hand(153, 230),
  ],
};

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  // Sklář fouká do píšťaly rozžhavenou baňku u pece; na polici foukané sklo a skleněná karta, na zemi střepy.
  glassblower: GLASSBLOWER,
  // Notář v kanceláři se šanony a hodinami: listina se zlatou pečetí, razítko a sloupek mincí na poplatek.
  notary_public: NOTARY,
  // Čarodějnice u kotle, z něhož vylézá úřední razítko; za ní pálení čarodějnic, u nohou černá kočka.
  witch: WITCH,
  // Bludička se září a lucerničkou v noční bažině: rozcestník do všech stran a klobouk poutníka v tůni.
  will_o_wisp: WISP,
  // Polednice s křivou berlou, slunce-hodiny na dvanáctce, pole, kostelík; na stole polévka a hlavní chod.
  noon_witch: NOON_WITCH,
  // Klekánice s kostnatou rukou za soumraku, zvonice zvoní klekání, v oknech už jsou doma králové.
  klekanice: KLEKANICE,
  // Pan farář jako pastýř s holí mezi ovečkami (nejmilejší jsou ty s pečetí a zlatým zvonkem), kostel s bání.
  parish_priest: PRIEST,
  // Vědma ve stanu s křišťálovou koulí, v níž je déšť a Dvojice; na stole Dvojice karet a svíčka.
  seer: SEER,
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  // Vodník po pás v rybníce pod smuteční vrbou: fajfka, hrníček s dušičkami, na hladině zahozená srdce.
  vodnik: VODNIK_SCENE,
};

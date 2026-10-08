/**
 * Obrázky žolíků — dávka 02 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - party_for_two — Párty pro dva: portrét `fig-party_for_two` (FIGURES['party_for_two'])
 *  - gardener — Zahrádkář Venca: scéna `gardener` (SCENES['gardener'])
 *  - svejk — Švejk: nová scéna `j-svejk` (SCENES['j-svejk'])
 *  - piggy_bank — Pokladnička: celá scéna místo portrétu `fig-piggy_bank` (SCENES['fig-piggy_bank'])
 *  - flea_trader — Bazarník: portrét `fig-flea_trader` (FIGURES['flea_trader'])
 *  - golem — Golem: scéna `golem` (SCENES['golem'])
 *  - helpline_aunt — Teta z poradny: portrét `fig-helpline_aunt` (FIGURES['helpline_aunt'])
 *  - weekend_cottager — Chatař: portrét `fig-weekend_cottager` (FIGURES['weekend_cottager'])
 *  - shooting_gallery — Střelec z pouti: portrét `fig-shooting_gallery` (FIGURES['shooting_gallery'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import { figure } from '../figureKit';
import { c, rect } from '../sceneKit';
import type { SceneOp } from '../sceneKit';
import { GARDENER, GOLEM } from '../scenes1';

const SKIN = '#f2b48e';
const r1 = (n: number): string => String(Math.round(n * 10) / 10);

/** Bod v místních souřadnicích otočený o `ang` stupňů, zvětšený `s` a posunutý na (tx, ty). */
function pt(x: number, y: number, ang: number, tx: number, ty: number, s = 1): [number, number] {
  const a = (ang * Math.PI) / 180;
  return [tx + s * (x * Math.cos(a) - y * Math.sin(a)), ty + s * (x * Math.sin(a) + y * Math.cos(a))];
}

/** Cesta v místních souřadnicích (jen M/L/C/Q/Z s dvojicemi `x,y`) otočená, zvětšená a posunutá. */
function place(d: string, ang: number, tx: number, ty: number, s = 1): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, xs: string, ys: string) => {
    const [x, y] = pt(Number(xs), Number(ys), ang, tx, ty, s);
    return `${r1(x)},${r1(y)}`;
  });
}

/** Srdíčko se špičkou dole (střed `x,y`, velikost `s`). */
const heart = (x: number, y: number, s: number): string =>
  `M${x},${y + s} C${x - s * 1.5},${y} ${x - s * 0.9},${y - s * 1.1} ${x},${y - s * 0.4} ` +
  `C${x + s * 0.9},${y - s * 1.1} ${x + s * 1.5},${y} ${x},${y + s} Z`;

/** Okvětní lístky kytičky (kroužky kolem středu) jako jedna cesta. */
function petals(cx: number, cy: number, r: number, n = 5, pr = r * 0.55): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    d += c(cx + Math.cos(a) * r, cy + Math.sin(a) * r, pr) + ' ';
  }
  return d.trim();
}

/** Hvězdicový obrys (slunečnice, záblesk): `n` cípů mezi poloměry `ra` a `rb`. */
function starPath(cx: number, cy: number, ra: number, rb: number, n: number): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2;
    const r = i % 2 === 0 ? ra : rb;
    d += `${i === 0 ? 'M' : 'L'}${r1(cx + Math.cos(a) * r)},${r1(cy + Math.sin(a) * r)} `;
  }
  return d + 'Z';
}

/** Levý okraj trupu portrétu (BUST ve figureKit) ve výšce `y` — pro vzory na oblečení. */
function bustLeft(y: number): number {
  if (y <= 210) return 100;
  // Bézierova křivka (44,284) (48,240) (70,218) (100,210): najdi t pro dané y.
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 30; k++) {
    const t = (lo + hi) / 2;
    const u = 1 - t;
    const yy = u * u * u * 284 + 3 * u * u * t * 240 + 3 * u * t * t * 218 + t * t * t * 210;
    if (yy > y) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  const u = 1 - t;
  return u * u * u * 44 + 3 * u * u * t * 48 + 3 * u * t * t * 70 + t * t * t * 100;
}

/** Posune cestu o (dx, dy) — rozumí absolutním příkazům M/L/C/Q/S/T/H/V/A; relativní nechá být. */
function shift(d: string, dx: number, dy: number): string {
  let cmd = '';
  let idx = 0;
  return d.replace(/[a-zA-Z]|-?\d*\.?\d+/g, (tok) => {
    if (/[a-zA-Z]/.test(tok)) {
      cmd = tok;
      idx = 0;
      return tok;
    }
    let v = Number(tok);
    const i = idx++;
    if ('MLCQST'.includes(cmd)) v += i % 2 === 0 ? dx : dy;
    else if (cmd === 'H') v += dx;
    else if (cmd === 'V') v += dy;
    else if (cmd === 'A' && i % 7 === 5) v += dx;
    else if (cmd === 'A' && i % 7 === 6) v += dy;
    return r1(v);
  });
}

/** Posune celé tahy scény. */
function moveOps(ops: readonly SceneOp[], dx: number, dy: number): SceneOp[] {
  return ops.map((op): SceneOp => {
    switch (op[0]) {
      case 'f':
        return ['f', op[1], shift(op[2], dx, dy), op[3]];
      case 'l':
        return ['l', shift(op[1], dx, dy), op[2]];
      case 's':
        return ['s', op[1], shift(op[2], dx, dy), op[3]];
      case 'h':
        return ['h', shift(op[1], dx, dy), op[2]];
      default:
        return ['i', op[1], op[2] + dx, op[3] + dy, op[4], op[5]];
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Párty pro dva — dvě skleničky ťukají „na nás dva“, girlanda, disko koule, dvojice balonků-srdíček.

/** Sklenička na šampaňské v místních souřadnicích (okraj nahoře ve 0,0, stopka dolů). */
const FLUTE = 'M-8,0 L8,0 C8,16 6,28 2,34 L2,50 L9,55 L-9,55 L-2,50 L-2,34 C-6,28 -8,16 -8,0 Z';
const FIZZ = 'M-7,7 L7,7 C7,17 5.5,26 2,31 L-2,31 C-5.5,26 -7,17 -7,7 Z';

function flute(ang: number, x: number, y: number): SceneOp[] {
  const bubbles = [
    [-2, 14],
    [2, 20],
    [-1, 25],
  ]
    .map(([bx, by]) => {
      const [px, py] = pt(bx!, by!, ang, x, y, 1.2);
      return c(px, py, 1.3);
    })
    .join(' ');
  return [
    ['f', '#fffaf0', place(FLUTE, ang, x, y, 1.2), 1.6],
    ['f', '#f2cf4a', place(FIZZ, ang, x, y, 1.2), 0],
    ['f', '#fffaf0', bubbles, 0],
    ['l', place('M-8,0 L8,0', ang, x, y, 1.2), 1.4],
  ];
}

/** Girlanda vlaječek: dva prověšené oblouky, vlaječky střídají barvy. */
function bunting(): SceneOp[] {
  const segs: [number, number, number, number, number, number][] = [
    [16, 60, 70, 86, 125, 64],
    [125, 64, 180, 86, 234, 58],
  ];
  const flags: Record<string, string[]> = { '#d7442c': [], '#f2cf4a': [], '#2f8077': [] };
  const cols = Object.keys(flags);
  let k = 0;
  let line = '';
  for (const [x0, y0, cx, cy, x1, y1] of segs) {
    line += `M${x0},${y0} Q${cx},${cy} ${x1},${y1} `;
    for (const t of [0.14, 0.38, 0.62, 0.86]) {
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      flags[cols[k++ % cols.length]!]!.push(
        `M${r1(x - 8)},${r1(y - 1)} L${r1(x + 8)},${r1(y + 1)} L${r1(x)},${r1(y + 17)} Z`,
      );
    }
  }
  return [['l', line, 1.2], ...cols.map((col): SceneOp => ['f', col, flags[col]!.join(' '), 1.1])];
}

const PARTY: Partial<FigureSpec> = {
  prop: undefined,
  bg: '#f3c7c0',
  motif: 'none',
  body: '#6b4a9e',
  collar: 'plain',
  female: true,
  hair: 'long',
  hairColor: '#c9a060',
  mood: 'grin',
  backdrop: [
    ...bunting(),
    // Disko koule na provázku.
    ['l', 'M50,74 L50,98', 1.2],
    ['f', '#d9d2c2', c(50, 114, 16), 1.6],
    [
      'l',
      'M34,114 H66 M37,104 H63 M37,124 H63 M50,98 C42,104 42,124 50,130 M50,98 C58,104 58,124 50,130',
      0.8,
    ],
    ['f', '#fffaf0', starPath(30, 96, 6, 1.6, 4) + ' ' + starPath(72, 132, 5, 1.4, 4), 0.8],
    // Dva balonky-srdíčka svázané k sobě.
    [
      'l',
      'M178,118 C182,128 186,134 192,140 M207,106 C206,120 200,132 192,140 M192,140 l-5,5 M192,140 l5,6',
      1.1,
    ],
    ['f', '#d7442c', heart(178, 100, 17), 1.6],
    ['f', '#e88a9a', heart(207, 90, 15), 1.6],
    ['l', 'M170,92 C172,88 175,87 178,88 M200,82 C202,79 205,78 207,79', 1.2],
    // Konfety.
    [
      'f',
      '#f2cf4a',
      'M24,150 l6,2 l-1,4 l-6,-2 Z M76,170 l5,-3 l2,4 l-5,3 Z M30,196 l6,1 l-1,4 l-6,-1 Z',
      0.7,
    ],
    [
      'f',
      '#2f8077',
      'M62,150 l4,4 l-3,3 l-4,-4 Z M22,176 l6,0 l0,4 l-6,0 Z M222,196 l5,2 l-2,4 l-5,-2 Z',
      0.7,
    ],
    [
      'f',
      '#d7442c',
      'M48,182 l5,-2 l2,4 l-5,2 Z M82,140 l4,3 l-2,3 l-4,-3 Z M168,148 l5,2 l-2,4 l-5,-2 Z',
      0.7,
    ],
  ],
  outfit: [
    // Výstřih šatů a flitry.
    ['f', SKIN, 'M108,210 L125,236 L142,210 Z', 1.4],
    [
      'f',
      '#fffaf0',
      [
        c(72, 262, 1.8),
        c(86, 246, 1.6),
        c(98, 270, 1.8),
        c(158, 252, 1.6),
        c(176, 268, 1.8),
        c(150, 276, 1.6),
      ].join(' '),
      0.6,
    ],
  ],
  extra: [
    // Perlový náhrdelník.
    [
      'f',
      '#fffaf0',
      [
        [111, 216],
        [115, 221],
        [120, 224],
        [125, 225],
        [130, 224],
        [135, 221],
        [139, 216],
      ]
        .map(([x, y]) => c(x!, y!, 2.3))
        .join(' '),
      0.8,
    ],
    // Náušnice — dvě třešničky (do páru).
    ['l', 'M97,165 L95,174 M97,165 L100,175 M153,165 L151,174 M153,165 L156,175', 1],
    ['f', '#d7442c', [c(94, 176, 2.8), c(101, 177, 2.8), c(150, 176, 2.8), c(157, 177, 2.8)].join(' '), 0.9],
    // Párty kornoutek na hlavě.
    ['f', '#f2cf4a', 'M106,120 C118,112 130,110 142,112 L130,64 Z', 1.8],
    ['f', '#d7442c', 'M112,104 L124,100 L126,108 L110,112 Z M118,84 L127,81 L128,88 L116,92 Z', 0],
    ['l', 'M106,120 C118,112 130,110 142,112 L130,64 Z', 1.8],
    ['f', '#e88a9a', c(130, 62, 6), 1.4],
    // Ťuknutí: její sklenička a skleničky partnera, který stojí mimo obraz.
    ...flute(18, 173, 164),
    ['f', SKIN, c(158, 220, 10, 9), 1.8],
    ['l', 'M150,217 l16,0 M150,223 l16,0', 1],
    ...flute(-18, 193, 166),
    ['f', '#22365c', 'M236,198 L218,206 C212,212 212,228 218,234 L236,244 Z', 1.6],
    ['f', '#fffaf0', 'M220,204 L213,208 C209,214 209,226 213,232 L221,235 C217,226 217,214 220,204 Z', 1.2],
    ['f', SKIN, c(208, 222, 9, 10), 1.8],
    ['l', 'M200,218 l14,0 M200,224 l14,0', 1],
    ['f', '#fffaf0', starPath(183, 162, 7, 2, 4), 1],
    ['l', 'M174,150 l-4,-7 M183,147 l0,-8 M192,150 l4,-7', 1.4],
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Zahrádkář Venca — nízký plot s výhledem na slunečnice, zahradní trpaslík a kompost, který „nelže“.

function picketFence(top: number): SceneOp[] {
  const ops: SceneOp[] = [];
  let grain = '';
  for (let i = 0; i < 7; i++) {
    const x = 20 + i * 31;
    ops.push([
      'f',
      'wood',
      `M${x},284 L${x},${top + 14} L${x + 13},${top} L${x + 26},${top + 14} L${x + 26},284 Z`,
      2,
    ]);
    grain += `M${x + 8},${top + 40} L${x + 9},${top + 64} M${x + 17},${top + 100} L${x + 16},${top + 128} `;
  }
  ops.push(['l', grain, 1]);
  ops.push(['f', 'wood2', `M16,${top + 30} L234,${top + 25} L234,${top + 39} L16,${top + 44} Z`, 2]);
  ops.push(['f', 'wood2', `M16,${top + 118} L234,${top + 113} L234,${top + 127} L16,${top + 132} Z`, 2]);
  return ops;
}

function sunflower(x: number, y: number, r: number, stemTo: number): SceneOp[] {
  return [
    ['s', '#3f7334', `M${x},${y} C${x + 2},${y + 20} ${x - 2},${stemTo - 20} ${x + 1},${stemTo}`, 3.4],
    ['f', '#5f9a46', place('M0,0 C8,-8 18,-6 22,0 C16,6 8,6 0,0 Z', -20, x + 1, y + r + 14), 1.2],
    ['f', '#f2cf4a', starPath(x, y, r, r * 0.6, 12), 1.4],
    ['f', '#8c5632', c(x, y, r * 0.45), 1.4],
  ];
}

const GARDEN_BACK: SceneOp[] = [
  ['f', 'daysky', rect(16, 16, 218, 268), 0],
  [
    'l',
    'M200,20 L200,24 M222,44 L226,44 M174,44 L178,44 M216,26 L219,23 M184,26 L181,23 M216,62 L219,65 M184,62 L181,65',
    1.6,
  ],
  ['f', 'sun', c(200, 44, 14), 2],
  // Slunečnice za plotem.
  ...sunflower(40, 96, 17, 150),
  ...sunflower(66, 118, 12, 150),
  ...sunflower(216, 102, 14, 150),
  ...picketFence(120),
  // Zahradní trpaslík s lopatkou.
  ['f', '#2f3542', 'M24,226 L24,218 L36,218 L36,226 Z M40,226 L40,218 L52,218 L52,226 Z', 1.4],
  ['f', '#3d6ab0', 'M22,220 C22,196 28,184 38,182 C48,184 54,196 54,220 Z', 1.6],
  ['f', SKIN, c(38, 172, 8, 7), 1.4],
  ['f', 'cloud', 'M28,172 C30,196 46,196 48,172 C44,180 32,180 28,172 Z', 1.4],
  ['f', 'nose', c(38, 173, 2.6), 1],
  ['f', '#d7442c', 'M28,168 C30,156 34,146 44,138 C44,148 48,160 48,168 Z', 1.6],
  ['l', 'M56,222 L58,186', 1.6],
  ['f', '#9a958a', 'M53,190 L63,190 L62,180 L58,176 L54,180 Z', 1.2],
  ['f', SKIN, c(54, 202, 4), 1.2],
  // Kompost z prken: hlína, slupky, žížala a pára — kompost nelže.
  ['f', '#5a3418', 'M178,164 C186,150 222,148 230,164 Z', 1.6],
  ['f', '#ef8a2e', 'M192,156 C196,150 204,152 202,158 C198,156 195,157 192,156 Z', 1.1],
  ['f', '#5f9a46', 'M210,152 C214,146 222,148 220,156 C216,152 213,153 210,152 Z', 1.1],
  ['f', 'wood2', 'M176,164 H232 V212 H176 Z', 1.8],
  ['f', 'wood', 'M180,168 H228 V178 H180 Z M180,182 H228 V192 H180 Z M180,196 H228 V206 H180 Z', 1.2],
  ['s', '#e88a9a', 'M200,158 C202,150 208,152 208,146 C208,142 212,141 213,144', 2.4],
  ['l', 'M188,142 c-4,-6 4,-8 0,-14 M206,136 c-4,-6 4,-8 0,-14 M222,142 c-4,-6 4,-8 0,-14', 1.2],
];

const GARDENER_SCENE: SceneOp[] = [
  ...GARDEN_BACK,
  ...GARDENER.slice(17),
  // Beruška na cuketě.
  ['f', '#d7442c', c(186, 226, 4.4), 1.2],
  ['l', 'M186,222 L186,230', 0.9],
  ['f', 'dark', `${c(184, 225, 0.9)} ${c(188, 227, 0.9)} ${c(186, 221.6, 1.6)}`, 0],
];

// ---------------------------------------------------------------------------------------------------------------
// Švejk — c. a k. pěšák v polní čepici salutuje v hospodě, dýmka, a na stěně obraz pána, na kterém se podepsaly mouchy.

const SVEJK_SCENE: SceneOp[] = figure({
  bg: '#eadfc6',
  motif: 'none',
  body: '#8aa0b8',
  collar: 'uniform',
  accent: '#5d9a3e',
  hair: 'short',
  hairColor: '#8a5a34',
  mood: 'smile',
  hat: 'cap',
  hatColor: '#8aa0b8',
  hatAccent: '#e6b347',
  backdrop: [
    // Hospodské obložení a polička s půllitry.
    ['f', '#c99a62', rect(16, 176, 218, 108), 1.4],
    ['l', 'M38,184 V284 M60,184 V284 M82,184 V284 M168,184 V284 M190,184 V284 M212,184 V284', 1],
    ['f', '#8c5632', rect(16, 170, 218, 9), 1.4],
    ['f', '#8c5632', rect(20, 100, 64, 6), 1.2],
    ['i', 'beer-stein', 22, 70, 31, '#e9b030'],
    ['i', 'beer-stein', 50, 70, 31, '#e9b030'],
    // Obraz pána s licousy — a mouchy na něm.
    ['f', '#e6b347', rect(166, 34, 58, 72), 1.8],
    ['f', '#d9d2c2', rect(173, 41, 44, 58), 1.1],
    ['f', '#22365c', 'M176,99 C178,86 186,81 195,80 C204,81 212,86 214,99 Z', 1],
    ['f', SKIN, c(195, 66, 8, 10), 1],
    ['f', '#fffaf0', 'M186,66 C184,80 190,84 195,78 C200,84 206,80 204,66 C200,74 190,74 186,66 Z', 0.8],
    [
      'f',
      'dark',
      [
        c(180, 50, 0.9),
        c(206, 56, 0.9),
        c(199, 88, 0.9),
        c(184, 76, 0.9),
        c(210, 46, 0.9),
        c(192, 53, 0.9),
      ].join(' '),
      0,
    ],
    // Moucha s klikatou dráhou letu.
    ['l', 'M150,66 c-6,-6 -2,-12 4,-8 c6,4 2,10 -2,6', 0.8],
    ['f', 'dark', c(158, 70, 2.4, 1.6), 0],
    ['f', '#fffaf0', `${c(156, 66, 2.4, 1.6)} ${c(161, 66, 2.4, 1.6)}`, 0.6],
  ],
  outfit: [
    // Řemen chlebníku přes prsa.
    ['s', '#8c5632', 'M160,214 L104,284', 8],
  ],
  extra: [
    // Přehnutá záložka polní čepice s knoflíky (v barvě sukna) a růžice.
    ['f', '#8aa0b8', 'M96,124 L154,124 L154,133 L96,133 Z', 1.4],
    ['f', '#e6b347', `${c(111, 129, 2.2)} ${c(139, 129, 2.2)}`, 0.9],
    // Dýmka v koutku a kouř.
    ['s', '#5a3418', 'M134,176 C142,182 148,188 152,192', 3.2],
    ['f', '#8c5632', 'M148,186 L166,186 L164,204 C161,209 153,209 151,204 Z', 1.6],
    ['f', '#5a3418', 'M148,186 L166,186 L165,190 L149,190 Z', 0],
    ['f', 'cloud', `${c(166, 176, 4)} ${c(172, 164, 5)} ${c(170, 148, 6)}`, 1.1],
    // Salutování: rukáv, manžeta a dlaň u čepice.
    ['f', '#8aa0b8', 'M100,214 L68,182 L102,146 L92,134 L48,170 C40,176 40,186 46,192 L72,228 Z', 2],
    ['f', '#6f8aa8', 'M92,134 L102,146 L96,152 L86,140 Z', 1.2],
    [
      'f',
      SKIN,
      'M86,138 C88,126 92,116 98,110 C102,106 108,108 107,114 L104,128 C102,136 98,142 92,144 Z',
      1.8,
    ],
    ['l', 'M94,128 L104,114 M92,134 L104,122', 0.9],
  ],
});

// ---------------------------------------------------------------------------------------------------------------
// Pokladnička — malované keramické prasátko na poličce, mince padá do štěrbiny, kladívko na provázku a kalendář
// s odškrtanými koly do rozbití.

const PIGGY_WALL: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  [
    'f',
    '#f3e8cf',
    'M28,16 H36 V284 H28 Z M80,16 H88 V284 H80 Z M132,16 H140 V284 H132 Z M184,16 H192 V284 H184 Z',
    0,
  ],
  // Kalendář s odškrtanými dny a zakroužkovaným dnem rozbití.
  ['f', '#fffaf0', rect(164, 34, 56, 54), 1.6],
  ['f', '#d7442c', rect(164, 34, 56, 12), 1.4],
  ['f', '#2f3542', `${rect(176, 29, 3, 9)} ${rect(204, 29, 3, 9)}`, 0],
  [
    'l',
    'M169,52 l8,8 M177,52 l-8,8 M182,52 l8,8 M190,52 l-8,8 M195,52 l8,8 M203,52 l-8,8 M208,52 l8,8 M216,52 l-8,8 ' +
      'M169,66 l8,8 M177,66 l-8,8 M182,66 l8,8 M190,66 l-8,8 M195,66 l8,8 M203,66 l-8,8',
    1.1,
  ],
  ['l', 'M168,80 h8 M181,80 h8', 1],
  ['s', '#d7442c', c(212, 70, 6), 1.8],
];

/** Polička s prasátkem (kreslená o kus níž, posune se nahoru, ať se celá vejde do okna obrázku). */
const PIGGY_SHELF: SceneOp[] = [
  // Polička s konzolami.
  ['f', '#c99a62', rect(16, 238, 218, 10), 1.6],
  ['f', '#8c5632', rect(16, 248, 218, 6), 1.2],
  ['f', '#8c5632', 'M34,254 L50,254 L34,276 Z M200,254 L216,254 L216,276 Z', 1.2],
  // Sloupky úspor.
  ['f', '#e6b347', 'M22,238 V214 H44 V238 Z M26,214 V200 H44 V214 Z', 1.4],
  ['l', 'M22,220 H44 M22,226 H44 M22,232 H44 M26,206 H44', 0.9],
  // Prasátko: zadní nohy, ucho vzadu, tělo, rypák, ucho vpředu, ocásek.
  ['h', c(120, 238, 74, 5), 0],
  ['f', '#e88a9a', 'M66,214 L82,214 L80,238 L68,238 Z M150,214 L166,214 L164,238 L152,238 Z', 1.8],
  ['h', 'M66,214 L82,214 L80,238 L68,238 Z M150,214 L166,214 L164,238 L152,238 Z', 45],
  ['f', '#e88a9a', 'M158,132 L166,106 L180,128 Z', 1.8],
  ['l', 'M44,168 C32,164 30,152 38,150 C46,148 46,160 38,160 C30,160 28,148 34,142', 2.4],
  ['f', '#e88a9a', c(120, 178, 76, 56), 2.4],
  ['f', '#e88a9a', 'M86,214 L102,214 L100,240 L88,240 Z M168,214 L184,214 L182,240 L170,240 Z', 1.8],
  ['h', 'M52,196 C70,226 160,238 192,204 C184,226 152,236 120,236 C84,236 58,222 52,196 Z', 45],
  ['f', '#f3c7c0', c(200, 186, 11, 16), 2],
  ['f', 'dark', `${c(197, 180, 1.8, 3)} ${c(203, 191, 1.8, 3)}`, 0],
  ['f', '#e88a9a', 'M168,134 L186,108 L194,140 Z', 1.8],
  ['f', '#f3c7c0', 'M174,132 L185,116 L189,136 Z', 0],
  ['f', 'dark', c(176, 160, 3.2), 0],
  ['l', 'M170,152 C174,149 179,149 182,152', 1.3],
  ['f', 'blush', c(182, 184, 7), 0],
  ['l', 'M178,204 C184,208 190,207 194,202', 1.6],
  // Malované kytičky na boku (lidová keramika).
  [
    'f',
    '#5f9a46',
    [
      place('M0,0 C6,-6 14,-5 18,0 C14,5 6,5 0,0 Z', 30, 100, 196),
      place('M0,0 C6,-6 14,-5 18,0 C14,5 6,5 0,0 Z', -150, 92, 190),
      place('M0,0 C6,-6 14,-5 18,0 C14,5 6,5 0,0 Z', -30, 134, 214),
    ].join(' '),
    0.9,
  ],
  ['f', '#fffaf0', `${petals(96, 184, 8)} ${petals(130, 208, 6)} ${petals(72, 160, 5)}`, 1],
  ['f', '#2f5fa8', `${petals(140, 160, 5)} ${petals(66, 196, 4.4)}`, 0.9],
  [
    'f',
    '#f2cf4a',
    `${c(96, 184, 3.6)} ${c(130, 208, 2.8)} ${c(72, 160, 2.4)} ${c(140, 160, 2.4)} ${c(66, 196, 2)}`,
    0.8,
  ],
  // Prasklinka — dlouho už nevydrží.
  ['l', 'M78,130 L84,140 L78,147 L86,157', 1.3],
  // Mašle kolem krku a provázek ke kladívku, které leží vedle na poličce.
  ['f', '#d7442c', 'M154,128 C162,150 164,200 158,230 L166,230 C172,200 170,150 162,126 Z', 1.4],
  ['f', '#d7442c', 'M162,222 L150,214 L150,232 Z M162,222 L174,214 L174,232 Z', 1.4],
  ['f', '#d7442c', c(162, 223, 3.4), 1.2],
  ['f', '#c99a62', rect(186, 224, 22, 7), 1.4],
  ['f', '#9a958a', 'M206,214 L222,214 L222,238 L206,238 Z', 1.8],
  ['f', '#5b5850', rect(206, 214, 16, 5), 0],
  ['l', 'M163,226 C168,238 178,236 186,228', 1.2],
  // Štěrbina a mince, která právě padá dovnitř.
  ['f', 'dark', 'M100,124 C110,121 130,121 140,124 L139,129 C129,126 111,126 101,129 Z', 0],
  ['f', '#e6b347', 'M106,125 A14,14 0 0,1 134,125 Z', 1.6],
  ['l', 'M110,125 A10,10 0 0,1 130,125', 1],
  ['l', 'M112,104 l0,-8 M120,101 l0,-10 M128,104 l0,-8', 1.4],
];

const PIGGY_SCENE: SceneOp[] = [...PIGGY_WALL, ...moveOps(PIGGY_SHELF, 0, -14)];

// ---------------------------------------------------------------------------------------------------------------
// Bazarník — pod modrou plachtou blešího trhu, za ním skoro prázdný regál s cenovkou (prodá i ten regál).

const FLEA: Partial<FigureSpec> = {
  prop: undefined,
  bg: '#f6e3a1',
  motif: 'none',
  body: '#8c5632',
  collar: 'vest',
  accent: '#2f6b3a',
  hair: 'bald',
  hairColor: '#5e3a20',
  beard: 'walrus',
  beardColor: '#5e3a20',
  hat: 'flatcap',
  hatColor: '#5b5850',
  mood: 'sly',
  backdrop: [
    // Modrá plachta s provazy.
    ['f', '#2f5fa8', 'M16,22 H234 V42 C204,56 160,48 125,58 C90,48 46,56 16,42 Z', 1.6],
    ['l', 'M60,24 C62,36 64,44 62,52 M125,24 V56 M190,24 C188,36 186,44 188,52', 0.9],
    // Regál: stojny, police, skoro nic na nich.
    ['f', '#c99a62', rect(28, 64, 194, 150), 1.6],
    ['f', '#8c5632', `${rect(22, 62, 10, 154)} ${rect(218, 62, 10, 154)}`, 1.6],
    ['f', '#8c5632', `${rect(22, 98, 206, 7)} ${rect(22, 140, 206, 7)} ${rect(22, 182, 206, 7)}`, 1.4],
    ['i', 'alarm-clock', 178, 70, 28, '#d7442c'],
    ['i', 'tv', 38, 106, 34, '#9a958a'],
    // Cenovka na provázku visí i na regálu.
    ['l', 'M223,147 C220,156 214,160 210,162', 1],
    ['f', '#fffaf0', place('M0,0 L22,-4 L26,8 L4,12 Z', 20, 190, 160), 1.4],
    ['l', place('M6,4 C9,1 12,7 15,3 C17,1 19,5 21,3', 20, 190, 160), 1],
    ['f', 'dark', c(212, 166, 1.4), 0],
  ],
  outfit: [
    // Prošívání vesty.
    ['l', 'M84,240 L108,252 M80,258 L110,270 M166,240 L142,252 M170,258 L140,270', 0.9],
  ],
  extra: [
    // Tužka za uchem.
    ['f', '#f2cf4a', place('M0,-3 L22,-3 L22,3 L0,3 Z', 150, 176, 140), 1.2],
    ['f', '#2f3542', place('M22,-3 L29,0 L22,3 Z', 150, 176, 140), 1],
    ['f', '#e88a9a', place('M-5,-3 L0,-3 L0,3 L-5,3 Z', 150, 176, 140), 1],
    // Bedna s harampádím v popředí: deštník, lucerna a cenovka.
    ['i', 'umbrella', 22, 176, 38, '#6b4a9e'],
    ['i', 'old-lantern', 44, 194, 30, '#e9b030'],
    ['f', '#c99a62', 'M18,222 L76,218 L78,264 L18,264 Z', 1.8],
    ['l', 'M18,236 L77,232 M18,250 L77,247 M34,221 L34,264 M60,219 L61,264', 1],
    ['f', '#fffaf0', place('M0,0 L20,-4 L23,7 L3,11 Z', -8, 40, 240), 1.3],
    ['l', place('M5,4 C8,1 11,7 14,3 C16,1 18,5 20,3', -8, 40, 240), 0.9],
    // Vějíř bankovek v ruce.
    ...[-105, -78, -51].map((a): SceneOp => [
      'f',
      '#5d9a3e',
      place('M0,-11 L44,-11 L44,11 L0,11 Z', a, 186, 244),
      1.4,
    ]),
    ['f', '#c6dcae', [-105, -78, -51].map((a) => c(...pt(30, 0, a, 186, 244), 5)).join(' '), 0.9],
    ['f', SKIN, c(186, 244, 11, 9), 1.8],
    ['l', 'M177,241 l18,0 M177,247 l18,0', 1.1],
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Golem — hliněný obr se šémem před pilovitým štítem staré synagogy, v dlani kamenná karta; návod nikde.

/** Štít se zubatým okrajem (vrchol `ax,ay`, pata `x0..x1` ve výšce `base`). */
function sawGable(x0: number, x1: number, base: number, ax: number, ay: number, teeth: number): string {
  let d = `M${x0},${base + 80} L${x0},${base} `;
  for (let i = 1; i <= teeth; i++) {
    const t = i / teeth;
    const x = x0 + (ax - x0) * t;
    const y = base + (ay - base) * t;
    d += `L${r1(x - 4)},${r1(y)} L${r1(x)},${r1(y)} `;
  }
  for (let i = teeth - 1; i >= 0; i--) {
    const t = i / teeth;
    const x = x1 + (ax - x1) * t;
    const y = base + (ay - base) * t;
    d += `L${r1(x)},${r1(y - (base - ay) / teeth)} L${r1(x)},${r1(y)} `;
  }
  return d + `L${x1},${base + 80} Z`;
}

const GOLEM_SCENE: SceneOp[] = [
  ...GOLEM.slice(0, 1),
  ...GOLEM.slice(3, 5),
  ...GOLEM.slice(6, 8),
  // Stará synagoga se zubatým štítem a železnými skobami na stěně (na půdu se nechodí).
  ['f', 'town', sawGable(20, 88, 162, 54, 100, 6), 2],
  [
    'f',
    'window',
    'M34,186 C34,180 40,180 40,186 L40,200 L34,200 Z M48,186 C48,180 54,180 54,186 L54,200 L48,200 Z',
    0,
  ],
  ['l', 'M62,138 v-3 h7 v3 M62,150 v-3 h7 v3 M62,162 v-3 h7 v3 M62,174 v-3 h7 v3 M62,186 v-3 h7 v3', 1.2],
  ...GOLEM.slice(9, 10),
  ...GOLEM.slice(14, 18),
  ...GOLEM.slice(18),
  // Kamenná karta v hliněné dlani.
  ['f', '#d9d2c2', place('M-21,-30 L21,-30 L21,30 L-21,30 Z', -12, 196, 214), 2],
  ['l', place('M-16,-25 L16,-25 L16,25 L-16,25 Z', -12, 196, 214), 0.9],
  [
    'f',
    '#9a958a',
    [
      [-8, -12],
      [6, -18],
      [10, 6],
      [-6, 14],
      [2, 0],
      [-12, 2],
      [12, 20],
      [-2, -22],
    ]
      .map(([x, y], i) => c(...pt(x!, y!, -12, 196, 214), 1.4 + (i % 3) * 0.6))
      .join(' '),
    0.6,
  ],
  ['l', place('M4,-30 L0,-20 L6,-12', -12, 196, 214), 1],
  [
    'f',
    'clay',
    'M234,284 L234,244 C222,232 204,236 196,240 C186,244 176,250 178,258 C180,264 192,262 200,258 L204,284 Z',
    2.2,
  ],
  ['f', 'clay', 'M182,236 C176,236 172,244 178,248 L196,246 L198,236 Z', 1.8],
  ['l', 'M200,250 C206,248 212,248 218,250 M198,258 C206,256 214,256 222,258', 1.2],
  // Otazník — šém mu vložili, návod nikdo.
  ['s', '#f2cf4a', 'M180,118 C180,106 198,106 198,118 C198,126 189,128 189,136', 5],
  ['l', 'M180,118 C180,106 198,106 198,118 C198,126 189,128 189,136', 1],
  ['f', '#f2cf4a', c(189, 145, 3.2), 1.2],
];

// ---------------------------------------------------------------------------------------------------------------
// Teta z poradny — sluchátko u ucha, zvednutý ukazováček, bublina s vykřičníkem a na poličce med a česnek.

const AUNT: Partial<FigureSpec> = {
  prop: undefined,
  bg: '#cbb8e3',
  motif: 'none',
  body: '#c86a8a',
  collar: 'plain',
  female: true,
  hair: 'curly',
  hairColor: '#d9d2c2',
  glasses: true,
  mood: 'o',
  backdrop: [
    ['f', '#8c5632', rect(18, 104, 70, 6), 1.2],
    ['i', 'honey-jar', 20, 72, 32, '#e9b030'],
    ['i', 'garlic', 54, 74, 30, '#fffaf0'],
    // Bublina s vykřičníkem.
    [
      'f',
      'cloud',
      'M168,40 C168,30 222,30 222,40 L222,78 C222,88 168,88 168,78 Z M178,86 L172,104 L190,86 Z',
      1.6,
    ],
    ['f', 'cloud', 'M179,84 L191,84 L180,90 Z', 0],
    ['s', '#d7442c', 'M195,42 L195,66', 6],
    ['f', '#d7442c', c(195, 76, 3.6), 1],
  ],
  outfit: [
    // Krajkový límeček, knoflíky svetru a brož.
    ['f', 'cloud', 'M104,212 C104,222 114,226 125,222 C136,226 146,222 146,212 L125,216 Z', 1.4],
    ['l', 'M125,224 L125,284', 1.2],
    ['f', '#e6b347', `${c(130, 244, 2.4)} ${c(130, 262, 2.4)} ${c(130, 278, 2.4)}`, 0.9],
    ['f', '#2f8077', c(148, 236, 5, 6), 1.4],
  ],
  extra: [
    // Řetízek na brýle.
    ['s', '#e6b347', 'M100,150 C94,172 98,196 112,204', 1.2],
    ['s', '#e6b347', 'M150,150 C156,172 152,196 138,204', 1.2],
    // Sluchátko u ucha, ruka a kroucená šňůra k telefonu.
    [
      'f',
      '#d7442c',
      'M152,134 C166,132 172,142 168,150 C166,168 164,180 158,190 C164,194 162,202 152,200 C144,198 142,190 146,184 L152,186 C158,172 160,160 158,150 L150,150 C146,142 146,136 152,134 Z',
      1.8,
    ],
    [
      'l',
      'M154,200 c6,4 10,0 6,-4 c-4,-4 -8,2 -2,6 c6,4 10,0 6,-4 M166,206 c6,4 10,0 6,-4 c-4,-4 -8,2 -2,6 c6,4 10,0 6,-4 M178,214 c6,4 10,0 6,-4 c-4,-4 -8,2 -2,6 c6,4 10,0 6,-4 M190,222 c4,2 8,4 10,6',
      1.1,
    ],
    ['f', '#c86a8a', 'M158,176 L178,170 L194,230 L170,238 Z', 1.8],
    ['f', SKIN, c(168, 170, 10, 11), 1.8],
    ['l', 'M160,166 l14,-2 M160,172 l15,-2', 1],
    ['f', '#d7442c', 'M178,264 L184,232 C186,226 226,226 228,232 L234,264 Z', 1.8],
    ['f', '#fffaf0', c(206, 245, 12), 1.4],
    ['f', 'dark', [0, 1, 2, 3, 4, 5, 6].map((i) => c(...pt(8, 0, i * 45 - 90, 206, 245), 1.5)).join(' '), 0],
    ['f', '#d7442c', c(206, 245, 3), 1],
    // Zvednutý ukazováček: rukáv, pěst a prst.
    ['f', '#c86a8a', 'M62,248 L58,190 L84,186 L94,240 Z', 1.8],
    ['f', SKIN, 'M74,150 C74,145 81,145 81,150 L82,178 L74,178 Z', 1.6],
    ['f', SKIN, c(73, 184, 12, 10), 1.8],
    ['l', 'M63,183 C68,180 74,180 78,184 M64,189 l15,0', 1],
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Chatař — flanelová košile, rybářský klobouček, buřt na klacku, chata se srdíčky v okenicích a kadibudka.

function flannel(): SceneOp[] {
  let d = '';
  for (const y of [226, 244, 262, 278]) {
    const l = bustLeft(y);
    d += `M${r1(l + 2)},${y} L${r1(248 - l)},${y} `;
  }
  for (const x of [66, 86, 106, 144, 164, 184]) {
    const top = x < 125 ? (x > 100 ? 210 : findTop(x)) : 250 - x > 100 ? 210 : findTop(250 - x);
    d += `M${x},${top + 2} L${x},284 `;
  }
  return [['s', '#22365c', d, 3]];
}

/** Horní okraj trupu nad bodem `x` (levá polovina). */
function findTop(x: number): number {
  for (let y = 210; y < 284; y++) if (bustLeft(y) <= x) return y;
  return 284;
}

const COTTAGER: Partial<FigureSpec> = {
  prop: undefined,
  bg: '#bcd6e6',
  motif: 'none',
  body: '#d7442c',
  collar: 'shirt',
  hair: 'short',
  hairColor: '#5e3a20',
  hat: 'bucket',
  hatColor: '#8a8f2e',
  beard: 'beard',
  beardColor: '#6b4423',
  mood: 'smile',
  backdrop: [
    // Les za chatou.
    ['f', '#2f6b3a', 'M16,206 L16,150 L30,110 L44,150 L50,128 L64,96 L78,140 L84,206 Z', 1.6],
    ['f', '#5d9a3e', 'M16,206 C70,198 170,202 234,198 L234,284 L16,284 Z', 1.4],
    // Kadibudka se srdíčkem.
    ['f', '#c99a62', 'M24,206 L24,140 L64,140 L64,206 Z', 1.8],
    ['f', '#8c5632', 'M20,142 L68,132 L68,140 L20,150 Z', 1.6],
    ['l', 'M30,150 V202 M58,150 V202 M30,150 H58 M30,202 H58', 1.2],
    ['f', 'dark', heart(44, 162, 5), 0],
    // Chata: roubení, střecha, komín s kouřem, okenice se srdíčky.
    ['f', '#8c5632', 'M156,206 L156,146 L234,146 L234,206 Z', 1.8],
    ['l', 'M156,158 H234 M156,170 H234 M156,182 H234 M156,194 H234', 1],
    ['f', '#b8302a', 'M146,150 L196,104 L244,150 Z', 1.8],
    ['f', '#9a958a', 'M170,128 L170,108 L180,108 L180,119 Z', 1.4],
    ['f', 'cloud', `${c(176, 100, 4)} ${c(170, 89, 5)} ${c(177, 76, 6)}`, 1.1],
    ['f', '#fffaf0', rect(196, 160, 20, 20), 1.4],
    ['l', 'M206,160 V180 M196,170 H216', 1],
    ['f', '#5d9a3e', `${rect(184, 158, 11, 24)} ${rect(217, 158, 11, 24)}`, 1.4],
    ['f', 'dark', `${heart(189.5, 168, 2.6)} ${heart(222.5, 168, 2.6)}`, 0],
  ],
  outfit: flannel(),
  extra: [
    // Buřt na klacku: klacek z ruky šikmo vzhůru, buřt s naříznutými konci a pára.
    ['s', '#8c5632', 'M186,246 L206,98', 4],
    ['l', 'M186,246 L206,98', 0.8],
    [
      'f',
      '#b8302a',
      place(
        'M-16,-8 C-12,-11 12,-11 16,-8 C22,-4 22,4 16,8 C12,11 -12,11 -16,8 C-22,4 -22,-4 -16,-8 Z',
        8,
        204,
        114,
      ),
      1.8,
    ],
    ['f', '#e88a9a', place('M-21,-4 L-14,0 L-21,4 Z M21,-4 L14,0 L21,4 Z', 8, 204, 114), 1],
    ['l', place('M-9,-6 C-7,-2 -7,2 -9,6 M9,-6 C7,-2 7,2 9,6 M-12,-8 C-4,-10 4,-10 12,-8', 8, 204, 114), 0.9],
    ['l', 'M194,93 c-3,-5 3,-7 0,-12 M208,89 c-3,-5 3,-7 0,-12 M222,95 c-3,-5 3,-7 0,-12', 1.1],
    ['f', SKIN, c(187, 240, 11, 9), 1.8],
    ['l', 'M178,237 l18,0 M178,243 l18,0', 1.1],
    // Rybářská muška za stuhou klobouku.
    ['f', '#f2cf4a', 'M140,128 L150,120 L148,132 Z', 1],
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Střelec z pouti — stánek s pruhovanou markýzou, terče s trefenou desítkou, plechové figurky, vzduchovka
// a obří plyšák, větší než on.

function awning(): SceneOp[] {
  const w = 218 / 9;
  const red: string[] = [];
  const cream: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = 16 + i * w;
    (i % 2 ? cream : red).push(`M${r1(x)},22 H${r1(x + w)} V46 A${r1(w / 2)},8 0 0,1 ${r1(x)},46 Z`);
  }
  return [
    ['f', '#d7442c', red.join(' '), 1.6],
    ['f', '#fffaf0', cream.join(' '), 1.6],
  ];
}

/** Vzduchovka: pažba u (0,0), hlaveň k `x = 180`, spodek pušky do záporných `y`. */
const RIFLE_ANG = 205;
const RIFLE_AT: [number, number] = [212, 252];
const rifle = (d: string): string => place(d, RIFLE_ANG, ...RIFLE_AT);

/** Plechová kachna na liště (zobák doprava). */
const DUCK =
  'M0,0 C0,-8 10,-10 16,-6 L18,-14 C18,-20 26,-20 27,-15 L32,-14 L27,-11 L24,-4 C24,2 18,4 10,4 C4,4 0,2 0,0 Z';

/** Růže z krepového papíru visící na provázku. */
function rose(x: number, y: number): SceneOp[] {
  return [
    ['l', `M${x},${y - 7} L${x},46`, 1],
    ['f', '#5d9a3e', place('M0,0 C4,-5 10,-4 12,0 C9,4 4,4 0,0 Z', -30, x + 2, y - 8), 1],
    ['f', '#d7442c', c(x, y, 7.5), 1.4],
    [
      'l',
      `M${x - 3},${y} C${x - 3},${y - 4} ${x + 3},${y - 4} ${x + 3},${y} C${x + 3},${y + 3} ${x - 1},${y + 3} ${x - 1},${y} M${x - 6},${y + 2} C${x - 3},${y + 6} ${x + 4},${y + 6} ${x + 6},${y + 1}`,
      0.9,
    ],
  ];
}

const SHOOTER: Partial<FigureSpec> = {
  prop: undefined,
  bg: '#2f8077',
  motif: 'none',
  body: '#e9b030',
  collar: 'shirt',
  hair: 'part',
  hairColor: '#3b2a1a',
  mood: 'sly',
  backdrop: [
    ...awning(),
    // Terč s trefenou desítkou.
    ['f', '#fffaf0', c(50, 92, 24), 1.8],
    ['f', '#d7442c', c(50, 92, 17), 1.2],
    ['f', '#fffaf0', c(50, 92, 11), 1.2],
    ['f', '#d7442c', c(50, 92, 5), 1.2],
    ['f', 'dark', `${c(51, 92, 1.8)} ${c(48, 90, 1.4)}`, 0],
    ['f', '#fffaf0', c(66, 148, 13), 1.6],
    ['f', '#d7442c', c(66, 148, 8), 1.1],
    ['f', '#fffaf0', c(66, 148, 3.2), 1],
    // Lišta s plechovými figurkami (jedna už spadla).
    ['f', '#8c5632', rect(16, 196, 218, 8), 1.4],
    ['f', '#f2cf4a', `${shift(DUCK, 20, 192)} ${shift(DUCK, 54, 192)}`, 1.2],
    // Papírové růže z krepáku na provázcích.
    ...rose(150, 66),
    ...rose(166, 78),
    // Obří plyšový medvěd.
    ['f', '#c99a62', c(206, 170, 30, 40), 2],
    ['f', '#c99a62', `${c(186, 76, 9)} ${c(226, 76, 9)}`, 1.8],
    ['f', '#e88a9a', `${c(186, 76, 4.5)} ${c(226, 76, 4.5)}`, 0],
    ['f', '#c99a62', c(206, 100, 25, 23), 2],
    ['f', '#f6e3a1', c(206, 110, 10, 8), 1.4],
    ['f', 'dark', `${c(198, 96, 2.4)} ${c(214, 96, 2.4)} ${c(206, 106, 3.4, 2.4)}`, 0],
    ['l', 'M206,108 L206,113 M201,114 C204,116 208,116 211,114', 1.2],
    ['f', '#d7442c', 'M206,128 L192,120 L192,136 Z M206,128 L220,120 L220,136 Z', 1.4],
    ['f', '#d7442c', c(206, 128, 3.4), 1.2],
  ],
  extra: [
    // Mrknutí — míří.
    ['f', SKIN, c(136, 152, 4.2), 0],
    ['l', 'M131,152 C134,155 138,155 141,152', 1.8],
    // Vzduchovka přes prsa: pažba, pouzdro se spouští, předpažbí, hlaveň s mířidlem.
    ['f', '#2f3542', rifle('M100,3 L180,3 L180,8 L100,8 Z M174,8 L178,8 L178,12 L174,12 Z'), 1.4],
    ['f', '#8c5632', rifle('M0,8 L0,-15 C14,-14 34,-8 56,-5 L72,-4 L72,5 L56,6 C36,7 16,8 0,8 Z'), 1.8],
    ['f', '#2f3542', rifle('M0,8 L-4,8 L-4,-15 L0,-15 Z'), 1.2],
    ['f', '#5b5850', rifle('M70,-4 L102,-4 L102,6 L70,6 Z'), 1.6],
    ['l', rifle('M78,-4 C78,-13 92,-13 92,-4 M86,-4 L84,-9'), 1.2],
    ['f', '#8c5632', rifle('M102,-4 L144,-3 L144,3 L102,3 Z'), 1.4],
    ['f', SKIN, c(...pt(60, 0, RIFLE_ANG, ...RIFLE_AT), 10, 9), 1.8],
    ['f', SKIN, c(...pt(122, 0, RIFLE_ANG, ...RIFLE_AT), 10, 9), 1.8],
  ],
};

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  party_for_two: PARTY,
  flea_trader: FLEA,
  helpline_aunt: AUNT,
  weekend_cottager: COTTAGER,
  shooting_gallery: SHOOTER,
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  gardener: GARDENER_SCENE,
  golem: GOLEM_SCENE,
  'j-svejk': SVEJK_SCENE,
  'fig-piggy_bank': PIGGY_SCENE,
};

/**
 * Obrázky žolíků — dávka 04 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - hejkal — Hejkal: portrét `fig-hejkal` (FIGURES['hejkal'])
 *  - tram_driver — Tramvaják: portrét `fig-tram_driver` (FIGURES['tram_driver'])
 *  - punter — Sázkař: portrét `fig-punter` (FIGURES['punter'])
 *  - pavlac_gossip — Drbna z pavlače: portrét `fig-pavlac_gossip` (FIGURES['pavlac_gossip'])
 *  - round_for_everyone — Rundu všem: scéna `rundu` (SCENES['rundu'])
 *  - pickled_cheese — Nakládaný hermelín: scéna `hermelin` (SCENES['hermelin'])
 *  - thirteenth_salary — Třináctý plat: nová scéna `j-thirteenth_salary` (SCENES['j-thirteenth_salary'])
 *  - temp_worker — Brigádník: portrét `fig-temp_worker` (FIGURES['temp_worker'])
 *  - fisherman — Rybář: portrét `fig-fisherman` (FIGURES['fisherman'])
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
 * M/L/C/Q/H/V/Z v místních souřadnicích kolem 0,0 (H a V se po otočení zapíšou jako L).
 */
function place(d: string, x: number, y: number, s = 1, deg = 0): string {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const T = (px: number, py: number): string =>
    `${r1(x + (px * cos - py * sin) * s)},${r1(y + (px * sin + py * cos) * s)}`;
  const out: string[] = [];
  let cmd = 'M';
  let cx = 0;
  let cy = 0;
  let pend: number | null = null;
  for (const t of d.match(/[MLCQZHV]|-?\d*\.?\d+/g) ?? []) {
    if (/^[A-Z]$/.test(t)) {
      cmd = t;
      out.push(t === 'H' || t === 'V' ? 'L' : t);
      pend = null;
      continue;
    }
    const v = Number(t);
    if (cmd === 'H' || cmd === 'V') {
      if (cmd === 'H') cx = v;
      else cy = v;
      out.push(T(cx, cy));
      continue;
    }
    if (pend === null) {
      pend = v;
      continue;
    }
    cx = pend;
    cy = v;
    out.push(T(cx, cy));
    pend = null;
  }
  return out.join(' ');
}

/** Elipsa z Bézierových křivek (dá se otáčet přes `place`). */
function ell(cx: number, cy: number, rx: number, ry = rx): string {
  const k = 0.5523;
  const [x0, x1, y0, y1] = [cx - rx, cx + rx, cy - ry, cy + ry];
  return (
    `M${r1(x0)},${r1(cy)} C${r1(x0)},${r1(cy - ry * k)} ${r1(cx - rx * k)},${r1(y0)} ${r1(cx)},${r1(y0)} ` +
    `C${r1(cx + rx * k)},${r1(y0)} ${r1(x1)},${r1(cy - ry * k)} ${r1(x1)},${r1(cy)} ` +
    `C${r1(x1)},${r1(cy + ry * k)} ${r1(cx + rx * k)},${r1(y1)} ${r1(cx)},${r1(y1)} ` +
    `C${r1(cx - rx * k)},${r1(y1)} ${r1(x0)},${r1(cy + ry * k)} ${r1(x0)},${r1(cy)} Z`
  );
}

/** Lomená uzavřená cesta z bodů. */
const poly = (pts: readonly (readonly [number, number])[]): string =>
  `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;

/** Ruka svírající předmět (stejná jako u rekvizit figureKit), prsty po směru `deg`. */
function hand(x: number, y: number, deg = 0, skin = SKIN): SceneOp[] {
  return [
    ['f', skin, place(ell(0, 0, 11, 9), x, y, 1, deg), 1.8],
    ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', x, y, 1, deg), 1.1],
  ];
}

/** Nota (hlavička, nožička, praporek) — otočená o `deg`. */
function note(x: number, y: number, color: string, deg = 0): SceneOp[] {
  return [
    ['s', color, place('M5,-1.5 L5,-21 C9,-17 13,-15 11,-8', x, y, 1, deg), 2.2],
    ['f', color, place(ell(0, 0, 5.5, 4), x, y, 1, deg - 18), 1.2],
  ];
}

/** Zubatá „chlupatá“ hvězda kolem středu (hříva, mech, kapka pěny). */
function shag(cx: number, cy: number, rx: number, ry: number, n: number, depth: number, a0 = 0): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = a0 + (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 1 - depth;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return poly(pts);
}

/** Smrk: zubatá silueta s patry větví. */
function spruce(x: number, top: number, w: number, h: number, tiers = 4): string {
  const right: [number, number][] = [];
  for (let i = 1; i <= tiers; i++) {
    const y = top + (h * i) / tiers;
    const half = (w / 2) * (0.3 + 0.7 * (i / tiers));
    right.push([x + half, y]);
    if (i < tiers) right.push([x + half * 0.35, y - (h / tiers) * 0.15]);
  }
  const left = right.map(([px, py]) => [2 * x - px, py] as [number, number]).reverse();
  return poly([[x, top], ...right, ...left]);
}

/**
 * Chlupaté předloktí: od lokte (x0,y0; zakulacený) k zápěstí (x1,y1), šířka w0 → w1, okraje s chomáčky.
 */
function furArm(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): string {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const [ux, uy] = [(x1 - x0) / len, (y1 - y0) / len];
  const [nx, ny] = [-uy, ux];
  const n = 8;
  const side = (sgn: number): [number, number][] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const w = (w0 + (w1 - w0) * t) / 2 + (i % 2 === 1 && i < n ? 2.6 : 0);
      return [x0 + ux * len * t + nx * w * sgn, y0 + uy * len * t + ny * w * sgn] as [number, number];
    });
  const elbow = Array.from({ length: 5 }, (_, i) => {
    const a = Math.PI / 2 + (i + 1) * (Math.PI / 6);
    const r = w0 / 2;
    return [
      x0 + (nx * Math.cos(a) + -ux * Math.sin(a)) * r * -1,
      y0 + (ny * Math.cos(a) + -uy * Math.sin(a)) * r * -1,
    ] as [number, number];
  });
  return poly([...side(1), ...side(-1).reverse(), ...elbow]);
}

// ─────────────────────────── Hejkal ───────────────────────────

// Hejkal: mechový lesní skřet s hřívou, větvičkami a špičatýma ušima hejká do dlaní za úplňku;
// zvukové vlny, noty (jedna zlatá se trefila), sova si zacpává uši křídly, muchomůrky.
const HEJKAL_SKIN = '#c6dcae';
const HEJKAL_COAT = '#5d9a3e';

const HEJKAL_BACKDROP: SceneOp[] = [
  // Úplněk za hlavou jako svatozář, krátery.
  ['f', '#f6e3a1', c(125, 116, 66), 1.8],
  ['f', '#f2cf4a', `${c(92, 82, 8)} ${c(166, 92, 6)} ${c(80, 140, 5)} ${c(174, 150, 9)}`, 0.8],
  // Hvězdy.
  ['f', '#f6e3a1', `${c(30, 70, 1.8)} ${c(214, 34, 2)} ${c(46, 104, 1.4)} ${c(226, 126, 1.6)}`, 0],
  // Smrky: zadní (petrolejová) a přední (tmavě zelená) řada.
  [
    'f',
    '#2f8077',
    `${spruce(40, 96, 56, 150)} ${spruce(214, 104, 52, 140)} ${spruce(78, 150, 40, 100, 3)}`,
    1.2,
  ],
  [
    'f',
    '#2f6b3a',
    `${spruce(22, 128, 52, 150)} ${spruce(232, 136, 50, 140)} ${spruce(190, 168, 40, 100, 3)}`,
    1.4,
  ],
  // Mechový pahorek.
  ['f', HEJKAL_COAT, 'M16,238 C60,228 190,232 234,226 L234,284 L16,284 Z', 1.4],
  // Muchomůrky v rozích.
  ['f', '#fffaf0', 'M26,244 L34,244 L35,264 L25,264 Z M215,250 L222,250 L223,266 L214,266 Z', 1.2],
  ['f', '#d7442c', 'M16,246 C16,230 44,228 44,246 Z M205,252 C205,238 232,238 232,252 Z', 1.6],
  ['f', '#fffaf0', `${c(24, 238, 2.4)} ${c(35, 236, 2)} ${c(213, 245, 2)} ${c(223, 243, 2.4)}`, 0.6],
  // Sova na větvi si zacpává uši křídly — rušení nočního klidu.
  ['l', 'M234,104 C216,100 198,104 176,98', 3],
  ['f', '#8c5632', 'M192,100 C184,86 186,62 202,58 C218,62 220,86 212,100 Z', 1.6],
  ['f', '#f6e3a1', 'M196,98 C192,90 194,80 202,78 C210,80 212,90 208,98 Z', 0],
  ['l', 'M198,86 l2,2 l2,-2 l2,2 M198,92 l2,2 l2,-2 l2,2', 0.8],
  ['f', '#fffaf0', `${c(197, 69, 5.5)} ${c(207, 69, 5.5)}`, 1.2],
  ['f', 'dark', `${c(197, 70, 1.8)} ${c(207, 70, 1.8)}`, 0],
  ['l', 'M191,66 L203,68 M213,66 L201,68', 1.4],
  ['f', '#e9b030', 'M200,74 L204,74 L202,79 Z', 0.8],
  ['f', '#5a3418', 'M190,80 C182,70 184,58 192,54 C194,62 194,72 196,80 Z', 1.4],
  ['f', '#5a3418', 'M214,80 C222,70 220,58 212,54 C210,62 210,72 208,80 Z', 1.4],
  ['l', 'M198,100 l-2,4 M202,100 l0,4 M206,100 l2,4', 1.2],
  // Hříva z mechu za hlavou.
  ['f', '#2f6b3a', shag(125, 150, 52, 62, 15, 0.22, 0.1), 1.8],
  ['f', HEJKAL_COAT, shag(125, 148, 40, 50, 13, 0.2, 0.3), 0],
];

const HEJKAL_OUTFIT: SceneOp[] = [
  // Plášť z listí.
  [
    'f',
    HEJKAL_COAT,
    [
      [70, 238, 30],
      [92, 226, -20],
      [160, 226, 20],
      [182, 240, -30],
      [64, 262, -15],
      [96, 252, 25],
      [154, 252, -25],
      [188, 266, 15],
      [84, 276, 10],
      [170, 278, -10],
    ]
      .map(([x, y, d]) => place('M-9,0 Q0,-7 9,0 Q0,7 -9,0 Z', x!, y!, 1, d!))
      .join(' '),
    0.8,
  ],
];

const HEJKAL_EXTRA: SceneOp[] = [
  // Špičaté uši.
  ['f', HEJKAL_SKIN, 'M100,146 C90,138 80,124 72,114 C76,134 84,158 100,166 Z', 1.8],
  ['f', HEJKAL_SKIN, 'M150,146 C160,138 170,124 178,114 C174,134 166,158 150,166 Z', 1.8],
  ['l', 'M96,150 C90,144 84,136 80,128 M154,150 C160,144 166,136 170,128', 1],
  // Mechová ofina a větvičky s lístky.
  [
    'f',
    '#2f6b3a',
    'M99,142 L103,124 L109,133 L113,117 L119,128 L125,113 L131,128 L137,117 L141,133 L147,124 L151,142 C152,120 142,106 125,106 C108,106 98,120 99,142 Z',
    1.6,
  ],
  ['s', '#8c5632', 'M110,112 L100,90 L88,84 M100,90 L102,76 M140,112 L150,90 L162,84 M150,90 L148,76', 3],
  [
    'f',
    HEJKAL_COAT,
    [
      place('M-6,0 Q0,-5 6,0 Q0,5 -6,0 Z', 85, 82, 1, -30),
      place('M-6,0 Q0,-5 6,0 Q0,5 -6,0 Z', 102, 72, 1, -80),
      place('M-6,0 Q0,-5 6,0 Q0,5 -6,0 Z', 165, 82, 1, 30),
      place('M-6,0 Q0,-5 6,0 Q0,5 -6,0 Z', 148, 72, 1, 80),
    ].join(' '),
    1,
  ],
  // Mechový plnovous (celý, bez díry pod pusou) a lístek zapletený ve vousech.
  [
    'f',
    '#8a8f2e',
    poly([
      [98, 166],
      [101, 180],
      [95, 190],
      [104, 194],
      [98, 205],
      [109, 206],
      [105, 216],
      [115, 217],
      [116, 227],
      [125, 222],
      [134, 227],
      [135, 217],
      [145, 216],
      [141, 206],
      [152, 205],
      [146, 194],
      [155, 190],
      [149, 180],
      [152, 166],
      [138, 171],
      [125, 172],
      [112, 171],
    ]),
    1.8,
  ],
  ['f', '#e9b030', place('M-6,0 Q0,-5 6,0 Q0,5 -6,0 Z', 138, 204, 1, 40), 1],
  // Ruce zdvižené k puse: chlupatá mechová předloktí s lokty dole, manžety z listí, dlaně do trychtýře.
  ['f', HEJKAL_COAT, furArm(80, 268, 106, 192, 25, 17), 1.8],
  ['f', HEJKAL_COAT, furArm(170, 268, 144, 192, 25, 17), 1.8],
  ['h', furArm(176, 268, 150, 193, 12, 8), 45],
  ['l', 'M86,254 C90,240 94,228 99,216 M164,254 C160,240 156,228 151,216', 1],
  [
    'f',
    '#2f6b3a',
    [
      [99, 201, -60],
      [113, 203, -15],
      [151, 201, 60],
      [137, 203, 15],
      [84, 238, 70],
      [166, 238, -70],
    ]
      .map(([x, y, d]) => place('M-8,0 Q0,-6 8,0 Q0,6 -8,0 Z', x!, y!, 1, d!))
      .join(' '),
    1,
  ],
  ['f', HEJKAL_SKIN, 'M96,170 C98,160 110,158 117,165 L119,187 C111,194 99,191 96,183 Z', 1.8],
  ['f', HEJKAL_SKIN, 'M154,170 C152,160 140,158 133,165 L131,187 C139,194 151,191 154,183 Z', 1.8],
  ['l', 'M99,172 L111,170 M99,178 L112,177 M151,172 L139,170 M151,178 L138,177', 1],
  // Otevřená pusa mezi dlaněmi.
  ['f', 'dark', ell(125, 180, 5, 6.5), 0],
  // Hejkání: vlny na obě strany.
  [
    's',
    '#fffaf0',
    'M162,164 Q169,177 162,190 M174,156 Q185,177 174,198 M186,148 Q201,177 186,206 M88,164 Q81,177 88,190 M76,156 Q65,177 76,198 M64,148 Q49,177 64,206',
    3,
  ],
  // Noty: falešné tuší, jedna zlatá se trefila.
  ...note(186, 128, '#e9b030', 8),
  ...note(52, 134, '#fffaf0', -24),
  ...note(210, 212, '#fffaf0', 22),
];

// ─────────────────────────── Tramvaják ───────────────────────────

// Tramvaják: řidič za čelním sklem tramvaje — linka 12 v orientační tabuli, žluté tyče a poutka,
// označovač jízdenek, stěrač, světla, v ruce kontrolér.
const TRAM_RED = '#d7442c';
const TRAM_BACKDROP: SceneOp[] = [
  // Čelní okno (pohled dovnitř vozu).
  ['f', '#bcd6e6', 'M44,66 H206 Q220,66 220,80 V226 H30 V80 Q30,66 44,66 Z', 2.6],
  // Interiér: madlo pod stropem, poutka, žluté tyče.
  ['s', '#d9d2c2', 'M32,92 H218', 3],
  ['l', 'M50,92 L50,106 M74,92 L74,106 M176,92 L176,106 M200,92 L200,106', 1.2],
  ['s', '#fffaf0', `${c(50, 112, 5.5)} ${c(74, 112, 5.5)} ${c(176, 112, 5.5)} ${c(200, 112, 5.5)}`, 2.4],
  ['s', '#f2cf4a', 'M60,92 V226 M190,92 V226', 5],
  // Označovač jízdenek na tyči.
  ['f', '#ef8a2e', rect(52, 132, 16, 22), 1.6],
  ['f', 'dark', rect(55, 137, 10, 3), 0],
  ['f', '#d7442c', c(60, 147, 2.4), 0.8],
  // Orientační tabule: linka 12 a „cíl“ (čárky).
  ['f', 'dark', rect(90, 24, 122, 34), 1.6],
  ['s', '#f2cf4a', 'M101,33 L106,29 L106,51 M112,34 C113,28 125,27 125,34 C125,41 112,44 112,51 L126,51', 3],
  ['s', '#f2cf4a', 'M136,35 h24 M164,35 h16 M136,46 h32 M172,46 h22', 2.4],
  // Poziční světlo.
  ['f', '#f6e3a1', c(222, 40, 5), 1.2],
];

const TRAM_EXTRA: SceneOp[] = [
  // Odlesky na skle.
  ['f', '#fffaf0', 'M196,72 L210,72 L184,122 L170,122 Z M212,84 L216,84 L196,122 L192,122 Z', 0],
  // Kontrolér: skříňka s pákou, ruka v rukávu na kouli.
  ['f', '#5b5850', 'M170,226 L174,206 L204,206 L208,226 Z', 1.6],
  ['l', 'M190,208 L182,190', 3],
  ['f', 'dark', c(181, 187, 6), 0],
  ['f', '#3d4a66', 'M146,226 L168,192 L188,200 L170,226 Z', 1.8],
  ...hand(180, 193, -60),
  // Stěrač.
  ['l', 'M66,224 L40,140', 2.2],
  ['s', '#1a1714', 'M44,154 L34,122', 3.4],
  // Čelo vozu pod oknem: rudý plech, krémový pruh, světla, větrací štěrbiny, nárazník.
  ['f', TRAM_RED, 'M16,224 H234 V284 H16 Z', 2.2],
  ['f', '#f3e8cf', rect(16, 231, 218, 8), 1.2],
  ['f', '#f6e3a1', `${c(46, 251, 10)} ${c(204, 251, 10)}`, 2],
  ['l', `${c(46, 251, 5)} ${c(204, 251, 5)}`, 1],
  ['l', 'M100,246 H150 M100,252 H150 M100,258 H150', 1.4],
  ['f', '#5b5850', rect(16, 262, 218, 8), 1.4],
];

// ─────────────────────────── Sázkař ───────────────────────────

// Sázkař: sázková kancelář — tabule kurzů s kroužkovaným tipem, televize s dostihem, podkova nad hlavou,
// tiket s křížky v ruce, tužka za uchem, „systém“ v notýsku, zmačkané prohrané tikety.
const HORSE =
  'M-18,-4 C-14,-10 6,-10 12,-6 L20,-16 C24,-19 29,-17 31,-12 L27,-10 L19,-2 C19,2 17,6 14,6 L27,10 L25,13 L10,9 C4,10 -6,10 -10,8 L-26,14 L-28,11 L-16,4 C-20,2 -22,0 -22,-3 L-31,3 L-29,-3 Z';

const PUNTER_BACKDROP: SceneOp[] = [
  // Obložení stěny.
  ['f', '#c99a62', 'M16,178 H234 V284 H16 Z', 1.4],
  ['l', 'M16,186 H234 M52,186 V284 M196,186 V284', 0.9],
  // Tabule kurzů (řádky = zápas a kurz), jeden tip zakroužkovaný.
  ['f', '#22365c', rect(22, 58, 66, 76), 2],
  ['s', '#fffaf0', 'M28,70 h24 M28,84 h20 M28,98 h26 M28,112 h18 M28,126 h22', 2.4],
  [
    's',
    '#f2cf4a',
    'M60,70 h8 M72,70 h8 M60,84 h8 M72,84 h8 M60,98 h8 M72,98 h8 M60,112 h8 M72,112 h8 M60,126 h8 M72,126 h8',
    2.4,
  ],
  ['s', '#d7442c', c(70, 98, 13, 7), 2],
  // Televize s dostihem.
  ['l', 'M188,16 L188,28', 2],
  ['f', 'dark', rect(146, 28, 82, 62), 1.6],
  ['f', '#bcd6e6', rect(152, 34, 70, 50), 1],
  ['f', '#5d9a3e', 'M152,64 H222 V84 H152 Z', 0],
  ['s', '#fffaf0', 'M152,66 H222', 2],
  ['l', 'M160,66 V76 M180,66 V76 M200,66 V76 M220,66 V76', 0.8],
  ['f', '#8c5632', place(HORSE, 190, 62, 0.95), 1.1],
  ['f', '#d7442c', 'M184,49 C186,44 194,44 194,50 L190,55 L184,54 Z', 1],
  ['f', '#f2cf4a', c(191, 44, 3), 0.8],
  ['l', 'M212,40 V64 M208,40 H216', 1.2],
  // Podkova pro štěstí (otvorem nahoru) na hřebíku nad hlavou.
  ['l', 'M125,30 L125,38', 1.6],
  ['f', '#9a958a', 'M108,40 C108,76 142,76 142,40 L134,40 C134,64 116,64 116,40 Z', 1.8],
  ['f', 'dark', `${c(112, 50, 1.4)} ${c(138, 50, 1.4)} ${c(116, 62, 1.4)} ${c(134, 62, 1.4)}`, 0],
  // Zmačkané prohrané tikety.
  ['f', '#fffaf0', `${shag(28, 248, 11, 10, 7, 0.28)} ${shag(222, 244, 9, 8, 6, 0.3, 0.4)}`, 1.4],
  ['l', 'M22,246 l8,4 M26,254 l6,-6 M218,242 l6,3', 0.8],
];

const PUNTER_OUTFIT: SceneOp[] = [
  // Notýsek se „systémem“ v náprsní kapse.
  ['f', '#fffaf0', place(rect(-9, -14, 18, 24), 88, 236, 1, -8), 1.4],
  ['l', place('M-6,-8 H6 M-6,-3 H6 M-6,2 H4', 88, 236, 1, -8), 0.8],
  ['f', '#5a3418', 'M74,240 L102,236 L104,262 L76,266 Z', 1.6],
];

const PUNTER_EXTRA: SceneOp[] = [
  // Tužka za uchem (ucho přes ni překreslené).
  ['f', '#f2cf4a', place('M-18,-2.6 L12,-2.6 L18,0 L12,2.6 L-18,2.6 Z', 158, 141, 1, 28), 1.2],
  ['f', '#e88a9a', place('M-23,-2.6 L-18,-2.6 L-18,2.6 L-23,2.6 Z', 158, 141, 1, 28), 1],
  ['f', SKIN, 'M151,150 C159,144 161,164 150,166 Z', 1.8],
  // Tiket s křížky v ruce.
  ['f', '#fffaf0', place(rect(-17, -24, 34, 48), 186, 226, 1, 9), 1.8],
  ['l', place('M-13,-14 H13 M-13,-5 H13 M-13,4 H13 M-13,13 H13 M-4,-20 V20 M5,-20 V20', 186, 226, 1, 9), 0.7],
  [
    's',
    '#d7442c',
    place('M-11,-12 L-6,-7 M-6,-12 L-11,-7 M7,-3 L12,2 M12,-3 L7,2 M-2,6 L3,11 M3,6 L-2,11', 186, 226, 1, 9),
    1.6,
  ],
  ...hand(184, 254, 9),
];

// ─────────────────────────── Drbna z pavlače ───────────────────────────

// Drbna z pavlače: opřená o zábradlí pavlače na polštáři, natáčky pod šátkem, šeptá za dlaní;
// bublina s Dvojicí (dvě karty), sousedka nahoře nastavuje ucho, na šňůře pár ponožek, muškáty.
const GOSSIP_DRESS = '#6fa0c8';

const GOSSIP_BACKDROP: SceneOp[] = [
  // Horní pavlač: dveře, šňůra s prádlem, zábradlí, podlaha s konzolami.
  ['f', '#8c5632', rect(190, 26, 32, 74), 1.6],
  ['l', 'M196,34 h20 v24 h-20 Z M196,66 h20 v24 h-20 Z', 0.9],
  // Sousedka ve dveřích s rukou za uchem.
  ['f', '#6b4a9e', 'M194,100 C194,84 200,78 207,78 C214,78 220,84 220,100 Z', 1.4],
  ['f', SKIN, c(207, 66, 9, 10), 1.6],
  ['f', '#d9d2c2', 'M198,62 C198,52 216,52 216,62 C212,58 202,58 198,62 Z', 1.2],
  ['f', '#d9d2c2', c(207, 52, 4.5), 1.2],
  ['f', 'dark', `${c(204, 66, 1.3)} ${c(210, 66, 1.3)}`, 0],
  ['f', SKIN, ell(219, 64, 4, 6), 1.4],
  ['l', 'M88,38 C120,46 150,46 184,38', 1.2],
  [
    'f',
    '#2f5fa8',
    'M96,42 L104,40 L106,44 L116,44 L118,40 L126,42 L124,50 L120,50 L120,64 L102,64 L102,50 L98,50 Z',
    1.3,
  ],
  [
    'f',
    '#d7442c',
    'M136,45 L142,45 L142,58 L148,62 L146,66 L136,62 Z M152,45 L158,45 L158,58 L164,62 L162,66 L152,62 Z',
    1.2,
  ],
  ['f', '#fffaf0', 'M168,43 L182,40 L182,48 L177,50 L175,47 L171,51 L168,51 Z', 1.1],
  ['f', '#9a958a', rect(16, 100, 218, 8), 1.4],
  ['l', 'M16,76 H234', 2.2],
  ['l', Array.from({ length: 22 }, (_, i) => `M${20 + i * 10},76 V100`).join(' '), 1],
  ['l', 'M40,108 L40,120 L52,108 M124,108 L124,120 L136,108 M208,108 L208,120 L220,108', 1.2],
  // Bublina s drbem: Dvojice.
  [
    'f',
    '#fffaf0',
    'M168,148 C150,148 150,118 176,116 C190,104 222,108 224,126 C232,140 216,152 198,150 L178,166 L184,148 Z',
    1.8,
  ],
  ['f', '#fffaf0', place(rect(-7, -10, 14, 20), 182, 132, 1, -10), 1.2],
  ['f', '#fffaf0', place(rect(-7, -10, 14, 20), 200, 131, 1, 8), 1.2],
  [
    'f',
    '#d7442c',
    `${place('M0,4 C-6,-1 -5,-6 -2,-6 C-1,-6 0,-5 0,-4 C0,-5 1,-6 2,-6 C5,-6 6,-1 0,4 Z', 182, 133, 1, -10)} ${place('M0,4 C-6,-1 -5,-6 -2,-6 C-1,-6 0,-5 0,-4 C0,-5 1,-6 2,-6 C5,-6 6,-1 0,4 Z', 200, 132, 1, 8)}`,
    0.8,
  ],
];

const GOSSIP_OUTFIT: SceneOp[] = [
  // Puntíkatá zástěra/župan.
  [
    'f',
    '#fffaf0',
    [
      [74, 250],
      [92, 232],
      [160, 230],
      [180, 248],
      [62, 272],
      [196, 270],
      [104, 222],
      [150, 222],
    ]
      .map(([x, y]) => c(x!, y!, 2.6))
      .join(' '),
    0.6,
  ],
];

const GOSSIP_EXTRA: SceneOp[] = [
  // Uzel šátku pod bradou.
  ['f', '#d7442c', ell(125, 194, 6, 5), 1.4],
  // Natáčky vykukující zpod šátku.
  ['f', '#e88a9a', `${rect(108, 126, 10, 8)} ${rect(120, 125, 10, 8)} ${rect(132, 126, 10, 8)}`, 1.2],
  ['l', 'M113,126 V134 M125,125 V133 M137,126 V134', 0.8],
  // Muškáty v truhlíku na zábradlí.
  ['f', '#8c5632', 'M20,222 L84,222 L80,240 L24,240 Z', 1.6],
  ['f', '#5d9a3e', `${c(30, 214, 9, 7)} ${c(48, 210, 10, 8)} ${c(68, 214, 9, 7)}`, 1.2],
  ['f', '#d7442c', `${c(28, 206, 5)} ${c(44, 200, 5.5)} ${c(58, 206, 5)} ${c(74, 204, 4.5)}`, 1.2],
  // Zábradlí pavlače přes trup.
  ['l', Array.from({ length: 19 }, (_, i) => `M${22 + i * 12},246 V284`).join(' '), 1.6],
  ['f', '#8c5632', rect(16, 238, 218, 9), 1.8],
  // Polštář na zábradlí, na něm předloktí.
  [
    'f',
    '#d7442c',
    'M76,240 C70,230 76,222 86,222 L170,222 C180,222 186,230 180,240 C178,246 78,246 76,240 Z',
    1.8,
  ],
  [
    'f',
    '#fffaf0',
    `${c(92, 239, 2.2)} ${c(112, 240, 2.2)} ${c(132, 240, 2.2)} ${c(158, 239, 2.2)} ${c(174, 232, 2.2)}`,
    0.6,
  ],
  [
    'f',
    GOSSIP_DRESS,
    'M78,226 C80,216 96,212 110,214 L146,218 L146,232 L96,234 C84,234 78,232 78,226 Z',
    1.8,
  ],
  ...hand(150, 225, 0),
  // Druhá ruka šeptá za dlaní.
  ['f', GOSSIP_DRESS, 'M158,238 L184,236 L168,186 L152,192 Z', 1.8],
  ['h', 'M172,237 L184,236 L168,186 L162,188 Z', 45],
  ['f', SKIN, 'M140,194 L140,164 C140,154 158,154 158,164 L158,194 C154,198 144,198 140,194 Z', 1.8],
  ['l', 'M145,156 V172 M149.5,155 V172 M154,156 V172', 1],
];

// ─────────────────────────── Rundu všem ───────────────────────────

/** Půllitr s důlky a pěnou, svíraný rukou, rukáv míří dolů z obrazu. */
function tankard(x: number, y: number, deg: number, sleeve: string, s = 1): SceneOp[] {
  const P = (d: string): string => place(d, x, y, s, deg);
  const dimples = [-8, 0, 8].flatMap((dx) => [-12, -1].map((dy) => ell(dx, dy, 2.8, 4.4))).join(' ');
  return [
    ['f', sleeve, P('M-13,18 L13,18 L16,240 L-16,240 Z'), 2],
    ['h', P('M4,18 L13,18 L16,240 L6,240 Z'), 45],
    ['f', sleeve === '#fffaf0' ? '#d9d2c2' : '#fffaf0', P('M-13.2,25 L13.2,25 L13.6,36 L-13.6,36 Z'), 1.6],
    ['f', '#bcd6e6', P('M15,-14 C31,-14 32,13 15,14 L15,7 C24,6 24,-7 15,-7 Z'), 1.6],
    ['f', '#e9b030', P('M-16,-22 L16,-22 L15,22 C14,27 -14,27 -15,22 Z'), 2.2],
    ['f', '#f2cf4a', P(dimples), 0.6],
    ['f', '#fffaf0', P('M-13,-17 L-10,-17 L-10,4 L-13,3 Z'), 0],
    [
      'f',
      '#fffaf0',
      P(
        'M-20,-20 C-25,-31 -12,-38 -5,-31 C-1,-40 13,-39 15,-30 C23,-33 27,-23 20,-19 C22,-14 14,-12 13,-16 L12,-9 C12,-6 8,-6 8,-9 L8,-16 L-18,-16 C-22,-16 -22,-19 -20,-20 Z',
      ),
      2,
    ],
    ['f', SKIN, P(ell(0, 12, 15, 9)), 1.8],
    ['l', P('M-5,4 L-5,19 M2,4 L2,20 M9,5 L9,18'), 1.1],
  ];
}

// Rundu všem: pět rukávů, pět půllitrů, ťuk nad stolem — pěna stříká; na tácku pět čárek,
// prázdná peněženka, ze které vylétá mol (platí ten, kdo to řekl nahlas).
const RUNDU_MUGS: SceneOp[] = (() => {
  const sleeves = ['#2f6b3a', '#d7442c', '#fffaf0', '#2f5fa8', '#8e3b6e'];
  const order = [-2, 2, -1, 1, 0];
  const ops: SceneOp[] = [];
  for (const i of order) {
    const a = (i * 13 * Math.PI) / 180;
    const x = 125 + 168 * Math.sin(a);
    const y = -60 + 168 * Math.cos(a);
    ops.push(...tankard(x, y, -i * 13, sleeves[i + 2]!, 1.12));
  }
  return ops;
})();

const RUNDU: SceneOp[] = [
  // Hospoda: zažloutlá zeď, tmavé obložení, smaltovaná lampa, stůl.
  ['f', '#f6e3a1', rect(16, 16, 218, 268), 0],
  ['f', '#8c5632', rect(16, 150, 218, 70), 1.4],
  ['l', 'M16,158 H234 M52,158 V220 M96,158 V220 M140,158 V220 M184,158 V220 M228,158 V220', 0.9],
  ['l', 'M206,16 L206,26', 1.4],
  ['f', '#2f6b3a', 'M188,42 C188,32 196,26 206,26 C216,26 224,32 224,42 Z', 1.6],
  ['f', '#fffaf0', 'M200,42 C200,47 212,47 212,42 Z', 1.2],
  ['f', '#c99a62', 'M16,220 H234 V284 H16 Z', 1.6],
  ['l', 'M16,232 C60,228 100,236 150,230 M170,228 C196,226 216,230 234,228', 0.9],
  // Tácek s pěti čárkami (čtyři a přeškrtnutí — runda pro pět).
  ['f', '#fffaf0', ell(88, 246, 21, 10), 1.6],
  ['s', '#d7442c', ell(88, 246, 17, 7.5), 2],
  ['l', 'M78,241 L77,251 M83,241 L82,251 M88,241 L87,251 M93,241 L92,251 M74,250 L97,242', 1.3],
  // Prázdná rozevřená peněženka na stole — platí ten, kdo to řekl nahlas.
  ['f', '#5a3418', 'M17,247 L40,242 L42,259 L19,263 Z', 1.4],
  ['f', '#8c5632', 'M20,249 L38,245.5 L39,252 L21,255.5 Z', 1],
  ['l', 'M28.5,245 L30.5,261', 1],
  ...RUNDU_MUGS,
  // Z peněženky vylétá mol.
  ['l', 'M30,244 C22,240 36,236 28,230', 0.8],
  [
    'f',
    '#d9d2c2',
    `${place(ell(-4.5, 0, 5, 3), 28, 224, 1, -35)} ${place(ell(4.5, 0, 5, 3), 28, 224, 1, 35)}`,
    1,
  ],
  ['f', 'dark', ell(28, 225, 1.5, 4), 0],
  // Ťuk: pěna stříká, kapky a čárky pohybu.
  ['f', '#fffaf0', shag(125, 46, 22, 15, 9, 0.38, 0.2), 1.8],
  [
    'f',
    '#fffaf0',
    `${ell(96, 38, 3.5)} ${ell(154, 36, 4)} ${ell(108, 24, 2.6)} ${ell(142, 24, 3)} ${ell(84, 56, 2.6)} ${ell(168, 54, 3)}`,
    1.1,
  ],
  ['l', 'M100,52 l-10,-4 M150,52 l10,-4 M125,30 l0,-6', 1.4],
];

// ─────────────────────────── Nakládaný hermelín ───────────────────────────

/** Hermelín z boku (bílá plíseň) a proužek náplně uprostřed. */
const CHEESE =
  'M-28,-11 C-31,-11 -33,-7 -33,0 C-33,7 -31,11 -28,11 L28,11 C31,11 33,7 33,0 C33,-7 31,-11 28,-11 Z';
const CHEESE_FILL =
  'M-32.5,-2.5 Q-22,-6 -11,-2.5 Q0,1 11,-2.5 Q22,-6 32.5,-2.5 L32.5,3 Q22,6 11,3 Q0,0 -11,3 Q-22,6 -32.5,3 Z';
/** Krajíc chleba (kůrka; střídka je zmenšená kopie). */
const BREAD = 'M-16,22 L-16,-6 C-24,-10 -22,-24 -10,-22 C-6,-28 6,-28 10,-22 C22,-24 24,-10 16,-6 L16,22 Z';
/** Horní ramínko dřevěného kolíčku. */
const PEG = 'M10,-2 L-22,-7 L-22,-3 L10,1 Z';
const CHEESES: readonly (readonly [number, number, number])[] = [
  [108, 198, -6],
  [152, 172, 9],
  [106, 146, 5],
];

// Nakládaný hermelín: velká sklenice v oleji — hermelíny, feferonky, cibule, bobkový list, pepř;
// víčko odložené, z hrdla stoupá zelený „aroma“ opar a krouží moucha; vedle chleba, pivo a kolíček na nos.
const HERMELIN: SceneOp[] = [
  // Lokál: zeď, tmavé obložení, kostkovaný ubrus.
  ['f', '#f3e8cf', rect(16, 16, 218, 268), 0],
  ['f', '#8c5632', rect(16, 150, 218, 70), 1.4],
  ['l', 'M16,158 H234 M60,158 V220 M190,158 V220', 0.9],
  ['f', '#fffaf0', 'M16,214 H234 V284 H16 Z', 1.6],
  [
    'f',
    '#d7442c',
    Array.from({ length: 18 }, (_, k) => {
      const col = k % 9;
      const row = Math.floor(k / 9);
      return rect(16 + col * 24 + (row % 2) * 12, 220 + row * 24, 12, 12);
    })
      .concat(Array.from({ length: 9 }, (_, col) => rect(28 + col * 24, 232, 12, 12)))
      .concat(Array.from({ length: 9 }, (_, col) => rect(16 + col * 24, 256, 12, 12)))
      .concat(Array.from({ length: 9 }, (_, col) => rect(28 + col * 24, 268, 12, 16)))
      .join(' '),
    0,
  ],
  ['l', 'M16,214 H234', 1.6],
  // Pivo vlevo.
  ['f', '#e9b030', 'M24,166 L52,166 L50,214 C49,218 27,218 26,214 Z', 1.8],
  [
    'f',
    '#fffaf0',
    'M21,166 C19,156 30,152 34,158 C38,150 50,152 50,160 C56,160 56,168 50,168 L26,169 C21,169 20,167 21,166 Z',
    1.6,
  ],
  ['f', '#bcd6e6', 'M52,174 C64,174 64,202 51,202 L51,196 C57,196 57,180 52,180 Z', 1.3],
  // Aroma: zelený opar z hrdla a moucha.
  [
    's',
    '#5d9a3e',
    'M100,82 C92,72 108,62 100,50 C94,42 102,34 98,28 M125,80 C117,68 133,58 125,46 C119,38 127,30 124,24 M150,82 C142,72 158,62 150,50 C144,42 152,34 148,28',
    3,
  ],
  ['l', 'M164,72 C176,60 196,64 192,76 C188,86 172,78 180,66 C186,58 200,58 204,48', 0.9],
  ['f', '#fffaf0', `${ell(200, 40, 5, 3)} ${ell(210, 42, 5, 3)}`, 1],
  ['f', 'dark', ell(205, 46, 4, 3), 0],
  // Sklenice: sklo, olej, sýry, feferonky, cibule, bobkový list, pepř.
  [
    'f',
    '#bcd6e6',
    'M66,226 C60,226 58,220 58,212 L58,104 C58,96 66,94 72,92 L178,92 C184,94 192,96 192,104 L192,212 C192,220 190,226 184,226 Z',
    2.4,
  ],
  ['f', '#f2cf4a', 'M62,120 L188,120 L188,212 C188,218 184,222 180,222 L70,222 C66,222 62,218 62,212 Z', 0],
  ['l', 'M62,120 L188,120', 1.2],
  // Hermelíny rozpůlené a proložené paprikovou náplní.
  ['f', '#fffaf0', CHEESES.map(([x, y, d]) => place(CHEESE, x, y, 1, d)).join(' '), 1.8],
  ['f', '#ef8a2e', CHEESES.map(([x, y, d]) => place(CHEESE_FILL, x, y, 1, d)).join(' '), 1],
  // Horní kůrka (kolečko sýra shora) s plísňovými skvrnkami.
  ['f', '#fffaf0', CHEESES.map(([x, y, d]) => place(ell(0, -11, 31, 5), x, y, 1, d)).join(' '), 1.4],
  [
    'f',
    '#d9d2c2',
    CHEESES.map(([x, y, d]) =>
      place(`${ell(-14, -11, 3.2, 1.5)} ${ell(4, -12.5, 2.6, 1.2)} ${ell(17, -10, 2.2, 1.1)}`, x, y, 1, d),
    ).join(' '),
    0,
  ],
  [
    'l',
    CHEESES.map(([x, y, d]) =>
      place('M-22,-7 L-19,-6 M-6,-8 L-3,-7 M12,-7 L15,-6 M-14,8 L-11,7 M18,8 L21,7', x, y, 1, d),
    ).join(' '),
    0.8,
  ],
  [
    'f',
    '#d7442c',
    `${place('M-16,0 C-10,-6 10,-6 16,-2 C10,2 -8,6 -16,0 Z', 164, 146, 1, 20)} ${place('M-16,0 C-10,-6 10,-6 16,-2 C10,2 -8,6 -16,0 Z', 80, 172, 1, -40)} ${place('M-14,0 C-8,-5 8,-5 14,-2 C8,2 -6,5 -14,0 Z', 172, 204, 1, 10)}`,
    1.3,
  ],
  [
    'f',
    '#2f6b3a',
    'M178,150 L183,149 L182,154 Z M72,183 L68,188 L73,189 Z M185,200 L190,198 L189,203 Z',
    0.8,
  ],
  ['l', `${c(126, 128, 8, 5)} ${c(126, 128, 4, 2.5)} ${c(148, 132, 7, 4)} ${c(120, 216, 6, 3.5)}`, 1.4],
  [
    'f',
    '#5d9a3e',
    `${place('M-12,0 Q0,-6 12,0 Q0,6 -12,0 Z', 106, 172, 1, -20)} ${place('M-12,0 Q0,-6 12,0 Q0,6 -12,0 Z', 174, 112, 1, 25)}`,
    1,
  ],
  [
    'f',
    'dark',
    `${c(142, 214, 2)} ${c(160, 196, 2)} ${c(90, 124, 2)} ${c(140, 116, 2)} ${c(70, 160, 2)} ${c(182, 182, 2)}`,
    0,
  ],
  ['f', '#fffaf0', 'M66,110 L72,110 L72,214 L66,212 Z', 0],
  ['h', 'M176,96 L192,104 L192,212 C192,220 190,226 184,226 L176,226 Z', 0],
  // Hrdlo bez víčka.
  ['f', '#bcd6e6', ell(125, 92, 54, 7), 1.8],
  ['l', ell(125, 92, 46, 4.5), 0.9],
  // Krajíc chleba opřený o sklenici, víčko odložené na ubrusu a kolíček „na nos“ pro hosty.
  ['f', '#8c5632', place(BREAD, 213, 190, 1, 8), 1.8],
  ['f', '#c99a62', place(BREAD, 213, 191, 0.78, 8), 0.8],
  ['l', place('M-6,-4 L-4,-2 M5,2 L7,4 M-3,10 L-1,11', 213, 190, 1, 8), 0.8],
  ['f', '#c08a1e', 'M150,236 C150,244 194,244 194,236 L194,242 C194,250 150,250 150,242 Z', 1.4],
  ['f', '#e9b030', ell(172, 236, 22, 7), 1.8],
  ['l', ell(172, 236, 16, 4.5), 0.8],
  ['f', '#c99a62', place(PEG, 54, 244, 1, -14), 1.3],
  ['f', '#c99a62', place('M10,-1 L-22,3 L-22,7 L10,2 Z', 54, 244, 1, -14), 1.3],
  ['f', '#9a958a', place(ell(4, 0.5, 3.4), 54, 244, 1, -14), 1],
];

// ─────────────────────────── Třináctý plat ───────────────────────────

// Třináctý plat: kancelář s olejovým soklem — trhací kalendář na „13“, vlaječka vzorného pracovníka,
// graf plánu, kde poslední sloupec prorazil čáru i rám; na stole hnědý výplatní sáček s razítkem přetékající
// bankovkami, karafiát ve sklenici a štos mincí.
const BANKNOTE = 'M-14,-22 L14,-22 L14,22 L-14,22 Z';

const THIRTEENTH: SceneOp[] = [
  // Zeď: nahoře bílá, dole zelený olejový sokl s rudou linkou.
  ['f', '#f3e8cf', rect(16, 16, 218, 268), 0],
  ['f', '#5d9a3e', 'M16,150 H234 V284 H16 Z', 1.2],
  ['s', '#d7442c', 'M16,150 H234', 3],
  // Trhací kalendář: „13“.
  ['f', '#d7442c', rect(30, 58, 54, 18), 1.6],
  ['f', '#fffaf0', rect(30, 76, 54, 56), 1.6],
  ['f', '#f3e8cf', 'M30,76 L84,76 L84,80 L74,84 L66,80 L54,85 L44,80 L30,82 Z', 1],
  ['l', `${c(44, 60, 3)} ${c(70, 60, 3)}`, 1.4],
  [
    's',
    '#1a1714',
    'M40,94 L46,90 L46,122 M54,93 C56,86 70,86 70,94 C70,100 64,104 60,105 C66,105 72,108 72,114 C72,124 56,124 53,117',
    3.6,
  ],
  // Vlaječka vzorného pracovníka s hvězdou.
  ['l', 'M100,34 L150,34', 1.6],
  ['f', '#d7442c', 'M104,34 L146,34 L125,86 Z', 1.8],
  ['f', '#e9b030', 'M125,42 L128,50 L136,50 L130,55 L132,63 L125,58 L118,63 L120,55 L114,50 L122,50 Z', 1],
  ['l', 'M110,74 L106,82 M140,74 L144,82', 1],
  // Graf plnění plánu: poslední sloupec přes čáru i rám.
  ['f', '#fffaf0', rect(158, 44, 64, 70), 1.6],
  ['f', '#d7442c', `${rect(164, 88, 10, 20)} ${rect(178, 80, 10, 28)} ${rect(192, 72, 10, 36)}`, 1.2],
  ['f', '#e9b030', 'M206,108 L216,108 L216,40 L222,40 L211,26 L200,40 L206,40 Z', 1.4],
  ['l', 'M162,62 h6 M172,62 h6 M182,62 h6 M192,62 h6 M202,62 h6 M212,62 h6 M162,108 H218', 1.2],
  // Stůl.
  ['f', '#8c5632', 'M16,204 H234 V284 H16 Z', 1.8],
  ['f', '#5a3418', 'M16,204 H234 V212 H16 Z', 1.2],
  // Karafiát ve sklenici.
  ['f', '#bcd6e6', 'M30,174 L52,174 L50,206 L32,206 Z', 1.4],
  ['s', '#2f6b3a', 'M41,206 C40,184 46,164 44,148', 2.6],
  ['f', '#5d9a3e', place('M-10,0 Q0,-4 10,0 Q0,4 -10,0 Z', 50, 166, 1, -40), 1],
  ['f', '#d7442c', shag(44, 144, 14, 11, 9, 0.3), 1.6],
  ['f', '#b8302a', shag(44, 146, 7, 5, 6, 0.3, 0.3), 0.8],
  // Odklopená chlopeň sáčku a bankovky z něj.
  ['f', '#c99a62', place('M-45,-28 L0,-58 L45,-28 Z', 128, 210, 1, -3), 1.8],
  ['f', '#9fd0c4', place(BANKNOTE, 104, 150, 1, -24), 1.6],
  ['f', '#c6dcae', place(BANKNOTE, 128, 140, 1, -4), 1.6],
  ['f', '#9fd0c4', place(BANKNOTE, 152, 148, 1, 18), 1.6],
  [
    'l',
    `${place(ell(0, -6, 6, 7), 104, 150, 1, -24)} ${place(ell(0, -6, 6, 7), 128, 140, 1, -4)} ${place(ell(0, -6, 6, 7), 152, 148, 1, 18)}`,
    1,
  ],
  [
    'l',
    `${place('M-10,-18 H10 M-10,10 H10', 104, 150, 1, -24)} ${place('M-10,-18 H10 M-10,10 H10', 128, 140, 1, -4)} ${place('M-10,-18 H10 M-10,10 H10', 152, 148, 1, 18)}`,
    0.8,
  ],
  // Výplatní sáček z hnědého papíru (zadní strana se slepenými chlopněmi) a kulaté razítko s hvězdou.
  ['f', '#c99a62', place('M-46,-30 L46,-30 L44,44 L-44,44 Z', 128, 210, 1, -3), 2.2],
  ['h', place('M-44,44 L-4,10 L4,10 L44,44 Z', 128, 210, 1, -3), 45],
  ['l', place('M-46,-30 L-4,10 L4,10 L46,-30 M-44,44 L-4,10 M44,44 L4,10', 128, 210, 1, -3), 1.3],
  ['s', '#b8302a', place(`${ell(16, -12, 11)} ${ell(16, -12, 7.5)}`, 128, 210, 1, -3), 1.6],
  [
    'f',
    '#b8302a',
    place(
      'M16,-18 L17.6,-14 L21.6,-14 L18.4,-11.4 L19.6,-7.4 L16,-9.8 L12.4,-7.4 L13.6,-11.4 L10.4,-14 L14.4,-14 Z',
      128,
      210,
      1,
      -3,
    ),
    0,
  ],
  // Štos mincí.
  [
    'f',
    '#e9b030',
    `${ell(206, 250, 15, 5)} ${ell(206, 243, 15, 5)} ${ell(206, 236, 15, 5)} ${ell(206, 229, 15, 5)}`,
    1.4,
  ],
  ['f', '#e9b030', `${ell(188, 258, 8, 3.5)} ${ell(38, 240, 8, 3.5)}`, 1.2],
];

// ─────────────────────────── Brigádník ───────────────────────────

/** Chmelová réva na drátěnce: hrbolatý sloup listí. */
function bine(x: number, top: number, bottom: number, w: number): string {
  const n = Math.round((bottom - top) / 16);
  const pts: string[] = [`M${x},${top}`];
  for (let i = 0; i < n; i++) {
    const y0 = top + i * 16;
    const ww = w * (0.55 + 0.45 * (i / n));
    pts.push(`Q${r1(x + ww + 6)},${r1(y0 + 8)} ${r1(x + ww * 0.6)},${r1(y0 + 16)}`);
  }
  for (let i = n - 1; i >= 0; i--) {
    const y0 = top + i * 16;
    const ww = w * (0.55 + 0.45 * (i / n));
    pts.push(`Q${r1(x - ww - 6)},${r1(y0 + 8)} ${r1(x - ww * 0.6)},${r1(y0)}`);
  }
  return pts.join(' ') + ' Z';
}

/** Chmelový list (trojlaločný). */
const HOP_LEAF = 'M0,9 C-11,7 -15,-2 -9,-6 C-9,-13 -2,-15 0,-9 C2,-15 9,-13 9,-6 C15,-2 11,7 0,9 Z';
/** Chmelová šištice. */
const HOP = 'M0,-6 C5,-5 6,2 0,8 C-6,2 -5,-5 0,-6 Z';

// Brigádník: česání chmele — chmelnice s drátěnkou a révami, koš plný šištic (pár listů a jedna ponožka:
// „kvalita se dořeší“), kartička s čárkami „od kusu“ na šňůrce, spálený nos, šiltovka.
/** Chmelové révy po šňůrách do V: [x dole, y dole, x nahoře, y nahoře]. */
const BINES: readonly (readonly [number, number, number, number])[] = [
  [46, 232, 26, 34],
  [68, 232, 98, 40],
  [204, 232, 224, 34],
  [182, 232, 154, 40],
];

/** Bod na révě (podíl `t` od země) posunutý kolmo o `off`. */
function alongBine(b: readonly [number, number, number, number], t: number, off: number): [number, number] {
  const [x0, y0, x1, y1] = b;
  const len = Math.hypot(x1 - x0, y1 - y0);
  return [x0 + (x1 - x0) * t - ((y1 - y0) / len) * off, y0 + (y1 - y0) * t + ((x1 - x0) / len) * off];
}

const TEMP_BACKDROP: SceneOp[] = [
  ['f', '#f2cf4a', c(200, 50, 15), 1.4],
  // Drátěnka: sloupy, drát nahoře, šňůry do V.
  ['l', 'M16,30 H234 M22,30 V230 M228,30 V230', 2],
  ['l', BINES.map(([x0, y0, x1, y1]) => `M${x0},${y0} L${x1},${y1}`).join(' '), 0.8],
  // Révy (listnatý pruh podél šňůry).
  [
    'f',
    '#5d9a3e',
    BINES.map((b) => {
      const [x0, y0, x1, y1] = b;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const deg = (Math.atan2(x1 - x0, y0 - y1) * 180) / Math.PI;
      return place(bine(0, -len / 2 + 6, len / 2, 10), (x0 + x1) / 2, (y0 + y1) / 2, 1, deg);
    }).join(' '),
    1.3,
  ],
  // Listy a šištice.
  [
    'f',
    '#2f6b3a',
    BINES.flatMap((b, i) =>
      [0.32, 0.66].map((t, k) => {
        const [x, y] = alongBine(b, t, (k + i) % 2 ? 12 : -12);
        return place(HOP_LEAF, x, y, 1, (k + i) % 2 ? 20 : -20);
      }),
    ).join(' '),
    1.1,
  ],
  [
    'f',
    '#c6dcae',
    BINES.flatMap((b, i) =>
      [0.18, 0.46, 0.8].map((t, k) => {
        const [x, y] = alongBine(b, t, (k + i) % 2 ? -13 : 13);
        return place(HOP, x, y + 4, 1);
      }),
    ).join(' '),
    1,
  ],
  [
    'l',
    BINES.flatMap((b, i) =>
      [0.18, 0.46, 0.8].map((t, k) => {
        const [x, y] = alongBine(b, t, (k + i) % 2 ? -13 : 13);
        return place('M-3,0 L0,2 L3,0 M-2.5,4 L0,6 L2.5,4', x, y + 2, 1);
      }),
    ).join(' '),
    0.7,
  ],
  // Pole s hlínou.
  ['f', '#c99a62', 'M16,226 C70,220 180,222 234,218 L234,284 L16,284 Z', 1.4],
  ['l', 'M24,244 h20 M200,240 h22 M30,258 h14', 1],
];

const TEMP_OUTFIT: SceneOp[] = [
  // Šňůrka a kartička s čárkami.
  ['l', 'M114,212 L120,238 M136,212 L131,238', 1.2],
  ['f', '#fffaf0', rect(112, 236, 28, 30), 1.4],
  [
    'l',
    'M116,242 v8 M119,242 v8 M122,242 v8 M125,242 v8 M114,249 l13,-6 M130,242 v8 M133,242 v8 M136,242 v8 M116,255 v8 M119,255 v8 M122,255 v8',
    1,
  ],
];

const TEMP_EXTRA: SceneOp[] = [
  // Kšilt šiltovky.
  ['f', '#b8302a', 'M90,132 C96,151 154,151 160,132 C148,140 102,140 90,132 Z', 1.8],
  // Koš na chmel před ním: ucho, proutí, kopec šištic, list a ponožka.
  ['s', '#8c5632', 'M160,226 C160,182 214,182 214,226', 4],
  ['f', '#c6dcae', shag(187, 222, 28, 12, 9, 0.25), 1.4],
  [
    'l',
    [
      [170, 218],
      [182, 216],
      [194, 218],
      [206, 220],
      [176, 226],
      [198, 226],
    ]
      .map(([x, y]) => place(HOP, x!, y!, 0.8))
      .join(' '),
    0.8,
  ],
  ['f', '#5d9a3e', place('M-12,0 Q0,-7 12,0 Q0,7 -12,0 Z', 206, 212, 1, -30), 1.1],
  ['f', '#fffaf0', 'M167,203 L176,202 L177,214 L187,217 C191,219 190,225 186,225 L170,222 Z', 1.2],
  ['f', '#d7442c', 'M167,203 L176,202 L176.3,207 L167.4,208 Z', 0.9],
  ['f', '#c99a62', 'M156,226 L218,226 L210,264 L164,264 Z', 1.8],
  ['l', 'M158,238 H215 M161,250 H212 M174,226 L177,264 M187,226 L187,264 M200,226 L197,264', 0.9],
  ['f', '#8c5632', 'M154,224 L220,224 L219,230 L155,230 Z', 1.3],
  // Padající šištice a kapka potu.
  ['f', '#c6dcae', `${place(HOP, 226, 244, 1, 30)} ${place(HOP, 150, 256, 1, -20)}`, 1],
  ['f', '#bcd6e6', 'M88,128 C83,136 83,141 88,141 C93,141 93,136 88,128 Z', 1],
];

// ─────────────────────────── Rybář ───────────────────────────

/** Kapr hledící doleva (nos na x −30). */
const CARP =
  'M-30,0 C-24,-12 -6,-16 12,-12 C20,-10 26,-6 30,-2 L42,-12 L38,0 L42,12 L30,2 C26,6 18,12 6,13 C-10,14 -24,10 -30,0 Z';

// Rybář: rybník s rákosím a orobincem, obří kapr právě vyskakuje a utíká; na vlasci místo ryby
// přívlač s babskou radou (svitek) a splávek; plandající klobouk s mouškami, vesta s kapsami, prut.
const FISH_BACKDROP: SceneOp[] = [
  // Protější břeh a rybník.
  [
    'f',
    '#5d9a3e',
    'M16,124 C40,110 60,118 84,108 C110,98 140,112 166,104 C192,96 214,110 234,104 L234,142 L16,142 Z',
    1.4,
  ],
  ['f', '#2f6b3a', `${c(40, 116, 14, 10)} ${c(150, 104, 12, 9)} ${c(208, 102, 13, 10)}`, 1.2],
  ['f', '#6fa0c8', 'M16,138 H234 V284 H16 Z', 1.4],
  [
    'l',
    'M24,166 c10,-3 20,3 30,0 M190,160 c10,-3 20,3 30,0 M30,232 c10,-3 20,3 30,0 M190,228 c10,-3 20,3 30,0',
    1.1,
  ],
  // Rákosí a orobinec.
  [
    'f',
    '#8a8f2e',
    'M18,284 C20,240 22,206 26,178 C28,210 28,250 28,284 Z M226,284 C226,250 226,214 230,184 C232,214 234,250 234,284 Z',
    1.2,
  ],
  ['s', '#2f6b3a', 'M36,284 C36,250 38,220 40,196 M220,284 C218,252 216,226 214,206', 2.2],
  ['f', '#8c5632', `${ell(40, 186, 4, 12)} ${ell(214, 196, 4, 12)}`, 1.2],
  // Utíkající kapr se šplouchnutím.
  ['f', '#fffaf0', 'M48,206 L54,190 L60,202 L66,184 L72,200 L80,188 L84,206 C76,212 56,212 48,206 Z', 1.4],
  ['f', '#e9b030', place(CARP, 62, 172, 1.05, 22), 1.8],
  ['f', '#c08a1e', place('M-6,-14 L4,-24 L16,-13 Z', 62, 172, 1.05, 22), 1.2],
  ['l', place('M-8,-4 C-6,0 -6,4 -8,8 M0,-6 C2,-1 2,5 0,10 M8,-6 C10,-1 10,5 8,10', 62, 172, 1.05, 22), 0.9],
  ['f', 'dark', place(ell(-20, -3, 2.2), 62, 172, 1.05, 22), 0],
  ['l', place('M-29,4 C-33,8 -34,12 -32,16 M-26,6 C-28,10 -27,14 -25,16', 62, 172, 1.05, 22), 1],
  ['f', '#bcd6e6', `${ell(36, 154, 2.4, 3.2)} ${ell(92, 150, 2.4, 3.2)} ${ell(28, 186, 2, 2.8)}`, 1],
];

const FISH_OUTFIT: SceneOp[] = [
  // Kapsy rybářské vesty.
  [
    'f',
    '#c99a62',
    `${rect(84, 238, 22, 14)} ${rect(86, 254, 22, 11)} ${rect(144, 238, 22, 14)} ${rect(142, 254, 22, 11)}`,
    1.2,
  ],
  ['l', 'M84,243 H106 M86,258 H108 M144,243 H166 M142,258 H164', 0.9],
  // Moucha zapíchnutá ve vestě.
  ['f', '#d7442c', 'M92,226 L100,222 L98,230 Z', 0.8],
];

const FISH_EXTRA: SceneOp[] = [
  // Mušky zapíchnuté v klobouku.
  ['f', '#d7442c', 'M104,124 L114,120 L110,130 Z', 1],
  ['f', '#f2cf4a', 'M138,116 L148,112 L146,122 Z', 1],
  ['l', 'M112,128 C116,130 116,134 112,134 M146,120 C150,122 150,126 146,126', 0.9],
  // Prut s navijákem, vlasec, splávek a ulovená babská rada.
  ['s', '#5a3418', 'M166,284 L224,36', 3.4],
  ['f', '#9a958a', c(165, 258, 7), 1.4],
  ['l', 'M165,258 L171,254 M161,256 L163,262', 1.2],
  ['l', 'M224,36 C230,70 222,96 210,140', 0.9],
  ['f', '#d7442c', 'M212,112 C208,118 210,126 215,126 C220,126 222,118 218,112 Z', 1.1],
  ['f', '#fffaf0', 'M210,120 C210,126 220,126 220,120 Z', 0.6],
  ['l', 'M215,106 L215,112', 1],
  ['l', 'M210,140 C206,142 206,148 210,148', 1.2],
  ['f', '#f6e3a1', place('M-16,-6 L16,-6 L16,6 L-16,6 Z', 206, 154, 1, -8), 1.6],
  [
    'f',
    '#f6e3a1',
    `${place(ell(-16, 0, 3, 6), 206, 154, 1, -8)} ${place(ell(16, 0, 3, 6), 206, 154, 1, -8)}`,
    1.4,
  ],
  ['s', '#d7442c', place('M-2,-7 L-2,7', 206, 154, 1, -8), 2.4],
  ['f', '#bcd6e6', `${ell(196, 168, 1.8, 2.6)} ${ell(212, 172, 1.8, 2.6)}`, 0.8],
  ...hand(176, 241, -76),
];

// ─────────────────────────── Výstup ───────────────────────────

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  hejkal: {
    bg: '#22365c',
    motif: 'none',
    skin: HEJKAL_SKIN,
    body: '#2f6b3a',
    collar: 'plain',
    hair: 'none',
    beard: undefined,
    mood: 'o',
    prop: undefined,
    backdrop: HEJKAL_BACKDROP,
    outfit: HEJKAL_OUTFIT,
    extra: HEJKAL_EXTRA,
  },
  tram_driver: {
    bg: TRAM_RED,
    motif: 'none',
    body: '#3d4a66',
    collar: 'uniform',
    accent: '#e9b030',
    hair: 'short',
    hairColor: '#3b2a1a',
    beard: 'mustache',
    beardColor: '#3b2a1a',
    hat: 'cap',
    hatColor: '#22365c',
    hatAccent: '#e9b030',
    mood: 'smile',
    prop: undefined,
    backdrop: TRAM_BACKDROP,
    extra: TRAM_EXTRA,
  },
  punter: {
    bg: '#c6dcae',
    motif: 'none',
    body: '#8c5632',
    collar: 'tie',
    accent: '#d7442c',
    hair: 'part',
    hairColor: '#2f2a26',
    hat: 'flatcap',
    hatColor: '#5b5850',
    mood: 'sly',
    redNose: false,
    prop: undefined,
    backdrop: PUNTER_BACKDROP,
    outfit: PUNTER_OUTFIT,
    extra: PUNTER_EXTRA,
  },
  pavlac_gossip: {
    bg: '#f6e3a1',
    motif: 'none',
    body: GOSSIP_DRESS,
    collar: 'plain',
    female: true,
    hair: 'none',
    hat: 'scarf',
    hatColor: '#d7442c',
    mood: 'sly',
    prop: undefined,
    backdrop: GOSSIP_BACKDROP,
    outfit: GOSSIP_OUTFIT,
    extra: GOSSIP_EXTRA,
  },
  temp_worker: {
    bg: '#f6e3a1',
    motif: 'none',
    body: '#2f5fa8',
    collar: 'plain',
    hair: 'curly',
    hairColor: '#c9a060',
    hat: 'cap',
    hatColor: '#d7442c',
    hatAccent: '#fffaf0',
    mood: 'grin',
    redNose: true,
    prop: undefined,
    backdrop: TEMP_BACKDROP,
    outfit: TEMP_OUTFIT,
    extra: TEMP_EXTRA,
  },
  fisherman: {
    bg: '#bcd6e6',
    motif: 'none',
    body: '#d7442c',
    collar: 'vest',
    accent: '#8a8f2e',
    hair: 'short',
    hairColor: '#6b4423',
    hat: 'bucket',
    hatColor: '#5d9a3e',
    beard: 'beard',
    beardColor: '#9a958a',
    mood: 'sad',
    prop: undefined,
    backdrop: FISH_BACKDROP,
    outfit: FISH_OUTFIT,
    extra: FISH_EXTRA,
  },
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  rundu: RUNDU,
  hermelin: HERMELIN,
  'j-thirteenth_salary': THIRTEENTH,
};

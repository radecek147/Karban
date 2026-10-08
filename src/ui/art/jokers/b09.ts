/**
 * Obrázky žolíků — dávka 09 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - court_painter — Dvorní malíř: portrét `fig-court_painter` (FIGURES['court_painter'])
 *  - colorblind_uncle — Barvoslepý strýc: portrét `fig-colorblind_uncle` (FIGURES['colorblind_uncle'])
 *  - trodden_path — Vyšlapaná pěšina: nová scéna `j-trodden_path` (SCENES['j-trodden_path'])
 *  - war_loot — Válečná kořist: nová scéna `j-war_loot` (SCENES['j-war_loot'])
 *  - anonymous_commenter — Anonymní diskutér: portrét `fig-anonymous_commenter` (FIGURES['anonymous_commenter'])
 *  - viral_video — Virální video: portrét `fig-viral_video` (FIGURES['viral_video'])
 *  - carbon_paper — Kopírák: nová scéna `j-carbon_paper` (SCENES['j-carbon_paper'])
 *  - defenestration — Defenestrace: scéna `defenestrace` (SCENES['defenestrace'])
 *  - brno_native — Brňák: portrét `fig-brno_native` (FIGURES['brno_native'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Barvy bereme přímo z tiskových inkoustů (print.ts `INKS`) — jiné odstíny se k nim stejně přichytí.
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import type { SceneOp } from '../sceneKit';
import { c, rect } from '../sceneKit';

// ─────────────────────────── Pomocné tvary ───────────────────────────

const SKIN = '#f2b48e';
const RED = '#d7442c';
const NAVY = '#22365c';
const GOLD = '#e9b030';
const CREAM = '#fffaf0';
const PAPER = '#f3e8cf';
const SKY = '#bcd6e6';
const GREEN = '#5d9a3e';
const OCHRE = '#c99a62';
const BROWN = '#8c5632';
const GREY = '#9a958a';
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

/** Elipsa jen z Bézierových křivek (dá se otáčet přes `place`). */
function ell(cx: number, cy: number, rx: number, ry = rx): string {
  const k = 0.5523;
  return (
    `M${cx - rx},${cy} C${cx - rx},${cy - ry * k} ${cx - rx * k},${cy - ry} ${cx},${cy - ry} ` +
    `C${cx + rx * k},${cy - ry} ${cx + rx},${cy - ry * k} ${cx + rx},${cy} ` +
    `C${cx + rx},${cy + ry * k} ${cx + rx * k},${cy + ry} ${cx},${cy + ry} ` +
    `C${cx - rx * k},${cy + ry} ${cx - rx},${cy + ry * k} ${cx - rx},${cy} Z`
  );
}

/** Obdélník se zaoblenými rohy kolem středu 0,0 (místní souřadnice pro `place`). */
function rrect(w: number, h: number, r: number): string {
  const x = w / 2;
  const y = h / 2;
  return (
    `M${-x + r},${-y} L${x - r},${-y} Q${x},${-y} ${x},${-y + r} L${x},${y - r} Q${x},${y} ${x - r},${y} ` +
    `L${-x + r},${y} Q${-x},${y} ${-x},${y - r} L${-x},${-y + r} Q${-x},${-y} ${-x + r},${-y} Z`
  );
}

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
function hand(x: number, y: number, deg = 0): SceneOp[] {
  return [
    ['f', SKIN, c(x, y, 11, 9), 1.8],
    ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', x, y, 1, deg), 1.1],
  ];
}

/** Srdce (výška ~36 při s = 1). */
const HEART =
  'M0,16 C-10,8 -20,0 -20,-8 C-20,-16 -14,-20 -9,-20 C-4,-20 -1,-17 0,-13 C1,-17 4,-20 9,-20 C14,-20 20,-16 20,-8 C20,0 10,8 0,16 Z';
/** Káro. */
const DIAMOND = 'M0,-20 C5,-12 10,-6 15,0 C10,6 5,12 0,20 C-5,12 -10,6 -15,0 C-10,-6 -5,-12 0,-20 Z';
/** Pik (hrot nahoře, stopka dole na y 20). */
const SPADE =
  'M0,-20 C-6,-11 -20,-5 -20,5 C-20,12 -14,15 -9,15 C-5,15 -2,13 -1,11 L-4,20 L4,20 L1,11 C2,13 5,15 9,15 C14,15 20,12 20,5 C20,-5 6,-11 0,-20 Z';
/** Kříže (♣) jako jedna cesta — kreslit bez obrysu (překryvy kruhů). */
function club(x: number, y: number, s: number): string {
  return [
    ell(x, y - 8 * s, 7.5 * s),
    ell(x - 8.5 * s, y + 4 * s, 7.5 * s),
    ell(x + 8.5 * s, y + 4 * s, 7.5 * s),
    place('M-1.6,4 L-4.5,17 L4.5,17 L1.6,4 Z', x, y, s),
  ].join(' ');
}

/** Tahy znaků (číslice, figury) v rámečku 6 × 10, levý horní roh v 0,0. */
const GLYPH: Readonly<Record<string, string>> = {
  '1': 'M1,2.2 L3.6,0 L3.6,10',
  '2': 'M0.2,2.4 C0.4,-0.6 6,-0.8 6,2.6 C6,5.4 0.6,7.6 0,10 L6,10',
  '3': 'M0,1.2 C1.5,-0.5 6,-0.4 6,2.6 C6,4.4 4,5 2.4,5 C4.4,5 6,6 6,7.6 C6,10.6 1.2,10.6 0,8.8',
  '4': 'M4.6,10 L4.6,0 L0,7 L6,7',
  '6': 'M5.4,0.8 C2.6,-0.6 0,1.4 0,6 C0,9 1.6,10 3,10 C4.8,10 6,8.8 6,7.4 C6,5.8 4.8,4.9 3.2,4.9 C1.6,4.9 0.3,5.8 0,7',
  '7': 'M0,0 L6,0 L2.2,10',
  K: 'M0,0 L0,10 M6,0 L0,6.2 M2,4.4 L6,10',
  Q: 'M3,0 C-1,0 -1,10 3,10 C7,10 7,0 3,0 Z M3.8,7.4 L6.6,11',
  J: 'M6,0 L6,7 C6,10.6 0,10.6 0,7.4',
};
const glyph = (ch: string, x: number, y: number, s = 1, deg = 0): string =>
  place(GLYPH[ch] ?? '', x, y, s, deg);

/** Korunka figury (místně kolem 0,0, šířka 16). */
const CROWN = 'M-8,5 L-8,-4 L-4,0 L0,-6 L4,0 L8,-4 L8,5 Z';

/** Létající figura: karta s indexem v rohu, barvou a korunkou uprostřed. */
function faceCard(x: number, y: number, deg: number, rank: string, red: boolean, s = 1): SceneOp[] {
  const p = (d: string): string => place(d, x, y, s, deg);
  const col = red ? RED : 'dark';
  const pip = place(red ? HEART : SPADE, 0, 0, 0.17);
  return [
    ['f', CREAM, p(rrect(26, 36, 3)), 1.5],
    ['f', GOLD, p(place(CROWN, 1, 3, 0.95)), 1],
    ['l', p(place(GLYPH[rank] ?? '', -10, -15, 0.75)), 1.3],
    ['f', col, p(`${place(pip, -7, -1)} ${place(pip, 6, 12)}`), 0],
  ];
}

// ─────────────────────────── Dvorní malíř ───────────────────────────

/** Koňská hlava z profilu (doprava, výška ~42). */
const HORSE =
  'M-14,20 C-16,6 -12,-6 -4,-12 L-7,-22 L1,-15 C4,-16 7,-16 9,-15 C15,-11 20,-2 22,6 C23,10 20,13 16,12 C12,11 9,9 6,11 C3,14 2,18 2,20 Z';
const HORSE_MANE = 'M-14,20 C-16,6 -12,-6 -4,-12 L-9,-9 C-17,-3 -21,8 -21,20 Z';
/** Čtyřcípá hvězdička tapety. */
const SPARK = 'M0,-4 Q0.8,-0.8 4,0 Q0.8,0.8 0,4 Q-0.8,0.8 -4,0 Q-0.8,-0.8 0,-4 Z';

// Dvorní malíř: zámecký salon se švestkovou tapetou a závěsem, na stojanu rozmalovaný král jako hrací karta
// (z obyčejných karet dělá figury), na zdi pozlacený obraz koně („za příplatek i s koněm“); halena s cákanci,
// velká mašle, baret, natočený knír, paleta a štětec.
const COURT_PAINTER: Partial<FigureSpec> = {
  bg: '#8e3b6e',
  motif: 'none',
  body: CREAM,
  collar: 'plain',
  hair: 'curly',
  hairColor: '#5a3418',
  beard: 'goatee',
  beardColor: '#5a3418',
  hat: 'beret',
  hatColor: RED,
  mood: 'smile',
  prop: undefined,
  backdrop: [
    // Tapeta se zlatými hvězdičkami a tmavé obložení se zlatou lištou.
    [
      'f',
      GOLD,
      [28, 54, 80, 106, 132, 158, 184, 210]
        .flatMap((x, i) => [44, 76, 108, 140, 172].map((y) => place(SPARK, x, y + (i % 2) * 16, 0.8)))
        .join(' '),
      0,
    ],
    ['f', '#5a3418', rect(16, 196, 218, 88), 1.4],
    ['s', GOLD, 'M16,196 L234,196', 3],
    // Závěs s třapcem vlevo.
    ['f', RED, 'M16,16 L50,16 C44,60 38,98 28,126 C36,150 40,180 38,212 L16,212 Z', 1.8],
    ['l', 'M26,16 C26,60 24,100 20,124 M38,16 C36,60 32,98 26,122 M24,132 C28,160 28,190 26,212', 1],
    ['s', GOLD, 'M16,122 C22,130 30,132 36,126', 3],
    ['f', GOLD, 'M33,128 C31,134 31,140 30,148 L40,148 C39,140 38,134 36,128 Z', 1.2],
    // Pozlacený obraz koně na zdi.
    ['f', GOLD, rect(46, 62, 46, 54), 2],
    ['f', SKY, rect(51, 67, 36, 44), 1.1],
    ['f', GREEN, 'M51,100 C62,96 76,98 87,96 L87,111 L51,111 Z', 0],
    ['f', CREAM, place(HORSE, 68, 92, 0.75), 1.4],
    ['f', BROWN, place(HORSE_MANE, 68, 92, 0.75), 1.1],
    ['f', 'dark', c(72, 86, 1.3), 0],
    // Malířský stojan s plátnem: rozmalovaný král jako hrací karta.
    ['f', OCHRE, 'M175,40 L182,40 L168,284 L160,284 Z', 1.4],
    ['f', OCHRE, 'M206,40 L213,40 L230,284 L222,284 Z', 1.4],
    ['f', BROWN, rect(186, 34, 16, 8), 1.2],
    ['f', CREAM, rect(162, 54, 68, 92), 2],
    ['l', rect(168, 60, 56, 80), 0.8],
    ['l', glyph('K', 171, 64, 1.1), 1.5],
    ['f', RED, place(HEART, 174, 82, 0.17), 0],
    ['f', SKIN, c(198, 98, 9.5, 10.5), 1.4],
    ['f', GOLD, place(CROWN, 198, 82, 1.2), 1.2],
    ['f', '#d9d2c2', 'M189,103 C191,115 205,115 207,103 C203,108 193,108 189,103 Z', 1],
    ['f', 'dark', `${c(195, 96, 1.2)} ${c(201, 96, 1.2)}`, 0],
    ['f', RED, 'M178,138 C178,122 186,112 198,112 C210,112 218,122 218,138 Z', 1.4],
    ['f', CREAM, 'M186,116 C192,122 204,122 210,116 L212,122 C204,128 192,128 184,122 Z', 1],
    ['f', 'dark', `${c(191, 121, 0.9)} ${c(198, 124, 0.9)} ${c(205, 121, 0.9)}`, 0],
    ['f', BROWN, rect(158, 144, 76, 7), 1.4],
  ],
  outfit: [
    // Cákance barev na halenu a velká volná mašle.
    ['f', RED, `${c(164, 266, 4.5)} ${c(186, 250, 3)}`, 0.8],
    ['f', '#2f5fa8', `${c(84, 272, 3.5)} ${c(150, 276, 3)}`, 0.8],
    ['f', '#f2cf4a', `${c(176, 272, 3.5)} ${c(98, 252, 2.6)}`, 0.8],
    ['f', NAVY, 'M122,226 C118,240 112,252 107,262 L116,263 C120,251 124,240 127,228 Z', 1.4],
    ['f', NAVY, 'M128,226 C134,240 140,250 146,258 L138,262 C132,250 128,240 123,228 Z', 1.4],
    ['f', NAVY, 'M125,222 C110,208 92,212 96,226 C98,236 114,232 125,222 Z', 1.6],
    ['f', NAVY, 'M125,222 C140,208 158,212 154,226 C152,236 136,232 125,222 Z', 1.6],
    ['f', NAVY, c(125, 223, 6), 1.4],
  ],
  extra: [
    // Natočený knír.
    ['l', 'M109,170 C103,170 100,165 104,161 M141,170 C147,170 150,165 146,161', 1.6],
    // Paleta v levé ruce (palec skrz otvor) a štětec v pravé ruce u plátna.
    [
      'f',
      OCHRE,
      'M46,246 C44,232 64,224 84,228 C100,231 106,242 100,252 C96,258 88,256 86,262 C84,270 72,274 60,270 C50,266 46,258 46,246 Z',
      1.8,
    ],
    ['f', CREAM, c(62, 256, 5), 1.2],
    ['f', RED, c(62, 238, 4.6), 1],
    ['f', '#f2cf4a', c(76, 234, 4.6), 1],
    ['f', '#2f5fa8', c(90, 238, 4.6), 1],
    ['f', GREEN, c(94, 250, 4.2), 1],
    ['f', CREAM, c(78, 262, 4), 1],
    ['f', SKIN, 'M52,262 C50,254 56,250 62,253 C66,256 66,262 62,266 C58,268 54,266 52,262 Z', 1.4],
    ['s', BROWN, 'M164,268 L200,148', 4],
    ['s', '#d9d2c2', 'M199,151 L202,141', 5],
    ['f', RED, 'M199,143 C198,137 201,132 205,130 C207,134 207,140 204,145 Z', 1.2],
    ...hand(173, 240, -73),
  ],
};

// ─────────────────────────── Barvoslepý strýc ───────────────────────────

// Barvoslepý strýc: sako sešité z červené a zelené půlky (jemu je to jedno), brýle „dna od lahve“ a v bublině
// „♥ = ♦, ♠ = ♣“; za ním přechod a semafor se třemi stejně šedivými světly očíslovanými 1-2-3 („jezdí podle
// pořadí, ne podle barvy“).
const COLORBLIND_UNCLE: Partial<FigureSpec> = {
  bg: SKY,
  motif: 'none',
  body: RED,
  body2: GREEN,
  collar: 'tie',
  accent: '#f2cf4a',
  hair: 'bald',
  hairColor: GREY,
  beard: 'mustache',
  beardColor: GREY,
  glasses: false,
  mood: 'grin',
  prop: undefined,
  outfit: [
    // Kravata s červenými a zelenými puntíky.
    ['f', RED, `${c(123.5, 222, 1.7)} ${c(126.5, 236, 1.7)}`, 0],
    ['f', GREEN, `${c(126.5, 229, 1.7)} ${c(124, 243, 1.5)}`, 0],
  ],
  backdrop: [
    // Dům v ulici, silnice a zebra přechodu.
    ['f', PAPER, 'M16,206 L16,128 L64,128 L64,206 Z', 1.4],
    ['f', BROWN, 'M12,130 L40,104 L68,130 Z', 1.4],
    ['f', '#6fa0c8', `${rect(24, 146, 12, 16)} ${rect(44, 146, 12, 16)} ${rect(24, 176, 12, 16)}`, 1.1],
    ['f', '#5b5850', 'M16,206 L234,206 L234,284 L16,284 Z', 1.4],
    [
      'f',
      CREAM,
      `${rect(16, 213, 218, 6)} ${rect(16, 228, 218, 9)} ${rect(16, 249, 218, 12)} ${rect(16, 274, 218, 10)}`,
      0.8,
    ],
    // Semafor: tři stejná světla s namalovanými čísly.
    ['f', NAVY, rect(196, 132, 7, 76), 1.4],
    [
      'f',
      NAVY,
      'M180,42 C180,36 184,34 188,34 L210,34 C214,34 218,36 218,42 L218,128 C218,132 214,134 210,134 L188,134 C184,134 180,132 180,128 Z',
      1.8,
    ],
    ['f', GREY, `${c(199, 56, 11)} ${c(199, 84, 11)} ${c(199, 112, 11)}`, 1.4],
    ['l', 'M186,46 C192,40 206,40 212,46 M186,74 C192,68 206,68 212,74 M186,102 C192,96 206,96 212,102', 1.4],
    [
      'l',
      `${glyph('1', 196, 50.5, 1.1)} ${glyph('2', 195.7, 78.5, 1.1)} ${glyph('3', 195.7, 106.5, 1.1)}`,
      1.3,
    ],
  ],
  extra: [
    // Tlusté brýle „dna od lahve“ s odlesky.
    ['l', `${c(114, 152, 9)} ${c(136, 152, 9)} M123,151 L127,151 M105,150 L98,147 M145,150 L152,147`, 3],
    ['l', 'M108,147 l4,-3 M130,147 l4,-3', 1.2],
    // Bublina: ♥ = ♦ a ♠ = ♣.
    [
      'f',
      CREAM,
      'M30,58 L86,58 C92,58 94,62 94,66 L94,112 C94,116 92,120 86,120 L82,120 L98,138 L72,120 L30,120 C26,120 22,116 22,112 L22,66 C22,62 26,58 30,58 Z',
      1.8,
    ],
    ['f', RED, `${place(HEART, 36, 77, 0.42)} ${place(DIAMOND, 79, 77, 0.45)}`, 1.2],
    ['f', 'dark', `${place(SPADE, 36, 104, 0.42)} ${club(79, 103, 0.62)}`, 0],
    ['l', 'M51,74 L63,74 M51,80 L63,80 M51,101 L63,101 M51,107 L63,107', 2],
  ],
};

// ─────────────────────────── Vyšlapaná pěšina ───────────────────────────

/** Karta ležící v trávě jako nášlapný kámen (zploštělá, natočená). */
function stepCard(x: number, y: number, w: number, rank: string, red: boolean): SceneOp[] {
  const s = w / 40;
  const deg = -16;
  return [
    ['f', CREAM, place(rrect(40, 24, 4), x, y, s, deg), 1.6],
    ['l', place(place(GLYPH[rank] ?? '', -11, -5.5, 1.1), x, y, s, deg), 1.6 * s + 0.3],
    ['f', red ? RED : 'dark', place(place(red ? HEART : SPADE, 7, 0, 0.3), x, y, s, deg), 0],
  ];
}

/** Sedmikrásky v trávníku. */
const DAISIES: readonly (readonly [number, number])[] = [
  [34, 176],
  [204, 172],
  [44, 212],
  [150, 238],
  [214, 204],
  [120, 160],
];

// Vyšlapaná pěšina: sídliště — k vchodu paneláku vede úřední chodník oklikou do L, ale přes trávník je
// vyšlapaná přímá pěšina z karet 3-4-…-6-7: pětka chybí a místo ní je louže se stopami (Postupka s jednou
// dírou); hned u pěšiny cedulka „nešlapat po trávníku“.
const TRODDEN_PATH: SceneOp[] = [
  ['f', SKY, rect(16, 16, 218, 268), 0],
  [
    'f',
    CREAM,
    'M168,44 C166,34 178,30 184,35 C188,26 204,26 206,36 C216,34 220,46 212,50 L172,51 C164,51 162,47 168,44 Z',
    1.3,
  ],
  // Paneláky: vzadu vlevo menší, vpředu velký s barevnými lodžiemi.
  ['f', '#d9d2c2', rect(28, 82, 66, 70), 1.4],
  ['l', 'M28,96 H94 M28,110 H94 M28,124 H94 M28,138 H94 M50,82 V152 M72,82 V152', 0.8],
  ['f', PAPER, rect(104, 56, 124, 96), 1.8],
  [
    'f',
    '#6fa0c8',
    [112, 134, 156, 178, 200].flatMap((x) => [62, 78, 94, 110].map((y) => rect(x + 2, y, 14, 9))).join(' '),
    0.9,
  ],
  ['f', RED, `${rect(112, 72, 18, 5)} ${rect(178, 104, 18, 5)}`, 0.9],
  ['f', '#f2cf4a', `${rect(156, 88, 18, 5)} ${rect(200, 72, 18, 5)}`, 0.9],
  ['f', '#2f5fa8', `${rect(134, 104, 18, 5)} ${rect(112, 104, 18, 5)}`, 0.9],
  ['l', 'M104,72 H228 M104,88 H228 M104,104 H228 M104,120 H228', 0.8],
  ['f', NAVY, rect(152, 128, 20, 24), 1.4],
  ['f', RED, rect(146, 124, 32, 5), 1.2],
  // Stromy u domu.
  ['f', BROWN, `${rect(97, 128, 4, 22)} ${rect(221, 132, 4, 18)}`, 1],
  ['f', '#2f6b3a', `${c(99, 124, 13, 15)} ${c(225, 128, 10, 13)}`, 1.4],
  // Trávník.
  ['f', GREEN, 'M16,148 C80,144 170,146 234,148 L234,284 L16,284 Z', 1.4],
  ['f', CREAM, DAISIES.map(([x, y]) => c(x, y, 2.6)).join(' '), 0.9],
  ['f', '#f2cf4a', DAISIES.map(([x, y]) => c(x, y, 1)).join(' '), 0],
  // Úřední chodník oklikou do L: podél spodního okraje, nahoru při pravém kraji a podél domu k vchodu.
  ['f', GREY, 'M16,250 L196,250 L210,162 L150,162 L152,152 L226,152 L234,156 L234,284 L16,284 Z', 1.6],
  [
    'l',
    'M40,250 L36,284 M80,250 L78,284 M120,250 L120,284 M160,250 L162,284 M200,250 L204,284 M207,180 L234,180 M203,206 L234,206 M199,230 L234,230 M176,152 L176,162 M200,152 L200,162',
    0.9,
  ],
  // Vyšlapaná pěšina napříč trávníkem.
  ['f', OCHRE, 'M20,251 C56,222 118,178 155,152 L166,152 C138,180 100,220 98,251 Z', 1.2],
  ['l', 'M26,246 l-4,-6 M34,240 l-3,-7 M96,244 l5,-6 M104,234 l4,-6', 1],
  ...stepCard(70, 236, 48, '3', true),
  ...stepCard(94, 212, 38, '4', false),
  // Chybí pětka: louže a stopy.
  ['f', BROWN, ell(116, 194, 13, 6), 1.2],
  [
    'f',
    '#5a3418',
    `${place(ell(0, 0, 2.8, 4.4), 110, 194, 1, 30)} ${place(ell(0, 0, 2.8, 4.4), 122, 192, 1, 30)}`,
    0.8,
  ],
  ...stepCard(133, 177, 28, '6', true),
  ...stepCard(149, 163, 21, '7', false),
  // Cedulka „nešlapat po trávníku“ přímo u pěšiny.
  ['f', BROWN, rect(176, 192, 4, 46), 1.2],
  ['f', CREAM, c(178, 184, 15), 1.8],
  ['s', RED, c(178, 184, 12), 3.4],
  [
    'f',
    'dark',
    [
      place('M0,-6 C4,-6 5,-1 4,3 C3,7 3,10 0,10 C-3,10 -4,7 -4,4 C-4,0 -4,-6 0,-6 Z', 177, 187, 0.9, 12),
      place(ell(-2.2, -9.5, 2), 177, 187, 0.9, 12),
      place(ell(1.2, -10.6, 1.5), 177, 187, 0.9, 12),
      place(ell(3.8, -9.4, 1.3), 177, 187, 0.9, 12),
      place(ell(5.6, -7.2, 1.1), 177, 187, 0.9, 12),
    ].join(' '),
    0,
  ],
  ['s', RED, 'M170,176 L186,192', 3],
];

// ─────────────────────────── Válečná kořist ───────────────────────────

/** Paprsky kola vozu. */
function spokes(cx: number, cy: number, r: number): string {
  let d = '';
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    d += `M${r1(cx + 6 * Math.cos(a))},${r1(cy + 6 * Math.sin(a))} L${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))} `;
  }
  return d.trim();
}

/** Meč zabodnutý hrotem dolů (místně: hrot v 0,0, jílec nahoře). */
const SWORD_BLADE = 'M0,0 L-3.5,-8 L-3.5,-44 L3.5,-44 L3.5,-8 Z';
const SWORD_GUARD = 'M-13,-44 L13,-44 L13,-50 L-13,-50 Z';
const SWORD_GRIP = 'M-2.6,-50 L2.6,-50 L2.6,-64 L-2.6,-64 Z';

// Válečná kořist: husitský válečný vůz po bitvě naložený kořistí (truhla zlaťáků, koruna, rytířská přilba,
// meč, ukořistěný prapor), na boku křídou čárky za každého poraženého šéfa („kořist počítal po vozech“)
// a nad vozem korouhev s kalichem.
const WAR_LOOT: SceneOp[] = [
  ['f', '#f6e3a1', rect(16, 16, 218, 268), 0],
  [
    'f',
    CREAM,
    'M96,58 C94,48 106,44 112,49 C116,40 132,40 134,50 C144,48 148,60 140,64 L100,65 C92,65 90,61 96,58 Z',
    1.3,
  ],
  ['f', '#c6dcae', 'M16,172 C60,156 110,164 150,156 C190,148 214,156 234,152 L234,284 L16,284 Z', 1.4],
  ['f', GREEN, 'M16,222 C80,214 170,218 234,212 L234,284 L16,284 Z', 1.4],
  // Korouhev s kalichem.
  ['f', BROWN, rect(204, 30, 5, 160), 1.4],
  ['f', RED, 'M204,34 L148,38 L160,56 L148,74 L204,70 Z', 1.8],
  [
    'f',
    GOLD,
    'M170,43 L188,43 C188,52 184,56 180,57 L180,62 L186,65 L172,65 L178,62 L178,57 C174,56 170,52 170,43 Z',
    1.2,
  ],
  // Kořist: ukořistěný prapor, hromada mincí, meč, truhla zlaťáků, koruna a přilba.
  ['f', BROWN, 'M54,142 L42,80 L45.5,79 L57.5,141 Z', 1.2],
  ['f', '#2f5fa8', 'M43,82 L24,87 L31,96 L24,105 L47,100 Z', 1.4],
  ['s', CREAM, 'M28,92 L45,89', 2.4],
  ['f', GOLD, 'M36,180 C46,150 80,138 110,142 C140,134 172,140 200,180 Z', 1.6],
  [
    'f',
    '#f2cf4a',
    (
      [
        [126, 156],
        [146, 148],
        [152, 163],
        [134, 166],
        [114, 166],
        [40, 169],
        [199, 168],
      ] as const
    )
      .map(([x, y]) => ell(x, y, 6.5, 3.4))
      .join(' '),
    1.1,
  ],
  ['f', '#d9d2c2', place(SWORD_BLADE, 116, 148, 1, -18), 1.4],
  ['f', GOLD, place(SWORD_GUARD, 116, 148, 1, -18), 1.4],
  ['f', BROWN, place(SWORD_GRIP, 116, 148, 1, -18), 1.2],
  ['f', GOLD, place(ell(0, -68, 4.5), 116, 148, 1, -18), 1.2],
  ['f', '#5a3418', 'M46,142 L54,116 L104,116 L98,142 Z', 1.8],
  ['f', BROWN, rect(46, 140, 54, 36), 2],
  ['f', GOLD, 'M48,142 C56,128 90,126 98,142 Z', 1.4],
  ['f', GOLD, `${rect(58, 140, 6, 36)} ${rect(82, 140, 6, 36)}`, 1],
  ['f', 'dark', rect(70, 150, 6, 8), 0],
  ['f', GOLD, 'M120,136 L118,110 L128,120 L138,102 L148,120 L158,110 L156,136 Z', 1.8],
  ['f', RED, c(138, 126, 3.4), 1],
  ['f', '#2f5fa8', `${c(126, 128, 2.6)} ${c(150, 128, 2.6)}`, 1],
  ['f', '#d9d2c2', 'M160,174 L160,138 C160,126 194,126 194,138 L194,174 Z', 2],
  ['h', 'M180,128 C188,129 194,132 194,138 L194,174 L182,174 Z', 0],
  ['f', 'dark', 'M163,146 L191,146 L191,151 L163,151 Z', 0],
  ['l', 'M177,128 L177,174', 1.4],
  ['f', 'dark', `${c(170, 161, 1.4)} ${c(170, 167, 1.4)} ${c(184, 161, 1.4)} ${c(184, 167, 1.4)}`, 0],
  // Vůz: vysoké bočnice s kováním a křídové čárky za poražené šéfy.
  ['f', BROWN, rect(22, 172, 196, 9), 1.8],
  ['f', OCHRE, 'M26,180 L214,180 L210,230 L30,230 Z', 2.2],
  ['l', 'M28,196 H212 M29,213 H211', 1],
  ['f', '#5b5850', `${rect(52, 180, 7, 50)} ${rect(182, 180, 7, 50)}`, 1.2],
  [
    's',
    CREAM,
    'M80,190 l2,22 M88,190 l2,22 M96,190 l2,22 M104,190 l2,22 M76,208 l34,-14 M124,190 l2,22 M132,190 l2,22',
    2.2,
  ],
  // Kola.
  ['f', OCHRE, `${c(72, 246, 32)} ${c(172, 246, 32)}`, 2.2],
  ['l', `${c(72, 246, 25)} ${c(172, 246, 25)}`, 1.2],
  ['l', `${spokes(72, 246, 25)} ${spokes(172, 246, 25)}`, 1.6],
  ['f', '#5b5850', `${c(72, 246, 6)} ${c(172, 246, 6)}`, 1.4],
  // Rozsypané mince v trávě.
  ['f', GOLD, `${ell(118, 268, 7, 3.2)} ${ell(128, 275, 7, 3.2)} ${ell(214, 272, 7, 3.2)}`, 1.2],
];

// ─────────────────────────── Anonymní diskutér ───────────────────────────

/** Bublina diskuse s ocáskem (zaoblený obdélník, ocásek dolů k bodu tx,ty). */
function bubble(x: number, y: number, w: number, h: number, tx: number, ty: number): string {
  const r = 7;
  const bx = Math.max(x + r + 4, Math.min(x + w - r - 16, tx - 6));
  return (
    `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} ` +
    `Q${x + w},${y + h} ${x + w - r},${y + h} L${bx + 12},${y + h} L${tx},${ty} L${bx},${y + h} ` +
    `L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`
  );
}

// Anonymní diskutér: noční pokoj osvětlený jen obrazovkou, mikina s kapucí a tmavé brýle (anonym),
// kolem bubliny s „!!!“, palcem dolů a rozzlobeným smajlíkem; vpředu záda notebooku s nálepkou čertíka
// a zběsilé ťukání, vedle vystydlý hrnek.
const ANONYMOUS_COMMENTER: Partial<FigureSpec> = {
  bg: NAVY,
  motif: 'none',
  skin: SKY,
  body: '#2f6b3a',
  collar: 'plain',
  hair: 'none',
  hat: 'hood',
  hatColor: '#2f6b3a',
  mood: 'sly',
  prop: undefined,
  backdrop: [
    // Objemná kapuce za hlavou, splývá do ramen mikiny.
    ['f', '#2f6b3a', 'M80,216 C70,150 90,90 125,88 C160,90 180,150 170,216 Z', 2],
    // Bubliny diskuse.
    ['f', CREAM, bubble(22, 60, 62, 40, 92, 116), 1.6],
    ['f', RED, `${rect(36, 67, 6, 18)} ${rect(50, 67, 6, 18)} ${rect(64, 67, 6, 18)}`, 1],
    ['f', RED, `${c(39, 92, 3.2)} ${c(53, 92, 3.2)} ${c(67, 92, 3.2)}`, 1],
    ['f', CREAM, bubble(164, 52, 62, 46, 160, 116), 1.6],
    ['i', 'thumb-down', 180, 56, 34, RED],
    ['f', CREAM, bubble(24, 118, 56, 34, 96, 160), 1.6],
    ['f', '#f2cf4a', c(40, 135, 10), 1.4],
    ['l', 'M34,131 l5,2 M46,131 l-5,2 M35,141 C38,137 42,137 45,141', 1.4],
    ['l', 'M56,128 H74 M56,135 H70 M56,142 H74', 1.4],
  ],
  extra: [
    // Kapuce stažená hluboko do čela, lem a šňůrky.
    [
      'f',
      '#2f6b3a',
      'M99,152 C100,132 110,124 125,124 C140,124 150,132 151,152 C142,140 108,140 99,152 Z',
      1.8,
    ],
    ['s', '#5d9a3e', 'M100,182 C96,150 104,138 125,138 C146,138 154,150 150,182', 2.6],
    ['s', CREAM, 'M110,186 L107,214 M140,186 L143,214', 2],
    // Tmavé brýle s odleskem obrazovky.
    [
      'f',
      'dark',
      'M102,146 L122,146 C122,156 118,160 112,160 C105,160 102,154 102,146 Z M128,146 L148,146 C148,154 145,160 138,160 C132,160 128,156 128,146 Z',
      0,
    ],
    ['l', 'M100,146 L150,146', 2],
    ['s', '#9fd0c4', 'M106,151 l6,-3 M132,151 l6,-3', 1.4],
    // Notebook zezadu se září nad hranou a nálepkou čertíka.
    ['f', GREY, 'M58,216 L192,216 L188,284 L62,284 Z', 2.2],
    ['s', '#9fd0c4', 'M60,214 L190,214', 3],
    ['i', 'devil-mask', 104, 228, 42, RED],
    ['l', 'M44,210 l8,6 M40,222 l10,2 M206,210 l-8,6 M210,222 l-10,2', 1.6],
    // Vystydlý hrnek.
    ['f', '#f2cf4a', 'M22,248 L46,248 L44,278 L24,278 Z', 1.6],
    ['l', 'M46,254 C54,254 54,270 45,270 M28,242 c-3,-5 3,-7 0,-12 M38,242 c-3,-5 3,-7 0,-12', 1.4],
  ],
};

// ─────────────────────────── Virální video ───────────────────────────

// Virální video: influencerka s kočičími oušky před kruhovým světlem, telefon na selfie tyči s tlačítkem
// přehrávání, létající srdíčka a vlevo graf zhlédnutí, kde je každý sloupec poloviční (jako bonus žolíka).
const VIRAL_VIDEO: Partial<FigureSpec> = {
  bg: '#cbb8e3',
  motif: 'none',
  body: '#e88a9a',
  collar: 'plain',
  female: true,
  hair: 'long',
  hairColor: '#f2cf4a',
  mood: 'grin',
  prop: undefined,
  backdrop: [
    // Kruhové světlo za hlavou.
    ['s', CREAM, c(125, 150, 64), 13],
    ['l', `${c(125, 150, 71)} ${c(125, 150, 57)}`, 1.4],
    // Graf zhlédnutí: každý den polovina.
    ['f', CREAM, rect(22, 58, 52, 72), 1.6],
    [
      'f',
      RED,
      `${rect(28, 66, 7, 56)} ${rect(37, 94, 7, 28)} ${rect(46, 108, 7, 14)} ${rect(55, 115, 7, 7)} ${rect(64, 118.5, 7, 3.5)}`,
      1,
    ],
    ['l', 'M26,122 L71,122', 1.4],
    ['s', NAVY, 'M42,70 C52,76 60,86 64,98', 2.2],
    ['f', NAVY, 'M59,96 L69,94 L66,105 Z', 0.8],
    // Srdíčka.
    ['f', RED, `${place(HEART, 196, 76, 0.42)} ${place(HEART, 218, 112, 0.3)}`, 1.4],
    ['f', '#e88a9a', `${place(HEART, 184, 108, 0.28)} ${place(HEART, 212, 56, 0.22)}`, 1.2],
  ],
  extra: [
    // Kočičí ouška.
    ['f', '#f2cf4a', 'M101,124 L103,94 L122,110 Z M149,124 L147,94 L128,110 Z', 1.8],
    ['f', '#e88a9a', 'M105,118 L106,102 L116,111 Z M145,118 L144,102 L134,111 Z', 0],
    // Telefon na selfie tyči.
    ['s', NAVY, 'M194,262 L206,180', 3.4],
    ['f', NAVY, place(rrect(38, 64, 6), 207, 150, 1, 8), 1.6],
    ['f', CREAM, place(rrect(31, 52, 3), 207, 150, 1, 8), 0],
    ['f', RED, place(ell(0, 0, 10), 207, 148, 1, 8), 1.2],
    ['f', CREAM, place('M-3,-5 L5,0 L-3,5 Z', 207, 148, 1, 8), 0],
    ['l', place('M-12,18 L12,18', 207, 150, 1, 8), 1.2],
    ['f', RED, place(ell(-9, 18, 2.4), 207, 150, 1, 8), 0],
    ...hand(194, 258, -82),
  ],
};

// ─────────────────────────── Kopírák ───────────────────────────

/** Šašek namalovaný na papíru (místně kolem 0,0); `copy` = modrý průklep. */
function jester(x: number, y: number, deg: number, copy: boolean): SceneOp[] {
  const p = (d: string): string => place(d, x, y, 1, deg);
  const w = copy ? 1 : 1.4;
  const hatA = copy ? '#2f5fa8' : RED;
  const hatB = copy ? '#6fa0c8' : '#f2cf4a';
  const face = copy ? SKY : '#f2b38c';
  return [
    ['f', CREAM, p('M-18,14 L-12,21 L-6,15 L0,22 L6,15 L12,21 L18,14 L12,9 L-12,9 Z'), w],
    ['f', face, p(ell(0, 0, 13, 14)), w],
    ['f', hatA, p('M-13,-8 C-22,-14 -28,-24 -36,-22 C-31,-13 -24,-9 -6,-10 Z'), w],
    ['f', hatB, p('M-7,-10 C-6,-22 -2,-32 4,-38 C6,-28 6,-18 7,-10 Z'), w],
    ['f', hatA, p('M6,-10 C18,-12 26,-18 34,-24 C30,-15 24,-9 13,-8 Z'), w],
    ['f', hatB, p('M-14,-8 C-8,-13 8,-13 14,-8 L14,-3 C8,-8 -8,-8 -14,-3 Z'), w],
    ['f', copy ? hatB : GOLD, p(`${ell(-36, -22, 3.4)} ${ell(4, -38, 3.4)} ${ell(34, -24, 3.4)}`), w],
    ['f', copy ? NAVY : 'dark', p(`${ell(-5, 0, 1.8)} ${ell(5, 0, 1.8)}`), 0],
    copy ? ['s', '#2f5fa8', p('M-6,5 C-3,9 3,9 6,5'), 1.4] : ['l', p('M-6,5 C-3,9 3,9 6,5'), 1.4],
  ];
}

/** List papíru vycházející z válce (místně: dolní střed v 0,0); řádky textu pod obrázkem šaška. */
const SHEET = 'M-40,-118 L40,-118 L40,0 L-40,0 Z';
const TYPED = 'M-30,-38 L18,-38 M-30,-30 L26,-30 M-30,-22 L6,-22';

// Kopírák: zelený psací stroj na úředním stole, z válce vychází originál se šaškem (žolík), mezi listy černý
// kopírák a za ním vyjíždí modrý průklep téhož šaška („skoro jako originál, jen modřejší“); na polici šanony.
const CARBON_PAPER: SceneOp[] = [
  ['f', '#c6dcae', rect(16, 16, 218, 268), 0],
  // Police se šanony.
  ['f', NAVY, rect(160, 34, 14, 38), 1.2],
  ['f', RED, rect(174, 34, 14, 38), 1.2],
  ['f', GREEN, rect(188, 34, 14, 38), 1.2],
  ['f', '#f2cf4a', place('M0,0 L14,0 L14,38 L0,38 Z', 205, 35, 1, 8), 1.2],
  ['f', CREAM, `${rect(163, 42, 8, 10)} ${rect(177, 42, 8, 10)} ${rect(191, 42, 8, 10)}`, 0.8],
  ['f', 'dark', `${c(167, 62, 2.4)} ${c(181, 62, 2.4)} ${c(195, 62, 2.4)}`, 0],
  ['f', BROWN, rect(150, 72, 84, 6), 1.4],
  // Stůl.
  ['f', BROWN, 'M16,232 L234,232 L234,284 L16,284 Z', 1.6],
  // Průklep vpravo, kopírák uprostřed, originál vlevo vpředu.
  ['f', CREAM, place(SHEET, 168, 196, 1, 9), 1.6],
  ...jester(186, 128, 9, true),
  ['s', '#2f5fa8', place(TYPED, 168, 196, 1, 9), 1.4],
  ['f', NAVY, place('M-36,-112 L36,-112 L36,0 L-36,0 Z', 128, 196, 1, 1), 1.6],
  ['s', '#6fa0c8', place('M-30,-104 L28,-104', 128, 196, 1, 1), 1.4],
  ['f', CREAM, place(SHEET, 88, 196, 1, -8), 1.8],
  ...jester(78, 130, -8, false),
  ['l', place(TYPED, 88, 196, 1, -8), 1.2],
  // Psací stroj: válec s knoflíky, přítlačná lišta, páka a klávesy.
  [
    'f',
    '#5b5850',
    'M36,186 L214,186 C218,186 220,190 220,194 C220,198 218,202 214,202 L36,202 C32,202 30,198 30,194 C30,190 32,186 36,186 Z',
    1.6,
  ],
  ['f', 'dark', `${c(26, 194, 8)} ${c(224, 194, 8)}`, 0],
  ['s', '#d9d2c2', 'M44,178 L206,178', 4],
  ['s', '#d9d2c2', 'M30,186 L18,170', 4],
  ['f', '#2f8077', 'M28,284 L42,204 L208,204 L222,284 Z', 2.4],
  ['f', '#5b5850', 'M94,204 C94,226 156,226 156,204 Z', 1.4],
  ['l', 'M125,204 L125,220 M110,206 L114,219 M140,206 L136,219 M100,206 L106,216 M150,206 L144,216', 0.9],
  [
    'f',
    PAPER,
    [
      ...[62, 76, 90, 104, 118, 132, 146, 160, 174, 188].map((x) => c(x, 236, 4.6)),
      ...[56, 70, 84, 98, 112, 126, 140, 154, 168, 182, 196].map((x) => c(x, 251, 4.6)),
      ...[50, 64, 78, 92, 106, 120, 134, 148, 162, 176, 190, 204].map((x) => c(x, 266, 4.6)),
    ].join(' '),
    1,
  ],
  ['f', PAPER, rect(86, 276, 78, 6), 1],
];

// ─────────────────────────── Defenestrace ───────────────────────────

/** Vyhozený pán (místně kolem trupu, hlava nahoře). */
function noble(x: number, y: number, deg: number): SceneOp[] {
  const p = (d: string): string => place(d, x, y, 1, deg);
  return [
    ['f', RED, p('M-12,-20 C-34,-26 -50,-8 -48,14 C-38,4 -26,2 -14,6 Z'), 1.6],
    ['f', CREAM, p('M-8,14 L-3,16 L-14,42 L-20,40 Z M3,16 L8,14 L26,34 L21,39 Z'), 1.4],
    ['f', 'dark', p(`${ell(-18, 44, 5, 3.4)} ${ell(26, 38, 5, 3.4)}`), 0],
    ['f', '#8e3b6e', p('M-12,8 C-21,14 -17,25 -6,23 L0,18 L6,23 C17,25 21,14 12,8 Z'), 1.6],
    ['f', NAVY, p('M-12,-18 C-15,-4 -14,6 -12,10 L12,10 C14,6 15,-4 12,-18 Z'), 1.6],
    ['f', GOLD, p(`${ell(0, -8, 1.4)} ${ell(0, -2, 1.4)} ${ell(0, 4, 1.4)}`), 0],
    ['f', NAVY, p('M-11,-16 L-26,-35 L-21,-39 L-6,-20 Z M10,-16 L29,-29 L32,-24 L12,-10 Z'), 1.4],
    ['f', SKIN, p(`${ell(-25, -40, 4.6)} ${ell(33, -28, 4.6)}`), 1.4],
    [
      'f',
      CREAM,
      p('M-15,-20 L-11,-25 L-6,-21 L-2,-26 L2,-21 L6,-26 L11,-21 L15,-25 L16,-18 L-16,-18 Z'),
      1.3,
    ],
    ['f', SKIN, p(ell(0, -35, 10, 11)), 1.6],
    ['f', '#5a3418', p('M-5,-27 L0,-20 L5,-27 Z'), 1],
    ['f', 'dark', p(`${ell(-4, -37, 1.4)} ${ell(4, -37, 1.4)} ${ell(0, -29, 2.2, 2.6)}`), 0],
    ['l', p('M-8,-42 C-6,-45 -2,-45 -1,-43 M2,-43 C4,-45 8,-45 9,-42'), 1.1],
  ];
}

/** Gotická věž s fiálami (silueta jako Týn), dolní střed v x, y. */
const tower = (x: number, y: number, h: number): string =>
  `M${x - 8},${y} L${x - 8},${y - h} L${x - 6},${y - h - 6} L${x - 4},${y - h} L${x},${y - h - 26} ` +
  `L${x + 4},${y - h} L${x + 6},${y - h - 6} L${x + 8},${y - h} L${x + 8},${y} Z`;

// Defenestrace: renesanční hrad se sgrafitovou omítkou, z otevřeného okna trčí ruce, které právě vyhodily
// pána s okružím; s ním letí figury z karet (zahozené figury) a mince, dole měkká hromada hnoje s vidlemi
// a za ní červené pražské střechy s gotickými věžemi.
const DEFENESTRACE: SceneOp[] = [
  ['f', SKY, rect(16, 16, 218, 268), 0],
  // Pražské věže a střechy v dálce.
  ['f', NAVY, `${tower(204, 232, 44)} ${tower(225, 232, 52)}`, 1.2],
  ['f', GOLD, `${c(204, 162, 2.2)} ${c(225, 154, 2.2)}`, 0.8],
  ['f', PAPER, 'M118,244 L118,224 L234,224 L234,244 Z', 1.2],
  [
    'f',
    RED,
    'M114,226 L130,210 L146,226 L150,226 L166,212 L182,226 L186,226 L204,208 L222,226 L234,226 L234,232 L114,232 Z',
    1.2,
  ],
  ['f', '#6fa0c8', `${rect(124, 234, 6, 7)} ${rect(160, 234, 6, 7)} ${rect(198, 234, 6, 7)}`, 0.8],
  // Hradní zeď se sgrafity a nárožím.
  ['f', PAPER, 'M16,16 L112,16 L112,284 L16,284 Z', 1.8],
  [
    'l',
    [176, 196, 216, 236, 256]
      .flatMap((y) =>
        [16, 36, 56, 76].map(
          (x) =>
            `M${x},${y} L${x + 20},${y} L${x + 20},${y + 20} L${x},${y + 20} Z M${x},${y} L${x + 10},${y + 10} L${x + 20},${y}`,
        ),
      )
      .join(' '),
    0.8,
  ],
  [
    'f',
    '#d9d2c2',
    `${rect(100, 16, 12, 22)} ${rect(104, 38, 8, 22)} ${rect(100, 60, 12, 22)} ${rect(104, 82, 8, 22)} ${rect(100, 104, 12, 22)} ${rect(104, 126, 8, 22)} ${rect(100, 148, 12, 22)}`,
    1,
  ],
  // Okno s otevřeným křídlem a rukama, které právě strčily.
  ['f', '#d9d2c2', 'M32,164 L32,86 C32,62 92,62 92,86 L92,164 Z', 2],
  ['f', NAVY, 'M40,158 L40,90 C40,74 84,74 84,90 L84,158 Z', 1.4],
  ['f', '#d9d2c2', rect(26, 158, 72, 9), 1.6],
  ['f', '#6fa0c8', 'M84,92 L106,84 L106,150 L84,156 Z', 1.6],
  ['l', 'M84,110 L106,104 M84,130 L106,126 M95,88 L95,153', 0.9],
  ['f', GREEN, 'M54,112 L92,105 L94,115 L56,124 Z', 1.4],
  ['f', '#8e3b6e', 'M52,134 L90,129 L91,139 L54,144 Z', 1.4],
  ['f', CREAM, 'M90,104 L96,103 L98,114 L92,115 Z M88,128 L94,128 L95,139 L89,139 Z', 1.2],
  ['f', SKIN, `${c(102, 108, 7, 8)} ${c(100, 133, 7, 8)}`, 1.4],
  ['l', 'M105,102 l4,-2 M106,107 l5,-1 M103,128 l4,-2 M104,133 l5,-1', 1],
  // Hromada hnoje s vidlemi, smradem a mouchou.
  ['f', OCHRE, 'M204,256 L212,204 L216,205 L209,257 Z', 1.2],
  ['f', BROWN, 'M118,284 C122,256 150,238 180,238 C208,236 232,252 234,262 L234,284 Z', 1.8],
  ['h', 'M180,238 C208,236 232,252 234,262 L234,284 L196,284 C200,266 194,250 180,238 Z', 30],
  ['f', '#5a3418', `${ell(146, 266, 7, 3.4)} ${ell(186, 252, 5, 2.6)} ${ell(172, 276, 8, 3.6)}`, 0],
  ['s', '#f2cf4a', 'M150,250 l8,-4 M190,246 l6,4 M214,256 l7,-2 M132,272 l7,-3', 1.6],
  ['s', GREEN, 'M156,234 c-4,-6 4,-10 0,-16 M226,240 c-4,-6 4,-10 0,-16', 1.8],
  ['f', 'dark', c(170, 222, 1.8), 0],
  ['l', 'M168,219 l-3,-3 M172,219 l3,-3', 0.9],
  // Letící figury a mince.
  ...faceCard(134, 64, 18, 'K', true),
  ...faceCard(212, 108, -16, 'Q', false),
  ...faceCard(126, 186, -24, 'J', true, 0.85),
  ['f', GOLD, `${c(160, 204, 5)} ${c(176, 216, 4.4)}`, 1.3],
  ['l', 'M160,194 l0,-6 M176,207 l0,-5', 1],
  // Klobouk s pérem odlétá zvlášť.
  ['f', NAVY, 'M168,52 C168,44 186,44 186,52 L192,54 C186,58 168,58 162,54 Z', 1.4],
  ['s', CREAM, 'M184,48 C192,40 198,36 204,36', 2.4],
  ...noble(168, 140, 28),
  ['l', 'M128,128 l-10,-4 M130,142 l-12,0 M134,156 l-10,4', 1.3],
];

// ─────────────────────────── Brňák ───────────────────────────

/** Brněnský drak (vycpaný krokodýl) z profilu, hlavou doleva. */
const CROC_BODY =
  'M84,80 C94,70 112,66 130,68 C148,66 164,70 174,76 C182,80 188,84 194,92 C184,90 176,88 168,88 C152,90 136,92 120,90 C106,92 94,90 84,88 Z';
const CROC_JAW_TOP = 'M84,80 L56,72 C50,72 48,76 52,79 L84,86 Z';
const CROC_JAW_LOW = 'M84,86 L58,88 C54,89 54,92 58,92 L86,90 Z';

// Brňák: průchod Staré radnice, pod klenbou visí na lanech brněnský drak (vycpaný krokodýl), průchodem je
// vidět červená šalina a dvě štíhlé věže Petrova na kopci; chlapík v bekovce s mazaným úsměvem drží sklenku
// moravského vína („Hradec? To je ta vesnice u Brna?“).
const BRNO_NATIVE: Partial<FigureSpec> = {
  bg: SKY,
  motif: 'none',
  body: RED,
  collar: 'shirt',
  hair: 'short',
  hairColor: '#5a3418',
  hat: 'flatcap',
  hatColor: NAVY,
  mood: 'sly',
  prop: { icon: 'wine-glass', color: '#f2cf4a', x: 160, y: 196, size: 62 },
  backdrop: [
    // Petrov: kopec, katedrála a dvě štíhlé věže.
    ['f', GREEN, 'M140,212 C160,180 196,170 234,170 L234,212 Z', 1.4],
    ['f', PAPER, rect(176, 136, 50, 42), 1.6],
    ['f', NAVY, 'M182,138 L191,84 L200,138 Z M202,138 L211,84 L220,138 Z', 1.6],
    ['l', 'M191,84 L191,77 M188,80 L194,80 M211,84 L211,77 M208,80 L214,80', 1.2],
    ['f', '#6fa0c8', `${rect(184, 150, 8, 14)} ${rect(210, 150, 8, 14)}`, 1],
    // Šalina zleva s trolejí.
    ['l', 'M16,104 L104,98', 1.2],
    ['l', 'M40,126 L56,103 L72,126', 1.4],
    ['f', RED, 'M18,212 L18,140 C18,130 26,126 34,126 L86,126 C94,126 100,130 100,140 L100,212 Z', 1.8],
    ['f', CREAM, 'M18,182 L100,182 L100,192 L18,192 Z', 0],
    ['f', NAVY, 'M26,136 L92,136 L92,168 L26,168 Z', 1.4],
    // Cedule linky ukazuje doleva (Brňák chce být úplně vlevo).
    ['f', '#f2cf4a', rect(40, 128.5, 38, 6.5), 0.9],
    ['l', 'M46,131.8 L72,131.8 M46,131.8 L50.5,129.6 M46,131.8 L50.5,134', 1],
    ['f', '#f2cf4a', `${c(32, 200, 4.5)} ${c(86, 200, 4.5)}`, 1.2],
    // Klenba průchodu radnice a drak na lanech pod ní.
    ['f', GREY, 'M16,16 L234,16 L234,70 C200,40 50,40 16,70 Z', 1.8],
    ['l', 'M102,44 L102,72 M160,44 L160,72', 1.2],
    ['f', '#8a8f2e', CROC_BODY, 1.8],
    ['f', '#8a8f2e', `${CROC_JAW_TOP} ${CROC_JAW_LOW}`, 1.6],
    ['f', CREAM, 'M60,79 L62,83 L64,80 L66,84 L68,81 L70,85 L72,82 L74,86 L76,83 L78,87 Z', 0.8],
    ['l', 'M104,68 l4,-5 l4,5 l4,-5 l4,5 l4,-5 l4,5 l4,-5 l4,5 l4,-5 l4,5 l4,-5 l4,5 l4,-5 l4,5', 1.2],
    ['f', '#8a8f2e', 'M102,89 L97,99 L106,99 L109,89 Z M152,89 L150,99 L159,99 L159,88 Z', 1.2],
    ['f', '#f2cf4a', c(82, 76, 3), 1],
    ['f', 'dark', c(82.5, 76, 1.3), 0],
  ],
  extra: [['l', 'M106,145 C110,141 116,141 120,144', 1.4]],
};

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  court_painter: COURT_PAINTER,
  colorblind_uncle: COLORBLIND_UNCLE,
  anonymous_commenter: ANONYMOUS_COMMENTER,
  viral_video: VIRAL_VIDEO,
  brno_native: BRNO_NATIVE,
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  'j-trodden_path': TRODDEN_PATH,
  'j-war_loot': WAR_LOOT,
  'j-carbon_paper': CARBON_PAPER,
  defenestrace: DEFENESTRACE,
};

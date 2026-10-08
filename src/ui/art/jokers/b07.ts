/**
 * Obrázky žolíků — dávka 07 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - regular — Stálý host: portrét `fig-regular` (FIGURES['regular'])
 *  - beer_belly — Pivní břicho: celý portrét `fig-beer_belly` (SCENES['fig-beer_belly'], zmenšená postava)
 *  - carousel — Kolotoč na pouti: scéna `kolotoc` (SCENES['kolotoc'])
 *  - echo — Ozvěna z propasti: scéna `ozvena` (SCENES['ozvena'])
 *  - lucky_seven — Šťastná sedmička: scéna `sedmicka` (SCENES['sedmicka'])
 *  - tab — Sekera: scéna `sekera` (SCENES['sekera'])
 *  - office_connection — Známý na úřadě: portrét `fig-office_connection` (FIGURES['office_connection'])
 *  - chronicler — Kronikář: portrét `fig-chronicler` (FIGURES['chronicler'])
 *  - chimney_sweep — Kominík: scéna `kominik` (SCENES['kominik'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import { figure } from '../figureKit';
import type { FigureSpec } from '../figureKit';
import { c, rect } from '../sceneKit';
import type { SceneOp } from '../sceneKit';

const SKIN = '#f2b48e';
const r1 = (n: number): string => String(Math.round(n * 10) / 10);

/** Posun, zvětšení, otočení (ve stupních) a zrcadlení cesty zapsané jen absolutními páry „x,y“ (M/L/C/Z). */
function place(d: string, ox: number, oy: number, s: number, deg = 0, flip = false): string {
  const a = (deg * Math.PI) / 180;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, xs: string, ys: string) => {
    const x = flip ? -Number(xs) : Number(xs);
    const y = Number(ys);
    return `${r1(ox + s * (cs * x - sn * y))},${r1(oy + s * (sn * x + cs * y))}`;
  });
}

/** Posun a zvětšení libovolné cesty (absolutní i relativní příkazy M L H V C S Q T A Z, i oblouky z `c()`). */
function xf(d: string, ox: number, oy: number, s: number): string {
  const tk = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  let out = '';
  let cmd = '';
  let i = 0;
  const n = (): number => Number(tk[i++]);
  const X = (): string => r1(ox + s * n());
  const Y = (): string => r1(oy + s * n());
  const S = (): string => r1(s * n());
  while (i < tk.length) {
    const t = tk[i] as string;
    if (/[a-z]/i.test(t)) {
      cmd = t;
      i++;
      out += cmd;
      if (cmd === 'Z' || cmd === 'z') continue;
    } else out += ' ';
    switch (cmd) {
      case 'M':
      case 'L':
      case 'T':
        out += `${X()},${Y()}`;
        break;
      case 'm':
      case 'l':
      case 't':
        out += `${S()},${S()}`;
        break;
      case 'H':
        out += X();
        break;
      case 'V':
        out += Y();
        break;
      case 'h':
      case 'v':
        out += S();
        break;
      case 'C':
        out += `${X()},${Y()} ${X()},${Y()} ${X()},${Y()}`;
        break;
      case 'c':
        out += `${S()},${S()} ${S()},${S()} ${S()},${S()}`;
        break;
      case 'S':
      case 'Q':
        out += `${X()},${Y()} ${X()},${Y()}`;
        break;
      case 's':
      case 'q':
        out += `${S()},${S()} ${S()},${S()}`;
        break;
      case 'A':
        out += `${S()},${S()} ${n()} ${n()},${n()} ${X()},${Y()}`;
        break;
      case 'a':
        out += `${S()},${S()} ${n()} ${n()},${n()} ${S()},${S()}`;
        break;
      default:
        i++;
    }
  }
  return out;
}

/** Celá kresba posunutá a zmenšená (např. menší postava, ať se vejde obří břicho). */
function xfOps(ops: readonly SceneOp[], ox: number, oy: number, s: number): SceneOp[] {
  return ops.map((op): SceneOp => {
    if (op[0] === 'f') return ['f', op[1], xf(op[2], ox, oy, s), op[3]];
    if (op[0] === 'l') return ['l', xf(op[1], ox, oy, s), op[2]];
    if (op[0] === 's') return ['s', op[1], xf(op[2], ox, oy, s), op[3] * s];
    if (op[0] === 'h') return ['h', xf(op[1], ox, oy, s), op[2]];
    return ['i', op[1], ox + s * op[2], oy + s * op[3], op[4] * s, op[5]];
  });
}

/** Trubice (paže, rukáv) podél lomené čáry, s kulatými konci. */
function tube(pts: readonly (readonly [number, number])[], w: number): string {
  const h = w / 2;
  const left: string[] = [];
  const right: string[] = [];
  pts.forEach(([x, y], i) => {
    const a = pts[Math.max(0, i - 1)] as readonly [number, number];
    const b = pts[Math.min(pts.length - 1, i + 1)] as readonly [number, number];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    left.push(`${r1(x + nx * h)},${r1(y + ny * h)}`);
    right.push(`${r1(x - nx * h)},${r1(y - ny * h)}`);
  });
  const back = [...right].reverse();
  return `M${left.join(' L')} A${h},${h} 0 0,0 ${back[0]} L${back.join(' L')} A${h},${h} 0 0,0 ${left[0]} Z`;
}

/** Paprsky / štětiny po obvodu kruhu. */
function ticks(cx: number, cy: number, r1_: number, r2: number, n: number, a0 = 0): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = a0 + (Math.PI * 2 * i) / n;
    d += `M${r1(cx + Math.cos(a) * r1_)},${r1(cy + Math.sin(a) * r1_)} L${r1(cx + Math.cos(a) * r2)},${r1(cy + Math.sin(a) * r2)}`;
  }
  return d;
}

/** Srdíčko (střed x, y, velikost s). */
const heart = (x: number, y: number, s: number): string =>
  `M${x},${y + s * 0.9} C${x - s * 1.5},${y - s * 0.1} ${x - s * 0.9},${y - s * 1.1} ${x},${y - s * 0.35} C${x + s * 0.9},${y - s * 1.1} ${x + s * 1.5},${y - s * 0.1} ${x},${y + s * 0.9} Z`;

/* ------------------------------------------------------------------------------------------------------------ */
/* Stálý host: věšák s hrnky štamgastů (jeden háček prázdný — svůj hrnek drží v ruce), židle se srdíčkem, hodiny. */

const MUG_HOOKS = [
  [40, '#2f5fa8'],
  [66, '#5d9a3e'],
  [92, '#e9b030'],
  [160, '#6b4a9e'],
  [186, '#2f8077'],
  [212, '#d7442c'],
] as const;

function regularBackdrop(): SceneOp[] {
  const bodies: string[] = [];
  const lids: string[] = [];
  let handles = '';
  let hooks = '';
  for (const [x] of MUG_HOOKS) {
    bodies.push(`M${x - 10},78 L${x + 10},78 L${x + 9},100 C${x + 9},103 ${x - 9},103 ${x - 9},100 Z`);
    lids.push(`M${x - 11},79 C${x - 11},73 ${x + 11},73 ${x + 11},79 Z`);
    handles += `M${x + 10},82 C${x + 17},82 ${x + 17},96 ${x + 9},96 `;
    hooks += `M${x},68 L${x},73 `;
  }
  const ops: SceneOp[] = [
    ['f', '#f6e3a1', rect(16, 16, 218, 268), 0],
    // Hodiny nad věšákem — štamgast tu sedí od otevření do zavíračky.
    ['f', '#fffaf0', c(206, 36, 12), 1.6],
    ['l', `${ticks(206, 36, 9, 11, 12)} M206,36 L206,28 M206,36 L211,40`, 1.1],
    // Obložení, lišta věšáku a háčky.
    ['f', '#c99a62', rect(16, 132, 218, 152), 1.4],
    ['l', 'M40,132 V284 M64,132 V284 M186,132 V284 M210,132 V284', 0.9],
    ['f', '#8c5632', rect(16, 126, 218, 7), 1.2],
    ['f', '#8c5632', rect(24, 60, 202, 9), 1.4],
    ['l', `${hooks} M125,68 L125,76 C125,80 120,80 120,76`, 1.6],
    // Světlejší místo na zdi, kde jeho hrnek visí každý den.
    ['f', '#fffaf0', 'M115,80 L135,80 L134,100 C134,103 116,103 116,100 Z', 0],
    ['f', '#fffaf0', bodies.join(' '), 1.4],
  ];
  for (const [x, col] of MUG_HOOKS) ops.push(['f', col, rect(x - 9.5, 86, 19, 7), 0.8]);
  ops.push(['f', '#9a958a', lids.join(' '), 1.2], ['l', handles, 1.8]);
  // Židle se srdíčky v opěradle (vlastní, nikdo jiný si na ni nesedne).
  ops.push(
    ['f', '#8c5632', `${rect(60, 150, 13, 134)} ${rect(177, 150, 13, 134)}`, 1.6],
    ['f', '#8c5632', `${c(66.5, 146, 7.5)} ${c(183.5, 146, 7.5)}`, 1.4],
    ['f', '#c99a62', 'M54,160 C90,150 160,150 196,160 L196,186 C160,177 90,177 54,186 Z', 1.6],
    ['f', '#5a3418', `${heart(84, 168, 6)} ${heart(166, 168, 6)}`, 1],
  );
  return ops;
}

/** Vlastní hrnek s cínovým víčkem a srdíčkem na tácku, ruka a hrana stolu. */
const REGULAR_EXTRA: SceneOp[] = [
  ['f', '#8c5632', rect(16, 250, 218, 34), 1.6],
  ['f', '#c99a62', rect(16, 244, 218, 7), 1.2],
  // Tácek s čárkami za odsezená kola.
  ['f', '#fffaf0', c(60, 250, 26, 6), 1.2],
  ['l', 'M48,248 l1,4 M53,248 l1,4 M58,248 l1,4 M63,248 l1,4 M46,252 l20,-4', 1],
  ['f', '#fffaf0', c(184, 244, 27, 5), 1.2],
  ['f', '#fffaf0', 'M166,194 L202,194 L200,238 C200,244 168,244 168,238 Z', 1.8],
  ['f', '#d7442c', rect(166.6, 206, 34.6, 14), 1],
  ['f', '#fffaf0', heart(184, 213, 4), 0.8],
  ['l', 'M202,200 C216,200 216,230 200,230', 3],
  ['f', '#9a958a', 'M163,195 C163,186 205,186 205,195 Z', 1.6],
  ['f', '#9a958a', 'M198,188 L208,178 L212,182 L204,192 Z', 1.2],
  ['f', SKIN, c(170, 226, 11, 10), 1.8],
  ['l', 'M161,223 l17,0 M161,229 l17,0', 1.1],
];

/* ------------------------------------------------------------------------------------------------------------ */
/* Pivní břicho: obří břicho v tílku s krejčovským metrem, přepravky jako „portfolio“ a graf růstu z půllitrů. */

function bellyBackdrop(): SceneOp[] {
  const ops: SceneOp[] = [['f', '#bcd6e6', rect(16, 16, 218, 268), 0]];
  // Přepravky na sobě (dlouhodobá investice): úchyt nahoře, žebra po stranách, nahoře lahve.
  const crates = [120, 158, 196, 234];
  ops.push(['f', '#d7442c', crates.map((y) => rect(18, y, 74, 38)).join(' '), 1.6]);
  ops.push([
    'f',
    '#1a1714',
    crates
      .map(
        (y) =>
          `M46,${y + 6} H64 C68,${y + 6} 68,${y + 13} 64,${y + 13} H46 C42,${y + 13} 42,${y + 6} 46,${y + 6} Z`,
      )
      .join(' '),
    0,
  ]);
  // Mřížka v boku přepravky.
  ops.push([
    'f',
    '#b8302a',
    crates.flatMap((y) => [26, 38, 50, 62, 74].map((x) => rect(x, y + 19, 8, 13))).join(' '),
    0.9,
  ]);
  const necks = [26, 40, 54, 68, 82];
  ops.push([
    'f',
    '#5d9a3e',
    necks
      .map((x) => `M${x - 3},120 L${x - 3},108 L${x - 1.5},102 L${x + 1.5},102 L${x + 3},108 L${x + 3},120 Z`)
      .join(' '),
    1.1,
  ]);
  ops.push(['f', '#e9b030', necks.map((x) => rect(x - 2.5, 99, 5, 3)).join(' '), 0.8]);
  // Graf růstu: sloupce z půllitrů, čím dál plnější, a šipka vzhůru.
  ops.push(
    ['f', '#e9b030', rect(160, 48, 68, 70), 1.8],
    ['f', '#fffaf0', rect(166, 54, 56, 58), 1.1],
    ['l', 'M172,60 L172,106 L218,106', 1.2],
  );
  const bars = [
    [176, 98],
    [187, 90],
    [198, 80],
    [209, 68],
  ] as const;
  ops.push([
    'f',
    '#f2cf4a',
    bars.map(([x, y]) => `M${x},106 L${x},${y} L${x + 8},${y} L${x + 8},106 Z`).join(' '),
    1,
  ]);
  ops.push([
    'f',
    '#fffaf0',
    bars.map(([x, y]) => `M${x - 1},${y} C${x - 1},${y - 5} ${x + 9},${y - 5} ${x + 9},${y} Z`).join(' '),
    0.9,
  ]);
  ops.push(
    ['s', '#d7442c', 'M174,96 L190,84 L200,78 L214,60', 2.4],
    ['f', '#d7442c', 'M210,58 L220,54 L216,64 Z', 1],
  );
  return ops;
}

/** Menší postava (s = 0,78, hlava nahoře uprostřed), ať pod ní zbude místo na pořádné břicho. */
const BELLY_S = 0.78;
const BELLY_OX = 125 * (1 - BELLY_S);
const BELLY_OY = 100 - 156 * BELLY_S;

function pivniBricho(): SceneOp[] {
  const man = figure({
    bg: '#bcd6e6',
    motif: 'none',
    body: SKIN,
    collar: 'plain',
    hair: 'bald',
    hairColor: '#5a3418',
    beard: 'walrus',
    beardColor: '#5a3418',
    mood: 'grin',
    redNose: true,
    extra: [
      // Pleška s pečlivě přehozenými pramínky.
      [
        's',
        '#5a3418',
        'M104,142 C112,131 132,128 146,137 M105,137 C115,128 133,126 145,132 M108,133 C118,126 132,125 142,128',
        2,
      ],
    ],
  }).slice(1);
  const belly =
    'M60,250 C32,240 22,214 30,192 C38,170 68,159 100,157 L150,157 C182,159 212,170 220,192 C228,214 218,240 190,250 C160,262 90,262 60,250 Z';
  return [
    ...bellyBackdrop(),
    // Kalhoty a pásek — přezka se schovala pod převis.
    ['f', '#22365c', rect(16, 246, 218, 22), 1.6],
    ['f', '#5a3418', rect(16, 248, 218, 9), 1.2],
    ['l', 'M30,252.5 h4 M40,252.5 h4 M206,252.5 h4 M216,252.5 h4', 1.2],
    // Paže za břichem (nadloktí).
    [
      'f',
      SKIN,
      tube(
        [
          [68, 170],
          [44, 192],
          [30, 222],
        ],
        17,
      ),
      1.8,
    ],
    [
      'f',
      SKIN,
      tube(
        [
          [182, 170],
          [206, 190],
          [222, 214],
        ],
        17,
      ),
      1.8,
    ],
    ...xfOps(man, BELLY_OX, BELLY_OY, BELLY_S),
    // Obří břicho a tílko, které už nestačí: lem vyjel nahoru a kouká pupík.
    ['f', SKIN, belly, 2.4],
    ['h', 'M196,170 C214,180 226,206 220,226 C214,244 200,252 186,254 C204,236 210,206 196,170 Z', 45],
    [
      'f',
      '#fffaf0',
      'M100,142 L110,142 C113,156 137,156 140,142 L150,142 C152,151 160,157 174,161 C202,169 216,184 221,203 C186,215 64,215 29,203 C34,184 48,169 76,161 C90,157 98,151 100,142 Z',
      2.2,
    ],
    [
      'l',
      'M48,190 C46,195 45,199 45,203 M66,176 C61,186 59,195 59,206 M184,176 C189,186 191,195 191,206 M202,190 C204,195 205,199 205,203',
      0.8,
    ],
    // Flek od piva na tílku.
    [
      'f',
      '#f2cf4a',
      'M140,178 C138,172 146,170 148,175 C152,173 156,178 152,181 C154,186 146,187 144,183 C140,185 136,181 140,178 Z',
      1,
    ],
    ['l', 'M118,244 C121,240 129,240 132,244 M120,247 C123,250 127,250 130,247', 1.6],
    // Krejčovský metr přes nejširší místo — a pořád nestačí.
    ['s', '#f2cf4a', 'M31,212 C70,230 180,230 219,212', 7],
    [
      'l',
      'M44,216 l-0.5,6 M58,221 l-0.3,6 M72,224 l0,6 M86,226 l0,6 M100,227 l0,6 M114,228 l0,6 M128,228 l0,6 M142,228 l0,6 M156,227 l0,6 M170,226 l0,6 M184,224 l0,6 M198,221 l0.3,6',
      1,
    ],
    ['s', '#f2cf4a', 'M216,214 C224,222 220,232 226,240', 6],
    // Levá ruka poplácává břicho (předloktí přes bok), pravá drží lahváč.
    [
      'f',
      SKIN,
      tube(
        [
          [30, 222],
          [52, 214],
          [72, 206],
        ],
        15,
      ),
      1.8,
    ],
    ['f', SKIN, c(78, 204, 11, 9), 1.8],
    ['l', 'M70,199 l14,-3 M71,205 l14,-3 M72,211 l13,-3', 1],
    ['l', 'M84,184 C88,186 92,190 92,194 M90,176 C97,180 102,186 102,192', 1.3],
    [
      'f',
      SKIN,
      tube(
        [
          [222, 214],
          [212, 190],
          [203, 170],
        ],
        15,
      ),
      1.8,
    ],
    ['i', 'beer-bottle', 178, 126, 52, '#5d9a3e'],
    ['f', SKIN, c(202, 162, 11, 9), 1.8],
    ['l', 'M193,159 l18,0 M193,165 l18,0', 1.1],
  ];
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Kolotoč na pouti: pruhovaná střecha se žárovkami a barvami karet, koníci na tyčích, perníkové srdce a praporky. */

/** Kolotočový koník čelem doprava (počátek uprostřed hřbetu). */
const HORSE =
  'M-24,-6 C-14,-12 2,-12 12,-10 C16,-18 18,-24 22,-28 L25,-30 L27,-35 L30,-29 C34,-26 38,-22 40,-18 C40,-14 36,-13 33,-14 C30,-12 26,-10 24,-6 C24,-2 22,2 18,6 L28,6 L32,13 L27,15 L24,10 L15,12 C10,14 2,14 -8,12 L-11,24 L-16,24 L-16,11 C-20,11 -23,9 -24,6 C-26,2 -26,-2 -24,-6 Z';
const HORSE_MANE =
  'M12,-10 C14,-18 17,-24 22,-28 C18,-22 16,-14 18,-8 C14,-10 13,-10 12,-10 Z M-24,-4 C-34,-6 -36,6 -32,16 C-30,8 -27,3 -24,1 Z';
const HORSE_SADDLE = 'M-9,-11 C-4,-13 4,-13 9,-11 L9,3 C3,5 -3,5 -9,3 Z';

function horse(ox: number, oy: number, s: number, body: string, saddle: string, mane: string): SceneOp[] {
  return [
    ['f', body, place(HORSE, ox, oy, s), 1.8],
    ['f', mane, place(HORSE_MANE, ox, oy, s), 1.2],
    ['f', saddle, place(HORSE_SADDLE, ox, oy, s), 1.2],
    ['l', place('M33,-14 L8,-6 M-9,-4 L9,-4', ox, oy, s), 1],
    ['f', 'dark', c(ox + 31 * s, oy - 23 * s, 1.8), 0],
  ];
}

function kolotoc(): SceneOp[] {
  const ops: SceneOp[] = [['f', '#bcd6e6', rect(16, 16, 218, 268), 0]];
  // Praporky přes pouť.
  const flags = (x0: number, y0: number, x1: number, y1: number, n: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.15) / n;
      const t1 = (i + 0.85) / n;
      const ax = x0 + (x1 - x0) * t0;
      const ay = y0 + (y1 - y0) * t0 + Math.sin(Math.PI * t0) * 6;
      const bx = x0 + (x1 - x0) * t1;
      const by = y0 + (y1 - y0) * t1 + Math.sin(Math.PI * t1) * 6;
      out.push(`M${r1(ax)},${r1(ay)} L${r1(bx)},${r1(by)} L${r1((ax + bx) / 2)},${r1((ay + by) / 2 + 11)} Z`);
    }
    return out;
  };
  const right = flags(130, 34, 234, 78, 6);
  const left = flags(120, 34, 16, 82, 6).slice(0, 4);
  const all = [...right, ...left];
  ops.push(['l', 'M130,34 C170,46 200,62 234,78 M120,34 C80,48 50,66 16,82', 1]);
  ops.push(['f', '#d7442c', all.filter((_, i) => i % 3 === 0).join(' '), 1]);
  ops.push(['f', '#f2cf4a', all.filter((_, i) => i % 3 === 1).join(' '), 1]);
  ops.push(['f', '#2f5fa8', all.filter((_, i) => i % 3 === 2).join(' '), 1]);
  // Střecha ve dvou barvách pruhů.
  const apexX = 125;
  const apexY = 42;
  const n = 8;
  const red: string[] = [];
  const cream: string[] = [];
  for (let i = 0; i < n; i++) {
    const xa = 24 + (204 * i) / n;
    const xb = 24 + (204 * (i + 1)) / n;
    const ya = 112 - Math.sin((Math.PI * i) / n) * 6;
    const yb = 112 - Math.sin((Math.PI * (i + 1)) / n) * 6;
    (i % 2 === 0 ? red : cream).push(`M${apexX},${apexY} L${r1(xa)},${r1(ya)} L${r1(xb)},${r1(yb)} Z`);
  }
  ops.push(['f', '#d7442c', red.join(' '), 1.4], ['f', '#fffaf0', cream.join(' '), 1.4]);
  ops.push(['l', 'M125,42 L125,26', 1.6], ['f', '#f2cf4a', 'M125,26 L140,30 L125,35 Z', 1.2]);
  ops.push(['f', '#e9b030', c(125, 41, 4), 1.2]);
  // Lambrekýn: zlatý pás se žárovkami a znaky karet, pod ním cípy.
  ops.push(['f', '#e9b030', 'M20,110 C70,103 180,103 230,110 L230,128 C180,121 70,121 20,128 Z', 1.8]);
  const scR: string[] = [];
  const scC: string[] = [];
  for (let i = 0; i < 11; i++) {
    const x = 20 + (210 * i) / 11;
    const w = 210 / 11;
    const y = 127.5 - Math.sin((Math.PI * (i + 0.5)) / 11) * 7;
    (i % 2 === 0 ? scR : scC).push(
      `M${r1(x)},${r1(y)} C${r1(x)},${r1(y + 11)} ${r1(x + w)},${r1(y + 11)} ${r1(x + w)},${r1(y)} Z`,
    );
  }
  ops.push(['f', '#d7442c', scR.join(' '), 1.2], ['f', '#fffaf0', scC.join(' '), 1.2]);
  const bulbs = [30, 54, 78, 104, 146, 172, 196, 220].map((x) =>
    c(x, 119 - Math.sin((Math.PI * (x - 20)) / 210) * 6, 3),
  );
  ops.push(['f', '#fffaf0', bulbs.join(' '), 1]);
  ops.push(['i', 'spades', 37, 108, 11, '#1a1714'], ['i', 'hearts', 84, 105, 11, '#d7442c']);
  ops.push(['i', 'diamonds', 155, 105, 11, '#d7442c'], ['i', 'clubs', 202, 108, 11, '#1a1714']);
  // Středový sloup s točenými pruhy.
  ops.push(['f', '#e9b030', rect(113, 132, 24, 100), 1.6]);
  const stripes: string[] = [];
  for (let y = 136; y < 222; y += 16) stripes.push(`M113,${y + 8} L137,${y} L137,${y + 6} L113,${y + 14} Z`);
  ops.push(['f', '#d7442c', stripes.join(' '), 0.8]);
  // Tyče koníků (za koníky) a koníci — jeden nahoře, druhý dole.
  ops.push(['s', '#e9b030', 'M66,130 L66,228 M176,130 L176,228', 4.5]);
  ops.push(...horse(66, 174, 1.18, '#fffaf0', '#2f5fa8', '#e9b030'));
  ops.push(...horse(176, 194, 1.18, '#c99a62', '#d7442c', '#5a3418'));
  // Perníkové srdce s polevou na sloupu.
  ops.push(['l', 'M125,132 L125,156', 1]);
  ops.push(['f', '#8c5632', heart(125, 166, 10), 1.6], ['s', '#fffaf0', heart(125, 166, 7), 1.2]);
  // Točna, sukně kolotoče, tráva a čáry točení.
  ops.push(
    ['f', '#6fae55', rect(16, 244, 218, 40), 1.4],
    ['f', '#c99a62', 'M22,228 C60,220 190,220 228,228 L228,238 C190,231 60,231 22,238 Z', 1.6],
    ['f', '#d7442c', 'M22,238 C60,231 190,231 228,238 L228,252 C190,245 60,245 22,252 Z', 1.6],
    [
      'l',
      'M46,235 L52,242 L46,249 M86,231 L92,238 L86,245 M126,230 L132,237 L126,244 M166,231 L172,238 L166,245 M206,235 L212,242 L206,249',
      1,
    ],
    ['l', 'M36,255 C80,262 170,262 212,255', 1.2],
    ['f', '#1a1714', 'M208,251 L218,254 L210,259 Z', 0],
  );
  return ops;
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Ozvěna z propasti: turista v klobouku s pérkem křičí z vyhlídky do propasti, ozvěna se vrací čím dál menší. */

/** Turista z vyhlídky (čelem doleva, do propasti). */
const TOURIST: SceneOp[] = [
  [
    'f',
    '#5a3418',
    'M182,189 L198,187 L198,196 L178,196 C176,193 178,190 182,189 Z M200,189 L216,187 L216,196 L196,196 C195,193 197,190 200,189 Z',
    1.4,
  ],
  ['f', '#d7442c', 'M186,160 L197,160 L197,189 L186,189 Z M203,160 L214,160 L214,189 L203,189 Z', 1.4],
  ['f', '#fffaf0', 'M185,160 L198,160 L198,166 L185,166 Z M202,160 L215,160 L215,166 L202,166 Z', 1.1],
  ['f', '#8c5632', 'M184,134 L218,134 L216,162 L202,162 L201,148 L199,162 L185,162 Z', 1.6],
  ['f', '#5d9a3e', 'M208,92 C226,90 232,100 232,112 L230,140 C224,144 214,144 210,140 Z', 1.6],
  ['l', 'M212,108 L230,106', 1],
  ['f', '#d9d2c2', 'M206,90 C206,84 232,84 232,90 C232,96 206,96 206,90 Z', 1.3],
  ['f', '#d7442c', 'M182,94 C182,88 214,86 216,92 L219,138 L181,138 Z', 1.8],
  [
    'l',
    'M190,92 L189,138 M199,90 L199,138 M208,90 L209,138 M182,104 L217,104 M181,118 L218,118 M181,130 L219,130',
    0.8,
  ],
  ['f', SKIN, 'M190,80 L200,80 L200,92 L190,92 Z', 1.4],
  ['f', SKIN, c(196, 70, 14), 2],
  ['f', SKIN, 'M184,66 C178,68 178,76 184,77 Z', 1.4],
  ['f', 'dark', c(190, 67, 1.8), 0],
  ['f', 'dark', c(184, 79, 2.4, 3), 0],
  ['f', 'blush', c(194, 76, 4), 0],
  ['f', '#2f6b3a', 'M186,58 C186,44 208,42 210,58 Z', 1.6],
  ['f', '#d7442c', 'M186,54 L210,54 L210,58 L186,58 Z', 0.8],
  ['f', '#2f6b3a', 'M176,59 C188,54 210,54 218,59 C210,64 186,64 176,59 Z', 1.4],
  ['f', '#fffaf0', 'M206,54 C210,42 216,34 224,30 C220,40 214,48 208,55 Z', 1],
  // Paže zvednutá k puse a dlaně složené do trychtýře.
  [
    'f',
    '#d7442c',
    tube(
      [
        [198, 98],
        [182, 112],
        [176, 92],
      ],
      12,
    ),
    1.6,
  ],
  ['l', 'M188,104 l4,6 M180,100 l6,1', 0.8],
  [
    'f',
    SKIN,
    'M184,66 C172,62 164,70 164,79 C164,88 172,96 184,94 L183,88 C176,88 172,84 172,80 C172,75 176,71 183,72 Z',
    1.6,
  ],
  ['l', 'M167,72 l6,3 M165,80 l7,0 M167,88 l6,-3', 0.9],
];

function ozvena(): SceneOp[] {
  return [
    ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
    ['f', '#c6dcae', 'M70,96 C100,86 140,90 176,98 L176,120 L70,120 Z', 1.2],
    // Propast: zadní stěna tmavne do hloubky, dole jezírko.
    [
      'f',
      '#9a958a',
      'M68,100 C100,96 150,98 180,106 L180,196 C170,226 164,256 162,284 L92,284 C86,200 80,150 68,100 Z',
      1.6,
    ],
    [
      'f',
      '#5b5850',
      'M82,150 C108,140 150,146 172,166 C166,212 162,248 160,284 L96,284 C94,230 90,186 82,150 Z',
      1.2,
    ],
    [
      'f',
      '#22365c',
      'M96,206 C114,198 146,200 162,212 C160,240 158,262 157,284 L102,284 C100,252 100,228 96,206 Z',
      1.2,
    ],
    ['f', '#2f8077', 'M104,250 C118,244 142,244 156,250 L157,268 L103,268 Z', 1],
    // Levý okraj s lesem.
    ['f', '#d9d2c2', 'M16,106 L72,102 C80,150 88,200 94,284 L16,284 Z', 1.8],
    ['l', 'M30,130 L60,126 M24,160 L70,154 M30,196 L78,190 M22,232 L84,228 M36,262 L88,258', 0.9],
    ['h', 'M50,104 L72,102 C80,150 88,200 94,284 L70,284 C66,200 60,150 50,104 Z', 45],
    ['f', '#5d9a3e', 'M16,96 L74,94 L76,106 L16,110 Z', 1.4],
    ['f', '#2f6b3a', 'M22,98 L32,62 L42,98 Z M40,98 L52,54 L64,98 Z M60,98 L68,72 L76,98 Z', 1.4],
    // Pravý okraj s vyhlídkou.
    ['f', '#d9d2c2', 'M234,198 L178,198 C170,228 164,256 162,284 L234,284 Z', 1.8],
    ['l', 'M182,222 L230,220 M176,248 L232,246 M172,272 L230,270', 0.9],
    ['f', '#5d9a3e', 'M176,194 L234,192 L234,202 L176,204 Z', 1.4],
    ['f', '#8c5632', 'M132,196 L234,196 L234,203 L132,203 Z', 1.4],
    ['l', 'M140,203 L178,236 M160,203 L180,222', 1.6],
    // Turistická hůl se štítky opřená o zábradlí.
    ['s', '#c99a62', 'M150,196 L166,124', 3.2],
    ['f', '#d7442c', 'M156,166 L162,168 L161,175 L157,176 L154,172 Z', 0.8],
    ['f', '#fffaf0', 'M159,152 L165,154 L164,161 L160,162 L157,158 Z', 0.8],
    // Turista (posunutý o kus doleva, ať se batoh vejde): kanady, podkolenky, pumpky, kostkovaná košile, batoh
    // s dekou, klobouk s pérkem; paže zvednutá a dlaně u pusy jako trychtýř.
    ...xfOps(TOURIST, -10, 0, 1),
    // Zábradlí vyhlídky (před nohama).
    ['l', 'M132,178 L234,178 M136,178 L136,196 M168,178 L168,196 M226,178 L226,196', 1.8],
    // Výkřik do propasti a ozvěna, která se vrací čím dál slabší.
    ['l', 'M148,68 C143,74 143,86 148,92 M140,62 C133,70 133,88 140,96 M132,56 C123,68 123,92 132,102', 2],
    // Ozvěna se vrací z hloubky čím dál menší a slabší (haló …aló …ló …ó).
    ['s', '#fffaf0', 'M116,128 C124,136 124,150 116,158 M126,122 C136,134 136,152 126,164', 3.4],
    ['s', '#fffaf0', 'M110,180 C116,186 116,196 110,202 M118,176 C125,184 125,198 118,206', 2.6],
    ['s', '#fffaf0', 'M110,220 C113,223 113,229 110,232 M115,217 C119,221 119,231 115,235', 1.8],
    ['s', '#fffaf0', 'M112,248 C114,250 114,253 112,255', 1.2],
  ];
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Šťastná sedmička: hrací automat v nádražce sype mince, na válcích tři sedmičky, nádražní hodiny ukazují sedm. */

const seven = (x: number, y: number): string =>
  `M${x},${y} H${x + 22} V${y + 7} L${x + 12},${y + 32} H${x + 3} L${x + 13},${y + 8} H${x} Z`;

function sedmicka(): SceneOp[] {
  const coins = [
    [96, 214],
    [108, 210],
    [120, 214],
    [132, 209],
    [144, 214],
    [156, 211],
    [102, 220],
    [116, 221],
    [130, 220],
    [146, 221],
    [160, 222],
    [88, 250],
    [106, 256],
    [126, 251],
    [146, 257],
    [166, 250],
    [186, 256],
    [70, 258],
    [204, 252],
    [50, 204],
    [200, 196],
    [206, 222],
  ] as const;
  return [
    ['f', '#9fd0c4', rect(16, 16, 218, 268), 0],
    // Obklady a dlažba nádražky.
    ['f', '#fffaf0', rect(16, 150, 218, 94), 1.2],
    [
      'l',
      'M16,168 H234 M16,186 H234 M16,204 H234 M16,222 H234 M34,150 V244 M52,150 V244 M198,150 V244 M216,150 V244',
      0.6,
    ],
    ['f', '#9a958a', rect(16, 242, 218, 42), 1.2],
    ['l', 'M16,256 H234 M40,242 L32,266 M80,242 L77,266 M170,242 L173,266 M210,242 L218,266', 0.8],
    // Jízdní řád na zdi a nádražní hodiny (právě sedm).
    ['f', '#fffaf0', rect(22, 66, 34, 46), 1.4],
    ['l', 'M27,74 h24 M27,80 h18 M27,86 h22 M27,92 h16 M27,98 h24 M27,104 h20', 0.8],
    ['l', 'M234,44 L218,44', 2],
    ['f', '#fffaf0', c(202, 44, 16), 2],
    ['l', `${ticks(202, 44, 12, 15, 12)} M202,44 L202,32 M202,44 L196,53`, 1.4],
    // Stolek na stání s pivem.
    ['f', '#8c5632', 'M18,186 L60,186 L60,192 L18,192 Z M36,192 L42,192 L42,244 L36,244 Z', 1.4],
    ['f', '#f2cf4a', 'M26,186 L28,160 L46,160 L48,186 Z', 1.4],
    ['f', '#fffaf0', 'M25,162 C24,152 50,152 49,162 Z', 1.2],
    // Automat: oblouk se žárovkami a čtyřlístkem, válce se sedmičkami, páka, tlačítka, výplata.
    ['f', '#d7442c', 'M66,100 C66,60 184,60 184,100 Z', 2],
    [
      'f',
      '#f2cf4a',
      [80, 96, 112, 125, 138, 154, 170].map((x, i) => c(x, [92, 80, 72, 70, 72, 80, 92][i]!, 3.4)).join(' '),
      1,
    ],
    ['i', 'clover', 113, 74, 24, '#5d9a3e'],
    ['f', '#d7442c', rect(62, 98, 126, 148), 2.2],
    ['f', '#b8302a', rect(62, 192, 126, 54), 1.6],
    ['f', '#e9b030', rect(72, 106, 106, 62), 1.8],
    ['f', '#1a1714', rect(78, 112, 94, 50), 0],
    ['f', '#fffaf0', `${rect(81, 115, 28, 44)} ${rect(111, 115, 28, 44)} ${rect(141, 115, 28, 44)}`, 1],
    ['f', '#d7442c', `${seven(84, 121)} ${seven(114, 121)} ${seven(144, 121)}`, 1.4],
    ['l', 'M78,137 H172', 0.8],
    ['f', '#f2cf4a', rect(80, 174, 14, 8), 1],
    ['f', '#5d9a3e', rect(100, 174, 14, 8), 1],
    ['f', '#2f5fa8', rect(120, 174, 14, 8), 1],
    ['f', '#1a1714', rect(156, 172, 4, 12), 0],
    ['f', '#9a958a', rect(186, 136, 10, 26), 1.4],
    ['s', '#d9d2c2', 'M192,150 L206,92', 4],
    ['f', '#d7442c', c(207, 88, 8), 1.6],
    ['f', '#1a1714', rect(78, 200, 94, 20), 0],
    ['f', '#d9d2c2', 'M74,218 L176,218 L172,230 L78,230 Z', 1.4],
    // Výhra sype: mince v misce, na zemi i ve vzduchu.
    ['f', '#e9b030', coins.map(([x, y]) => c(x, y, 6, 4)).join(' '), 1.1],
    [
      'l',
      'M58,212 l8,-4 M56,198 l8,2 M192,204 l-8,-2 M196,214 l-8,4 M60,92 l-8,-6 M190,92 l8,-6 M125,60 l0,-8',
      1.2,
    ],
  ];
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Sekera: pivní tácek plný čárek a křížků, sekyrka zaseknutá do pultu, prázdná peněženka, ze které letí mol. */

/** Sekera: oko u počátku, topůrko po +x, ostří k +y; spodek ostří (y > 26) je zaseknutý pod povrchem. */
const AXE_HANDLE =
  'M-6,-6 C20,-6.5 42,-5.5 58,-5.5 C63,-8 69,-6 69,0 C69,6 63,8 58,5.5 C42,5.5 20,6.5 -6,6 Z';
const AXE_HEAD =
  'M-11,-15 C-11,-19 11,-19 11,-15 L11,2 C9,8 9,12 14,17 C18,21 23,24 28,26 L-28,26 C-23,24 -18,21 -14,17 C-9,12 -9,8 -11,2 Z';
const AXE_EDGE = 'M-21,22 C-12,21.5 12,21.5 21,22 L28,26 L-28,26 Z';

function sekera(): SceneOp[] {
  const tally = (x: number, y: number): string =>
    `M${x},${y} l1,18 M${x + 6},${y - 0.5} l1,18 M${x + 12},${y - 1} l1,18 M${x + 18},${y - 1.5} l1,18 M${x - 3},${y + 13} l26,-9`;
  const ax = 148;
  const ay = 178;
  const sc = 1.3;
  const deg = -27;
  const at = (d: string): string => place(d, ax, ay, sc, deg);
  return [
    ['f', '#e9b030', rect(16, 16, 218, 268), 0],
    ['f', '#8c5632', rect(16, 104, 218, 40), 1.2],
    ['l', 'M50,104 V144 M96,104 V144 M142,104 V144 M188,104 V144', 0.9],
    // Výčepní kohout a načaté pivo na pultu.
    ['f', '#d9d2c2', 'M152,58 L166,58 L168,108 L150,108 Z', 1.6],
    ['f', '#d9d2c2', 'M152,70 C140,70 134,78 134,90 L141,90 C141,82 145,78 152,78 Z', 1.4],
    ['f', '#1a1714', 'M155,32 C155,28 163,28 163,32 L162,58 L156,58 Z', 1.2],
    ['f', '#9a958a', rect(144, 104, 30, 6), 1.2],
    ['f', '#f2cf4a', 'M30,142 L33,90 L61,90 L64,142 Z', 1.6],
    ['f', '#fffaf0', 'M31,98 C30,86 64,86 63,98 C56,102 38,102 31,98 Z', 1.2],
    ['l', 'M62,102 C72,104 72,128 63,130', 2.4],
    // Pult.
    ['f', '#c99a62', rect(16, 140, 218, 144), 1.6],
    [
      'l',
      'M16,168 C60,164 120,172 234,166 M16,230 C80,226 150,234 234,228 M16,258 C70,254 160,260 234,256',
      0.7,
    ],
    // Tácek s čárkami: čím míň v kapse, tím víc na tácku.
    ['f', '#fffaf0', c(88, 196, 68, 44), 1.8],
    ['s', '#d7442c', c(88, 196, 60, 37), 2.6],
    ['l', `${tally(38, 172)} ${tally(68, 170)} ${tally(98, 168)} ${tally(42, 202)} ${tally(72, 200)}`, 2],
    ['l', 'M100,204 l11,13 M111,204 l-11,13', 2],
    // Sekera zaseknutá do okraje tácku — „zapsat na sekeru“ doslova.
    ['f', '#8c5632', at(AXE_HANDLE), 1.8],
    ['l', at('M14,-1 C30,-1.5 44,-1.2 56,-1.2'), 0.8],
    ['f', '#9a958a', at(AXE_HEAD), 2],
    ['f', '#fffaf0', at(AXE_EDGE), 1],
    ['l', at('M-33,26.6 L33,26.6'), 2.8],
    ['l', at('M-33,27 L-40,31 M-36,27 L-40,21 M33,27 L41,30 M35,27 L40,21'), 1.1],
    // Tužka vrchního.
    ['f', '#f2cf4a', 'M34,258 L96,246 L98,254 L36,266 Z', 1.4],
    ['f', '#f2b38c', 'M96,246 L110,248 L98,254 Z', 1.2],
    ['f', '#1a1714', 'M106,247.3 L110,248 L107.5,250.5 Z', 0],
    ['f', '#e88a9a', 'M34,258 L27,259.5 L29,267 L36,266 Z', 1.2],
    // Otevřená prázdná peněženka, z ní vylétá mol.
    ['f', '#5a3418', 'M160,236 L196,230 L200,262 L162,266 Z', 1.6],
    ['f', '#8c5632', 'M196,230 L230,236 L228,266 L200,262 Z', 1.6],
    ['f', '#1a1714', 'M168,240 L192,236 L194,252 L170,256 Z', 0],
    ['l', 'M204,240 L224,243 M204,247 L224,250 M204,254 L223,257', 1],
    [
      'f',
      '#d9d2c2',
      'M188,212 C180,202 172,206 176,214 C172,220 180,222 188,216 C194,222 202,220 198,214 C202,206 194,202 188,212 Z',
      1.2,
    ],
    ['l', 'M188,212 L188,218 M186,210 l-3,-5 M190,210 l3,-5', 1],
    ['l', 'M182,232 C178,228 180,224 184,222', 0.8],
  ];
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Kominík: černá uniforma se dvěma řadami zlatých knoflíků, cylindr, ježek na laně přes rameno, střechy a komíny
   s kouřem ve tvaru křížů — a ruka kolemjdoucího, která se rychle chytá za knoflík. */

const club = (x: number, y: number, s: number): string =>
  `${c(x, y - s * 0.55, s * 0.5)} ${c(x - s * 0.55, y + s * 0.15, s * 0.5)} ${c(x + s * 0.55, y + s * 0.15, s * 0.5)}`;
/** Nožka křížového znaku pod obláčkem. */
const clubStem = (x: number, y: number, s: number): string =>
  `M${r1(x - s * 0.14)},${r1(y)} L${r1(x + s * 0.14)},${r1(y)} L${r1(x + s * 0.4)},${r1(y + s * 0.95)} L${r1(x - s * 0.4)},${r1(y + s * 0.95)} Z`;

function kominik(): SceneOp[] {
  const puffs = [
    [43, 70, 16],
    [199, 56, 14],
    [216, 36, 9],
  ] as const;
  return figure({
    bg: '#bcd6e6',
    motif: 'none',
    body: '#1a1714',
    collar: 'plain',
    hair: 'short',
    hairColor: '#3b2a1a',
    hat: 'top',
    hatColor: '#1a1714',
    hatAccent: '#5b5850',
    mood: 'grin',
    backdrop: [
      // Kouř z komínů ve tvaru křížů (černé barvy, jako kominík).
      ['f', '#d9d2c2', puffs.map(([x, y, k]) => clubStem(x, y, k)).join(' '), 1.2],
      ['f', '#d9d2c2', puffs.map(([x, y, k]) => club(x, y, k)).join(' '), 1.2],
      ['f', '#b8302a', 'M16,190 L76,128 L134,190 L134,284 L16,284 Z', 1.8],
      ['f', '#b8302a', 'M146,200 L196,150 L234,186 L234,284 L146,284 Z', 1.8],
      ['l', 'M22,196 L80,138 M28,212 L92,150 M36,228 L104,162 M154,212 L198,166 M162,226 L210,178', 1],
      // Komíny sedí na střechách.
      ['f', '#8c5632', 'M34,173 L34,96 L52,96 L52,155 Z', 1.6],
      ['f', '#1a1714', rect(31, 90, 24, 7), 1],
      ['f', '#8c5632', 'M190,157 L190,80 L208,80 L208,172 Z', 1.6],
      ['f', '#1a1714', rect(187, 74, 24, 7), 1],
      ['l', 'M34,120 H52 M34,140 H52 M190,104 H208 M190,128 H208', 0.8],
      // Vlaštovky.
      ['l', 'M150,52 l6,4 l6,-4 M168,72 l5,3 l5,-3', 1.4],
    ],
    outfit: [
      ['s', '#5b5850', 'M125,216 L125,284', 1.6],
      ['f', '#e9b030', [228, 244, 260].flatMap((y) => [c(111, y, 4.5), c(139, y, 4.5)]).join(' '), 1.2],
      ['l', [228, 244, 260].flatMap((y) => [`M109,${y} l4,0`, `M137,${y} l4,0`]).join(' '), 0.8],
    ],
    extra: [
      // Bílý šátek kolem krku.
      ['f', '#fffaf0', 'M104,206 C112,220 138,220 146,206 L148,216 C138,230 112,230 102,216 Z', 1.6],
      ['f', '#fffaf0', 'M122,222 L114,240 L124,234 Z M128,222 L136,240 L126,234 Z', 1.2],
      // Saze na tváři.
      ['f', '#5b5850', `${c(108, 170, 6, 4)} ${c(146, 142, 5, 3)}`, 0],
      // Lano stočené na rameni, na konci ježek a koule.
      [
        's',
        '#c99a62',
        'M70,226 C56,234 62,256 80,252 C96,248 94,226 80,222 M66,232 C54,246 70,262 86,254 M84,222 C70,218 60,226 62,240',
        3,
      ],
      ['s', '#c99a62', 'M64,252 C58,254 54,252 50,247', 2.4],
      ['f', '#1a1714', c(42, 236, 10), 1.4],
      ['l', ticks(42, 236, 9, 16, 16), 1.4],
      ['f', '#9a958a', c(42, 254, 4.5), 1],
      // Ruka kolemjdoucího chytá knoflík.
      ['f', '#d7442c', 'M234,228 L170,236 L172,256 L234,254 Z', 1.6],
      ['f', SKIN, 'M172,236 C160,230 148,232 144,240 C142,246 148,250 156,248 L172,254 Z', 1.6],
      ['f', SKIN, 'M158,232 C152,226 142,228 141,236 L152,238 Z', 1.2],
      ['l', 'M228,232 l-2,20 M196,232 l4,-4 M200,224 l3,-6', 1],
    ],
  });
}

/* ------------------------------------------------------------------------------------------------------------ */

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  // Stálý host: vlastní hrnek, vlastní háček na věšáku (teď prázdný), vlastní židle se srdíčkem.
  regular: {
    bg: '#f6e3a1',
    motif: 'none',
    body: '#bcd6e6',
    collar: 'vest',
    accent: '#8c5632',
    hatColor: '#5b5850',
    hairColor: '#9a958a',
    beardColor: '#8a7a6a',
    prop: undefined,
    backdrop: regularBackdrop(),
    extra: REGULAR_EXTRA,
  },
  // Známý na úřadě: mrkne, obálka v kapse, za ním fronta u přepážky a švagrová vykukuje z podatelny.
  office_connection: {
    bg: '#fffaf0',
    motif: 'none',
    body: '#8c5632',
    backdrop: [
      ['f', '#9fd0c4', rect(16, 150, 218, 134), 1.2],
      ['l', 'M16,150 H234', 2],
      // Přepážka s okénkem a mluvítkem.
      ['f', '#8c5632', rect(20, 62, 70, 96), 1.6],
      ['f', '#bcd6e6', rect(26, 68, 58, 70), 1.2],
      ['f', '#fffaf0', 'M44,138 C44,128 66,128 66,138 Z', 1],
      ['f', '#c99a62', rect(18, 150, 76, 8), 1.4],
      ['f', '#1a1714', rect(42, 52, 26, 12), 1],
      ['f', '#f2cf4a', `${c(49, 58, 2)} ${c(55, 58, 2)} ${c(61, 58, 2)}`, 0],
      // Fronta u přepážky (zezadu): babička v šátku a pán v buřince.
      ['f', '#9a958a', 'M10,266 C10,214 22,198 34,198 C46,198 58,214 58,266 Z', 1.6],
      // Babička zezadu: šátek přes celou hlavu, uzel s cípy v týle, puntíky.
      ['f', '#6b4a9e', 'M30,190 L24,206 L34,197 L44,206 L38,190 Z', 1.4],
      ['f', '#6b4a9e', c(34, 179, 12, 13), 1.6],
      [
        'f',
        '#fffaf0',
        `${c(29, 172, 1.6)} ${c(38, 170, 1.6)} ${c(34, 180, 1.6)} ${c(27, 184, 1.6)} ${c(41, 183, 1.6)}`,
        0,
      ],
      ['f', '#6b4a9e', c(34, 192, 4, 3), 1.2],
      ['f', '#5b5850', 'M44,266 C44,224 54,210 66,210 C78,210 88,224 88,266 Z', 1.6],
      // Pán v buřince zezadu: týl, ucho, límec kabátu.
      ['f', SKIN, rect(61, 202, 10, 9), 1.2],
      ['f', SKIN, c(56, 197, 2.6, 3.6), 1],
      ['f', '#5a3418', c(66, 196, 10, 11), 1.4],
      ['l', 'M60,212 L66,218 L72,212', 1.2],
      [
        'f',
        '#2f3542',
        'M57,190 C57,178 75,178 75,190 Z M52,191 C58,186 74,186 80,191 C74,194 58,194 52,191 Z',
        1.3,
      ],
      // Dveře podatelny, pootevřené, a švagrová.
      ['f', '#8c5632', rect(170, 60, 60, 172), 1.6],
      ['f', '#1a1714', rect(176, 66, 14, 166), 0],
      ['f', '#c99a62', 'M190,66 L226,66 L226,232 L190,232 Z', 1.4],
      ['f', '#fffaf0', rect(198, 80, 22, 44), 1.1],
      ['f', '#1a1714', c(194, 156, 3), 0],
      ['f', '#5a3418', c(184, 96, 6), 1.2],
      ['f', SKIN, c(186, 110, 9, 10), 1.4],
      ['f', '#5a3418', 'M177,108 C176,98 194,96 195,106 C190,102 182,102 177,108 Z', 1.1],
      ['l', `${c(183, 110, 3)} ${c(190, 110, 3)}`, 1],
      ['f', '#d7442c', 'M183,116 C186,115 189,115 191,116 C188,119 185,119 183,116 Z', 0.6],
      ['f', SKIN, 'M190,124 C196,122 198,128 194,132 L188,132 Z', 1.2],
    ],
    outfit: [
      // Obálka v náprsní kapse.
      ['f', '#fffaf0', 'M72,238 L98,234 L100,250 L74,254 Z', 1.4],
      ['l', 'M72,238 L87,246 L98,234', 1],
      ['l', 'M70,252 L102,246', 1.8],
    ],
    extra: [
      // Mrknutí: levé oko zavřené.
      ['f', SKIN, c(114, 152, 4.2), 0],
      ['l', 'M109,153 C112,150 117,150 120,153', 1.8],
      ['l', c(114, 152, 8), 1.8],
    ],
  },
  // Kronikář: otevřená obecní kronika s iniciálou a kaňkou, brk, police s ročníky, za oknem náves s kostelem.
  chronicler: {
    bg: '#f6e3a1',
    motif: 'none',
    body: '#5b5850',
    collar: 'bow',
    accent: '#d7442c',
    hairColor: '#d9d2c2',
    beard: 'mustache',
    beardColor: '#d9d2c2',
    prop: undefined,
    backdrop: [
      // Police s ročníky kroniky.
      ['f', '#8c5632', rect(18, 56, 72, 150), 1.6],
      [
        'f',
        '#2f6b3a',
        `${rect(24, 64, 10, 36)} ${rect(48, 66, 9, 34)} ${rect(70, 64, 12, 36)} ${rect(30, 110, 10, 36)} ${rect(58, 112, 12, 34)}`,
        1.1,
      ],
      [
        'f',
        '#d7442c',
        `${rect(34, 66, 9, 34)} ${rect(57, 64, 13, 36)} ${rect(24, 112, 6, 34)} ${rect(40, 110, 9, 36)} ${rect(70, 110, 12, 36)}`,
        1.1,
      ],
      [
        'f',
        '#22365c',
        `${rect(43, 64, 5, 36)} ${rect(49, 112, 9, 34)} ${rect(24, 156, 14, 34)} ${rect(52, 158, 12, 32)}`,
        1.1,
      ],
      ['f', '#c99a62', `${rect(38, 156, 14, 34)} ${rect(64, 160, 16, 30)}`, 1.1],
      [
        'l',
        'M24,72 h10 M34,74 h9 M57,72 h13 M70,72 h12 M30,118 h10 M40,118 h9 M58,120 h12 M70,118 h12 M24,164 h14 M38,164 h14 M52,166 h12',
        1.2,
      ],
      ['l', 'M18,100 H90 M18,146 H90 M18,190 H90', 1.6],
      // Okno na náves.
      ['f', '#fffaf0', rect(160, 52, 66, 92), 1.8],
      ['f', '#bcd6e6', rect(166, 58, 54, 80), 1],
      ['f', '#5d9a3e', 'M166,116 C182,106 204,110 220,104 L220,138 L166,138 Z', 1],
      ['f', '#fffaf0', 'M174,128 L174,100 L184,100 L184,128 Z', 1],
      ['f', '#d7442c', 'M172,100 L179,80 L186,100 Z', 1],
      ['f', '#fffaf0', 'M196,130 L196,118 L212,118 L212,130 Z', 1],
      ['f', '#d7442c', 'M194,119 L204,110 L214,119 Z', 1],
      ['l', 'M193,58 V138 M166,98 H220', 1.6],
      // Nástěnný kalendář — vždycky s datem.
      ['f', '#fffaf0', rect(160, 152, 30, 32), 1.4],
      ['f', '#d7442c', rect(160, 152, 30, 9), 1.2],
      ['l', 'M168,170 l6,-4 l0,12 M178,168 c4,-4 8,0 4,4 l-6,6 h8', 1.1],
    ],
    extra: [
      // Soustředěně vyplazený jazyk v koutku.
      ['f', '#e88a9a', 'M131,176 C135,176 137,180 134,183 C131,183 130,180 131,176 Z', 1],
      // Otevřená kronika: iniciála, krasopisné řádky, kaňka (s chybou).
      ['f', '#8c5632', 'M28,232 C70,220 112,222 125,232 C138,222 180,220 222,232 L226,270 L24,270 Z', 1.8],
      ['f', '#fffaf0', 'M34,230 C70,220 108,222 125,232 L125,270 L32,270 Z', 1.4],
      ['f', '#fffaf0', 'M125,232 C142,222 180,220 216,230 L218,270 L125,270 Z', 1.4],
      ['l', 'M125,232 L125,270', 1.2],
      ['f', '#d7442c', rect(42, 236, 15, 15), 1],
      ['s', '#e9b030', 'M45,247 C44,240 54,238 54,243 C54,247 48,247 49,243', 1.8],
      [
        'l',
        'M62,240 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 10,0 M62,248 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 10,0 M42,258 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0',
        0.9,
      ],
      [
        'l',
        'M134,240 c4,-3 8,3 12,0 c4,-3 8,3 12,0 c4,-3 8,3 12,0 M134,248 c4,-3 8,3 12,0 c4,-3 8,3 12,0',
        0.9,
      ],
      // Kaňka a přeškrtnuté slovo.
      [
        'f',
        '#1a1714',
        'M146,256 C142,250 150,246 154,252 C160,248 164,256 158,260 C160,266 150,268 148,262 C142,264 140,258 146,256 Z',
        0,
      ],
      ['f', '#1a1714', `${c(164, 252, 1.6)} ${c(140, 264, 1.3)}`, 0],
      ['l', 'M160,247 c3,-2 6,2 9,0 M158,249 L172,245', 1],
      // Ruka s brkem, předloktí v černém rukávníku.
      ['f', '#1a1714', 'M184,236 C200,230 220,236 234,244 L234,270 C220,262 204,256 188,250 Z', 1.4],
      ['l', 'M190,236 l-2,12 M195,234 l-2,14', 0.9],
      ['f', '#fffaf0', 'M170,250 C182,216 204,188 226,170 C220,196 198,230 172,252 Z', 1.4],
      [
        'l',
        'M172,250 C186,224 204,198 222,176 M188,218 l-6,-4 M197,205 l-6,-4 M206,192 l-6,-4 M194,220 l4,4 M203,207 l4,4',
        0.8,
      ],
      ['f', SKIN, c(182, 242, 12, 10), 1.8],
      ['l', 'M172,239 l18,-4 M173,245 l18,-4', 1.1],
      ['l', 'M170,250 L166,256', 1.4],
    ],
  },
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  // Pivní břicho: menší pán, obří břicho v tílku, metr, kterému nestačí, přepravky a graf „investice“.
  'fig-beer_belly': pivniBricho(),
  // Kolotoč na pouti: točí se dokola (Postupka kolem dokola) — barvy karet na lambrekýnu, koníci nahoře a dole.
  kolotoc: kolotoc(),
  // Ozvěna z propasti: turista křičí z vyhlídky, ozvěna se vrací z hloubky (poslední karta skóruje znovu).
  ozvena: ozvena(),
  // Šťastná sedmička: automat v nádražce, tři sedmičky, mince sypou, hodiny ukazují sedm.
  sedmicka: sedmicka(),
  // Sekera: tácek plný čárek, zaseknutá sekyrka a prázdná peněženka s molem.
  sekera: sekera(),
  // Kominík: knoflíky pro štěstí, ježek na laně, kouř ve tvaru křížů a cizí ruka na knoflíku.
  kominik: kominik(),
};

/**
 * Obrázky žolíků — dávka 06 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - recount_committee — Volební komise: portrét `fig-recount_committee` (FIGURES['recount_committee'])
 *  - football_fan — Fotbalový fanoušek: portrét `fig-football_fan` beze změny (hotový návrh ve figures.ts)
 *  - crown_goldsmith — Zlatník: portrét `fig-crown_goldsmith` (FIGURES['crown_goldsmith'])
 *  - beggar — Žebrák: portrét `fig-beggar` (FIGURES['beggar'])
 *  - building_savings — Stavební spoření: nová scéna `j-building_savings` (SCENES['j-building_savings'])
 *  - late_train — Zpožděný rychlík: scéna `rychlik` (SCENES['rychlik'])
 *  - head_waiter — Pan vrchní: scéna `vrchni` (SCENES['vrchni'])
 *  - old_guard — Stará garda: portrét `fig-old_guard` (FIGURES['old_guard'])
 *  - herbalist — Kořenářka: portrét `fig-herbalist` (FIGURES['herbalist'])
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

/** Čtyřcípá jiskra. */
const STAR4 = 'M0,-10 Q1.5,-1.5 10,0 Q1.5,1.5 0,10 Q-1.5,1.5 -10,0 Q-1.5,-1.5 0,-10 Z';
/** Srdíčko (výška ~36 při s = 1). */
const HEART =
  'M0,16 C-10,8 -20,0 -20,-8 C-20,-16 -14,-20 -9,-20 C-4,-20 -1,-17 0,-13 C1,-17 4,-20 9,-20 C14,-20 20,-16 20,-8 C20,0 10,8 0,16 Z';
/** Tužka (hrot dole). */
const PENCIL = 'M-2.6,-14 L2.6,-14 L2.6,8 L0,14 L-2.6,8 Z';

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
function hand(x: number, y: number, deg = 0): SceneOp[] {
  return [
    ['f', SKIN, c(x, y, 11, 9), 1.8],
    ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', x, y, 1, deg), 1.1],
  ];
}

/** Přerušovaná čára lomenou cestou (čárky po `dash`, mezery `gap`). */
function dashed(pts: readonly (readonly [number, number])[], dash = 5, gap = 4): string {
  let d = '';
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let s = 0; s < len; s += dash + gap) {
      const e = Math.min(s + dash, len);
      d += `M${r1(x0 + ((x1 - x0) * s) / len)},${r1(y0 + ((y1 - y0) * s) / len)} `;
      d += `L${r1(x0 + ((x1 - x0) * e) / len)},${r1(y0 + ((y1 - y0) * e) / len)} `;
    }
  }
  return d.trim();
}

/** Čárky po pěti (čtyři svislé, pátá šikmo přes ně) — sčítací arch. */
function tally(x: number, y: number, n: number, h = 11): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const gx = x + Math.floor(i / 5) * 22;
    const k = i % 5;
    d +=
      k === 4
        ? `M${gx - 2},${y + h - 1} L${gx + 14},${y + 1} `
        : `M${gx + k * 4},${y} L${gx + k * 4},${y + h} `;
  }
  return d.trim();
}

/** Půllitr s pěnou (dno uprostřed v x, y; výška ~38 při s = 1). */
function mug(x: number, y: number, s = 1): SceneOp[] {
  return [
    ['f', '#bcd6e6', place('M8,-25 C21,-25 21,-5 8,-5 L8,-10 C15,-10 15,-20 8,-20 Z', x, y, s), 1.4],
    ['f', '#e9b030', place('M-9,0 L-10,-28 L10,-28 L9,0 Z', x, y, s), 1.6],
    ['l', place('M-5,-22 L-5,-6 M0,-22 L0,-6 M5,-22 L5,-6', x, y, s), 0.8],
    [
      'f',
      '#fffaf0',
      place('M-12,-26 C-14,-34 -6,-38 -3,-33 C-1,-40 9,-39 8,-33 C14,-35 15,-27 11,-25 Z', x, y, s),
      1.4,
    ],
  ];
}

/** Smrk: čtyři patra větví do zubu, špička nahoře, pata (`base`) dole uprostřed. */
function spruce(x: number, base: number, w: number, h: number): string {
  const left: (readonly [number, number])[] = [];
  for (let i = 1; i <= 4; i++) {
    const y = base - h + (h * i) / 4;
    const hw = (w / 2) * (0.35 + (0.65 * i) / 4);
    left.push([x - hw, y]);
    if (i < 4) left.push([x - hw * 0.45, y]);
  }
  const right = left.map(([px, py]) => [2 * x - px, py] as const).reverse();
  return `M${x},${base - h} ${[...left, ...right].map(([px, py]) => `L${r1(px)},${r1(py)}`).join(' ')} Z`;
}

/** Posune absolutní souřadnice y cesty o `dy` (relativní příkazy malými písmeny nechá být). */
function shiftY(d: string, dy: number): string {
  const ys: Readonly<Record<string, readonly number[]>> = {
    M: [1],
    L: [1],
    T: [1],
    H: [],
    V: [0],
    C: [1, 3, 5],
    S: [1, 3],
    Q: [1, 3],
    A: [6],
  };
  const arity: Readonly<Record<string, number>> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7 };
  let cmd = '';
  let i = 0;
  return d.replace(/[A-Za-z]|-?\d*\.?\d+/g, (t) => {
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t;
      i = 0;
      return t;
    }
    const n = arity[cmd];
    const idx = n ? i % n : -1;
    i++;
    return n && ys[cmd]!.includes(idx) ? r1(Number(t) + dy) : t;
  });
}

/** Posune celý tah o `dy` dolů. */
function shiftOp(op: SceneOp, dy: number): SceneOp {
  switch (op[0]) {
    case 'f':
      return ['f', op[1], shiftY(op[2], dy), op[3]];
    case 's':
      return ['s', op[1], shiftY(op[2], dy), op[3]];
    case 'l':
      return ['l', shiftY(op[1], dy), op[2]];
    case 'h':
      return ['h', shiftY(op[1], dy), op[2]];
    default:
      return ['i', op[1], op[2], op[3] + dy, op[4], op[5]];
  }
}

// ─────────────────────────── Volební komise ───────────────────────────

// Školní třída jako volební místnost: tabule se třemi různými součty, plenta, zapečetěná urna a lupa na křížek.
const recountCommittee: Partial<FigureSpec> = {
  bg: '#f3e8cf',
  motif: 'none',
  body: '#2f4858',
  collar: 'tie',
  accent: '#d7442c',
  female: true,
  hair: 'bun',
  hairColor: '#7a6a5a',
  glasses: true,
  mood: 'flat',
  prop: undefined,
  backdrop: [
    // Spodek stěny natřený školní olejovkou.
    ['f', '#9fd0c4', rect(16, 158, 218, 126), 0],
    ['s', '#2f8077', 'M16,158 H234', 3],
    // Tabule: třikrát sečteno, třikrát jinak.
    ['f', '#8c5632', rect(22, 58, 78, 70), 1.6],
    ['f', '#2f6b3a', rect(27, 63, 68, 60), 1.1],
    ['s', '#fffaf0', `${tally(34, 69, 7)} ${tally(34, 86, 9)} ${tally(34, 103, 6)}`, 1.3],
    ['f', '#c99a62', rect(25, 128, 72, 4), 1],
    ['f', '#fffaf0', rect(74, 124, 11, 4), 0.8],
    // Plenta se závěsem.
    ['l', 'M170,68 V214 M226,68 V214', 2],
    [
      'f',
      '#e9b030',
      'M170,70 L226,70 L226,190 C221,196 216,188 211,194 C206,200 200,190 195,196 C190,202 184,192 179,198 C176,200 172,196 170,194 Z',
      1.6,
    ],
    [
      'l',
      'M183,72 C181,112 185,152 182,196 M198,72 C200,112 196,152 197,196 M212,72 C210,112 214,152 212,192',
      1,
    ],
    ['f', '#8c5632', rect(166, 62, 64, 8), 1.4],
  ],
  outfit: [
    // Visačka člena komise na šňůrce.
    ['l', 'M140,212 C144,216 148,220 150,222', 1.2],
    ['f', '#fffaf0', place('M-10,-8 L10,-8 L10,10 L-10,10 Z', 154, 230, 1, 6), 1.3],
    ['f', '#d7442c', place('M-10,-8 L10,-8 L10,-3 L-10,-3 Z', 154, 230, 1, 6), 0.8],
    ['f', '#9a958a', place('M-7,0 L-1,0 L-1,7 L-7,7 Z', 154, 230, 1, 6), 0.6],
    ['l', place('M2,2 L7,2 M2,5 L6,5', 154, 230, 1, 6), 0.7],
  ],
  extra: [
    // Tužka za uchem.
    ['f', '#f2c24a', place(PENCIL, 157, 142, 1, 18), 1.2],
    ['f', '#1a1714', place('M-1.2,10 L1.2,10 L0,14 Z', 157, 142, 1, 18), 0],
    // Stůl komise s ubrusem.
    ['f', '#e8603a', rect(16, 238, 218, 8), 1.4],
    ['f', '#d7442c', rect(16, 246, 218, 24), 1.6],
    ['l', 'M48,250 V270 M98,250 V270 M150,250 V270 M200,250 V270', 0.9],
    // Zapečetěná urna s obálkou ve štěrbině.
    ['f', '#d8a85a', 'M28,184 L38,174 L100,174 L90,184 Z', 1.4],
    ['f', '#8c5632', 'M90,184 L100,174 L100,230 L90,240 Z', 1.4],
    ['f', '#c99a62', rect(28, 184, 62, 56), 1.8],
    ['f', '#1a1714', 'M52,177 L78,177 L75,181 L49,181 Z', 0],
    ['f', '#fffaf0', place('M-11,-16 L11,-16 L11,4 L-11,4 Z', 64, 176, 1, 12), 1.3],
    ['l', place('M-11,-16 L0,-8 L11,-16', 64, 176, 1, 12), 0.9],
    ['f', '#f6e3a1', rect(42, 214, 34, 16), 1.1],
    ['l', 'M28,198 L90,208', 1],
    ['f', '#b8302a', c(59, 203, 5), 1.2],
    // Hromádka lístků.
    ['f', '#fffaf0', 'M154,244 L164,234 L222,234 L214,244 Z', 1.2],
    ['f', '#fffaf0', 'M158,242 L170,232 L226,233 L216,242 Z', 1.2],
    ['l', 'M180,236 L212,236 M176,239 L206,239', 0.8],
    // Lupa: zvětšený křížek na lístku.
    ['s', '#5a3418', 'M184,234 L192,212', 5],
    ['f', '#1a1714', c(197, 194, 19), 0],
    ['f', '#bcd6e6', c(197, 194, 15), 1],
    ['f', '#fffaf0', rect(188, 185, 18, 18), 1.2],
    ['s', '#d7442c', 'M191,188 L203,200 M203,188 L191,200', 2.6],
    ['l', 'M186,186 C188,181 192,179 196,179', 1.4],
    ...hand(184, 236, -70),
  ],
};

// ─────────────────────────── Zlatník ───────────────────────────

// Dílna: lupa v oku, kožená zástěra, rohatka na ponku, nářadí na stěně a korunky na polštářcích podle hodností.
const crownGoldsmith: Partial<FigureSpec> = {
  bg: '#2f8077',
  motif: 'none',
  body: '#fffaf0',
  collar: 'bow',
  accent: '#d7442c',
  hair: 'bald',
  hairColor: '#9a958a',
  beard: 'walrus',
  beardColor: '#d9d2c2',
  glasses: false,
  mood: 'sly',
  prop: undefined,
  backdrop: [
    // Police s korunkami pro dámu a kluka (král ji dostává právě do ruky).
    ['f', '#c99a62', rect(16, 120, 78, 6), 1.4],
    ['f', '#d7442c', `${c(38, 117, 15, 5)} ${c(74, 117, 13, 5)}`, 1.2],
    ['f', '#e9b030', 'M25,114 L29,102 L33,109 L38,94 L43,109 L47,102 L51,114 C44,111 32,111 25,114 Z', 1.3],
    ['f', '#fffaf0', `${c(29, 101, 2.2)} ${c(38, 93, 2.6)} ${c(47, 101, 2.2)}`, 0.9],
    ['f', '#e88a9a', c(38, 107, 2.4), 0.8],
    ['f', '#e9b030', 'M64,114 L64,103 L69,107 L74,99 L79,107 L84,103 L84,114 Z', 1.3],
    // Deska s nářadím.
    ['f', '#d8a85a', rect(164, 44, 62, 66), 1.6],
    ['f', '#1a1714', `${c(176, 50, 1.6)} ${c(204, 50, 1.6)} ${c(218, 50, 1.6)}`, 0],
    ['l', 'M176,52 L184,78 L180,104 M186,52 L178,78 L184,104', 2.2],
    ['s', '#d7442c', 'M180,90 L179,103 M183,90 L185,103', 3],
    ['s', '#8c5632', 'M204,62 L204,104', 3.4],
    ['f', '#9a958a', rect(196, 54, 16, 8), 1.2],
    ['f', '#9a958a', rect(215, 54, 6, 46), 1.1],
    ['l', 'M215,62 h6 M215,70 h6 M215,78 h6 M215,86 h6', 0.6],
    // Ponk s rohatkou a prstýnkem.
    ['f', '#8c5632', rect(16, 198, 218, 86), 1.6],
    ['f', '#c99a62', rect(16, 192, 218, 8), 1.4],
    [
      'f',
      '#5b5850',
      'M22,170 L52,170 C60,170 66,166 72,163 C68,174 60,178 52,178 L48,178 L48,184 L55,192 L27,192 L33,184 L33,178 L24,178 Z',
      1.4,
    ],
    ['s', '#e9b030', c(64, 162, 4.6), 2],
    ['f', '#5fb8d6', c(64, 157, 2.2), 0.8],
    ['l', 'M16,226 H44 M16,250 H40', 1],
    ['f', '#e9b030', `${c(30, 238, 2)} ${c(30, 262, 2)}`, 0.8],
  ],
  outfit: [
    // Kožená zástěra s kapsou na pinzety.
    ['l', 'M98,236 L108,212 M152,236 L142,212', 1.8],
    ['f', '#8c5632', 'M94,284 L96,238 C104,232 146,232 154,238 L156,284 Z', 1.8],
    ['l', 'M114,246 L113,232 M118,246 L119,230 M130,246 L134,234', 1.3],
    ['f', '#5a3418', rect(108, 244, 32, 22), 1.3],
  ],
  extra: [
    // Hodinářská lupa v oku (oko za ní je obří).
    ['f', '#1a1714', c(136, 152, 10.5), 0],
    ['f', '#bcd6e6', c(136, 152, 7.6), 1],
    ['f', 'dark', c(136, 152, 3.8), 0],
    ['f', '#fffaf0', c(133.5, 149.5, 1.5), 0],
    // Hotová královská koruna v ruce.
    [
      'f',
      '#e9b030',
      'M166,236 L166,204 L174,214 L178,198 L184,212 L190,190 L196,212 L202,198 L206,214 L214,204 L214,236 Z',
      1.8,
    ],
    ['f', '#e9b030', `${c(166, 202, 3)} ${c(178, 196, 3)} ${c(202, 196, 3)} ${c(214, 202, 3)}`, 1.1],
    ['l', 'M190,190 L190,180 M186,184 L194,184', 1.8],
    ['f', '#c08a1e', rect(166, 224, 48, 12), 1.4],
    ['f', '#d7442c', c(178, 230, 3), 0.9],
    ['f', '#2f5fa8', c(190, 230, 3.2), 0.9],
    ['f', '#5d9a3e', c(202, 230, 3), 0.9],
    [
      'f',
      '#fffaf0',
      `${place(STAR4, 224, 190, 0.8)} ${place(STAR4, 158, 196, 0.55)} ${place(STAR4, 220, 222, 0.45)}`,
      0.8,
    ],
    ...hand(190, 246),
  ],
};

// ─────────────────────────── Žebrák ───────────────────────────

// Podloubí s oblouky do náměstí, lucerna a kočičí hlavy: záplatovaný kabát, karton s dvojkou (krále přeškrtnutého), plecháček, padající koruna a pes.
const beggar: Partial<FigureSpec> = {
  bg: '#f6e3a1',
  motif: 'none',
  prop: undefined,
  backdrop: [
    // Klenba podloubí a pilíře z pískovce.
    ['f', '#c99a62', 'M16,16 H234 V58 C200,38 160,38 125,58 C90,38 50,38 16,58 Z', 0],
    ['l', 'M16,58 C50,38 90,38 125,58 C160,38 200,38 234,58', 1.4],
    // Oblouky do světlého náměstí, za nimi domy s okny.
    [
      'f',
      '#bcd6e6',
      'M24,206 L24,126 C24,96 76,96 76,126 L76,206 Z M174,206 L174,126 C174,96 226,96 226,126 L226,206 Z',
      1.8,
    ],
    ['f', '#f3c7c0', rect(30, 150, 40, 56), 1.2],
    ['f', '#9fd0c4', rect(180, 146, 40, 60), 1.2],
    ['f', '#b8302a', 'M27,152 L50,130 L73,152 Z M177,148 L200,126 L223,148 Z', 1.3],
    [
      'f',
      '#3b4f78',
      `${rect(36, 160, 9, 11)} ${rect(55, 160, 9, 11)} ${rect(36, 180, 9, 11)} ${rect(55, 180, 9, 11)} ${rect(186, 156, 9, 11)} ${rect(205, 156, 9, 11)}`,
      0.9,
    ],
    // Lucerna zavěšená v klenbě.
    ['l', 'M125,56 L125,61 M108,74 l-5,0 M142,74 l5,0 M111,64 l-4,-3 M139,64 l4,-3', 1.2],
    ['f', '#1a1714', 'M119,61 L131,61 L129,65 L121,65 Z M115,82 L135,82 L131,87 L119,87 Z', 0],
    ['f', '#f2cf4a', 'M120,65 L130,65 L133,82 L117,82 Z', 1.4],
    // Dlažba z kočičích hlav.
    ['f', '#9a958a', rect(16, 206, 218, 78), 1.4],
    [
      'f',
      '#d9d2c2',
      Array.from({ length: 9 }, (_, row) =>
        Array.from({ length: 20 }, (_, i) => c(14 + i * 12 + (row % 2) * 6, 211 + row * 9, 5.2, 3.6)).join(
          ' ',
        ),
      ).join(' '),
      0.8,
    ],
  ],
  outfit: [
    // Záplaty.
    ['f', '#8a8f2e', 'M60,236 L80,232 L84,252 L64,256 Z', 1.3],
    ['l', 'M63,239 l3,0 M66,254 l3,-1 M80,236 l1,3 M82,248 l1,3', 0.9],
    ['f', '#8c5632', 'M154,242 L170,240 L172,256 L156,258 Z', 1.3],
    ['l', 'M157,245 l3,0 M168,243 l1,3 M159,256 l3,0', 0.9],
    // Karton na krku: dvojka ano, král ne.
    ['l', 'M100,226 L112,206 M150,224 L138,206', 1.2],
    ['f', '#c99a62', 'M92,226 L156,222 L158,262 L94,266 Z', 1.6],
    ['f', '#fffaf0', place('M-9,-13 L9,-13 L9,13 L-9,13 Z', 112, 244, 1, -3), 1.2],
    ['f', '#d7442c', `${place(HEART, 112, 237, 0.2)} ${place(HEART, 112, 251, 0.2)}`, 0],
    ['f', '#e9b030', 'M130,253 L130,242 L135,246 L140,238 L145,246 L150,242 L150,253 Z', 1.1],
    ['s', '#d7442c', 'M127,237 L153,256 M153,237 L127,256', 2.2],
  ],
  extra: [
    // Plecháček s mincemi a padající koruna.
    ['f', '#9a958a', 'M174,216 L204,216 L201,246 L177,246 Z', 1.8],
    ['f', '#5b5850', c(189, 216, 15, 4), 1.4],
    ['f', '#e9b030', `${c(184, 215, 4, 1.8)} ${c(193, 216, 4, 1.8)}`, 0.8],
    ['l', 'M176,226 L202,226', 0.8],
    ['f', '#e9b030', c(190, 198, 6.5), 1.4],
    ['f', '#c08a1e', c(190, 198, 3.2), 0],
    ['l', 'M183,186 L183,176 M191,184 L191,172 M198,186 L198,178', 1.1],
    ...hand(189, 248),
    // Věrný pes sedí vedle.
    ['l', 'M25,252 C19,248 18,240 22,236', 1.6],
    ['f', '#c99a62', 'M22,264 C18,240 26,222 40,216 C52,220 58,238 56,264 Z', 1.8],
    ['f', '#8c5632', 'M28,234 C34,226 44,228 44,238 C38,242 30,242 28,234 Z', 0],
    ['l', 'M48,238 L50,264', 1.3],
    ['f', '#c99a62', c(44, 204, 12, 11), 1.8],
    ['f', '#c99a62', 'M50,199 C60,197 67,203 65,209 C61,213 53,212 50,210 Z', 1.6],
    ['f', 'dark', c(65, 203, 2.4), 0],
    ['f', '#8c5632', 'M36,195 C28,197 28,211 34,216 C39,210 41,202 36,195 Z', 1.2],
    ['f', 'dark', c(49, 200, 1.8), 0],
    ['s', '#d7442c', 'M35,214 C40,219 48,219 53,214', 2.4],
  ],
};

// ─────────────────────────── Stavební spoření ───────────────────────────

// Jeřáb zvedá střechu — strop je vyšší; prasátko v helmě se zámkem (vázanost) spoří, vedle čárkovaná garáž s otazníkem.
const ARROW_UP = 'M0,-11 L8,-2 L3,-2 L3,10 L-3,10 L-3,-2 L-8,-2 Z';

/** Prasátko-pokladnička ve stavební helmě, mince padá do štěrbiny. */
const PIGGY: readonly SceneOp[] = [
  [
    'f',
    '#e88a9a',
    `${rect(62, 252, 10, 12)} ${rect(82, 254, 10, 10)} ${rect(106, 254, 10, 10)} ${rect(122, 250, 10, 12)}`,
    1.6,
  ],
  ['f', '#e88a9a', c(92, 236, 42, 24), 2.2],
  ['f', '#f3c7c0', c(51, 236, 8, 10), 1.6],
  ['f', '#8e3b6e', `${c(49, 232, 1.6, 2.4)} ${c(49, 240, 1.6, 2.4)}`, 0],
  ['f', 'dark', c(66, 228, 2.6), 0],
  ['f', 'blush', c(70, 241, 6), 0],
  ['f', '#1a1714', 'M96,212 L116,213 L115,217 L95,216 Z', 0],
  ['f', '#e9b030', c(106, 200, 8), 1.4],
  ['f', '#c08a1e', c(106, 200, 4), 0],
  ['l', 'M134,232 C144,226 146,236 140,238 C134,240 136,230 144,228', 1.4],
  ['f', '#f2c24a', 'M56,218 C56,200 88,198 88,218 Z', 1.8],
  ['f', '#f2c24a', 'M50,216 L94,218 L93,222 L50,221 Z', 1.4],
  ['l', 'M72,200 L72,216', 1.1],
  // Zámek na boku: šest let vázanost.
  ['l', 'M106,236 C106,228 115,228 115,236', 1.8],
  ['f', '#e9b030', rect(103, 235, 15, 12), 1.4],
  ['f', '#1a1714', `${c(110.5, 240, 1.6)} M110,241 L111,241 L111.6,245 L109.4,245 Z`, 0],
];

const BUILDING_SAVINGS: readonly SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  [
    'f',
    '#fffaf0',
    'M30,84 C28,74 40,68 48,73 C52,63 70,63 72,74 C82,72 86,84 78,88 L36,89 C29,89 27,86 30,84 Z',
    1.3,
  ],
  [
    'f',
    '#fffaf0',
    'M150,74 C149,66 158,62 164,66 C167,58 180,58 182,67 C190,66 192,76 186,78 L156,79 C150,79 148,77 150,74 Z',
    1.3,
  ],
  // Tráva a staveniště.
  ['f', '#6fae55', 'M16,224 C80,218 170,220 234,216 L234,284 L16,284 Z', 1.4],
  // Čárkovaná garáž se štítem a otazníkem (možná).
  [
    'l',
    dashed([
      [22, 222],
      [22, 182],
      [53, 162],
      [84, 182],
      [84, 222],
    ]),
    1.4,
  ],
  ['i', 'question', 44, 172, 18, '#2f5fa8'],
  // Jeřáb: věž, výložník, kabina, protizávaží.
  ['l', 'M211,38 L211,24 M211,24 L120,38 M211,24 L234,32', 1.1],
  ['f', '#f2c24a', `${rect(202, 48, 4, 176)} ${rect(216, 48, 4, 176)}`, 1.1],
  [
    'l',
    Array.from(
      { length: 7 },
      (_, i) => `M206,${54 + i * 23} L216,${66 + i * 23} M216,${66 + i * 23} L206,${77 + i * 23}`,
    ).join(' '),
    1,
  ],
  ['f', '#f2c24a', `${rect(92, 37, 142, 3.5)} ${rect(92, 45, 142, 3.5)}`, 1.1],
  ['l', Array.from({ length: 14 }, (_, i) => `M${94 + i * 10},40.5 L${99 + i * 10},45`).join(' '), 0.9],
  ['f', '#f2c24a', rect(184, 49, 18, 16), 1.4],
  ['f', '#bcd6e6', rect(187, 52, 9, 8), 0.9],
  ['f', '#9a958a', rect(222, 49, 12, 14), 1.2],
  ['f', '#9a958a', rect(192, 222, 36, 10), 1.4],
  // Kočka, lano, hák a vázací lana.
  ['f', '#1a1714', rect(134, 48, 12, 5), 0],
  ['l', 'M140,53 L140,72', 1.1],
  ['l', 'M137,72 h6 v5 C143,83 135,84 134,79', 1.6],
  ['l', 'M139,80 L112,104 M139,80 L168,104', 1.1],
  // Komín a zvednutá střecha.
  ['f', '#b8302a', 'M160,112 L160,92 L170,92 L170,116 Z', 1.4],
  ['f', '#d7442c', 'M84,124 L140,88 L196,124 Z', 2],
  ['l', 'M103,112 L177,112 M121,100 L159,100 M112,112 L106,124 M140,112 L140,124 M168,112 L174,124', 0.9],
  // Šipky nahoru: strop jde výš.
  ['f', '#f2cf4a', `${place(ARROW_UP, 104, 136)} ${place(ARROW_UP, 176, 136)}`, 1.3],
  // Zdi z cihel, okno a dveře.
  ['f', '#e8603a', rect(96, 148, 88, 74), 1.8],
  [
    'l',
    `${Array.from({ length: 8 }, (_, i) => `M96,${156 + i * 8} H184`).join(' ')} ${Array.from(
      { length: 9 },
      (_, r) =>
        Array.from({ length: 5 }, (_, k) => `M${102 + k * 18 + (r % 2) * 9},${148 + r * 8} v8`).join(' '),
    ).join(' ')}`,
    0.6,
  ],
  ['f', '#bcd6e6', rect(106, 160, 26, 24), 1.4],
  ['l', 'M119,160 V184 M106,172 H132', 1.1],
  ['f', '#8c5632', rect(148, 180, 24, 42), 1.4],
  ['f', '#e9b030', c(166, 202, 2), 0.8],
  // Cihly na paletě.
  ['f', '#b8302a', `${rect(196, 240, 14, 7)} ${rect(210, 240, 14, 7)} ${rect(203, 233, 14, 7)}`, 1.1],
  ['f', '#c99a62', rect(192, 247, 36, 5), 1.1],
  ...PIGGY.map((op) => shiftOp(op, -7)),
];

// ─────────────────────────── Zpožděný rychlík ───────────────────────────

// Nádraží: hodiny na sloupu ukazují pět minut po, tlampač hlásí zpoždění, rychlík funí a hlemýžď ho předjíždí.
const RYCHLIK_BODY: readonly SceneOp[] = [
  // Kouř z komína táhne dozadu.
  [
    'f',
    '#fffaf0',
    'M132,112 C120,110 118,96 130,92 C128,80 142,74 150,82 C154,70 172,68 178,78 C186,70 202,72 204,82 C214,78 228,86 222,98 C230,104 224,116 214,114 C210,124 194,124 190,116 C182,124 166,122 164,114 C156,120 140,120 132,112 Z',
    1.6,
  ],
  ['f', '#fffaf0', `${c(206, 56, 12, 9)} ${c(226, 44, 9, 7)} ${c(131, 112, 10, 8)}`, 1.3],
  // Nádražní budova s prázdnou cedulí (jméno stanice si každý domyslí).
  ['f', '#f6e3a1', rect(16, 92, 76, 132), 1.6],
  ['f', '#b8302a', 'M10,94 L52,64 L98,94 Z', 1.6],
  ['f', '#fffaf0', rect(24, 108, 60, 16), 1.6],
  ['l', 'M28,112 H80 V120 H28 Z', 0.7],
  ['f', '#bcd6e6', 'M28,190 L28,160 C28,150 46,150 46,160 L46,190 Z', 1.3],
  ['f', '#8c5632', 'M58,224 L58,168 C58,158 78,158 78,168 L78,224 Z', 1.3],
  // Nástupištní hodiny na sloupu ukazují pět minut po, pod nimi tlampač hlásí zpoždění.
  ['f', '#5b5850', rect(94, 76, 4, 140), 1.1],
  ['f', '#fffaf0', c(96, 60, 17), 2.2],
  ['l', 'M96,45 v3 M96,72 v3 M81,60 h3 M108,60 h3', 1.1],
  ['l', 'M96,60 L96.6,50 M96,60 L102,49.6', 2],
  ['f', '#1a1714', c(96, 60, 1.8), 0],
  ['f', '#9a958a', 'M98,84 L102,84 L111,78 L111,94 L102,88 L98,88 Z', 1.3],
  ['l', 'M115,81 C118,84 118,88 115,91 M119,77 C124,82 124,90 119,95', 1.1],
  // Nástupiště za kolejí.
  ['f', '#d9d2c2', rect(16, 214, 218, 14), 1.2],
  ['s', '#f2cf4a', 'M16,218 H234', 2],
  // Lokomotiva (jede doleva).
  ['f', '#d7442c', rect(108, 196, 126, 10), 1.6],
  ['f', '#3b4f78', 'M184,118 L234,114 L234,200 L184,200 Z', 2],
  ['f', '#1a1714', 'M178,118 L234,110 L234,116 L180,124 Z', 0],
  ['f', '#bcd6e6', rect(194, 130, 24, 24), 1.4],
  ['f', '#3b4f78', 'M124,150 H186 V196 H124 C114,196 114,150 124,150 Z', 2],
  ['s', '#e9b030', 'M146,151 V195 M168,151 V195', 2.4],
  ['f', '#1a1714', 'M124,150 C114,150 114,196 124,196 L132,196 L132,150 Z', 0],
  ['f', '#1a1714', 'M126,150 L123,124 L139,124 L136,150 Z', 0],
  ['f', '#1a1714', rect(120, 119, 22, 6), 0],
  ['f', '#e9b030', 'M152,150 C152,136 170,136 170,150 Z', 1.6],
  ['f', '#f2cf4a', c(118, 160, 4.5), 1.4],
  ['f', '#d7442c', rect(104, 198, 8, 14), 1.4],
  ['f', '#1a1714', `${rect(97, 200, 7, 4)} ${rect(97, 207, 7, 4)}`, 0],
  // Kola s ojnicí.
  ['f', '#d7442c', `${c(152, 214, 16)} ${c(190, 214, 16)} ${c(124, 222, 8)} ${c(222, 220, 10)}`, 1.8],
  [
    'l',
    'M152,198 V230 M136,214 H168 M141,203 L163,225 M163,203 L141,225 M190,198 V230 M174,214 H206 M179,203 L201,225 M201,203 L179,225',
    0.9,
  ],
  ['f', '#1a1714', `${c(152, 214, 3.4)} ${c(190, 214, 3.4)} ${c(124, 222, 2.4)} ${c(222, 220, 2.6)}`, 0],
  ['s', '#9a958a', 'M152,220 L190,220', 3.4],
  ['f', '#fffaf0', 'M108,230 C100,232 94,226 98,220 C96,212 108,210 112,216 C118,214 122,222 116,226 Z', 1.2],
  // Kolej a štěrk.
  ['f', '#9a958a', rect(16, 230, 218, 12), 1.2],
  ['f', '#1a1714', rect(16, 229, 218, 3), 0],
  [
    'l',
    'M24,236 h14 M52,236 h14 M80,236 h14 M108,236 h14 M136,236 h14 M164,236 h14 M192,236 h14 M220,236 h14',
    1.4,
  ],
  ['f', '#6fae55', 'M16,242 H234 V284 H16 Z', 1.4],
  // Hlemýžď na kolejnici předjíždí rychlík.
  ['f', '#c6dcae', 'M26,229 C26,220 32,217 36,222 L60,224 C66,225 70,227 68,229 Z', 1.4],
  ['l', 'M29,220 L25,211 M33,219 L33,210', 1.2],
  ['f', 'dark', `${c(25, 210, 1.8)} ${c(33, 209, 1.8)}`, 0],
  ['f', '#e9b030', c(50, 214, 11), 1.6],
  ['l', 'M50,214 C50,210 55,210 55,214 C55,219 46,220 45,214 C45,207 58,206 59,214', 1.1],
  ['l', 'M71,226 h18 M73,221 h14 M75,216 h8', 1.2],
];

const RYCHLIK: readonly SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  ...RYCHLIK_BODY.map((op) => shiftOp(op, 12)),
];

// ─────────────────────────── Pan vrchní ───────────────────────────

// Hospoda: paroží, výčep, tácek se třemi čárkami, frak, utěrka přes rameno, kasírka, tužka za uchem a tři piva na tácu.
const VRCHNI: readonly SceneOp[] = [
  ...figure({
    bg: '#f6e3a1',
    motif: 'none',
    body: '#22365c',
    collar: 'bow',
    accent: '#1a1714',
    hair: 'part',
    hairColor: '#1a1714',
    beard: 'mustache',
    beardColor: '#1a1714',
    mood: 'sly',
    backdrop: [
      // Obložení a lampa.
      ['f', '#8c5632', rect(16, 168, 218, 116), 1.4],
      ['f', '#5a3418', rect(16, 164, 218, 6), 1.2],
      ['l', 'M60,170 V284 M190,170 V284', 1],
      ['l', 'M125,16 L125,30', 1.4],
      ['f', '#2f6b3a', 'M104,46 L146,46 L138,30 L112,30 Z', 1.6],
      ['f', '#f2cf4a', c(125, 48, 6, 3), 1],
      // Paroží na štítku — bez něj by to nebyla hospoda.
      ['f', '#8c5632', 'M38,88 L54,88 L54,100 C54,106 46,110 46,110 C46,110 38,106 38,100 Z', 1.4],
      [
        's',
        '#c99a62',
        'M43,90 C36,82 30,74 28,60 M32,72 L22,68 M30,65 L24,57 M49,90 C56,82 62,74 64,60 M60,72 L70,68 M62,65 L68,57',
        4,
      ],
      // Výčep: dva kohouty s dřevěnými pákami a pivní tácek s čárkami, opřený o pult.
      ['f', '#c99a62', rect(16, 176, 74, 8), 1.4],
      ['f', '#d9d2c2', `${rect(21, 146, 6, 30)} ${rect(43, 146, 6, 30)}`, 1.2],
      [
        'f',
        '#d9d2c2',
        'M27,148 L36,148 C39,148 40,150 40,153 L40,159 L36,159 L36,153 L27,153 Z M49,148 L58,148 C61,148 62,150 62,153 L62,159 L58,159 L58,153 L49,153 Z',
        1.2,
      ],
      ['f', '#5a3418', 'M21.5,146 L26.5,146 L28,124 L20,124 Z M43.5,146 L48.5,146 L50,124 L42,124 Z', 1.2],
      ['f', '#fffaf0', `${c(24, 122, 3.6)} ${c(46, 122, 3.6)}`, 1.1],
      ['f', '#fffaf0', c(77, 165, 11), 1.6],
      ['s', '#d7442c', c(77, 165, 8.5), 1.3],
      ['l', 'M73,160 V170 M77,160 V170 M81,160 V170', 1.4],
    ],
    outfit: [
      // Saténové klopy fraku.
      ['f', '#1a1714', 'M100,210 L116,248 L110,284 L90,284 C90,250 94,226 100,210 Z', 0],
      ['f', '#1a1714', 'M150,210 L134,248 L140,284 L160,284 C160,250 156,226 150,210 Z', 0],
    ],
    extra: [
      // Lesk na pomádě a tužka za uchem.
      ['s', '#fffaf0', 'M110,126 C116,120 126,118 136,120', 1.6],
      ['f', '#f2c24a', place(PENCIL, 93, 146, 1, -24), 1.2],
      ['f', '#1a1714', place('M-1.2,10 L1.2,10 L0,14 Z', 93, 146, 1, -24), 0],
      // Utěrka přes rameno.
      ['f', '#fffaf0', 'M80,222 C86,216 94,212 103,211 L101,256 L84,258 C84,246 83,234 80,222 Z', 1.6],
      ['s', '#d7442c', 'M85,246 L101,245 M85,250 L101,249', 1.6],
      ['l', 'M92,216 C91,228 92,240 91,256 M86,258 l-1,5 M90,258 l-1,5 M94,257 l-1,5 M98,257 l-1,5', 1],
      // Kasírka za pasem.
      ['f', '#5a3418', 'M130,240 L164,236 L166,262 L132,264 Z', 1.6],
      ['l', 'M131,248 L165,244', 1.1],
      ['f', '#e9b030', c(148, 247, 2.6), 1],
      // Zdvižená ruka s tácem a třemi pivy.
      ['f', '#22365c', 'M166,238 C176,214 184,186 188,156 L204,156 C202,190 194,220 184,246 Z', 2],
      ['f', '#fffaf0', 'M187,158 L205,158 L205,150 L188,150 Z', 1.4],
      ['f', SKIN, c(196, 144, 9, 8), 1.6],
      ['f', '#9a958a', c(190, 134, 36, 7), 1.8],
      ...mug(166, 130, 0.85),
      ...mug(190, 130, 0.85),
      ...mug(214, 130, 0.85),
    ],
  }),
];

// ─────────────────────────── Stará garda ───────────────────────────

// Veterán u štamgastského stolu: tři medaile a tři krokve (úroveň 3), nárameníky, šavle na zdi a fotka z mládí.
const oldGuard: Partial<FigureSpec> = {
  bg: '#bcd6e6',
  motif: 'none',
  body: '#2f6b3a',
  hatColor: '#2f6b3a',
  hairColor: '#d9d2c2',
  beardColor: '#fffaf0',
  mood: 'smile',
  prop: undefined,
  backdrop: [
    // Obložení hospody.
    ['f', '#8c5632', rect(16, 170, 218, 114), 1.4],
    ['f', '#5a3418', rect(16, 166, 218, 6), 1.2],
    // Zažloutlá fotka staré party.
    ['l', 'M30,74 L56,60 L82,74', 1],
    ['f', '#1a1714', c(56, 60, 1.8), 0],
    ['f', '#c08a1e', rect(24, 72, 64, 52), 1.6],
    ['f', '#f6e3a1', rect(30, 78, 52, 40), 1],
    [
      'f',
      '#c99a62',
      'M32,118 C32,106 46,106 46,118 Z M49,118 C49,106 63,106 63,118 Z M66,118 C66,106 80,106 80,118 Z',
      1,
    ],
    ['f', '#c99a62', `${c(39, 99, 5)} ${c(56, 98, 5)} ${c(73, 99, 5)}`, 1],
    ['f', '#8c5632', `${rect(34, 90, 10, 4)} ${rect(51, 89, 10, 4)} ${rect(68, 90, 10, 4)}`, 0.8],
    // Za rám zastrčená stará dvojka.
    ['f', '#fffaf0', place('M-6,-8 L6,-8 L6,8 L-6,8 Z', 86, 120, 1, 14), 1.1],
    ['f', '#d7442c', `${place(HEART, 86.6, 116, 0.13)} ${place(HEART, 85.4, 124, 0.13)}`, 0],
    // Zkřížené šavle.
    ['f', '#fffaf0', 'M172,128 C190,110 208,90 228,62 C226,74 212,94 177,133 Z', 1.4],
    ['f', '#fffaf0', 'M220,128 C202,110 184,90 164,62 C166,74 180,94 215,133 Z', 1.4],
    ['f', '#e9b030', `${c(174, 130, 5)} ${c(218, 130, 5)}`, 1.3],
    ['s', '#5a3418', 'M172,134 L166,142 M220,134 L226,142', 3.4],
  ],
  outfit: [
    // Nárameníky se třásněmi.
    ['f', '#e9b030', 'M62,226 C72,214 90,211 102,213 L101,222 C90,222 78,226 70,234 Z', 1.4],
    ['f', '#e9b030', 'M188,226 C178,214 160,211 148,213 L149,222 C160,222 172,226 180,234 Z', 1.4],
    ['l', 'M70,234 l-2,6 M76,229 l-2,6 M82,226 l-1,6 M180,234 l2,6 M174,229 l2,6 M168,226 l1,6', 1.1],
    // Tři medaile.
    ['f', '#d7442c', `${rect(80, 232, 9, 12)} ${rect(104, 232, 9, 12)}`, 1],
    ['f', '#2f5fa8', rect(92, 232, 9, 12), 1],
    ['f', '#fffaf0', `${rect(83, 232, 3, 12)} ${rect(95, 232, 3, 12)} ${rect(107, 232, 3, 12)}`, 0],
    ['f', '#e9b030', `${c(84.5, 250, 5)} ${c(108.5, 250, 5)}`, 1.2],
    ['f', '#d9d2c2', c(96.5, 250, 5), 1.2],
    // Tři krokve na rukávu.
    ['s', '#e9b030', 'M56,238 L65,245 L74,238 M55,245 L64,252 L73,245 M54,252 L63,259 L72,252', 2.6],
  ],
  extra: [
    // Půllitr v ruce.
    ...mug(186, 248, 1.25),
    ...hand(184, 250),
  ],
};

// ─────────────────────────── Kořenářka ───────────────────────────

// Bylinky za úplňku u smrků: košík s vykopaným kořenem a zvadlou kytkou, kytice heřmánku a mobil s receptem.
const herbalist: Partial<FigureSpec> = {
  bg: '#3b4f78',
  motif: 'none',
  body: '#b8302a',
  collar: 'apron',
  hatColor: '#5d9a3e',
  mood: 'smile',
  prop: undefined,
  backdrop: [
    // Úplněk a hvězdy.
    ['f', '#f6e3a1', c(196, 64, 24), 1.6],
    ['f', '#f2cf4a', `${c(188, 56, 5)} ${c(204, 72, 4)} ${c(202, 54, 2.5)}`, 0],
    [
      'f',
      '#fffaf0',
      `${place(STAR4, 110, 40, 0.45)} ${place(STAR4, 148, 30, 0.35)} ${place(STAR4, 96, 74, 0.3)} ${place(STAR4, 226, 118, 0.35)} ${place(STAR4, 160, 70, 0.3)}`,
      0,
    ],
    // Okraj smrkového lesa a louka.
    ['f', '#24543a', `${spruce(56, 204, 44, 108)} ${spruce(222, 200, 42, 96)}`, 1.3],
    [
      'f',
      '#2f6b3a',
      `${spruce(28, 208, 36, 84)} ${spruce(86, 206, 30, 70)} ${spruce(194, 204, 30, 66)}`,
      1.3,
    ],
    ['f', '#5d9a3e', 'M16,198 C70,184 170,192 234,182 L234,284 L16,284 Z', 1.4],
    [
      'f',
      '#fffaf0',
      `${c(176, 206, 3)} ${c(210, 196, 3)} ${c(222, 214, 3)} ${c(196, 222, 3)} ${c(30, 210, 3)}`,
      0.8,
    ],
    [
      'f',
      '#f2cf4a',
      `${c(176, 206, 1.2)} ${c(210, 196, 1.2)} ${c(222, 214, 1.2)} ${c(196, 222, 1.2)} ${c(30, 210, 1.2)}`,
      0,
    ],
  ],
  outfit: [
    // Mobil s receptem z internetu v kapse zástěry.
    ['f', '#1a1714', place('M-7,-13 L7,-13 L7,13 L-7,13 Z', 142, 231, 1, 8), 0],
    ['f', '#9fd0c4', place('M-5,-10 L5,-10 L5,8 L-5,8 Z', 142, 231, 1, 8), 0.8],
    ['f', '#5d9a3e', place('M0,-7 C5,-4 5,1 0,3 C-5,1 -5,-4 0,-7 Z', 142, 229, 1, 8), 0.8],
    ['l', 'M134,215 l-4,-4 M144,213 l0,-6 M153,217 l4,-4', 1],
    ['f', 'cloud', rect(128, 244, 28, 18), 1.3],
  ],
  extra: [
    // Kytice v ruce: heřmánek a levandule, převázaná mašlí.
    ['l', 'M190,244 L174,200 M190,244 L188,190 M190,244 L204,197 M190,244 L218,206 M190,244 L164,210', 1.4],
    [
      'f',
      '#5d9a3e',
      [
        [182, 226, -30],
        [198, 222, 35],
        [176, 214, -40],
        [208, 214, 50],
        [190, 212, 0],
      ]
        .map(([x, y, a]) => place('M0,-7 C4,-3 4,3 0,6 C-4,3 -4,-3 0,-7 Z', x!, y!, 1, a!))
        .join(' '),
      1,
    ],
    [
      'f',
      '#6b4a9e',
      `${c(218, 203, 3, 4)} ${c(220, 196, 2.6, 3.6)} ${c(221, 190, 2.2, 3)} ${c(164, 207, 3, 4)} ${c(162, 200, 2.6, 3.6)} ${c(161, 194, 2.2, 3)}`,
      1,
    ],
    [
      'f',
      '#fffaf0',
      [
        [174, 200],
        [188, 189],
        [204, 197],
      ]
        .flatMap(([x, y]) =>
          Array.from({ length: 8 }, (_, k) =>
            place('M0,0 C-3,-3 -3,-8 0,-9 C3,-8 3,-3 0,0 Z', x!, y!, 1, k * 45),
          ),
        )
        .join(' '),
      0.8,
    ],
    ['f', '#f2cf4a', `${c(174, 200, 3)} ${c(188, 189, 3)} ${c(204, 197, 3)}`, 0.9],
    ['s', '#d7442c', 'M183,238 L197,238', 3],
    ...hand(190, 248),
    // Uzel šátku pod bradou.
    ['f', '#5d9a3e', c(125, 192, 6.5, 5), 1.6],
    ['f', 'cloud', c(123, 191, 1.6), 0],
    // Košík: vykopaný kořen s lístky a obličejem (kořenářka), heřmánek a jedna zvadlá kytka.
    ['l', 'M31,228 C26,212 24,198 30,192 C35,188 40,192 39,198 M76,228 C76,216 77,208 79,201', 1.4],
    [
      'f',
      '#5d9a3e',
      `${place('M0,-9 C5,-4 5,4 0,8 C-5,4 -5,-4 0,-9 Z', 55, 183)} ${place('M0,-9 C5,-4 5,4 0,8 C-5,4 -5,-4 0,-9 Z', 48, 186, 1, -38)} ${place('M0,-9 C5,-4 5,4 0,8 C-5,4 -5,-4 0,-9 Z', 62, 186, 1, 38)}`,
      1.1,
    ],
    ['f', '#e8cf9a', 'M45,229 C42,212 46,195 55,193 C64,195 68,212 65,229 Z', 1.6],
    ['l', 'M46,211 C41,208 40,202 41,198 M64,211 C69,208 70,202 69,198', 1.2],
    ['f', 'dark', `${c(51, 204, 1.7)} ${c(59, 204, 1.7)} ${c(55, 211, 2, 2.4)}`, 0],
    ['f', '#5d9a3e', `${c(32, 227, 9, 6)} ${c(76, 226, 9, 6)}`, 1.2],
    [
      'f',
      '#fffaf0',
      Array.from({ length: 8 }, (_, k) =>
        place('M0,0 C-2.6,-2.6 -2.6,-7 0,-7.8 C2.6,-7 2.6,-2.6 0,0 Z', 79, 199, 1, k * 45),
      ).join(' '),
      0.8,
    ],
    ['f', '#f2cf4a', c(79, 199, 2.6), 0.8],
    // Zvadlá: hlavička i plátky visí dolů, jeden plátek už upadl.
    [
      'f',
      '#c99a62',
      `${[140, 162, 184, 206, 228]
        .map((a) => place('M0,0 C-3.2,-3.2 -3.2,-10 0,-11 C3.2,-10 3.2,-3.2 0,0 Z', 39, 201, 1, a))
        .join(' ')} ${place('M0,0 C-2.6,-2.6 -2.6,-8 0,-9 C2.6,-8 2.6,-2.6 0,0 Z', 24, 222, 1, 120)}`,
      0.9,
    ],
    ['f', '#8c5632', c(39, 201, 3.6), 1],
    ['f', '#c99a62', 'M20,228 L92,228 L84,276 L28,276 Z', 1.8],
    ['l', 'M22,240 L90,240 M24,252 L88,252 M38,228 L40,276 M56,228 L56,276 M74,228 L72,276', 0.9],
  ],
};

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {
  recount_committee: recountCommittee,
  crown_goldsmith: crownGoldsmith,
  beggar,
  old_guard: oldGuard,
  herbalist,
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  'j-building_savings': BUILDING_SAVINGS,
  rychlik: RYCHLIK,
  vrchni: VRCHNI,
};

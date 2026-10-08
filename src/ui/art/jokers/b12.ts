/**
 * Obrázky žolíků — dávka 12 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - forefather — Praotec Čech: scéna `cech` (SCENES['cech'])
 *  - libuse — Kněžna Libuše: scéna `libuse` (SCENES['libuse'])
 *  - blanik_knights — Blaničtí rytíři: scéna `blanik` (SCENES['blanik'])
 *  - bruncvik_sword — Bruncvíkův meč: scéna `bruncvik` (SCENES['bruncvik'])
 *  - faust — Doktor Faust: scéna `faust` (SCENES['faust'])
 *  - krakonos — Krakonoš: scéna `krakonos` (SCENES['krakonos'])
 *  - silly_honza — Hloupý Honza: scéna `honza` (SCENES['honza'])
 *  - astro_clock — Orloj: scéna `orloj` (SCENES['orloj'])
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
const INK = '#1a1714';
const BUST = 'M44,284 C48,240 70,218 100,210 L150,210 C180,218 202,240 206,284 Z';
const BUST_SHADOW: SceneOp = [
  'h',
  'M150,210 C180,218 202,240 206,284 L178,284 C176,252 168,228 150,210 Z',
  45,
];
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

/** Zvětší cestu k bodu cx,cy (absolutní i relativní příkazy, oblouky včetně poloměrů). */
function scalePath(d: string, cx: number, cy: number, k: number): string {
  let cmd = '';
  let idx = 0;
  return d.replace(/[a-zA-Z]|-?\d*\.?\d+/g, (tok) => {
    if (/[a-zA-Z]/.test(tok)) {
      cmd = tok;
      idx = 0;
      return tok;
    }
    const v = Number(tok);
    const i = idx++;
    const ax = (n: number): number => cx + (n - cx) * k;
    const ay = (n: number): number => cy + (n - cy) * k;
    if ('MLCQST'.includes(cmd)) return r1(i % 2 === 0 ? ax(v) : ay(v));
    if (cmd === 'H') return r1(ax(v));
    if (cmd === 'V') return r1(ay(v));
    if (cmd === 'A' || cmd === 'a') {
      const j = i % 7;
      if (j === 2 || j === 3 || j === 4) return tok;
      if (cmd === 'A' && j === 5) return r1(ax(v));
      if (cmd === 'A' && j === 6) return r1(ay(v));
      return r1(v * k);
    }
    return r1(v * k);
  });
}

/** Zvětší celé tahy scény k bodu cx,cy (tloušťky linek nechá). */
function scaleOps(ops: readonly SceneOp[], cx: number, cy: number, k: number): SceneOp[] {
  return ops.map((op): SceneOp => {
    switch (op[0]) {
      case 'f':
        return ['f', op[1], scalePath(op[2], cx, cy, k), op[3]];
      case 'l':
        return ['l', scalePath(op[1], cx, cy, k), op[2]];
      case 's':
        return ['s', op[1], scalePath(op[2], cx, cy, k), op[3]];
      case 'h':
        return ['h', scalePath(op[1], cx, cy, k), op[2]];
      default:
        return ['i', op[1], cx + (op[2] - cx) * k, cy + (op[3] - cy) * k, op[4] * k, op[5]];
    }
  });
}

/** Ruka svírající předmět (stejná jako u rekvizit figureKit). */
function hand(x: number, y: number, deg = 0): SceneOp[] {
  return [
    ['f', SKIN, c(x, y, 11, 9), 1.8],
    ['l', place('M-9,-3 L9,-3 M-9,3 L9,3', x, y, 1, deg), 1.1],
  ];
}

/** Paprsky slunce jako klíny (jedna cesta) od středu cx,cy do vzdálenosti r. */
function rays(cx: number, cy: number, n: number, r: number, width = 0.5): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const w = (Math.PI / n) * width;
    d +=
      `M${r1(cx)},${r1(cy)} L${r1(cx + Math.cos(a - w) * r)},${r1(cy + Math.sin(a - w) * r)} ` +
      `L${r1(cx + Math.cos(a + w) * r)},${r1(cy + Math.sin(a + w) * r)} Z `;
  }
  return d.trim();
}

/** Rysky po obvodu kruhu (tahy tuší). */
function ticks(cx: number, cy: number, ra: number, rb: number, n: number, from = 0): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = from + (Math.PI * 2 * i) / n;
    d +=
      `M${r1(cx + Math.cos(a) * ra)},${r1(cy + Math.sin(a) * ra)} ` +
      `L${r1(cx + Math.cos(a) * rb)},${r1(cy + Math.sin(a) * rb)} `;
  }
  return d.trim();
}

/** Hvězda s n cípy. */
function star(cx: number, cy: number, ra: number, rb: number, n = 5): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    const r = i % 2 === 0 ? ra : rb;
    d += `${i === 0 ? 'M' : 'L'}${r1(cx + Math.cos(a) * r)},${r1(cy + Math.sin(a) * r)} `;
  }
  return d + 'Z';
}

/** Malé kruhy (jedna cesta) — hlavy, nýty, tečky. */
const dots = (pts: readonly (readonly [number, number])[], r: number): string =>
  pts.map(([x, y]) => c(x, y, r)).join(' ');

// ─────────────────────────── Praotec Čech ───────────────────────────

/** Včelky: křidélka, žluté tělíčko s pruhy a dráha letu. */
function bees(pts: readonly (readonly [number, number])[]): SceneOp[] {
  return [
    [
      'f',
      '#fffaf0',
      pts.map(([x, y]) => `${c(x - 2, y - 4, 3, 2.4)} ${c(x + 3, y - 4.5, 3, 2.4)}`).join(' '),
      0.8,
    ],
    ['f', '#f2cf4a', pts.map(([x, y]) => c(x, y, 5, 3.4)).join(' '), 1],
    [
      'l',
      pts
        .map(
          ([x, y]) => `M${x - 1.5},${y - 3} L${x - 1.5},${y + 3} M${x + 1.8},${y - 3} L${x + 1.8},${y + 3}`,
        )
        .join(' '),
      1.2,
    ],
    ['l', pts.map(([x, y]) => `M${x - 6},${y + 4} c-3,3 1,5 -2,8`).join(' '), 0.7],
  ];
}

/** Pět snopů na poli, od nejmenšího po největší (Postupka). */
function sheaves(): SceneOp[] {
  const list = [
    [150, 186, 0.45],
    [160, 190, 0.6],
    [172, 195, 0.75],
    [186, 201, 0.9],
    [202, 208, 1.05],
  ] as const;
  const SHEAF = 'M-5,0 L-2,-8 L-7,-17 L-4,-16 L-2,-20 L0,-16 L2,-20 L4,-16 L7,-17 L2,-8 L5,0 Z';
  return [
    ['f', '#e9b030', list.map(([x, y, s]) => place(SHEAF, x, y, s)).join(' '), 1.1],
    ['l', list.map(([x, y, s]) => place('M-3,-8 L3,-8', x, y, s)).join(' '), 1.2],
  ];
}

// Praotec Čech: na úsvitu ukazuje na Říp s rotundou, krajem teče řeka mléka, včely u košnice, pět snopů jako Postupka.
const CECH: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  // Úsvit za Řípem.
  ['f', '#f6e3a1', rays(66, 100, 16, 260, 0.55), 0],
  ['f', '#f2cf4a', c(66, 100, 22), 1.6],
  // Kužely Středohoří na obzoru.
  ['f', '#6fa0c8', 'M96,178 L118,150 L132,162 L156,134 L176,156 L196,142 L214,160 L234,148 L234,178 Z', 1.4],
  // Lány polí v perspektivě.
  ['f', '#c6dcae', rect(16, 172, 218, 112), 1.4],
  ['f', '#f2cf4a', 'M128,172 L176,172 L234,214 L234,252 Z', 1.2],
  ['f', '#5d9a3e', 'M176,172 L234,172 L234,198 Z', 1.2],
  ['f', '#c99a62', 'M110,172 L128,172 L234,262 L234,284 L200,284 Z', 1.2],
  ['l', 'M136,176 L234,236 M150,178 L234,226', 0.8],
  // Říp — zalesněná homole s rotundou na temeni.
  ['f', '#5d9a3e', 'M4,196 C14,150 40,118 66,116 C92,118 118,150 128,196 Z', 1.8],
  [
    'f',
    '#2f6b3a',
    'M24,170 c2,-8 10,-8 12,0 c2,-7 10,-7 12,0 Z M84,150 c2,-7 9,-7 11,0 c2,-6 9,-6 11,0 Z M96,176 c2,-8 10,-8 12,0 Z M40,140 c2,-7 9,-7 11,0 Z',
    1,
  ],
  ['f', '#fffaf0', 'M56,118 L56,104 L76,104 L76,118 Z', 1.3],
  ['f', '#fffaf0', 'M76,118 L76,108 C84,108 86,118 86,118 Z', 1.2],
  ['f', '#b8302a', 'M54,105 C56,94 76,94 78,105 Z', 1.3],
  ['f', '#fffaf0', rect(63, 87, 6, 8), 1],
  ['f', '#b8302a', 'M62,88 L66,80 L70,88 Z', 1],
  ['l', 'M61,111 L61,116 M71,111 L71,116', 1.4],
  // Řeka mléka se klikatí od soutoku pod Řípem až k okraji.
  [
    'f',
    '#fffaf0',
    'M106,196 C96,200 86,202 74,206 C56,212 34,218 16,222 L16,246 C40,238 64,228 82,218 C94,210 102,204 112,198 Z',
    1.4,
  ],
  ['s', '#6fa0c8', 'M26,232 l10,-3 M48,226 l9,-3 M70,216 l6,-3 M90,208 l4,-2', 1.6],
  // Pět snopů od nejmenšího po největší — poctivá Postupka.
  ...sheaves(),
  // Košnice se včelami (strdí).
  ['f', '#8c5632', rect(12, 258, 52, 8), 1.4],
  ['f', '#e9b030', 'M16,258 C14,220 56,218 56,258 Z', 1.6],
  ['l', 'M17,249 h38 M19,240 h34 M24,231 h24', 1.1],
  ['f', INK, 'M30,258 C30,250 42,250 42,258 Z', 0],
  ...bees([
    [26, 212],
    [56, 204],
  ]),
  // Hůl poutníka.
  ['f', '#8c5632', 'M210,284 L216,104 L223,104 L218,284 Z', 1.8],
  ['f', '#8c5632', c(220, 98, 8, 7), 1.8],
  // Kožich, halena a sponka.
  ['f', '#8c5632', BUST, 2.4],
  ['f', '#d7442c', 'M104,224 L146,224 L142,284 L108,284 Z', 1.8],
  ['l', 'M110,250 L140,250 M111,262 L139,262', 1],
  BUST_SHADOW,
  ['f', '#c99a62', 'M84,216 C98,198 152,198 166,216 C158,232 92,232 84,216 Z', 2],
  ['l', 'M92,214 l4,8 M104,208 l3,9 M118,206 l2,9 M132,206 l-1,9 M146,208 l-3,9 M158,214 l-4,8', 1.2],
  ['f', '#e9b030', c(164, 230, 7), 1.6],
  ['f', '#c08a1e', c(164, 230, 3), 0.8],
  // Zvednutá paže ukazuje na Říp.
  ['f', '#8c5632', 'M88,228 C70,214 62,196 58,178 L72,172 C76,190 84,204 100,216 Z', 2],
  ['f', SKIN, 'M56,178 C52,170 58,162 66,164 C74,166 76,176 70,180 C64,184 58,184 56,178 Z', 1.6],
  ['f', SKIN, 'M58,168 L56,146 C56,141 62,140 63,145 L65,166 Z', 1.4],
  ['l', 'M60,174 C64,176 68,176 71,173', 1],
  // Hlava: pleš, bílé vousy po pás.
  ['f', SKIN, 'M98,146 C90,140 88,160 99,162 Z', 1.8],
  ['f', SKIN, 'M152,146 C160,140 162,160 151,162 Z', 1.8],
  ['f', SKIN, c(125, 148, 27, 32), 2.4],
  ['f', '#fffaf0', 'M110,124 C116,118 130,118 136,122 C128,122 118,124 112,128 Z', 0],
  ['f', '#d9d2c2', 'M98,152 C94,144 96,136 102,133 C102,141 104,147 106,153 Z', 1.2],
  ['f', '#d9d2c2', 'M152,152 C156,144 154,136 148,133 C148,141 146,147 144,153 Z', 1.2],
  ['f', 'blush', c(108, 160, 6), 0],
  ['f', 'blush', c(142, 160, 6), 0],
  [
    'f',
    '#fffaf0',
    'M100,166 C94,196 104,226 125,244 C146,226 156,196 150,166 C138,178 112,178 100,166 Z',
    2.2,
  ],
  ['l', 'M114,190 C116,206 119,218 122,230 M136,190 C134,206 131,218 128,230 M125,186 L125,236', 1.1],
  [
    'f',
    '#fffaf0',
    'M101,170 C107,159 120,159 125,166 C130,159 143,159 149,170 C144,178 134,177 125,172 C116,177 106,178 101,170 Z',
    2,
  ],
  ['f', '#e8806a', 'M125,144 C118,155 117,162 123,164 C130,166 134,160 131,154 Z', 1.8],
  ['f', '#fffaf0', 'M103,138 C108,131 118,131 122,136 C116,136 108,137 103,141 Z', 1.4],
  ['f', '#fffaf0', 'M147,138 C142,131 132,131 128,136 C134,136 142,137 147,141 Z', 1.4],
  ['f', 'dark', c(114, 147, 2.6), 0],
  ['f', 'dark', c(136, 147, 2.6), 0],
  // Ruka na holi.
  ...hand(217, 202),
];

// ─────────────────────────── Kněžna Libuše ───────────────────────────

/** Lipový lístek (srdčitý se špičkou dolů), místní souřadnice kolem 0,0. */
const LINDEN = 'M0,-5 C3,-9 9,-6 7,0 C6,3 3,5 0,9 C-3,5 -6,3 -7,0 C-9,-6 -3,-9 0,-5 Z';

/** Lipový věneček kolem temene: lístky střídavě s kvítky. */
function wreath(): SceneOp[] {
  const pts: (readonly [number, number, number])[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (Math.PI * i) / 8;
    pts.push([125 + Math.cos(a) * 29, 132 + Math.sin(a) * 24, (a * 180) / Math.PI + 90]);
  }
  const leaves = pts.map(([x, y, deg]) => place(LINDEN, x, y, 1, deg)).join(' ');
  const flowers = [pts[1]!, pts[3]!, pts[5]!, pts[7]!];
  return [
    ['f', '#5d9a3e', leaves, 1.1],
    ['f', '#fffaf0', flowers.map(([x, y]) => c(x, y - 3, 3.2)).join(' '), 0.9],
    ['f', '#f2cf4a', flowers.map(([x, y]) => c(x, y - 3, 1.3)).join(' '), 0],
  ];
}

/** Silueta města z vidění: hradby, věže a katedrála se dvěma věžemi, jejichž špičky se dotýkají hvězd. */
const CITY =
  'M130,98 L130,84 L136,84 L136,70 L134,70 L140,58 L146,70 L144,70 L144,84 L152,84 L152,76 L150,76 L156,66 ' +
  'L162,76 L160,76 L160,84 L166,84 L166,64 L170,64 L170,48 L168,48 L173,34 L178,48 L176,48 L176,64 L184,64 ' +
  'L184,48 L182,48 L187,34 L192,48 L190,48 L190,64 L196,64 L196,84 L202,84 L202,70 L200,70 L206,58 L212,70 ' +
  'L210,70 L210,84 L218,84 L218,76 L216,76 L222,66 L228,76 L226,76 L226,98 Z';

// Kněžna Libuše: v transu zvedá dlaň k vidění zlatého města, jehož věže se dotýkají hvězd; Vyšehrad, věneček, dáma.
const LIBUSE: SceneOp[] = [
  ['f', '#22365c', rect(16, 16, 218, 268), 0],
  // Hvězdy.
  [
    'f',
    '#f2cf4a',
    `${star(30, 92, 5, 2)} ${star(96, 76, 4, 1.6)} ${star(48, 148, 4, 1.6)} ${star(118, 58, 3, 1.2)}`,
    0.9,
  ],
  [
    'f',
    '#f2cf4a',
    dots(
      [
        [72, 108],
        [30, 124],
        [100, 96],
        [62, 64],
      ],
      1.4,
    ),
    0,
  ],
  // Vidění: záře, zlaté město nad oblakem, hvězdy na špičkách věží (o kus níž, ať hvězdy nelepí na rám).
  ...moveOps(
    [
      ['f', '#2f5fa8', rays(178, 80, 18, 90, 0.5), 0],
      ['f', '#6fa0c8', c(178, 78, 50, 42), 0],
      ['f', '#f6e3a1', c(178, 80, 38, 32), 0],
      ['f', '#e9b030', CITY, 1.4],
      ['l', 'M138,92 v-4 M156,92 v-4 M172,58 v-4 M186,58 v-4 M206,92 v-4 M221,92 v-4', 1.6],
      ['f', '#fffaf0', `${star(173, 27, 6, 2.6)} ${star(187, 27, 6, 2.6)}`, 1.1],
      [
        'f',
        '#fffaf0',
        'M124,104 C120,94 132,88 140,94 C144,84 160,84 164,92 C170,84 188,84 192,94 C200,86 216,88 218,96 C228,94 234,102 230,108 L128,110 C122,110 120,106 124,104 Z',
        1.4,
      ],
    ],
    0,
    5,
  ),
  // Vyšehradská skála s hradbou nad Vltavou.
  ['f', '#9a958a', 'M16,266 L16,186 L28,182 L44,188 C54,196 58,214 62,232 L66,266 Z', 1.6],
  ['l', 'M22,206 l8,10 M38,224 l-6,12 M50,204 l4,8', 1.1],
  [
    'f',
    '#d9d2c2',
    'M16,186 L16,170 L20,170 L20,166 L26,166 L26,170 L32,170 L32,166 L38,166 L38,170 L44,170 L44,188 L28,182 Z',
    1.3,
  ],
  ['f', INK, 'M27,182 L27,176 C27,172 33,172 33,176 L33,183 Z', 0],
  ['f', '#6fa0c8', 'M16,248 C30,244 44,250 60,246 L62,266 L16,266 Z', 1.2],
  ['s', '#fffaf0', 'M22,256 l10,0 M40,252 l8,0', 1.4],
  // Copy za zády.
  ['f', '#f2cf4a', 'M100,150 C94,184 96,206 98,216 L152,216 C154,206 156,184 150,150 Z', 1.4],
  // Roucho, výšivka u výstřihu, korále.
  ['f', '#fffaf0', BUST, 2.4],
  ['s', '#d7442c', 'M98,214 C110,240 140,240 152,214', 7],
  ['l', 'M101,219 l4,5 l3,-4 l4,5 l3,-4 l4,5 l3,-4 l4,5 l3,-4 l4,5 l3,-4 l4,5 l3,-4 l3,4', 0.9],
  ['s', '#d7442c', 'M70,284 L80,246 M180,284 L170,246', 5],
  BUST_SHADOW,
  [
    'f',
    '#e9b030',
    dots(
      [
        [112, 236],
        [118, 241],
        [125, 243],
        [132, 241],
        [138, 236],
      ],
      2.6,
    ),
    0.9,
  ],
  // Zvednutá paže v širokém rukávu.
  ['f', '#fffaf0', 'M150,236 C162,206 172,176 180,140 L198,142 C198,180 192,212 178,246 Z', 2],
  ['s', '#d7442c', 'M181,150 L198,152', 4],
  ['f', SKIN, 'M178,138 L176,130 C174,126 179,123 181,127 L183,134 Z', 1.2],
  ['f', SKIN, 'M181,144 C180,134 181,122 183,114 C184,109 199,109 199,114 C200,124 200,134 198,144 Z', 1.5],
  ['l', 'M187,111 L187,124 M191,110 L191,124 M195,111 L195,124', 1],
  // Krk, obličej se zavřenýma očima.
  ['f', SKIN, 'M113,172 L113,212 C118,218 132,218 137,212 L137,172 Z', 2],
  ...moveOps(
    [
      ['f', SKIN, c(125, 152, 24, 28), 2.4],
      [
        'f',
        '#f2cf4a',
        'M100,150 C96,122 110,110 125,110 C140,110 154,122 150,150 C144,134 134,130 125,130 C116,130 106,134 100,150 Z',
        1.8,
      ],
      ['l', 'M110,152 C113,155 118,155 121,152 M129,152 C132,155 137,155 140,152', 1.6],
      ['l', 'M110,149 l-3,-2 M140,149 l3,-2', 1.1],
      ['f', 'blush', c(110, 164, 5), 0],
      ['f', 'blush', c(140, 164, 5), 0],
      ['l', 'M125,154 C123,162 124,164 127,164', 1.3],
      ['f', '#d7442c', 'M119,172 C122,170 128,170 131,172 C128,176 122,176 119,172 Z', 1],
      // Dlouhé copy s červenými stužkami.
      [
        'f',
        '#f2cf4a',
        'M100,148 C92,180 92,222 96,254 C100,260 107,258 107,252 C106,222 106,186 110,158 Z',
        1.8,
      ],
      [
        'f',
        '#f2cf4a',
        'M150,148 C158,180 158,222 154,254 C150,260 143,258 143,252 C144,222 144,186 140,158 Z',
        1.8,
      ],
      [
        'l',
        'M97,180 l9,4 M96,196 l10,4 M96,212 l10,4 M97,228 l9,4 M153,180 l-9,4 M154,196 l-10,4 M154,212 l-10,4 M153,228 l-9,4',
        1,
      ],
      [
        'f',
        '#d7442c',
        'M95,250 L108,250 L110,262 L102,258 L93,262 Z M142,250 L155,250 L157,262 L149,258 L140,262 Z',
        1.1,
      ],
      ...wreath(),
    ],
    0,
    5,
  ),
  // Dáma v ruce — vidí, že z toho bude dáma.
  ['f', '#fffaf0', place('M-13,-18 L13,-18 L13,18 L-13,18 Z', 74, 238, 1, -12), 1.6],
  ['f', '#e9b030', place('M-8,4 L-8,-6 L-4,-1 L0,-9 L4,-1 L8,-6 L8,4 Z', 74, 236, 1, -12), 1.1],
  ['f', '#d7442c', place('M-8,6 L8,6 L8,10 L-8,10 Z', 74, 236, 1, -12), 0.9],
  ...hand(84, 254, -12),
];

// ─────────────────────────── Blaničtí rytíři ───────────────────────────

/** Řady kroužků kroužkové košile (obloučky). */
function mail(x0: number, y0: number, x1: number, y1: number, step = 8): string {
  let d = '';
  for (let y = y0, row = 0; y < y1; y += step, row++)
    for (let x = x0 + (row % 2) * (step / 2); x < x1; x += step)
      d += `M${r1(x)},${r1(y)} c${r1(step * 0.2)},${r1(step * 0.4)} ${r1(step * 0.8)},${r1(step * 0.4)} ${r1(step)},0 `;
  return d.trim();
}

/** Spící rytíř v pozadí (helmice s chocholem, kroužková kápě), otočený o deg kolem x,y. */
function sleeper(x: number, y: number, deg: number): SceneOp[] {
  const p = (d: string): string => place(d, x, y, 0.62, deg);
  return [
    ['f', '#9a958a', p('M-46,90 C-40,62 -26,50 -12,46 L12,46 C26,50 40,62 46,90 Z'), 1.6],
    ['f', '#d9d2c2', p('M-26,0 C-26,-30 26,-30 26,0 L26,40 C16,52 -16,52 -26,40 Z'), 1.6],
    ['f', SKIN, p('M-16,6 C-16,-8 16,-8 16,6 L16,22 C10,34 -10,34 -16,22 Z'), 1.4],
    ['l', p('M-11,8 C-8,11 -4,11 -2,8 M2,8 C4,11 8,11 11,8'), 1.2],
    ['f', '#8c5632', p('M-12,20 C-6,14 6,14 12,20 C6,22 -6,22 -12,20 Z'), 1],
    ['f', '#9a958a', p('M-28,-2 C-26,-30 -12,-44 0,-46 C12,-44 26,-30 28,-2 Z'), 1.6],
    ['f', '#d7442c', p('M0,-46 C-6,-62 2,-76 14,-80 C10,-66 14,-56 6,-44 Z'), 1.2],
  ];
}

/** Budík na skalce — zazvoní, „až bude nejhůř“. */
function alarmClock(x: number, y: number): SceneOp[] {
  return [
    ['l', `M${x - 8},${y + 10} l-4,7 M${x + 8},${y + 10} l4,7`, 1.8],
    ['f', '#d7442c', `${c(x - 9, y - 12, 5)} ${c(x + 9, y - 12, 5)}`, 1.3],
    ['f', '#d7442c', c(x, y, 14), 1.8],
    ['f', '#fffaf0', c(x, y, 10), 1.2],
    ['l', `${ticks(x, y, 7.5, 9.5, 12)} M${x},${y} L${x},${y - 7} M${x},${y} L${x + 5},${y + 2}`, 0.9],
    ['f', '#e9b030', c(x, y - 16, 2.4), 1],
  ];
}

// Blaničtí rytíři: řez horou s rozhlednou, v jeskyni chrápou rytíři; pavučina, krápníky, budík „až bude nejhůř“.
const BLANIK: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  [
    'f',
    '#fffaf0',
    'M196,40 C194,32 204,28 210,33 C214,26 228,28 228,36 C234,36 236,44 230,46 L200,46 C194,46 192,42 196,40 Z',
    1.2,
  ],
  // Rozhledna na temeni.
  ['f', '#c99a62', 'M150,62 L154,32 L166,32 L170,62 Z', 1.4],
  ['l', 'M152,52 h16 M153,42 h14 M156,32 L164,62 M164,32 L156,62', 0.8],
  ['f', '#b8302a', 'M150,34 L160,20 L170,34 Z', 1.3],
  // Hora a les na hřebeni.
  [
    'f',
    '#5d9a3e',
    'M16,96 C40,76 70,64 100,62 C126,60 146,58 170,60 C200,64 220,80 234,92 L234,266 L16,266 Z',
    1.8,
  ],
  [
    'f',
    '#2f6b3a',
    'M24,92 l7,-16 l7,16 Z M40,84 l7,-17 l7,17 Z M58,76 l7,-17 l7,17 Z M80,70 l7,-17 l7,17 Z M104,66 l7,-16 l7,16 Z M124,64 l6,-14 l6,14 Z M178,66 l7,-16 l7,16 Z M196,72 l7,-17 l7,17 Z M214,82 l7,-16 l7,16 Z',
    1.1,
  ],
  // Řez horou: hlína a jeskyně.
  ['f', '#8c5632', 'M20,266 L20,128 C20,74 230,74 230,128 L230,266 Z', 1.6],
  ['f', '#5b5850', 'M28,266 L28,132 C28,84 222,84 222,132 L222,266 Z', 1.8],
  // Krápníky.
  [
    'f',
    '#9a958a',
    'M70,99 l5,16 l5,-18 Z M98,92 l5,16 l5,-17 Z M150,93 l4,14 l4,-14 Z M206,112 l3,12 l4,-10 Z',
    1,
  ],
  // Pavučina v rohu.
  [
    'l',
    'M30,108 L64,98 M30,108 L54,130 M30,108 L60,114 M40,105 C44,110 46,116 40,121 M50,102 C54,110 56,118 48,126',
    0.8,
  ],
  // Další dva spáči v pozadí.
  ...sleeper(64, 168, -18),
  ...sleeper(188, 166, 16),
  // Svíčka na skalce vlevo a budík.
  ['f', '#9a958a', 'M28,266 L28,240 C40,232 58,234 66,244 L70,266 Z', 1.4],
  ['f', '#fffaf0', rect(36, 214, 8, 22), 1.2],
  ['f', '#ef8a2e', 'M40,213 C35,206 38,198 40,194 C42,198 45,206 40,213 Z', 1.1],
  ['f', '#fffaf0', 'M43,216 c3,0 3,6 1,8', 0.8],
  ...alarmClock(56, 226),
  // Štít s kalichem opřený vpravo.
  ['f', '#d7442c', 'M186,214 L222,214 L222,236 C222,252 210,262 204,266 C198,262 186,252 186,236 Z', 1.8],
  [
    'f',
    '#e9b030',
    'M195,222 L213,222 C213,234 208,238 205,238 L205,246 L210,250 L198,250 L203,246 L203,238 C200,238 195,234 195,222 Z',
    1.1,
  ],
  // Hlavní rytíř: kroužková košile, suknice, meč pod rukama.
  ['f', '#9a958a', BUST, 2.4],
  ['l', mail(54, 226, 200, 268, 9), 0.9],
  ['f', '#d7442c', 'M100,222 L150,222 L146,284 L104,284 Z', 1.8],
  BUST_SHADOW,
  ['f', '#e9b030', rect(100, 238, 50, 8), 1.6],
  ['f', '#d9d2c2', 'M121,246 L129,246 L128,284 L122,284 Z', 1.4],
  ['f', '#8c5632', rect(121, 220, 8, 18), 1.3],
  ['f', '#e9b030', c(125, 216, 6), 1.4],
  ['f', '#9a958a', `${c(107, 236, 10, 9)} ${c(143, 236, 10, 9)}`, 1.8],
  ['l', 'M100,234 l14,0 M136,234 l14,0', 1],
  // Kroužková kápě, obličej se zavřenýma očima a knírem, chrápe.
  ['f', '#d9d2c2', 'M93,150 C93,118 157,118 157,150 L157,198 C142,214 108,214 93,198 Z', 2.2],
  ['l', mail(97, 182, 154, 206, 7), 0.8],
  ['f', SKIN, 'M104,152 C104,132 146,132 146,152 L146,178 C140,194 110,194 104,178 Z', 2],
  ['f', 'blush', `${c(111, 170, 5)} ${c(139, 170, 5)}`, 0],
  ['l', 'M108,158 C111,162 117,162 120,158 M130,158 C133,162 139,162 142,158', 1.6],
  [
    'f',
    '#8c5632',
    'M104,176 C110,166 120,166 125,172 C130,166 140,166 146,176 C138,180 130,178 125,175 C120,178 112,180 104,176 Z',
    1.4,
  ],
  ['f', INK, c(125, 184, 4, 3.4), 0],
  // Helmice s nánosníkem a chocholem.
  ['f', '#d7442c', 'M126,98 C120,78 130,62 146,58 C140,74 144,86 134,100 Z', 1.6],
  ['f', '#9a958a', 'M94,146 C96,118 110,100 125,96 C140,100 154,118 156,146 Z', 2.2],
  ['h', 'M138,101 C148,110 154,126 155,146 L147,146 C146,128 143,112 138,101 Z', -45],
  ['f', '#e9b030', 'M92,142 L158,142 L158,150 L92,150 Z', 1.6],
  ['f', '#9a958a', 'M121,150 L129,150 L128,168 C126,170 124,170 122,168 Z', 1.4],
  [
    'f',
    '#e9b030',
    dots(
      [
        [100, 146],
        [112, 146],
        [138, 146],
        [150, 146],
      ],
      1.4,
    ),
    0,
  ],
  // Zzz stoupá k hlíně.
  ['l', 'M159,128 h8 l-8,8 h8 M171,108 h11 l-11,11 h11 M188,88 h13 l-13,13 h13', 4.4],
  ['s', '#fffaf0', 'M159,128 h8 l-8,8 h8 M171,108 h11 l-11,11 h11 M188,88 h13 l-13,13 h13', 2],
];

// ─────────────────────────── Bruncvíkův meč ───────────────────────────

/** Kříže (♣) jako jedna cesta — kreslit bez obrysu nebo s tenkým. */
function club(x: number, y: number, s: number): string {
  return [
    c(x, y - 8 * s, 7 * s),
    c(x - 8 * s, y + 3 * s, 7 * s),
    c(x + 8 * s, y + 3 * s, 7 * s),
    place('M-1.6,2 L-4.5,15 L4.5,15 L1.6,2 Z', x, y, s),
  ].join(' ');
}

/** Čtyřcípá jiskra. */
const spark = (x: number, y: number, s: number): string =>
  place('M0,-10 Q1.5,-1.5 10,0 Q1.5,1.5 0,10 Q-1.5,1.5 -10,0 Q-1.5,-1.5 0,-10 Z', x, y, s);

/** Meč v místních souřadnicích: záštita v 0,0, čepel dolů (+y). */
const SWORD = {
  blade: 'M-7,0 L7,0 L6,112 L0,128 L-6,112 Z',
  fuller: 'M0,6 L0,104',
  guard: 'M-26,-7 C-30,-7 -32,-1 -28,1 L28,1 C32,-1 30,-7 26,-7 Z',
  grip: 'M-4.5,-34 L4.5,-34 L4.5,-7 L-4.5,-7 Z',
  wrap: 'M-4.5,-28 L4.5,-24 M-4.5,-20 L4.5,-16 M-4.5,-12 L4.5,-8',
} as const;
const SW = { x: 180, y: 92, deg: 41, s: 1.2 } as const;
const sw = (d: string): string => place(d, SW.x, SW.y, SW.s, SW.deg);
/** Bod v místních souřadnicích meče → souřadnice karty. */
function swPt(x: number, y: number): readonly [number, number] {
  const a = (SW.deg * Math.PI) / 180;
  return [
    SW.x + (x * Math.cos(a) - y * Math.sin(a)) * SW.s,
    SW.y + (x * Math.sin(a) + y * Math.cos(a)) * SW.s,
  ];
}
const POMMEL = swPt(0, -40);

/** Rozseknutá dvojka křížů: obě poloviny odletují od čepele na obě strany. */
function cutCard(): SceneOp[] {
  const [cx, cy] = swPt(0, 52);
  const k = 0.88;
  const half = (d: string, dx: number, dy: number, deg: number): string => place(d, cx + dx, cy + dy, k, deg);
  const pip = (x: number, y: number, dx: number, dy: number, deg: number): readonly [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [
      cx + dx + (x * Math.cos(a) - y * Math.sin(a)) * k,
      cy + dy + (x * Math.sin(a) + y * Math.cos(a)) * k,
    ];
  };
  const A = 'M-21,-29 L21,-29 L21,-17 L-21,17 Z';
  const B = 'M21,-17 L21,29 L-21,29 L-21,17 Z';
  const [ax, ay] = pip(-9, -14, -13, -11, -14);
  const [bx, by] = pip(11, 7, 13, 11, -2);
  return [
    ['f', '#fffaf0', half(A, -13, -11, -14), 1.8],
    ['f', '#fffaf0', half(B, 13, 11, -2), 1.8],
    ['f', INK, `${club(ax, ay, 0.46)} ${club(bx, by, 0.46)}`, 0],
  ];
}

// Bruncvíkův meč: meč seká sám a přetíná nejnižší kartu; korunovaný lev s dvojitým ocasem, Karlův most a Bruncvík.
const BRUNCVIK: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  [
    'f',
    '#fffaf0',
    'M30,72 C28,62 40,58 46,63 C50,54 66,54 68,64 C78,62 82,74 74,78 L36,79 C28,79 26,75 30,72 Z',
    1.3,
  ],
  // Hradčany v dálce (katedrála vpravo od záštity, ať ji meč nezakryje).
  ...moveOps(
    [
      [
        'f',
        '#7fa6cc',
        'M112,170 L112,150 L126,146 L126,138 L150,138 L150,132 L176,132 L176,118 L180,104 L184,118 L184,124 L192,124 L192,110 L196,96 L200,110 L200,132 L222,132 L222,140 L234,140 L234,170 Z',
        1.3,
      ],
      ['l', 'M134,146 v-4 M142,146 v-4 M158,140 v-4 M166,140 v-4 M208,140 v-4 M216,140 v-4', 1.2],
    ],
    22,
    4,
  ),
  // Vltava a Karlův most s oblouky a sochami na zábradlí.
  ['f', '#6fa0c8', rect(16, 180, 218, 86), 1.2],
  [
    'f',
    '#9a958a',
    'M16,170 L234,170 L234,214 L230,214 A20,20 0 0,0 190,214 L170,214 A20,20 0 0,0 130,214 L110,214 A20,20 0 0,0 70,214 L50,214 A20,20 0 0,0 10,214 L16,214 Z',
    1.6,
  ],
  ['l', 'M16,178 H234', 1.1],
  [
    'f',
    '#9a958a',
    'M50,214 L60,226 L70,214 Z M110,214 L120,226 L130,214 Z M170,214 L180,226 L190,214 Z',
    1.2,
  ],
  [
    'f',
    '#5b5850',
    'M28,170 L28,160 C28,154 34,154 34,160 L34,170 Z M86,170 L86,158 C86,152 92,152 92,158 L92,170 Z M140,170 L140,160 C140,154 146,154 146,160 L146,170 Z M206,170 L206,158 C206,152 212,152 212,158 L212,170 Z',
    1,
  ],
  [
    'f',
    '#5b5850',
    dots(
      [
        [31, 151],
        [89, 149],
        [143, 151],
        [209, 149],
      ],
      3.4,
    ),
    1,
  ],
  ['s', '#fffaf0', 'M30,236 l12,0 M90,244 l10,0 M150,234 l12,0 M70,256 l14,0', 1.4],
  // Sloup s Bruncvíkem na pilíři.
  ['f', '#d9d2c2', 'M56,214 L56,150 L64,150 L64,214 Z', 1.3],
  ['f', '#d9d2c2', rect(52, 144, 16, 7), 1.2],
  ['f', '#e9b030', 'M54,144 L56,128 C56,122 64,122 64,128 L66,144 Z', 1.2],
  ['f', '#e9b030', c(60, 119, 4.5), 1.1],
  ['l', 'M66,132 L74,112', 1.6],
  // Kouzelný meč seká sám: stopy švihu, karta přeseknutá vedví, jiskry.
  ['s', '#fffaf0', 'M64,190 C62,212 76,232 100,240 M76,186 C76,204 88,220 108,228', 2.4],
  // Labuť na Vltavě poslechla „Hlavy dolů!“ — hlavu pod vodou, ocas nahoru.
  [
    'f',
    '#fffaf0',
    'M34,250 C34,240 48,236 60,240 C66,236 70,230 72,226 C74,236 70,246 62,252 C52,257 40,257 34,250 Z',
    1.6,
  ],
  ['l', 'M48,244 C54,240 60,242 62,246', 0.9],
  ['l', 'M36,249 C30,252 27,256 28,261', 5],
  ['s', '#fffaf0', 'M36,249 C30,252 27,256 28,261', 3],
  ['s', '#fffaf0', 'M16,261 C20,258 36,258 40,261', 1.6],
  ['f', '#ef8a2e', 'M62,253 L66,259 L70,254 Z', 0.9],
  ...cutCard(),
  ['f', '#d9d2c2', sw(SWORD.blade), 2],
  ['l', sw(SWORD.fuller), 1],
  ['f', '#8c5632', sw(SWORD.grip), 1.6],
  ['l', sw(SWORD.wrap), 1],
  ['f', '#e9b030', sw(SWORD.guard), 1.8],
  ['f', '#e9b030', c(POMMEL[0], POMMEL[1], 9), 1.8],
  ['f', '#d7442c', c(POMMEL[0], POMMEL[1], 4), 1],
  ['f', '#f2cf4a', `${spark(82, 212, 0.8)} ${spark(194, 52, 0.6)} ${spark(96, 104, 0.55)}`, 1],
  // Věrný lev: korunovaný, s dvojitým ocasem, kouká na meč.
  ['l', 'M220,252 C232,236 230,218 214,206 M224,248 C238,232 236,210 226,196', 6.4],
  ['s', '#f2cf4a', 'M220,252 C232,236 230,218 214,206 M224,248 C238,232 236,210 226,196', 3.6],
  [
    'f',
    '#ef8a2e',
    `${place('M0,0 C-6,-4 -6,-12 0,-16 C2,-10 6,-6 6,0 Z', 214, 206, 1, -50)} ${place('M0,0 C-6,-4 -6,-12 0,-16 C2,-10 6,-6 6,0 Z', 226, 196, 1, -20)}`,
    1.1,
  ],
  ['f', '#f2cf4a', 'M146,266 C144,238 156,218 180,212 C204,208 222,222 226,244 L228,266 Z', 1.8],
  ['h', 'M200,212 C214,218 224,230 226,244 L228,266 L208,266 C210,244 206,226 200,212 Z', 45],
  [
    'f',
    '#f2cf4a',
    'M152,266 L152,236 C152,230 164,230 164,236 L164,266 Z M168,266 L168,236 C168,230 180,230 180,236 L180,266 Z',
    1.6,
  ],
  ['l', 'M156,262 v4 M160,262 v4 M172,262 v4 M176,262 v4', 1],
  [
    'f',
    '#ef8a2e',
    place(
      'M0,-26 L6,-20 L14,-23 L16,-14 L24,-10 L20,-2 L25,6 L17,10 L16,19 L7,17 L0,24 L-7,17 L-16,19 L-17,10 L-25,6 L-20,-2 L-24,-10 L-16,-14 L-14,-23 L-6,-20 Z',
      168,
      200,
      1.05,
    ),
    1.8,
  ],
  ['f', '#f2cf4a', c(166, 202, 15, 14), 1.6],
  ['f', '#f2cf4a', `${c(155, 190, 4.5)} ${c(177, 189, 4.5)}`, 1.2],
  ['f', '#fffaf0', `${c(160, 199, 3.4)} ${c(171, 198, 3.4)}`, 1],
  ['f', INK, `${c(159, 197.5, 1.7)} ${c(170, 196.5, 1.7)}`, 0],
  ['f', INK, 'M161,206 L169,206 L165,210 Z', 0.8],
  ['l', 'M165,210 L165,213 C162,216 158,215 157,213 M165,213 C168,216 172,215 173,213', 1.1],
  ['f', '#e9b030', 'M156,182 L156,172 L160,177 L165,169 L170,177 L174,172 L174,182 Z', 1.2],
];

// ─────────────────────────── Doktor Faust ───────────────────────────

/** Sloupek mincí (zlaťáky) se spodním okrajem v y: n mincí nad sebou. */
function coinStack(x: number, y: number, n: number): SceneOp[] {
  const top = y - n * 5;
  let rims = '';
  for (let i = 1; i < n; i++)
    rims += `M${x - 11},${y - i * 5} C${x - 6},${y - i * 5 + 2.4} ${x + 6},${y - i * 5 + 2.4} ${x + 11},${y - i * 5} `;
  return [
    [
      'f',
      '#e9b030',
      `M${x - 11},${top} L${x - 11},${y} C${x - 6},${y + 3} ${x + 6},${y + 3} ${x + 11},${y} L${x + 11},${top} Z`,
      1.4,
    ],
    ['l', rims.trim(), 0.8],
    ['f', '#f2cf4a', c(x, top, 11, 3.4), 1.3],
  ];
}

// Doktor Faust: učenec nad sloupky zlaťáků, čertík drží jeho zastavenou dušičku ve sklenici; díra ve stropě.
const FAUST: SceneOp[] = [
  ['f', '#5b5850', rect(16, 16, 218, 268), 0],
  ['l', 'M16,40 H140 M50,16 V40 M100,16 V40 M16,124 H234 M60,104 V124 M150,104 V124 M200,104 V124', 0.8],
  // Díra ve stropě s noční oblohou.
  [
    'f',
    '#22365c',
    'M146,18 L234,18 L234,72 L222,66 L214,76 L202,64 L190,72 L180,60 L168,66 L160,52 L150,50 L154,38 L144,30 Z',
    1.8,
  ],
  ['f', '#f6e3a1', 'M208,30 A12,12 0 1,0 222,46 A9,9 0 1,1 208,30 Z', 1.1],
  ['f', '#f2cf4a', `${star(170, 34, 4, 1.6)} ${star(190, 50, 3, 1.2)} ${star(224, 60, 3, 1.2)}`, 0.8],
  ['f', '#c99a62', 'M188,72 L204,80 L200,84 L186,76 Z M156,52 L146,60 L144,56 L152,48 Z', 1],
  [
    'f',
    '#9a958a',
    dots(
      [
        [176, 82],
        [212, 88],
        [166, 74],
      ],
      1.8,
    ),
    0.8,
  ],
  // Police s knihami.
  ['f', '#8c5632', 'M16,96 H140 V104 H16 Z', 1.4],
  ['f', '#d7442c', rect(24, 60, 10, 36), 1.2],
  ['f', '#2f5fa8', rect(36, 66, 9, 30), 1.2],
  ['f', '#5d9a3e', rect(47, 56, 11, 40), 1.2],
  ['f', '#e9b030', 'M60,96 L66,62 L75,64 L69,96 Z', 1.2],
  ['f', '#6b4a9e', rect(80, 70, 10, 26), 1.2],
  ['f', '#c99a62', rect(92, 64, 12, 32), 1.2],
  ['f', '#8c5632', 'M16,170 H96 V178 H16 Z M196,170 H234 V178 H196 Z', 1.4],
  // Lebka a baňka s bublajícím lektvarem.
  ['f', '#fffaf0', 'M26,170 L26,160 C20,156 20,138 36,136 C52,138 52,156 46,160 L46,170 Z', 1.4],
  ['f', INK, `${c(31, 151, 3.6)} ${c(41, 151, 3.6)}`, 0],
  ['l', 'M31,164 v6 M36,164 v6 M41,164 v6', 0.9],
  ['f', '#bcd6e6', 'M66,170 C52,170 52,148 66,146 L66,132 L74,132 L74,146 C88,148 88,170 74,170 Z', 1.4],
  ['f', '#5d9a3e', 'M57,158 C60,154 80,154 83,158 C84,166 80,170 74,170 L66,170 C60,170 56,166 57,158 Z', 0],
  ['f', '#c6dcae', `${c(70, 124, 3)} ${c(76, 114, 2.4)} ${c(68, 104, 2)}`, 0.8],
  ['f', '#6fa0c8', rect(200, 142, 9, 28), 1.1],
  ['f', '#d7442c', rect(211, 148, 12, 22), 1.1],
  // Čertík vykukuje zpoza ramene (tělíčko za ramenem), ocas stoupá k díře ve stropě.
  ['l', 'M204,186 C230,178 232,140 216,118 C206,104 194,92 198,76', 4.6],
  ['s', '#d7442c', 'M204,186 C230,178 232,140 216,118 C206,104 194,92 198,76', 2.4],
  ['f', '#d7442c', 'M198,74 L192,62 L204,68 Z', 1.1],
  ['f', '#d7442c', 'M170,234 C166,196 172,170 188,166 C202,168 208,190 206,234 Z', 2],
  ['h', 'M194,168 C204,176 208,196 206,234 L196,234 C198,204 198,184 194,168 Z', 45],
  ['f', '#d7442c', 'M172,132 L170,110 L181,126 Z M198,130 L204,110 L192,124 Z', 1.2],
  ['f', '#d7442c', c(187, 145, 16, 17), 2],
  ['f', '#fffaf0', `${c(181, 141, 3.6)} ${c(194, 141, 3.6)}`, 1],
  ['f', INK, `${c(182, 142, 1.7)} ${c(195, 142, 1.7)}`, 0],
  ['l', 'M175,134 l6,3 M200,134 l-6,3', 1.3],
  ['l', 'M178,152 C183,159 191,159 196,152', 1.6],
  ['f', '#fffaf0', 'M182,155 l2,4 l2,-3 Z M190,155 l2,3 l2,-4 Z', 0.6],
  // Roucho s kožešinou.
  ['f', '#6b4a9e', BUST, 2.4],
  BUST_SHADOW,
  ['f', '#8c5632', 'M84,218 C98,200 152,200 166,218 C158,234 92,234 84,218 Z', 2],
  ['l', 'M92,216 l4,8 M106,210 l3,9 M120,208 l2,9 M134,208 l-1,9 M148,210 l-3,9 M160,216 l-4,8', 1.2],
  ['f', '#e9b030', c(125, 236, 5), 1.3],
  ['l', 'M108,236 L120,236 M130,236 L142,236', 1.2],
  // Hlava: špičatá bradka, kníry, potutelný úsměv, biret.
  ['f', SKIN, 'M112,180 L112,208 C118,214 132,214 138,208 L138,180 Z', 2],
  ['f', SKIN, 'M100,152 C92,146 90,166 101,168 Z M150,152 C158,146 160,166 149,168 Z', 1.8],
  ['f', SKIN, c(125, 156, 24, 29), 2.4],
  ['f', 'blush', `${c(109, 168, 5)} ${c(141, 168, 5)}`, 0],
  [
    'f',
    '#5a3418',
    'M110,176 C112,194 118,206 125,212 C132,206 138,194 140,176 C134,183 116,183 110,176 Z',
    1.8,
  ],
  [
    'f',
    '#5a3418',
    'M106,172 C112,164 121,165 125,170 C129,165 138,164 144,172 C140,170 136,176 125,174 C114,176 110,170 106,172 Z',
    1.4,
  ],
  ['l', 'M118,180 C122,183 128,183 132,180', 1.4],
  ['l', 'M106,144 C111,140 117,141 121,145 M129,145 C133,141 139,140 144,144', 2],
  ['f', INK, `${c(115, 152, 2.4)} ${c(135, 152, 2.4)}`, 0],
  ['l', 'M110,155 C113,157 117,157 120,155 M130,155 C133,157 137,157 140,155', 0.9],
  ['l', 'M125,152 C122,162 123,165 127,165', 1.4],
  ['f', '#22365c', 'M94,136 C84,116 104,100 130,102 C156,104 170,118 158,136 C140,128 110,128 94,136 Z', 2.2],
  ['l', 'M100,126 C116,120 140,120 154,126', 1],
  // Zavařovačka s dušičkou a zastavárenskou cedulkou v čertově pracce.
  [
    'f',
    '#bcd6e6',
    'M184,214 C182,206 186,202 190,202 L214,202 C218,202 222,206 220,214 L220,250 C220,258 214,260 202,260 C190,260 184,258 184,250 Z',
    1.8,
  ],
  [
    'f',
    '#fffaf0',
    'M194,248 C190,236 192,222 202,220 C212,222 214,236 210,248 L206,244 L202,249 L198,244 Z',
    1.3,
  ],
  ['f', INK, `${c(199, 230, 1.6)} ${c(206, 230, 1.6)}`, 0],
  ['f', INK, c(202.5, 237, 1.6, 2.2), 0],
  ['s', '#fffaf0', 'M188,212 L188,238', 2],
  ['f', '#9a958a', rect(186, 196, 32, 7), 1.4],
  ['l', 'M200,176 C210,180 212,186 206,192', 5],
  ['s', '#d7442c', 'M200,176 C210,180 212,186 206,192', 2.8],
  ['f', '#d7442c', 'M190,198 C188,188 198,184 206,188 C212,190 214,196 212,200 Z', 1.4],
  ['l', 'M192,199 l-1,5 M198,200 l0,5 M204,200 l1,5 M210,199 l2,4', 1.3],
  ['l', 'M216,203 C222,210 222,218 218,224', 0.9],
  ['f', '#f6e3a1', place('M-7,-4 L7,-4 L10,0 L7,4 L-7,4 Z', 222, 230, 1, 70), 1.1],
  ['f', INK, c(221, 225, 1.1), 0],
  ['l', 'M221,230 l0,6 M224,230 l0,4', 0.8],
  // Sloupky zlaťáků — co koruna, to násobek.
  ['f', '#8c5632', 'M16,250 H96 V266 H16 Z', 1.4],
  ...coinStack(30, 252, 3),
  ...coinStack(52, 252, 5),
  ...coinStack(76, 252, 7),
  ['f', '#f2cf4a', `${spark(90, 210, 0.6)} ${spark(40, 222, 0.45)}`, 0.9],
];

// ─────────────────────────── Krakonoš ───────────────────────────

// Krakonoš: nad Sněžkou slunce, holí si přivolal bouřku s bleskem; horská bouda a rosnička na žebříčku.
const KRAKONOS: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  // Slunce nad Sněžkou.
  ['f', '#f6e3a1', rays(36, 72, 14, 70, 0.5), 0],
  ['f', '#f2cf4a', c(36, 72, 13), 1.6],
  // Bouřkový mrak, déšť a blesk.
  [
    's',
    '#2f5fa8',
    'M160,80 l-8,22 M176,82 l-8,22 M192,82 l-8,22 M224,80 l-8,22 M168,108 l-6,16 M184,110 l-6,16 M228,108 l-6,16',
    2,
  ],
  [
    'f',
    '#5b5850',
    'M140,58 C134,42 150,32 164,38 C170,22 194,20 202,32 C214,22 234,28 234,44 L234,72 C222,80 204,78 196,72 C184,80 164,80 156,70 C144,72 136,66 140,58 Z',
    1.8,
  ],
  ['l', 'M150,66 C156,70 164,70 168,64 M188,70 C194,74 204,74 208,68', 1],
  ['f', '#f2cf4a', 'M194,70 L190,85 L199,83 L205,96 L209,77 L202,79 L204,70 Z', 1.4],
  // Hřebeny Krkonoš, Sněžka se sněhem a kapličkou.
  [
    'f',
    '#6fa0c8',
    'M16,150 L30,134 L64,100 L92,128 L110,140 L140,128 L176,138 L206,124 L234,134 L234,266 L16,266 Z',
    1.8,
  ],
  ['f', '#fffaf0', 'M50,114 L64,100 L78,114 L72,112 L66,118 L60,112 L55,116 Z', 1.2],
  // Kaple na vrcholu Sněžky: kulatá stavba s kuželovou střechou a lucernou.
  ['f', '#fffaf0', 'M56,102 L56,92 L72,92 L72,102 Z', 1.3],
  ['f', '#5b5850', 'M53,93 L64,82 L75,93 Z', 1.3],
  ['f', '#fffaf0', rect(62, 77, 4, 6), 0.9],
  ['l', 'M64,77 L64,72 M62,74 h4 M60,96 v4 M68,96 v4', 1],
  [
    'f',
    '#5d9a3e',
    'M16,212 C40,188 74,180 100,186 L150,184 C180,180 210,192 234,186 L234,266 L16,266 Z',
    1.8,
  ],
  // Pokroucená kosodřevina a smrčky.
  [
    'f',
    '#2f6b3a',
    'M16,196 l8,-20 l8,20 Z M60,186 l7,-18 l7,18 Z M200,188 l7,-18 l7,18 Z M218,190 l8,-22 l8,22 Z',
    1.1,
  ],
  // Horská bouda s komínem.
  ['f', '#c99a62', rect(24, 168, 30, 20), 1.4],
  ['f', '#5a3418', 'M20,170 L39,150 L58,170 Z', 1.4],
  ['f', '#5a3418', rect(46, 150, 5, 10), 1],
  ['f', '#fffaf0', 'M48,146 C44,140 50,136 48,130 C54,132 56,140 52,146 Z', 0.9],
  ['f', '#fffaf0', `${rect(29, 174, 6, 6)} ${rect(43, 174, 6, 6)}`, 0.9],
  [
    'f',
    '#d7442c',
    `${rect(26, 174, 3, 6)} ${rect(35, 174, 3, 6)} ${rect(40, 174, 3, 6)} ${rect(49, 174, 3, 6)}`,
    0.6,
  ],
  // Hůl zvednutá k bouřce.
  ['f', '#8c5632', place('M-3.5,0 L3.5,0 L4.5,170 L-4.5,170 Z', 212, 102, 1, 8), 1.8],
  ['f', '#8c5632', c(212, 100, 7), 1.6],
  [
    'f',
    '#f2cf4a',
    `${place('M0,-7 Q1,-1 7,0 Q1,1 0,7 Q-1,1 -7,0 Q-1,-1 0,-7 Z', 222, 94, 1)} ${place('M0,-7 Q1,-1 7,0 Q1,1 0,7 Q-1,1 -7,0 Q-1,-1 0,-7 Z', 200, 106, 0.7)}`,
    0.9,
  ],
  // Zelený kabát s knoflíky.
  ['f', '#5d9a3e', BUST, 2.4],
  BUST_SHADOW,
  ['l', 'M88,226 C84,250 86,268 88,284 M162,226 C166,250 164,268 162,284', 1.6],
  [
    'f',
    '#e9b030',
    dots(
      [
        [90, 240],
        [91, 256],
        [160, 240],
        [159, 256],
      ],
      3,
    ),
    1,
  ],
  // Hlava: vous až po pás, huňaté obočí.
  ['f', SKIN, 'M98,146 C90,140 88,160 99,162 Z M152,146 C160,140 162,160 151,162 Z', 1.8],
  ['f', SKIN, c(125, 150, 27, 31), 2.4],
  ['f', 'blush', `${c(108, 160, 6)} ${c(142, 160, 6)}`, 0],
  ['f', '#d9d2c2', 'M98,164 C94,196 104,238 125,264 C146,238 156,196 152,164 C140,178 110,178 98,164 Z', 2.2],
  ['l', 'M112,190 C114,210 118,228 122,246 M138,190 C136,210 132,228 128,246 M125,184 L125,250', 1.1],
  [
    'f',
    '#d9d2c2',
    'M100,170 C106,158 120,158 125,165 C130,158 144,158 150,170 C145,179 134,178 125,172 C116,178 105,179 100,170 Z',
    2,
  ],
  ['f', '#e8806a', 'M125,144 C118,155 117,162 123,164 C130,166 134,160 131,154 Z', 1.8],
  [
    'f',
    '#d9d2c2',
    'M103,138 C108,130 118,130 122,136 C116,136 108,137 103,140 Z M147,138 C142,130 132,130 128,136 C134,136 142,137 147,140 Z',
    1.4,
  ],
  ['f', INK, `${c(114, 146, 2.6)} ${c(136, 146, 2.6)}`, 0],
  // Klobouk s pérem.
  ['f', '#2f6b3a', 'M94,126 C92,98 106,84 125,84 C144,84 158,98 156,126 Z', 2.4],
  ['f', '#d7442c', 'M94,116 C110,121 140,121 156,116 L157,125 C140,130 110,130 93,125 Z', 1.4],
  ['f', '#fffaf0', 'M150,112 C160,96 172,86 186,82 C178,96 168,106 154,116 Z', 1.4],
  ['l', 'M152,114 L182,86', 0.9],
  ['f', '#2f6b3a', 'M62,126 C74,114 176,114 188,126 C176,138 74,138 62,126 Z', 2.4],
  // Ruka na holi.
  ...hand(208, 196, 8),
  // Rosnička ve sklenici: leze po žebříčku nahoru — bude hezky.
  [
    'f',
    '#bcd6e6',
    'M22,222 C20,214 24,210 30,210 L52,210 C58,210 62,214 60,222 L60,256 C60,262 54,266 41,266 C28,266 22,262 22,256 Z',
    1.8,
  ],
  ['f', '#9a958a', rect(24, 204, 34, 7), 1.3],
  ['l', 'M34,262 L34,220 M48,262 L48,220 M34,252 H48 M34,242 H48 M34,232 H48 M34,222 H48', 1],
  ['f', '#5d9a3e', 'M34,226 C32,218 40,214 44,218 C48,214 54,218 50,226 C48,230 38,230 34,226 Z', 1.2],
  ['f', '#fffaf0', `${c(39, 217, 2.4)} ${c(47, 217, 2.4)}`, 0.8],
  ['f', INK, `${c(39, 217, 1.1)} ${c(47, 217, 1.1)}`, 0],
  ['l', 'M38,224 C41,226 44,226 46,224', 0.8],
  ['s', '#fffaf0', 'M26,220 L26,248', 2],
];

// ─────────────────────────── Hloupý Honza ───────────────────────────

/** Buchta (kopeček se švem a tečkami povidel) se středem dole v x,y. */
const BUN = 'M-14,0 C-16,-14 16,-14 14,0 Z';

// Hloupý Honza: leží na peci pod puntíkatou peřinou s korunou na čepici; dvě buchty (Dvojice), kocour, zámek v okně.
const HONZA: SceneOp[] = [
  ['f', '#bcd6e6', rect(16, 16, 218, 268), 0],
  ['f', '#8c5632', rect(16, 16, 218, 14), 1.4],
  ['l', 'M16,30 H234', 1],
  // Okýnko s výhledem na zámek se srdíčkem.
  ['f', '#8c5632', rect(140, 40, 84, 76), 1.8],
  ['f', '#6fa0c8', rect(146, 46, 72, 64), 1.2],
  ['f', '#5d9a3e', 'M146,110 L146,96 C166,84 196,82 218,90 L218,110 Z', 1.2],
  ['f', '#fffaf0', 'M188,92 L188,74 L194,74 L194,80 L204,80 L204,70 L212,70 L212,90 Z', 1.1],
  ['f', '#d7442c', 'M186,75 L191,66 L196,75 Z M202,71 L208,60 L214,71 Z', 1],
  ['f', INK, `${rect(198, 84, 3, 5)} ${rect(206, 76, 2, 3)}`, 0],
  ['f', '#e88a9a', 'M160,58 C155,52 149,56 152,62 L160,70 L168,62 C171,56 165,52 160,58 Z', 1],
  ['s', '#8c5632', 'M180,46 V110 M146,76 H218', 4],
  ['f', '#c99a62', rect(136, 114, 92, 6), 1.3],
  ['f', '#d7442c', 'M146,114 C146,106 154,106 154,114 Z', 1],
  ['f', '#5d9a3e', 'M150,107 l-3,-6 M150,107 l3,-6', 0.8],
  // Věnec česneku od trámu (první palička až pod odznakem vzácnosti).
  ['l', 'M36,30 C34,60 38,100 36,140', 1.2],
  [
    'f',
    '#fffaf0',
    [
      [40, 72],
      [33, 88],
      [39, 104],
      [35, 120],
      [38, 136],
    ]
      .map(([x, y]) => place('M0,-9 C3,-5 8,-3 8,3 C8,7 4,9 0,9 C-4,9 -8,7 -8,3 C-8,-3 -3,-5 0,-9 Z', x!, y!))
      .join(' '),
    1.1,
  ],
  ['l', 'M40,68 L40,80 M33,84 L33,96 M39,100 L39,112 M35,116 L35,128 M38,132 L38,144', 0.7],
  // Pec: bílená, s kachlíky, ohništěm a lavicí.
  ['f', '#fffaf0', 'M16,180 L234,180 L234,266 L16,266 Z', 2],
  ['f', '#d9d2c2', rect(16, 170, 218, 12), 1.6],
  [
    'l',
    'M16,206 H110 M170,206 H234 M60,182 V206 M200,182 V206 M40,206 V234 M80,206 V234 M190,206 V234 M222,206 V234',
    0.9,
  ],
  ['f', '#5a3418', 'M112,236 L112,212 C112,192 166,192 166,212 L166,236 Z', 1.8],
  [
    'f',
    '#ef8a2e',
    'M118,236 C116,224 124,216 128,208 C130,216 134,220 138,212 C142,220 148,224 150,214 C156,222 160,228 160,236 Z',
    1.2,
  ],
  ['f', '#f2cf4a', 'M128,236 C126,228 132,224 134,218 C136,226 142,228 144,236 Z', 0],
  ['f', '#8c5632', 'M118,236 L160,230 L162,236 Z', 1],
  ['f', '#c99a62', rect(16, 236, 218, 10), 1.6],
  ['f', '#8c5632', rect(16, 246, 218, 20), 1.4],
  // Na lavici dvě buchty na talíři a spící kocour.
  ['f', '#d9d2c2', c(60, 236, 30, 5), 1.3],
  ['f', '#e9b030', `${place(BUN, 46, 235, 1)} ${place(BUN, 74, 235, 1)}`, 1.4],
  ['l', 'M38,229 C44,226 50,226 54,229 M66,229 C72,226 78,226 82,229', 0.9],
  [
    'f',
    '#8e3b6e',
    dots(
      [
        [44, 230],
        [50, 229],
        [72, 230],
        [78, 229],
      ],
      1.2,
    ),
    0,
  ],
  ['f', '#ef8a2e', 'M180,236 C176,220 196,212 212,216 C226,220 230,232 224,236 Z', 1.6],
  ['f', '#ef8a2e', c(186, 226, 9, 8), 1.4],
  ['f', '#ef8a2e', 'M179,222 L180,212 L186,219 Z M188,219 L194,212 L194,222 Z', 1.1],
  ['l', 'M182,227 c2,2 4,2 5,0 M189,227 c2,2 4,2 5,0 M200,222 l2,10 M208,220 l2,12 M216,222 l1,10', 1],
  ['l', 'M224,236 C232,232 232,224 226,222', 2.4],
  ['l', 'M198,206 h6 l-6,6 h6 M208,198 h5 l-5,5 h5', 1.2],
  // Polštář, peřina v kostičkách, ponožka s dírou.
  ['f', '#fffaf0', 'M48,170 C44,152 56,144 72,146 L104,150 C112,152 112,170 106,172 Z', 1.6],
  ['l', 'M56,152 L100,156 M54,162 L104,166', 0.8],
  ['f', '#d7442c', 'M92,172 C92,156 106,148 130,146 C160,144 190,146 208,152 C218,156 220,168 216,172 Z', 2],
  [
    'f',
    '#fffaf0',
    dots(
      [
        [116, 156],
        [132, 152],
        [148, 151],
        [164, 151],
        [180, 152],
        [196, 155],
        [108, 166],
        [124, 163],
        [140, 162],
        [156, 162],
        [172, 162],
        [188, 163],
        [204, 165],
      ],
      2.2,
    ),
    0,
  ],
  ['l', 'M120,148 C124,156 124,164 122,172 M168,146 C172,156 172,164 170,172', 0.9],
  ['f', '#fffaf0', 'M208,158 C210,148 222,148 228,152 C234,156 234,166 228,170 L210,170 Z', 1.6],
  ['s', '#2f5fa8', 'M213,152 L213,170 M219,150 L219,170', 2.4],
  ['f', SKIN, c(229, 158, 3.4, 4), 1],
  // Hlava na dlani: čepice s bambulí, slaměné vlasy, blažený úsměv, koruna.
  ...scaleOps(
    [
      ['f', SKIN, 'M66,170 L60,148 C58,142 66,140 70,144 L80,164 Z', 1.6],
      ['f', SKIN, c(86, 140, 20, 22), 2.2],
      [
        'f',
        '#f2cf4a',
        'M66,136 C64,122 74,114 86,114 C98,114 108,122 106,136 C100,128 92,126 86,126 C80,126 70,128 66,136 Z',
        1.6,
      ],
      ['l', 'M74,140 C77,143 81,143 83,140 M90,140 C93,143 97,143 99,140', 1.5],
      ['f', 'blush', `${c(73, 150, 4.5)} ${c(100, 150, 4.5)}`, 0],
      ['l', 'M86,142 C84,148 85,150 88,150', 1.2],
      ['l', 'M78,154 C83,159 91,159 96,154', 1.6],
      ['f', '#d7442c', 'M64,128 C62,108 76,98 90,100 C104,102 112,112 108,128 C96,122 76,122 64,128 Z', 2],
      ['f', '#fffaf0', c(108, 104, 5.5), 1.3],
      ['f', '#e9b030', place('M-12,0 L-12,-12 L-6,-6 L0,-15 L6,-6 L12,-12 L12,0 Z', 84, 104, 1, -14), 1.4],
      [
        'f',
        '#d7442c',
        dots(
          [
            [78, 98],
            [90, 95],
          ],
          1.8,
        ),
        0.8,
      ],
      ['f', '#e9b030', `${star(122, 98, 4, 1.6)} ${star(56, 96, 3, 1.2)}`, 0.8],
    ],
    92,
    170,
    1.16,
  ),
];

// ─────────────────────────── Orloj ───────────────────────────

const DIAL = { x: 125, y: 176, r: 62 } as const;

/** Apoštol v okénku: svatozář, hlava, roucho; volitelně klíč (sv. Petr). */
function apostle(x: number, robe: string, key: boolean): SceneOp[] {
  const ops: SceneOp[] = [
    ['f', '#e9b030', c(x, 66, 8), 1],
    ['f', robe, `M${x - 10},92 C${x - 10},80 ${x + 10},80 ${x + 10},92 Z`, 1.2],
    ['f', SKIN, c(x, 68, 5.5), 1.1],
    [
      'f',
      '#fffaf0',
      `M${x - 4},73 C${x - 3},80 ${x + 3},80 ${x + 4},73 C${x + 2},75 ${x - 2},75 ${x - 4},73 Z`,
      0.8,
    ],
  ];
  if (key) ops.push(['l', `M${x + 6},90 L${x + 12},76 M${x + 11},79 l3,1`, 1.4]);
  return ops;
}

/** Zeď věže (zůstává na místě); průčelí orloje se posouvá níž. */
const ORLOJ_WALL: SceneOp[] = [
  ['f', '#9a958a', rect(16, 16, 218, 268), 0],
  [
    'l',
    'M16,44 H234 M16,98 H50 M200,98 H234 M16,160 H48 M202,160 H234 M16,226 H48 M202,226 H234 M30,44 V98 M220,44 V98 M32,98 V160 M216,98 V160 M30,160 V226 M220,160 V226',
    0.8,
  ],
];

const ORLOJ_FRONT: SceneOp[] = [
  // Kohout na štítku nad okénky (dost nízko, aby nepřekážel odznaku vzácnosti).
  ['f', '#d9d2c2', 'M115,50 L135,50 L132,45 L118,45 Z', 1.2],
  ['i', 'rooster', 115, 26, 20, '#e9b030'],
  // Okénka s apoštoly.
  ['f', '#d9d2c2', 'M84,98 L84,62 C84,44 166,44 166,62 L166,98 Z', 1.6],
  [
    'f',
    '#22365c',
    'M92,94 L92,62 C92,50 116,50 116,62 L116,94 Z M134,94 L134,62 C134,50 158,50 158,62 L158,94 Z',
    1.4,
  ],
  ...apostle(104, '#d7442c', true),
  ...apostle(146, '#5d9a3e', false),
  ['l', 'M125,52 L125,98', 1.4],
  // Rám ciferníku s modrými cviklíky a zlatými hvězdičkami.
  ['f', '#d9d2c2', rect(52, 104, 146, 146), 1.8],
  [
    'f',
    '#2f5fa8',
    'M56,108 L96,108 C76,116 64,128 56,148 Z M194,108 L154,108 C174,116 186,128 194,148 Z M56,246 L96,246 C76,238 64,226 56,206 Z M194,246 L154,246 C174,238 186,226 194,206 Z',
    1.1,
  ],
  [
    'f',
    '#f2cf4a',
    dots(
      [
        [64, 116],
        [186, 116],
        [64, 238],
        [186, 238],
      ],
      2.2,
    ),
    0,
  ],
  // Ciferník: zlatý prstenec s ryskami, den, noc, soumrak a svítání.
  ['f', '#e9b030', c(DIAL.x, DIAL.y, DIAL.r + 8), 2.2],
  ['l', ticks(DIAL.x, DIAL.y, DIAL.r + 1, DIAL.r + 7, 24), 1.2],
  ['f', '#6fa0c8', c(DIAL.x, DIAL.y, DIAL.r), 1.8],
  [
    'f',
    '#ef8a2e',
    'M64,188 C86,172 164,172 186,188 C187,194 186,200 184,206 C160,190 90,190 66,206 C64,200 63,194 64,188 Z',
    0,
  ],
  ['f', '#22365c', `M66,206 C90,190 160,190 184,206 A${DIAL.r},${DIAL.r} 0 0,1 66,206 Z`, 1.2],
  ['l', 'M64,188 C86,172 164,172 186,188', 1.2],
  // Zvěrokruh (výstředný prstenec) a hvězdy na noční části.
  ['s', '#e9b030', c(125, 160, 38), 8],
  ['l', ticks(125, 160, 34, 42, 12), 1],
  ['f', '#f2cf4a', `${star(100, 218, 3, 1.2)} ${star(150, 222, 3, 1.2)} ${star(125, 230, 2.4, 1)}`, 0.6],
  // Ručička se sluníčkem a půlměsíc.
  ['l', `M${DIAL.x},${DIAL.y} L168,132`, 2.6],
  ['f', '#e9b030', place('M0,0 L-5,-4 L-2,-4 L-2,-12 L2,-12 L2,-4 L5,-4 Z', 172, 128, 1, 45), 1.2],
  ['f', '#f2cf4a', c(154, 146, 8), 1.6],
  ['l', ticks(154, 146, 10, 14, 8), 1.1],
  ['l', `M${DIAL.x},${DIAL.y} L92,210`, 2],
  ['f', '#fffaf0', c(90, 212, 7), 1.4],
  ['f', '#22365c', 'M90,205 A7,7 0 0,1 90,219 A4,7 0 0,0 90,205 Z', 0],
  ['f', '#e9b030', c(DIAL.x, DIAL.y, 6), 1.6],
  // Kostlivec: zvonek, provaz, přesýpací hodiny.
  ['f', '#d9d2c2', rect(196, 218, 34, 8), 1.3],
  ['f', '#e9b030', 'M206,112 C206,100 220,100 220,112 L222,116 L204,116 Z', 1.3],
  ['f', '#e9b030', c(213, 118, 2.4), 0.9],
  ['l', 'M213,98 L213,102 M213,120 L222,140', 1],
  ['f', '#fffaf0', 'M204,160 C204,150 222,150 222,160 L220,186 L206,186 Z', 1.3],
  ['l', 'M206,160 h14 M206,167 h14 M207,174 h12 M213,152 V186', 0.9],
  ['s', '#fffaf0', 'M220,156 L226,146 L222,140 M206,158 L198,168 L200,176', 3],
  ['l', 'M220,156 L226,146 L222,140 M206,158 L198,168 L200,176', 0.8],
  ['s', '#fffaf0', 'M208,186 L206,218 M218,186 L220,218', 3],
  ['l', 'M208,186 L206,218 M218,186 L220,218', 0.8],
  [
    'f',
    '#fffaf0',
    'M205,140 C203,128 223,128 221,140 C221,146 217,148 213,148 C209,148 205,146 205,140 Z',
    1.4,
  ],
  ['f', INK, `${c(209.5, 138, 2.4)} ${c(216.5, 138, 2.4)}`, 0],
  ['l', 'M209,145 h8 M211,143 v4 M213,143 v4 M215,143 v4', 0.7],
  ['f', '#c99a62', 'M192,170 L204,170 L204,173 L192,173 Z M192,187 L204,187 L204,190 L192,190 Z', 0.9],
  ['f', '#f6e3a1', 'M194,173 L202,173 L198,180 Z M198,180 L194,187 L202,187 Z', 0.9],
  ['f', '#e9b030', 'M196,187 L200,187 L198,183 Z', 0],
  // Lakomec s měšcem.
  ['f', '#d9d2c2', rect(20, 218, 32, 8), 1.3],
  ['f', '#8c5632', 'M24,218 L28,176 C30,168 44,168 46,176 L50,218 Z', 1.4],
  ['f', SKIN, c(37, 160, 8), 1.3],
  ['f', '#22365c', 'M27,158 C26,146 48,146 47,158 Z', 1.2],
  ['f', '#9a958a', 'M33,168 L37,180 L41,168 Z', 0.9],
  ['f', '#e9b030', 'M38,204 C30,204 30,190 38,188 L36,184 L44,184 L42,188 C50,190 50,204 42,204 Z', 1.2],
  ['l', 'M24,184 L18,214', 1.4],
];

// Orloj: kohout, apoštolové v okénkách, astronomický ciferník; kostlivec zvoní a drží přesýpací hodiny, lakomec s měšcem.
const ORLOJ: SceneOp[] = [...ORLOJ_WALL, ...moveOps(ORLOJ_FRONT, 0, 10)];

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  cech: CECH,
  libuse: LIBUSE,
  blanik: BLANIK,
  bruncvik: BRUNCVIK,
  faust: FAUST,
  krakonos: KRAKONOS,
  honza: HONZA,
  orloj: ORLOJ,
};

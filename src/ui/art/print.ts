/**
 * Tisková kreslicí sada — výtvarný styl „Sirkárna“ (docs/DECISIONS.md 2026-10-06): retro tisk jako zápalkové
 * nálepky a plakáty z 60. let. Omezená sada tiskových barev (inkoustů), silná černá linka, barva lehce posunutá
 * vedle linky (soutisk „vedle“) a rastrové tečky místo stínů a lazur.
 *
 * Všechno je procedurální SVG bez filtrů — obrázky se vkládají přímo do stránky, jsou ostré v každé velikosti
 * a levné na vykreslení (žádná bitmapová keš). Barvy z obsahu se přitahují k nejbližšímu inkoustu (`inkOf`),
 * takže i stovky obrázků drží jednu paletu.
 *
 * API odpovídá předchozí akvarelové sadě (stejné názvy funkcí), aby se kresby nemusely přepisovat:
 * `wash` = plocha inkoustem (slabá = rastr), `ink` = linka, `knock` = papír, `paint` = papír + barva + obrys.
 * Id ve `<defs>` používají placeholder `%ID%` (každá instance si ho nahradí vlastním prefixem).
 */
import { iconPaths, iconViewBox, hasIcon, escapeXml, safeColor } from './icons';

export const PR_ID = '%ID%';
const ID = PR_ID;

/** Základní barvy stylu. */
export const PR = {
  /** Tiskařská čerň (linka). */
  ink: '#1a1714',
  /** Papír (krémový karton). */
  paper: '#f3e8cf',
  /** Okraj karty — linka. */
  paperEdge: '#1a1714',
  /** Rastr stínů (námořnická modř). */
  shadow: '#22365c',
  red: '#d7442c',
  black: '#1f2a44',
} as const;

/** Paleta rolí kreseb (figury karet, Štamgast) — už přímo inkousty. */
export const PR_PAL = {
  skin: '#f2b38c',
  cheek: '#e8603a',
  hair: '#8c5632',
  hairDark: '#5a3418',
  gold: '#e9b030',
  goldDark: '#c08a1e',
  red: '#d7442c',
  white: '#fffaf0',
  green: '#5d9a3e',
  greenDark: '#2f6b3a',
  blue: '#2f5fa8',
  sky: '#6fa0c8',
  wood: '#c99a62',
  clay: '#a88a6a',
  stone: '#9a958a',
} as const;

/**
 * Tiskové barvy (inkousty). Každá barva z obsahu se přitáhne k nejbližšímu — paleta je široká, aby se obrázky
 * od sebe lišily, ale pořád jednotná (plné, mírně teplé barvy bez přechodů).
 */
export const INKS: readonly string[] = [
  '#d7442c', // rumělka
  '#b8302a', // cihlová
  '#e8603a', // oranžovočervená
  '#ef8a2e', // oranžová
  '#e9b030', // hořčicová
  '#f2cf4a', // žlutá
  '#f6e3a1', // bledě žlutá
  '#8a8f2e', // olivová
  '#5d9a3e', // zelená
  '#2f6b3a', // tmavě zelená
  '#c6dcae', // bledě zelená
  '#2f8077', // petrolejová
  '#9fd0c4', // mátová
  '#6fa0c8', // nebeská
  '#bcd6e6', // bledě modrá
  '#2f5fa8', // modrá
  '#22365c', // námořnická
  '#6b4a9e', // fialová
  '#cbb8e3', // levandulová
  '#8e3b6e', // švestková
  '#e88a9a', // růžová
  '#f3c7c0', // bledě růžová
  '#8c5632', // hnědá
  '#5a3418', // tmavě hnědá
  '#c99a62', // okrová
  '#f2b38c', // tělová
  '#9a958a', // šedá
  '#5b5850', // tmavě šedá
  '#d9d2c2', // světle šedá
  '#f3e8cf', // papír
  '#fffaf0', // bílá
  '#1a1714', // čerň
];

const r2 = (n: number): string => String(Math.round(n * 100) / 100);

function rgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const v = m[1] as string;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

const inkCache = new Map<string, string>();

/** Nejbližší tiskový inkoust k barvě (vážená vzdálenost v RGB; jiné zápisy než `#rrggbb` beze změny). */
export function inkOf(color: string): string {
  const key = color.toLowerCase();
  const hit = inkCache.get(key);
  if (hit) return hit;
  const p = rgb(key);
  if (!p) return color;
  let best = INKS[0] as string;
  let bd = Infinity;
  for (const ink of INKS) {
    const q = rgb(ink) as [number, number, number];
    const rm = (p[0] + q[0]) / 2;
    const dr = p[0] - q[0];
    const dg = p[1] - q[1];
    const db = p[2] - q[2];
    // „Redmean“ — levná aproximace vnímané vzdálenosti barev.
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) {
      bd = d;
      best = ink;
    }
  }
  inkCache.set(key, best);
  return best;
}

/** Rastrové vzory (barva + velikost tečky) použité v aktuálním obrázku — každý se do `<defs>` vloží jednou. */
const halftones = new Set<string>();

export interface PrintDefsOptions {
  width: number;
  height: number;
  /** Měřítko (malé obrázky v jednotkách viewBoxu → jemnější rastr). */
  scale?: number;
  /** Papír (barva podkladu). */
  paper?: string;
}

let rasterScale = 1;

/**
 * Sdílené `<defs>` jednoho obrázku: papír (`%ID%-pp`). Rastrové vzory se přidávají průběžně (`wash` se slabým
 * krytím) přímo do kresby — viz `beginArt`.
 */
export function printDefs(o: PrintDefsOptions): string {
  const paper = o.paper ?? PR.paper;
  return `<pattern id="${ID}-pp" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${paper}"/></pattern>`;
}

/** Id a definice rastru: tečky inkoustu `color` velikosti podle krytí `op` (0–1). */
function halftone(color: string, op: number): { id: string; def: string } {
  const size = 6 * rasterScale;
  // Plocha tečky ≈ krytí (r = sqrt(op / π) × rozteč), o kousek jemnější — rastr nemá přebít kresbu.
  const r = Math.max(0.5 * rasterScale, Math.min(size * 0.48, Math.sqrt(op / Math.PI) * size * 0.82));
  const key = `${color.slice(1)}-${Math.round(r * 10)}`;
  const id = `${ID}-ht${key}`;
  if (halftones.has(key)) return { id, def: '' };
  halftones.add(key);
  return {
    id,
    def:
      `<defs><pattern id="${id}" width="${r2(size)}" height="${r2(size)}" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">` +
      `<circle cx="${r2(size / 2)}" cy="${r2(size / 2)}" r="${r2(r)}" fill="${color}"/></pattern></defs>`,
  };
}

// ─────────────────────────── Tvary (bez barvy) ───────────────────────────

export const shp = {
  path: (d: string, extra = ''): string => `<path d="${d}"${extra ? ` ${extra}` : ''}/>`,
  rect: (x: number, y: number, w: number, h: number, rx = 0): string =>
    `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}"${rx ? ` rx="${r2(rx)}"` : ''}/>`,
  circle: (cx: number, cy: number, r: number): string =>
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"/>`,
  ellipse: (cx: number, cy: number, rx: number, ry: number): string =>
    `<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx)}" ry="${r2(ry)}"/>`,
};

export interface IconPlacement {
  x: number;
  y: number;
  size: number;
}

/** Rozparsovaný viewBox ikony. */
function iconBox(name: string): [number, number, number, number] {
  const p = iconViewBox(name)
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const [x = 0, y = 0, w = 512, h = 512] = p;
  return [x, y, w > 0 ? w : 512, h > 0 ? h : 512];
}

/**
 * Ikona jako tvar bez barvy (cesty bez `fill`, barvu dodá obal) vepsaná do čtverce. Vrací markup a měřítko
 * (tloušťku linky je třeba vydělit měřítkem). `data-icon` zůstává kvůli testům a ladění.
 */
export function iconShape(name: string, at: IconPlacement): { markup: string; scale: number } {
  const [vx, vy, vw, vh] = iconBox(name);
  const s = at.size / Math.max(vw, vh);
  const ox = at.x + (at.size - vw * s) / 2 - vx * s;
  const oy = at.y + (at.size - vh * s) / 2 - vy * s;
  const paths = iconPaths(name).replace(/\sfill="currentColor"/g, '');
  return {
    markup: `<g transform="translate(${r2(ox)} ${r2(oy)}) scale(${Math.round(s * 10000) / 10000})" data-icon="${escapeXml(
      hasIcon(name) ? name : 'fallback',
    )}">${paths}</g>`,
    scale: s,
  };
}

let iconSeq = 0;

/**
 * Začátek sestavování jednoho obrázku — id sdílených ikon (`iconRef`) a rastry se počítají od nuly, takže stejný
 * obrázek má vždy stejný markup. `scale` = měřítko rastru (malé kulaté obrázky 120 × 120 mají jemnější tečky).
 */
export function beginArt(scale = 1): void {
  iconSeq = 0;
  halftones.clear();
  rasterScale = scale;
}

/**
 * Ikona jako sdílený tvar: definice (vlož do `<defs>`, smí být i uvnitř těla) a odkaz `<use>` — cesta ikony je
 * v markupu jen jednou, i když se kreslí ve více vrstvách (stín, papír, barva, linka).
 */
export function iconRef(name: string, at: IconPlacement): { def: string; use: string; scale: number } {
  iconSeq += 1;
  const id = `${ID}-ic${iconSeq}`;
  const icon = iconShape(name, at);
  return {
    def: icon.markup.replace('<g ', `<g id="${id}" `),
    use: `<use href="#${id}"/>`,
    scale: icon.scale,
  };
}

// ─────────────────────────── Tisk ───────────────────────────

/** Krytí, od kterého je plocha plnou barvou; slabší = rastr. */
const SOLID_FROM = 0.42;
/** Soutisk „vedle“: o kolik barva ujede proti lince (jednotky obrázku karty 250 × 350). */
const MISREG: readonly [number, number] = [2.2, 1.6];

export interface WashOptions {
  /** Krytí: ≥ 0,42 plná barva, slabší rastr (čím slabší, tím menší tečky). */
  op?: number;
  /** Posun proti lince (soutisk „vedle“); výchozí mírný posun. */
  dx?: number;
  dy?: number;
  /** Doplňkové atributy obalu (už escapované). */
  extra?: string;
}

/**
 * Plocha inkoustem: barva se přitáhne k nejbližšímu tiskovému inkoustu. Silná plocha = plná barva lehce
 * posunutá proti lince, slabá = rastrové tečky (tahy `stroke="currentColor"` dostanou průhlednost).
 */
export function wash(shape: string, color: string, o: WashOptions = {}): string {
  const c = inkOf(safeColor(color, '#888888'));
  const op = o.op ?? 0.62;
  const dx = o.dx ?? MISREG[0];
  const dy = o.dy ?? MISREG[1];
  const move = dx || dy ? ` transform="translate(${r2(dx)} ${r2(dy)})"` : '';
  const extra = o.extra ? ` ${o.extra}` : '';
  if (op >= SOLID_FROM) return `<g fill="${c}" color="${c}"${move}${extra}>${shape}</g>`;
  const ht = halftone(c, op);
  return (
    `${ht.def}<g fill="url(#${ht.id})" color="${c}" stroke-opacity="${r2(Math.min(1, op * 2.2))}"${move}${extra}>` +
    `${shape}</g>`
  );
}

/** Papír přes tvar (zakryje, co je pod ním — kresba se skládá odzadu dopředu). */
export function knock(shape: string): string {
  return `<g fill="${PR.paper}">${shape}</g>`;
}

export interface InkOptions {
  color?: string;
  op?: number;
  /** Měřítko tvaru (ikony) — tloušťka se vydělí. */
  scale?: number;
  cap?: 'round' | 'butt';
  extra?: string;
  /** Násobek tloušťky místo výchozího `INK_WEIGHT` (1 = přesně zadaná tloušťka). */
  weight?: number;
}

/**
 * Váha linky: kresby jsou navržené na tloušťky akvarelu (×0,72); tisková linka je ×1,35 — silná, stejnoměrná
 * čerň. Platí jen pro čerň (výchozí barvu) — barevné ozdobné tahy zůstávají, jak jsou.
 */
export const INK_WEIGHT = 1.35 / 0.72;

/** Linka (stejnoměrná, bez rozvlnění). */
export function ink(shape: string, width: number, o: InkOptions = {}): string {
  const color = o.color ?? PR.ink;
  const outer = width * (o.weight ?? (color === PR.ink ? INK_WEIGHT : 1));
  const w = outer / (o.scale ?? 1);
  const op = o.op ?? 1;
  return (
    `<g fill="none" stroke="${color}" stroke-width="${r2(w)}" stroke-linejoin="round" stroke-linecap="${o.cap ?? 'round'}"` +
    `${op < 1 ? ` opacity="${r2(op)}"` : ''}${o.extra ? ` ${o.extra}` : ''}>${shape}</g>`
  );
}

/** Plná čerň (zorničky, drobné tečky). */
export function inkFill(shape: string, color: string = PR.ink): string {
  return `<g fill="${color}">${shape}</g>`;
}

/** Nejtenčí obrys plochy v `paint` (aby i drobné tvary měly tiskovou linku). */
const MIN_OUTLINE = 1.7;

/**
 * Základní tah kresby: papír přes tvar → barva (posunutá) → obrys. `inkW` 0 = bez obrysu, `color` null = bez
 * barvy. Tloušťka `inkW` je v jednotkách návrhu (×0,72 a váha linky `INK_WEIGHT` v `ink`).
 */
export function paint(
  shape: string,
  color: string | null,
  inkW: number,
  o: WashOptions & { noKnock?: boolean } = {},
): string {
  const outline = inkW > 0 ? Math.max(inkW * 0.72, inkW >= 1 ? MIN_OUTLINE / INK_WEIGHT : 0) : 0;
  return (
    (o.noKnock ? '' : knock(shape)) +
    (color ? wash(shape, color, { ...o, op: Math.max(o.op ?? 0.9, SOLID_FROM) }) : '') +
    (outline > 0 ? ink(shape, outline) : '')
  );
}

/** Ikona vytištěná plnou barvou s obrysem (siluety z game-icons.net). */
export function paintIcon(
  name: string,
  at: IconPlacement,
  color: string,
  o: { inkW?: number; op?: number; knock?: boolean; dx?: number; dy?: number } = {},
): string {
  const icon = iconRef(name, at);
  const inkW = o.inkW ?? Math.max(1.1, at.size / 80);
  const k = at.size / 100;
  return (
    `<defs>${icon.def}</defs>` +
    (o.knock ? knock(icon.use) : '') +
    wash(icon.use, color, {
      op: Math.max(o.op ?? 0.9, SOLID_FROM),
      dx: o.dx ?? 1.6 * k,
      dy: o.dy ?? 1.2 * k,
    }) +
    (inkW > 0 ? ink(icon.use, inkW * 0.8, { scale: icon.scale }) : '')
  );
}

/** Papírový podklad (s okrajem linkou). */
export function paperBase(w: number, h: number, rx: number, edge: string = PR.paperEdge): string {
  return `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${rx}" fill="${PR.paper}" stroke="${edge}" stroke-width="5"/>`;
}

/** Bez zrna — tisk je čistý (dřív akvarelové zrno papíru). Zůstává kvůli API. */
export function grainOver(_w: number, _h: number, _rx: number): string {
  return '';
}

/** Míchání barev (pro odstíny palety). */
export function mixColor(a: string, b: string, t: number): string {
  const pa = rgb(a) ?? [128, 128, 128];
  const pb = rgb(b) ?? [128, 128, 128];
  return (
    '#' +
    pa
      .map((x, i) => Math.round(x + ((pb[i] ?? 0) - x) * t))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

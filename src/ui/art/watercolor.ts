/**
 * Akvarelová sada — výtvarný styl E1 „Pohádková knížka“ (docs/DECISIONS.md 2026-10-05): tenká hnědá tuš,
 * vodové barvy, které se v ploše mění a na krajích tmavnou, hrubý papír se zrnem.
 *
 * Všechno je procedurální SVG (žádné bitmapy ani cizí obrázky): papír = světlem nasvícený šum
 * (`feTurbulence` + `feDiffuseLighting`), lavírování = posunutá a rozmazaná plocha s tmavším okrajem
 * (`feDisplacementMap`, `feMorphology`) a zrnitým pigmentem, tuš = lehce rozvlněná linka.
 *
 * Filtry jsou drahé, proto se hotové obrázky v prohlížeči kreslí jen jednou do bitmapy (src/ui/art/raster.ts).
 * Markup je zároveň navržený tak, aby po odstranění všech atributů `filter` (rychlá náhrada, než je bitmapa
 * hotová) dával rozumný plochý obrázek: papír má vlastní barvu, lavírování je poloprůhledná plocha.
 *
 * Id ve `<defs>` používají placeholder `%ID%` (každá instance si ho nahradí vlastním prefixem).
 */
import { iconPaths, iconViewBox, hasIcon, escapeXml, safeColor } from './icons';

export const WC_ID = '%ID%';
const ID = WC_ID;

/** Základní barvy stylu. */
export const WC = {
  ink: '#2e2620',
  paper: '#fbf8f1',
  paperEdge: '#d6cbb4',
  /** Studený stín (lazura přes tvary). */
  shadow: '#4a4f8a',
  red: '#c43d32',
  black: '#2f3542',
} as const;

/** Paleta barev kreseb (role → barva vodovky). */
export const WC_PAL = {
  skin: '#f2b48e',
  cheek: '#e8706a',
  hair: '#8a5a34',
  hairDark: '#5e3a20',
  gold: '#e6b347',
  goldDark: '#c08f2e',
  red: '#c8463a',
  white: '#fffaf0',
  green: '#5f9a46',
  greenDark: '#3f7334',
  blue: '#3d6ab0',
  sky: '#5e7fb0',
  wood: '#d8a85a',
  clay: '#a88a6a',
  stone: '#9a948c',
} as const;

const r2 = (n: number): string => String(Math.round(n * 100) / 100);

export interface WcDefsOptions {
  width: number;
  height: number;
  /** Měřítko efektů (menší obrázky v jednotkách viewBoxu → jemnější rozpití). */
  scale?: number;
  /** Papír (barva podkladu). */
  paper?: string;
}

/**
 * Sdílené `<defs>` jednoho obrázku: papír (`%ID%-pp`), lavírování (`%ID%-we`), tuš (`%ID%-wi`), natrhlý okraj
 * pro masky (`%ID%-mb`) a zrno (`%ID%-gp`).
 */
export function wcDefs(o: WcDefsOptions): string {
  const k = o.scale ?? 1;
  const paper = o.paper ?? WC.paper;
  const w = o.width;
  const h = o.height;
  return (
    `<filter id="${ID}-pe" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.04 / k)}" numOctaves="5" seed="2" result="n"/>` +
    `<feDiffuseLighting in="n" lighting-color="${paper}" surfaceScale="${r2(1.8 * k)}"><feDistantLight azimuth="45" elevation="62"/></feDiffuseLighting></filter>` +
    `<pattern id="${ID}-pp" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="${paper}" filter="url(#${ID}-pe)"/></pattern>` +
    `<filter id="${ID}-we" x="-10%" y="-10%" width="120%" height="120%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.022 / k)}" numOctaves="3" seed="4" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${r2(7 * k)}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="${r2(0.7 * k)}" result="b0"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.014 / k)}" numOctaves="2" seed="21" result="lo"/>` +
    `<feColorMatrix in="lo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.3 0.18" result="lom"/>` +
    `<feComposite in="b0" in2="lom" operator="in" result="b"/>` +
    `<feMorphology in="b0" operator="erode" radius="${r2(1.9 * k)}" result="e"/>` +
    `<feComposite in="b0" in2="e" operator="out" result="edge"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.55 / k)}" numOctaves="2" seed="7" result="g"/>` +
    `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.7 -0.6" result="ga"/>` +
    `<feComposite in="b0" in2="ga" operator="in" result="gr"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="edge"/><feMergeNode in="edge"/><feMergeNode in="gr"/></feMerge></filter>` +
    `<filter id="${ID}-wi" x="-6%" y="-6%" width="112%" height="112%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.04 / k)}" numOctaves="2" seed="5" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${r2(1.8 * k)}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `<filter id="${ID}-mb" x="-10%" y="-10%" width="120%" height="120%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.018 / k)}" numOctaves="3" seed="12" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${r2(20 * k)}" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `<filter id="${ID}-ge" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${r2(0.9 / k)}" numOctaves="3" seed="6"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 0.314  0 0 0 0 0.235  0 0 0 0 0.157  7 0 0 0 -3.9"/>` +
    `<feComponentTransfer><feFuncA type="linear" slope="0.1"/></feComponentTransfer></filter>` +
    `<pattern id="${ID}-gp" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="none" filter="url(#${ID}-ge)"/></pattern>`
  );
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
 * (tloušťku tuše je třeba vydělit měřítkem). `data-icon` zůstává kvůli testům a ladění.
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
 * Začátek sestavování jednoho obrázku — id sdílených ikon (`iconRef`) se číslují od nuly, takže stejný obrázek
 * má vždy stejný markup (klíč bitmapové keše).
 */
export function beginArt(): void {
  iconSeq = 0;
}

/**
 * Ikona jako sdílený tvar: definice (vlož do `<defs>`, smí být i uvnitř těla) a odkaz `<use>` — cesta ikony je
 * v markupu jen jednou, i když se maluje ve více vrstvách (stín, papír, vodovka, tuš).
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

// ─────────────────────────── Malování ───────────────────────────

export interface WashOptions {
  /** Krytí barvy (výchozí 0,62). */
  op?: number;
  /** Posun proti lince (soutisk „vedle“). */
  dx?: number;
  dy?: number;
  /** Doplňkové atributy obalu (už escapované). */
  extra?: string;
}

/** Lavírování: plocha vodovou barvou (multiply přes papír), okraje rozpité a tmavší. */
export function wash(shape: string, color: string, o: WashOptions = {}): string {
  const c = safeColor(color, '#888888');
  const op = o.op ?? 0.62;
  const dx = o.dx ?? 1.6;
  const dy = o.dy ?? 1.1;
  const move = dx || dy ? ` transform="translate(${r2(dx)} ${r2(dy)})"` : '';
  return (
    `<g filter="url(#${ID}-we)" style="mix-blend-mode:multiply"${o.extra ? ` ${o.extra}` : ''}>` +
    `<g fill="${c}" color="${c}" opacity="${r2(op)}"${move}>${shape}</g></g>`
  );
}

/** Papír přes tvar (zakryje, co je pod ním — kresba se maluje odzadu dopředu). */
export function knock(shape: string): string {
  return `<g fill="url(#${ID}-pp)">${shape}</g>`;
}

export interface InkOptions {
  color?: string;
  op?: number;
  /** Měřítko tvaru (ikony) — tloušťka se vydělí. */
  scale?: number;
  cap?: 'round' | 'butt';
  extra?: string;
}

/** Linka tuší (lehce rozvlněná). */
export function ink(shape: string, width: number, o: InkOptions = {}): string {
  const w = width / (o.scale ?? 1);
  return (
    `<g fill="none" stroke="${o.color ?? WC.ink}" stroke-width="${r2(w)}" stroke-linejoin="round" stroke-linecap="${o.cap ?? 'round'}"` +
    `${o.op !== undefined && o.op < 1 ? ` opacity="${r2(o.op)}"` : ''} filter="url(#${ID}-wi)"${o.extra ? ` ${o.extra}` : ''}>${shape}</g>`
  );
}

/** Plná tuš (zorničky, drobné tečky). */
export function inkFill(shape: string, color: string = WC.ink): string {
  return `<g fill="${color}" filter="url(#${ID}-wi)">${shape}</g>`;
}

/**
 * Základní tah kresby: papír přes tvar → vodovka → obrys tuší. `inkW` 0 = bez obrysu, `color` null = bez barvy.
 */
export function paint(
  shape: string,
  color: string | null,
  inkW: number,
  o: WashOptions & { noKnock?: boolean } = {},
): string {
  return (
    (o.noKnock ? '' : knock(shape)) +
    (color ? wash(shape, color, o) : '') +
    (inkW > 0 ? ink(shape, inkW * 0.72) : '')
  );
}

/** Ikona namalovaná vodovkou s obrysem tuší (siluety z game-icons.net). */
export function paintIcon(
  name: string,
  at: IconPlacement,
  color: string,
  o: { inkW?: number; op?: number; knock?: boolean; dx?: number; dy?: number } = {},
): string {
  const icon = iconRef(name, at);
  const inkW = o.inkW ?? Math.max(1.1, at.size / 80);
  return (
    `<defs>${icon.def}</defs>` +
    (o.knock ? knock(icon.use) : '') +
    wash(icon.use, color, { op: o.op ?? 0.7, dx: o.dx, dy: o.dy }) +
    (inkW > 0 ? ink(icon.use, inkW, { scale: icon.scale, op: 0.85 }) : '')
  );
}

/** Papírový podklad (s okrajem) a závěrečné zrno přes celý obrázek. */
export function paperBase(w: number, h: number, rx: number, edge: string = WC.paperEdge): string {
  return `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="${rx}" fill="url(#${ID}-pp)" stroke="${edge}" stroke-width="2.5"/>`;
}

export function grainOver(w: number, h: number, rx: number): string {
  return `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="${rx}" fill="url(#${ID}-gp)" pointer-events="none"/>`;
}

/** Maska s natrhlým okrajem (vinětu kresby „vpije“ do papíru). */
export function blobMask(id: string, x: number, y: number, w: number, h: number, rx: number): string {
  return `<mask id="${ID}-${id}"><rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(rx)}" fill="#fff" filter="url(#${ID}-mb)"/></mask>`;
}

/** Míchání barev (pro odstíny palety). */
export function mixColor(a: string, b: string, t: number): string {
  const parse = (c: string): number[] => {
    const m = /^#([0-9a-f]{6})$/i.exec(c);
    if (!m) return [128, 128, 128];
    const v = m[1] as string;
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const pa = parse(a);
  const pb = parse(b);
  return (
    '#' +
    pa
      .map((x, i) => Math.round(x + ((pb[i] ?? 0) - x) * t))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

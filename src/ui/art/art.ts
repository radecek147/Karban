/**
 * Obecný renderer `ArtSpec` → SVG ve stylu „Sirkárna“ (retro tisk, src/ui/art/print.ts; CLAUDE.md kap. 7,
 * ARCHITECTURE 4): ikona + paleta + vzor pozadí + rekvizita, vytištěné plnými barvami se silnou linkou
 * a zasazené do rámečku podle druhu obsahu:
 *
 *  - **žolík** — kartonová karta s oknem obrázku, dole štítek se jménem v barvě vzácnosti, drahokamy 1–4,
 *  - **spotřebky** — pranostika = list kalendáře s kroužky, babská rada = papír z notýsku s izolepou,
 *    úřední razítko = perforovaná známka s otiskem razítka,
 *  - **kupón** — lístek s výřezy a ústřižkem, **obálka** — dopisní obálka / tlustá obálka / krabice od bot,
 *  - **štítek** — kulatý odznak na provázku, **šéf** a útraty — hrací žeton (barva `BossDef.color`),
 *  - **síla piva** — pivní tácek, **balíček** — rub karty, **výzva** — karta s šachovnicovým rámem,
 *  - **vylepšení / pečeť** — malý dlaždicový odznak (sbírka, tooltipy).
 *
 * Pozadí je plná barva `bg`, ikona světlá silueta v barvě `fg` s rastrovým stínem a obrysem, vzor obsahu
 * (`pattern`) je přetisk v barvě `accent`. Žolík s `scene` dostane místo ikony ručně kreslenou scénu.
 *
 * Markup je řetězec s placeholdery `%ID%` (`artMarkupRaw`), `artMarkup` id zunikátní; do stránky se vkládá přímo
 * jako SVG (svg.ts). Barvy z obsahu procházejí `safeColor` a přitahují se k tiskovým inkoustům (`inkOf`).
 */
import type { ArtSpec, BoosterDef, ContentRegistry, JokerRarity } from '../../engine/content-types';
import type { BlindKind, ConsumableKind } from '../../engine/types';
import { registry as defaultRegistry } from '../../content';
import { hasKey, t } from '../../i18n/cs';
import { cardBackMarkupRaw, labelSvg } from './cards';
import { escapeXml, safeColor } from './icons';
import { hasScene, sceneMarkup } from './scenes';
import { svgElement, withUniqueIds } from './svg';
import {
  PR,
  beginArt,
  iconRef,
  iconShape,
  ink,
  inkOf,
  knock,
  mixColor,
  paint,
  paintIcon,
  shp,
  wash,
  printDefs,
} from './print';

export type ArtKind =
  | 'joker'
  | 'consumable'
  | 'voucher'
  | 'tag'
  | 'booster'
  | 'boss'
  | 'blind'
  | 'deck'
  | 'stake'
  | 'challenge'
  | 'enhancement'
  | 'seal';

export interface ArtOptions {
  /** Žolík: vzácnost (rámeček). */
  rarity?: JokerRarity;
  /** Spotřebka: typ (tvar rámečku). */
  consumableKind?: ConsumableKind;
  /** Kupón: úroveň v páru. */
  tier?: 1 | 2;
  /** Obálka: velikost. */
  boosterSize?: BoosterDef['size'];
  /** Šéf / útrata: barva žetonu. */
  color?: string;
  /** Přístupný popisek (`role="img"`); bez něj je obrázek dekorativní. */
  label?: string;
  /** Žolík: jméno na štítku karty (bez něj štítek jen v barvě vzácnosti). */
  title?: string;
}

const ID = '%ID%';
const INK = PR.ink;

/**
 * Barvy vzácností žolíků (tiskové inkousty): námořnická, petrolejová, fialová, zlatá. `frame` = štítek se jménem
 * a drahokamy, `text` = barva jména na štítku.
 */
export const RARITY_COLORS: Readonly<
  Record<JokerRarity, { frame: string; light: string; dark: string; text: string; gems: number }>
> = {
  common: { frame: '#22365c', light: '#bcd6e6', dark: '#1a1714', text: '#f3e8cf', gems: 1 },
  rare: { frame: '#2f8077', light: '#9fd0c4', dark: '#1a1714', text: '#f3e8cf', gems: 2 },
  epic: { frame: '#6b4a9e', light: '#cbb8e3', dark: '#1a1714', text: '#f3e8cf', gems: 3 },
  legendary: { frame: '#e9b030', light: '#f6e3a1', dark: '#1a1714', text: '#1a1714', gems: 4 },
};

/** Barvy typů spotřebek. */
export const CONSUMABLE_COLORS: Readonly<
  Record<ConsumableKind, { frame: string; light: string; dark: string }>
> = {
  pranostika: { frame: '#35648f', light: '#b9d6ef', dark: '#1f3f5e' },
  rada: { frame: '#eadfc4', light: '#fffaf0', dark: '#5d7a2e' },
  razitko: { frame: '#a3272f', light: '#f4ecd8', dark: '#6b161c' },
};

/** Výchozí obrázky žetonů útrat bez šéfa (a šéfa, jehož definice chybí). */
export const BLIND_ART: Readonly<Record<BlindKind, { spec: ArtSpec; color: string }>> = {
  small: { spec: { icon: 'glass-shot', bg: '#1d3f66', fg: '#e8f1ff', pattern: 'dots' }, color: '#3b7fd8' },
  big: { spec: { icon: 'beer-stein', bg: '#5a3a0e', fg: '#fff3d1', pattern: 'stripes' }, color: '#e8a92a' },
  boss: { spec: { icon: 'crowned-skull', bg: '#3a1414', fg: '#ffe1dc', pattern: 'rays' }, color: '#c8372d' },
};

const VIEWBOX: Readonly<Record<ArtKind, string>> = {
  joker: '0 0 250 350',
  consumable: '0 0 250 350',
  voucher: '0 0 250 350',
  booster: '0 0 250 350',
  deck: '0 0 250 350',
  challenge: '0 0 250 350',
  tag: '0 0 120 120',
  boss: '0 0 120 120',
  blind: '0 0 120 120',
  stake: '0 0 120 120',
  enhancement: '0 0 120 120',
  seal: '0 0 120 120',
};

export function artViewBox(kind: ArtKind): string {
  return VIEWBOX[kind];
}

/** Je druh kulatý (žeton, odznak, tácek)? */
export function isRoundArt(kind: ArtKind): boolean {
  return VIEWBOX[kind] === '0 0 120 120';
}

const r1 = (n: number): string => String(Math.round(n * 100) / 100);

// ─────────────────────────── Paleta a vzory ───────────────────────────

interface Palette {
  bg: string;
  fg: string;
  accent: string;
}

function palette(spec: ArtSpec): Palette {
  const bg = safeColor(spec.bg, '#2b2b2b');
  const fg = safeColor(spec.fg, '#f4ecd8');
  return { bg, fg, accent: safeColor(spec.accent, fg) };
}

/** Paprsky ze středu (vzor `rays` a zlatá záře legendárních žolíků) — tvar bez barvy. */
function rayShape(cx: number, cy: number, radius: number, count = 16): string {
  let d = '';
  const half = Math.PI / count / 2;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    d += `M${r1(cx)} ${r1(cy)}L${r1(cx + Math.cos(a - half) * radius)} ${r1(cy + Math.sin(a - half) * radius)}L${r1(cx + Math.cos(a + half) * radius)} ${r1(cy + Math.sin(a + half) * radius)}z`;
  }
  return shp.path(d);
}

type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

function shapeMarkup(shape: Shape): string {
  return shape.kind === 'rect'
    ? shp.rect(shape.x, shape.y, shape.w, shape.h, shape.rx)
    : shp.circle(shape.cx, shape.cy, shape.r);
}

function shapeBox(shape: Shape): {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  half: number;
} {
  return shape.kind === 'rect'
    ? {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        cx: shape.x + shape.w / 2,
        cy: shape.y + shape.h / 2,
        half: Math.max(shape.w, shape.h) / 2,
      }
    : {
        x: shape.cx - shape.r,
        y: shape.cy - shape.r,
        w: shape.r * 2,
        h: shape.r * 2,
        cx: shape.cx,
        cy: shape.cy,
        half: shape.r,
      };
}

/** Přetisk vzoru pozadí v barvě `accent` (poloprůhledný inkoust přes plnou barvu okna) v boxu okna. */
function patternPaint(
  pattern: ArtSpec['pattern'],
  color: string,
  b: ReturnType<typeof shapeBox>,
  k: number,
): string {
  const s = (n: number): number => n * k;
  const c = inkOf(color);
  const over = (shape: string, op = 0.32): string => `<g fill="${c}" opacity="${op}">${shape}</g>`;
  const lines = (d: string, w: number, op = 0.32): string =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${r1(w)}" stroke-linejoin="round" opacity="${op}"/>`;
  let d = '';
  switch (pattern) {
    case 'stripes':
      for (let x = b.x - b.h; x < b.x + b.w; x += s(30))
        d += `M${r1(x)} ${r1(b.y + b.h)}L${r1(x + b.h * 0.7)} ${r1(b.y)}`;
      return lines(d, s(11), 0.28);
    case 'dots': {
      let dots = '';
      for (let y = b.y + s(12), j = 0; y < b.y + b.h; y += s(24), j++)
        for (let x = b.x + s(12) + (j % 2) * s(12); x < b.x + b.w; x += s(24))
          dots += shp.circle(x, y, s(4.5));
      return over(dots, 0.4);
    }
    case 'checker': {
      let sq = '';
      for (let y = b.y, j = 0; y < b.y + b.h; y += s(28), j++)
        for (let x = b.x + (j % 2) * s(28); x < b.x + b.w; x += s(56)) sq += shp.rect(x, y, s(28), s(28));
      return over(sq, 0.22);
    }
    case 'waves':
      for (let y = b.y + s(14); y < b.y + b.h; y += s(22)) {
        d += `M${r1(b.x - s(10))} ${r1(y)}`;
        for (let x = b.x - s(10); x < b.x + b.w + s(20); x += s(40))
          d += `q${r1(s(10))} ${r1(-s(9))} ${r1(s(20))} 0t${r1(s(20))} 0`;
      }
      return lines(d, s(4), 0.38);
    case 'grid':
      for (let x = b.x + s(11); x < b.x + b.w; x += s(22)) d += `M${r1(x)} ${r1(b.y)}V${r1(b.y + b.h)}`;
      for (let y = b.y + s(11); y < b.y + b.h; y += s(22)) d += `M${r1(b.x)} ${r1(y)}H${r1(b.x + b.w)}`;
      return lines(d, s(1.6), 0.4);
    case 'zigzag':
      for (let y = b.y + s(16); y < b.y + b.h; y += s(22)) {
        d += `M${r1(b.x)} ${r1(y)}`;
        for (let x = b.x; x < b.x + b.w; x += s(16)) d += `l${r1(s(8))} ${r1(-s(8))}l${r1(s(8))} ${r1(s(8))}`;
      }
      return lines(d, s(4), 0.38);
    case 'rays':
      return over(rayShape(b.cx, b.cy, b.half * 1.6), 0.22);
    default:
      return '';
  }
}

interface WindowOpts {
  /** Velikost hlavní ikony (jinak podle tvaru). */
  iconSize?: number;
  /** Svislý posun ikony od středu okna. */
  iconDy?: number;
  /** Zlatá záře za ikonou (legendární). */
  glow?: string;
  /** Měřítko efektů (malé žetony 0,5). */
  k?: number;
  /** Kreslit rekvizitu? */
  prop?: boolean;
}

/**
 * Okno s obrázkem: plné pozadí `bg` s přetiskem vzoru, světlá silueta ikony v barvě `fg` s rastrovým stínem
 * a obrysem, rekvizita v kroužku. Vrací [defs, body].
 */
function artWindow(spec: ArtSpec, shape: Shape, opts: WindowOpts = {}): [string, string] {
  const p = palette(spec);
  const b = shapeBox(shape);
  const k = opts.k ?? 1;
  const defs = `<clipPath id="${ID}-win">${shapeMarkup(shape)}</clipPath>`;
  const size = opts.iconSize ?? Math.round(b.half * 1.15);
  const iy = b.cy - size / 2 + (opts.iconDy ?? 0);
  const ix = b.cx - size / 2;
  const scene = hasScene(spec.scene);
  const back =
    wash(shapeMarkup(shape), p.bg, { op: scene ? 0.2 : 1, dx: 0, dy: 0 }) +
    (scene ? '' : patternPaint(spec.pattern, p.accent, b, k)) +
    (opts.glow
      ? wash(rayShape(b.cx, b.cy + (opts.iconDy ?? 0), b.half * 1.6, 20), opts.glow, {
          op: 0.5,
          dx: 0,
          dy: 0,
        })
      : '');
  let body = `<g clip-path="url(#${ID}-win)">${back}${scene ? sceneMarkup(spec.scene as string) : ''}</g>`;
  if (!scene) {
    const icon = iconRef(spec.icon, { x: ix, y: iy, size });
    // Rastrový stín vedle siluety, papírový podklad, barva `fg` lehce vedle linky a silný obrys.
    body +=
      `<g class="art-icon"><defs>${icon.def}</defs>` +
      wash(icon.use, PR.ink, { op: 0.3, dx: size * 0.045, dy: size * 0.06 }) +
      knock(icon.use) +
      wash(icon.use, p.fg, { op: 1, dx: 1.8 * k, dy: 1.4 * k }) +
      ink(icon.use, Math.max(1.4, size / 52), { scale: icon.scale }) +
      `</g>`;
  }
  if (spec.prop && opts.prop !== false && !scene) {
    const ps = Math.round(size * 0.36);
    const pr = ps * 0.72;
    const pcx = shape.kind === 'rect' ? shape.x + shape.w - pr - 8 : b.cx + b.half * 0.6;
    const pcy = shape.kind === 'rect' ? shape.y + shape.h - pr - 8 : b.cy + b.half * 0.6;
    body +=
      `<g class="art-prop">` +
      paint(shp.circle(pcx, pcy, pr), null, Math.max(1.2, pr * 0.1)) +
      wash(shp.circle(pcx, pcy, pr), p.accent, { op: 0.25, dx: 0, dy: 0 }) +
      paintIcon(spec.prop, { x: pcx - ps / 2, y: pcy - ps / 2, size: ps }, p.bg, {
        op: 0.72,
        inkW: Math.max(0.8, ps / 60),
      }) +
      `</g>`;
  }
  return [defs, body];
}

/** Kosočtverečné drahokamy na papírovém štítku vlevo nahoře (počet = úroveň vzácnosti, čitelné i bez barev). */
function gems(count: number, color: string): string {
  const gap = 18;
  const x0 = 34;
  const cy = 34;
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + i * gap;
    d += `<path d="M${r1(x)} ${cy - 8}l7 8l-7 8l-7-8z"/>`;
  }
  const w = 22 + (count - 1) * gap + 14;
  return (
    `<g class="art-gems" data-gems="${count}">` +
    `<rect x="22" y="22" width="${w}" height="24" rx="5" fill="${PR.paper}" stroke="${PR.ink}" stroke-width="3.5"/>` +
    `<g fill="${inkOf(color)}" stroke="${PR.ink}" stroke-width="2.4" stroke-linejoin="round">${d}</g></g>`
  );
}

/** Kartonový podklad karty se silnou linkou. */
function paperCard(rx = 18, edge: string = PR.paperEdge, fill: string = PR.paper): string {
  return `<rect x="4" y="4" width="242" height="342" rx="${rx}" fill="${inkOf(fill)}" stroke="${edge}" stroke-width="7"/>`;
}

/** Jméno na štítku karty: tučné zúžené verzálky; dlouhé jméno se stáhne, aby se vešlo. */
function titleText(title: string, cx: number, y: number, maxW: number, color: string, size = 34): string {
  // Nezlomitelné mezery (předložky) v SVG textu nic nedělají — a `&nbsp;` by po serializaci nebylo platné XML.
  const text = title.replace(/\u00a0/g, ' ').toLocaleUpperCase('cs');
  const chars = [...text].length;
  const fs = chars > 15 ? size * 0.82 : size;
  // Big Shoulders Display 800 v verzálkách ≈ 0,5 em na znak.
  const fit = chars * fs * 0.5 > maxW ? ` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"` : '';
  return (
    `<text class="art-title" x="${cx}" y="${y}" text-anchor="middle" font-family="'Big Shoulders Display', 'Barlow Condensed', 'Arial Narrow', sans-serif" ` +
    `font-weight="800" font-size="${r1(fs)}" letter-spacing="0.5" fill="${color}"${fit}>${escapeXml(text)}</text>`
  );
}

// ─────────────────────────── Druhy rámečků ───────────────────────────

function jokerArt(spec: ArtSpec, rarity: JokerRarity, title?: string): [string, string] {
  const r = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
  const [defs, win] = artWindow(
    spec,
    { kind: 'rect', x: 18, y: 18, w: 214, h: 248, rx: 6 },
    {
      iconSize: 150,
      glow: rarity === 'legendary' ? r.frame : undefined,
    },
  );
  const body =
    paperCard(16) +
    win +
    `<rect x="18" y="18" width="214" height="248" rx="6" fill="none" stroke="${PR.ink}" stroke-width="5"/>` +
    // Štítek se jménem v barvě vzácnosti (soutisk: barva lehce vedle linky).
    `<rect x="16" y="278" width="218" height="54" rx="7" fill="${inkOf(r.frame)}" transform="translate(1.6 1.2)"/>` +
    `<rect x="16" y="278" width="218" height="54" rx="7" fill="none" stroke="${PR.ink}" stroke-width="5"/>` +
    (title ? titleText(title, 125, 317, 198, r.text) : '') +
    gems(r.gems, r.frame);
  return [defs, body];
}

function consumableArt(spec: ArtSpec, kind: ConsumableKind): [string, string] {
  const c = CONSUMABLE_COLORS[kind];
  if (kind === 'rada') {
    // Papír z notýsku: linky, červený okraj, izolepa; dole bylinkový štítek.
    const [defs, win] = artWindow(
      spec,
      { kind: 'rect', x: 30, y: 40, w: 196, h: 228, rx: 14 },
      { iconSize: 140 },
    );
    let lines = '';
    for (let y = 30; y < 340; y += 16) lines += `M10 ${y}H240`;
    const body =
      paperCard(10) +
      ink(shp.path(lines), 0.9, { color: '#7f9fc4', op: 0.45 }) +
      ink(shp.path('M22 4V346'), 1.4, { color: '#c86060', op: 0.7 }) +
      win +
      wash(shp.rect(10, 22, 64, 20), '#f3e39a', {
        op: 0.6,
        dx: 0,
        dy: 0,
        extra: 'transform="rotate(-24 42 32)"',
      }) +
      wash(shp.rect(176, 22, 64, 20), '#f3e39a', {
        op: 0.6,
        dx: 0,
        dy: 0,
        extra: 'transform="rotate(24 208 32)"',
      }) +
      wash(shp.rect(30, 284, 196, 46, 10), c.dark, { op: 0.7, dx: 0, dy: 0 }) +
      knock(iconShape('linden-leaf', { x: 111, y: 293, size: 28 }).markup);
    return [defs, body];
  }
  if (kind === 'razitko') {
    // Poštovní známka: perforovaný okraj (maska), červený rám, otisk razítka.
    const [defs, win] = artWindow(
      spec,
      { kind: 'rect', x: 24, y: 24, w: 202, h: 244, rx: 8 },
      { iconSize: 140 },
    );
    let holes = '';
    for (let x = 14; x <= 236; x += 22)
      holes += `<circle cx="${x}" cy="2" r="7"/><circle cx="${x}" cy="348" r="7"/>`;
    for (let y = 14; y <= 336; y += 22)
      holes += `<circle cx="2" cy="${y}" r="7"/><circle cx="248" cy="${y}" r="7"/>`;
    const mask = `<mask id="${ID}-perf"><rect width="250" height="350" fill="#fff"/><g fill="#000">${holes}</g></mask>`;
    const body =
      `<g mask="url(#${ID}-perf)"><rect x="0" y="0" width="250" height="350" fill="${PR.paper}"/>` +
      wash(shp.rect(0, 0, 250, 350), '#f4e6c8', { op: 0.4, dx: 0, dy: 0 }) +
      `</g>` +
      wash(
        `<rect x="14" y="14" width="222" height="322" fill="none" stroke="currentColor" stroke-width="7"/>`,
        c.frame,
        {
          op: 0.75,
          dx: 0,
          dy: 0,
        },
      ) +
      win +
      wash(shp.rect(24, 282, 202, 44, 6), c.frame, { op: 0.75, dx: 0, dy: 0 }) +
      knock(iconShape('stamper', { x: 111, y: 290, size: 28 }).markup) +
      ink(shp.circle(192, 236, 40), 4, { color: c.frame, op: 0.5 }) +
      ink(shp.circle(192, 236, 30), 1.6, { color: c.frame, op: 0.5, extra: 'stroke-dasharray="5 4"' }) +
      ink(shp.path('M158 250l68-28'), 3.4, { color: c.frame, op: 0.5 });
    return [defs + mask, body];
  }
  // Pranostika: list z kalendáře s kroužkovou vazbou a záhlavím.
  const [defs, win] = artWindow(
    spec,
    { kind: 'rect', x: 16, y: 66, w: 218, h: 210, rx: 14 },
    { iconSize: 136 },
  );
  const body =
    `<rect x="4" y="10" width="242" height="336" rx="14" fill="${PR.paper}" stroke="${PR.ink}" stroke-width="7"/>` +
    wash(shp.path('M4 24a12 12 0 0 1 12-12h218a12 12 0 0 1 12 12v34H4z'), c.frame, {
      op: 0.78,
      dx: 0,
      dy: 0,
    }) +
    ink(shp.path('M16 46H234'), 1.2, { color: PR.paper, op: 0.6, extra: 'stroke-dasharray="6 6"' }) +
    [70, 180]
      .map(
        (x) =>
          wash(shp.circle(x, 22, 7), INK, { op: 0.6, dx: 0, dy: 0 }) +
          paint(shp.rect(x - 4, 0, 8, 24, 4), '#c9ccd1', 1.6),
      )
      .join('') +
    win +
    wash(shp.rect(16, 288, 218, 46, 10), c.frame, { op: 0.75, dx: 0, dy: 0 }) +
    knock(iconShape('fluffy-cloud', { x: 109, y: 295, size: 32 }).markup);
  return [defs, body];
}

function voucherArt(spec: ArtSpec, tier: 1 | 2): [string, string] {
  const frame = tier === 2 ? '#c8961a' : '#3f7a5c';
  const light = tier === 2 ? '#f2d478' : '#b9dcc8';
  const [defs, win] = artWindow(
    spec,
    { kind: 'rect', x: 20, y: 20, w: 210, h: 240, rx: 16 },
    { iconSize: 140 },
  );
  const mask =
    `<mask id="${ID}-tick"><rect width="250" height="350" fill="#fff"/>` +
    `<circle cx="0" cy="282" r="16" fill="#000"/><circle cx="250" cy="282" r="16" fill="#000"/></mask>`;
  const body =
    `<g mask="url(#${ID}-tick)">` +
    paperCard(16) +
    wash(shp.rect(4, 4, 242, 342, 14), light, { op: 0.45, dx: 0, dy: 0 }) +
    ink(shp.rect(10, 10, 230, 330, 10), 1.6, { color: frame, op: 0.75, extra: 'stroke-dasharray="8 5"' }) +
    `</g>` +
    win +
    ink(shp.path('M22 282H228'), 2.2, { color: frame, op: 0.8, extra: 'stroke-dasharray="7 7"' }) +
    paintIcon('ticket', { x: 105, y: 296, size: 40 }, frame, { op: 0.75, inkW: 1 }) +
    (tier === 2 ? paint(shp.path('M40 316l6-14l6 14l-14-9h16zM198 316l6-14l6 14l-14-9h16z'), frame, 1) : '');
  return [defs + mask, body];
}

function boosterArt(spec: ArtSpec, size: BoosterDef['size']): [string, string] {
  const p = palette(spec);
  const b = { x: 14, y: 40, w: 222, h: 300, cx: 125, cy: 190, half: 150 };
  const pattern = patternPaint(spec.pattern, p.accent, b, 1.2);
  const clip = `<clipPath id="${ID}-env"><rect x="4" y="38" width="234" height="300" rx="12"/></clipPath>`;
  if (size === 'mega') {
    // Krabice od bot: víko + krabice + štítek.
    const body =
      paint(shp.rect(14, 118, 222, 226, 6), p.bg, 2.2, { op: 0.8, dx: 0, dy: 0 }) +
      `<g clip-path="url(#${ID}-box)">${patternPaint(spec.pattern, p.accent, { x: 14, y: 118, w: 222, h: 226, cx: 125, cy: 231, half: 113 }, 1.2)}</g>` +
      paint(shp.rect(4, 70, 242, 62, 8), mixColor(p.bg, '#000000', 0.2), 2.2, { op: 0.85, dx: 0, dy: 0 }) +
      ink(shp.path('M4 120H246'), 1.4, { op: 0.4 }) +
      paint(shp.rect(62, 170, 126, 126, 10), null, 1.6) +
      paintIcon(spec.icon, { x: 70, y: 178, size: 110 }, p.bg, { op: 0.8 }) +
      ink(shp.path('M30 96h40M180 96h40'), 3.2, { color: p.fg, op: 0.6 });
    return [
      `<clipPath id="${ID}-box"><rect x="14" y="118" width="222" height="226" rx="6"/></clipPath>`,
      body,
    ];
  }
  const envIcon = (): string => {
    const icon = iconRef(spec.icon, { x: 71, y: 196, size: 100 });
    return (
      `<defs>${icon.def}</defs>` +
      knock(icon.use) +
      wash(icon.use, p.fg, { op: 0.4 }) +
      ink(icon.use, 1.4, { scale: icon.scale, op: 0.85 })
    );
  };
  const envelope = (dx: number, dy: number, back: boolean): string =>
    `<g transform="translate(${dx} ${dy})"${back ? ' opacity="0.8"' : ''}>` +
    paint(shp.rect(4, 38, 234, 300, 12), p.bg, 2.2, { op: 0.8, dx: 0, dy: 0 }) +
    (back
      ? ''
      : `<g clip-path="url(#${ID}-env)">${pattern}</g>` +
        ink(shp.path('M8 330L121 210L234 330'), 1.6, { op: 0.4 }) +
        paint(
          shp.path('M4 50a12 12 0 0 1 12-12h210a12 12 0 0 1 12 12L121 172z'),
          mixColor(p.bg, '#000000', 0.18),
          2.2,
          { op: 0.85, dx: 0, dy: 0 },
        ) +
        paint(shp.circle(121, 168, 17), '#b91c1c', 1.6, { op: 0.85 }) +
        ink(shp.circle(121, 168, 10), 1.4, { color: '#fca5a5', op: 0.8 }) +
        envIcon()) +
    `</g>`;
  const body = size === 'jumbo' ? envelope(10, -10, true) + envelope(0, 4, false) : envelope(4, 0, false);
  return [clip, body];
}

/** Hrací žeton (šéf, útrata): okraj v barvě žetonu se zářezy, uprostřed obrázek. */
function chipArt(spec: ArtSpec, color: string): [string, string] {
  const c = safeColor(color, '#c8372d');
  let notches = '';
  for (let i = 0; i < 8; i++) {
    notches += `<rect x="55" y="4" width="10" height="16" rx="2" transform="rotate(${i * 45} 60 60)"/>`;
  }
  const [defs, win] = artWindow(
    spec,
    { kind: 'circle', cx: 60, cy: 60, r: 38 },
    { iconSize: 50, k: 0.5, prop: false },
  );
  const body =
    `<circle cx="60" cy="60" r="56" fill="${inkOf(c)}"/>` +
    knock(notches) +
    `<circle cx="60" cy="60" r="56" fill="none" stroke="${PR.ink}" stroke-width="4"/>` +
    ink(shp.circle(60, 60, 45), 1.6, { color: PR.paper, extra: 'stroke-dasharray="5 4"' }) +
    knock(shp.circle(60, 60, 38)) +
    win +
    `<circle cx="60" cy="60" r="38" fill="none" stroke="${PR.ink}" stroke-width="3.2"/>`;
  return [defs, body];
}

/** Štítek: kulatý odznak na provázku. */
function tagArt(spec: ArtSpec): [string, string] {
  const [defs, win] = artWindow(spec, { kind: 'circle', cx: 60, cy: 64, r: 38 }, { iconSize: 48, k: 0.5 });
  const body =
    ink(shp.path('M60 14C52 6 44 2 36 2'), 1.8, { color: '#8a6a3a', op: 0.9 }) +
    paint(shp.circle(60, 64, 52), '#e3c76a', 1.8, { op: 0.8 }) +
    ink(shp.circle(60, 64, 46), 1.4, { color: '#8a6410', op: 0.7, extra: 'stroke-dasharray="3 4"' }) +
    knock(shp.circle(60, 64, 38)) +
    win +
    ink(shp.circle(60, 64, 38), 1.4, { color: '#8a6410', op: 0.8 }) +
    paint(shp.circle(60, 17, 4), null, 1.4);
  return [defs, body];
}

/** Síla piva: pivní tácek se zoubkovaným okrajem. */
function stakeArt(spec: ArtSpec): [string, string] {
  const p = palette(spec);
  let d = '';
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const rr = i % 2 === 0 ? 57 : 53;
    d += `${i === 0 ? 'M' : 'L'}${r1(60 + Math.cos(a) * rr)} ${r1(60 + Math.sin(a) * rr)}`;
  }
  const [defs, win] = artWindow(spec, { kind: 'circle', cx: 60, cy: 60, r: 40 }, { iconSize: 52, k: 0.5 });
  const body =
    paint(shp.path(`${d}z`), '#f4e6c8', 1.6, { op: 0.5 }) +
    wash(`<circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" stroke-width="4"/>`, p.bg, {
      op: 0.8,
      dx: 0,
      dy: 0,
    }) +
    win +
    ink(shp.circle(60, 60, 40), 1.1, { op: 0.6 });
  return [defs, body];
}

/** Výzva: karta s šachovnicovým (cílovým) rámem. */
function challengeArt(spec: ArtSpec): [string, string] {
  const [defs, win] = artWindow(
    spec,
    { kind: 'rect', x: 22, y: 22, w: 206, h: 306, rx: 14 },
    { iconSize: 150 },
  );
  let sq = '';
  for (let y = 2, j = 0; y < 348; y += 10, j++)
    for (let x = 2 + (j % 2) * 10; x < 248; x += 20) sq += shp.rect(x, y, 10, 10);
  const body =
    paperCard(16) +
    `<g clip-path="url(#${ID}-chk)">${wash(sq, INK, { op: 0.7, dx: 0, dy: 0 })}</g>` +
    knock(shp.rect(22, 22, 206, 306, 14)) +
    win +
    ink(shp.rect(22, 22, 206, 306, 14), 2, { op: 0.8 });
  const clip = `<clipPath id="${ID}-chk"><rect x="2" y="2" width="246" height="346" rx="16"/></clipPath>`;
  return [defs + clip, body];
}

/** Vylepšení / pečeť: zaoblená dlaždice s ikonou (sbírka, tooltipy). */
function tileArt(spec: ArtSpec, round: boolean): [string, string] {
  const shape: Shape = round
    ? { kind: 'circle', cx: 60, cy: 60, r: 52 }
    : { kind: 'rect', x: 8, y: 8, w: 104, h: 104, rx: 18 };
  const [defs, win] = artWindow(spec, shape, { iconSize: 66, k: 0.5, prop: false });
  return [defs, knock(shapeMarkup(shape)) + win + ink(shapeMarkup(shape), 2, { op: 0.85 })];
}

// ─────────────────────────── Veřejné API ───────────────────────────

/** SVG markup obrázku obsahu s placeholdery `%ID%` (klíč bitmapové keše). */
export function artMarkupRaw(kind: ArtKind, spec: ArtSpec, opts: ArtOptions = {}): string {
  beginArt(isRoundArt(kind) ? 0.5 : 1);
  if (kind === 'deck') {
    // Balíček = rub karty v barvách balíčku.
    return cardBackMarkupRaw(spec).replace('class="pc-svg pc-back"', 'class="art-svg art-deck"');
  }
  let parts: [string, string];
  switch (kind) {
    case 'joker':
      parts = jokerArt(spec, opts.rarity ?? 'common', opts.title);
      break;
    case 'consumable':
      parts = consumableArt(spec, opts.consumableKind ?? 'pranostika');
      break;
    case 'voucher':
      parts = voucherArt(spec, opts.tier ?? 1);
      break;
    case 'booster':
      parts = boosterArt(spec, opts.boosterSize ?? 'normal');
      break;
    case 'boss':
    case 'blind':
      parts = chipArt(spec, opts.color ?? BLIND_ART.boss.color);
      break;
    case 'tag':
      parts = tagArt(spec);
      break;
    case 'stake':
      parts = stakeArt(spec);
      break;
    case 'challenge':
      parts = challengeArt(spec);
      break;
    case 'seal':
      parts = tileArt(spec, true);
      break;
    case 'enhancement':
    default:
      parts = tileArt(spec, false);
      break;
  }
  const [defs, body] = parts;
  const round = isRoundArt(kind);
  const w = round ? 120 : 250;
  const h = round ? 120 : 350;
  const data = [
    `data-kind="${kind}"`,
    opts.rarity ? `data-rarity="${escapeXml(opts.rarity)}"` : '',
    opts.consumableKind ? `data-consumable="${escapeXml(opts.consumableKind)}"` : '',
    `data-icon-name="${escapeXml(spec.icon)}"`,
    spec.scene && hasScene(spec.scene) ? `data-scene="${escapeXml(spec.scene)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX[kind]}" class="art-svg art-${kind}" ${data} focusable="false">` +
    `<defs>${printDefs({ width: w, height: h })}${defs}</defs>` +
    body +
    `</svg>`
  );
}

/** SVG markup obrázku obsahu (unikátní id ve `<defs>`). */
export function artMarkup(kind: ArtKind, spec: ArtSpec, opts: ArtOptions = {}): string {
  return withUniqueIds(artMarkupRaw(kind, spec, opts));
}

/** SVG element obrázku obsahu (s `label` přístupný jako `role="img"`). */
export function artElement(kind: ArtKind, spec: ArtSpec, opts: ArtOptions = {}): SVGSVGElement {
  return labelSvg(svgElement(artMarkupRaw(kind, spec, opts)), opts.label);
}

/** Záložní obrázek pro neznámé id (obsah se mohl mezi verzemi změnit). */
export const UNKNOWN_ART: ArtSpec = { icon: 'question', bg: '#3a3a3a', fg: '#f4ecd8', pattern: 'none' };

export type ContentArtKind = Exclude<ArtKind, 'blind'>;

/**
 * Obrázek obsahu podle id z registru (žolík, spotřebka, kupón, štítek, obálka, šéf, balíček, síla piva, výzva,
 * vylepšení, pečeť) — rámeček, vzácnost, typ i barvu žetonu vybere podle definice. Neznámé id → otazník.
 */
export function contentArt(
  kind: ContentArtKind,
  id: string,
  opts: { label?: string; registry?: ContentRegistry } = {},
): SVGSVGElement {
  const reg = opts.registry ?? defaultRegistry();
  const o: ArtOptions = { label: opts.label };
  let spec: ArtSpec | undefined;
  switch (kind) {
    case 'joker': {
      const def = reg.jokers[id];
      spec = def?.art;
      o.rarity = def?.rarity;
      if (def && hasKey(`jokers.${id}.name`)) o.title = t(`jokers.${id}.name`);
      break;
    }
    case 'consumable': {
      const def = reg.consumables[id];
      spec = def?.art;
      o.consumableKind = def?.kind;
      break;
    }
    case 'voucher': {
      const def = reg.vouchers[id];
      spec = def?.art;
      o.tier = def?.tier;
      break;
    }
    case 'booster': {
      const def = reg.boosters[id];
      spec = def?.art;
      o.boosterSize = def?.size;
      break;
    }
    case 'boss': {
      const def = reg.bosses[id];
      spec = def?.art;
      o.color = def?.color;
      break;
    }
    case 'tag':
      spec = reg.tags[id]?.art;
      break;
    case 'deck':
      spec = reg.decks[id]?.art;
      break;
    case 'stake':
      spec = reg.stakes[id]?.art;
      break;
    case 'challenge':
      spec = reg.challenges[id]?.art;
      break;
    case 'enhancement':
      spec = reg.enhancements[id]?.art;
      break;
    case 'seal':
      spec = reg.seals[id]?.art;
      break;
  }
  return artElement(kind, spec ?? UNKNOWN_ART, o);
}

/**
 * Žeton útraty: Malá a Velká mají vlastní obrázek (malé a velké pivo), šéf obrázek a barvu z `BossDef`
 * (u Velké útraty s pravidlem šéfa — Imperial — se ukáže šéf).
 */
export function blindArt(
  kind: BlindKind,
  bossId: string | null,
  opts: { label?: string; registry?: ContentRegistry } = {},
): SVGSVGElement {
  const reg = opts.registry ?? defaultRegistry();
  const boss = bossId ? reg.bosses[bossId] : undefined;
  if (boss) return artElement('boss', boss.art, { color: boss.color, label: opts.label });
  const base = BLIND_ART[kind];
  return artElement('blind', base.spec, { color: base.color, label: opts.label });
}

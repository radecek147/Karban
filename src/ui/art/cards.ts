/**
 * SVG hrací karty — líc a rub ve výtvarném stylu „Sirkárna“ (retro tisk, src/ui/art/print.ts; vlastní
 * procedurální grafika, CLAUDE.md kap. 7).
 *
 *  - viewBox 250 × 350 (poměr 5 : 7), čitelné při šířce ~70–110 px,
 *  - rohové indexy 2–10, J, Q, K, A + symbol barvy **vždy** (kvůli barvoslepým),
 *  - pipy 2–10 v klasickém rozložení — plná tisková barva lehce vedle silné linky, eso s velkým symbolem,
 *  - figury stylizované česky: Kluk s čepicí a peřím, Dáma v šátku na puntíky s korálemi, Král s korunou,
 *    knírem a hermelínem — dvouhlavé (zrcadlené) jako skutečné karty,
 *  - barvy karet jsou v obrázku zapečené: klasické (♥♦ rumělka, ♠♣ čerň), nebo čtyřbarevné pro barvoslepé
 *    (♦ modrá, ♣ zelená) — podle třídy `.colorblind` na <html>,
 *  - vylepšení mění rámeček a tón karty (kamenná nemá index ani barvu), pečeť je vosková pečeť vlevo dole,
 *    edice a stav „mimo provoz“ řeší CSS na obalu (components/card.ts).
 *
 * Markup se skládá jako řetězec (rychlé, kešovatelné); id ve `<defs>` jsou pro každou instanci unikátní.
 */
import type { ArtSpec, ContentRegistry } from '../../engine/content-types';
import type { Card, Rank, Suit } from '../../engine/types';
import { registry as defaultRegistry } from '../../content';
import { t } from '../../i18n/cs';
import { SUIT_PATH_D, escapeXml, iconsLoaded, safeColor } from './icons';
import { svgElement, withUniqueIds } from './svg';
import {
  PR,
  PR_PAL,
  beginArt,
  grainOver,
  iconShape,
  ink,
  inkFill,
  knock,
  mixColor,
  paint,
  paintIcon,
  shp,
  wash,
  printDefs,
} from './print';

export const CARD_WIDTH = 250;
export const CARD_HEIGHT = 350;
export const CARD_VIEWBOX = `0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`;
/** Výška / šířka karty. */
export const CARD_RATIO = CARD_HEIGHT / CARD_WIDTH;

/** Co karta potřebuje k vykreslení líce. */
export type CardFace = Pick<Card, 'suit' | 'rank' | 'enhancement' | 'seal'>;

/** CSS proměnná barvy podle `Suit` (+ záložní barva, kdyby styly chyběly). */
export const SUIT_VARS: Readonly<Record<Suit, { cssVar: string; fallback: string; name: string }>> = {
  S: { cssVar: '--suit-spades', fallback: '#1e1b16', name: 'spades' },
  H: { cssVar: '--suit-hearts', fallback: '#c8372d', name: 'hearts' },
  D: { cssVar: '--suit-diamonds', fallback: '#c8372d', name: 'diamonds' },
  C: { cssVar: '--suit-clubs', fallback: '#1e1b16', name: 'clubs' },
};

/** Barevné schéma karet: klasické, nebo čtyřbarevné (barvoslepý režim). */
export type SuitScheme = 'classic' | 'four';

interface SuitInk {
  /** Tuš indexu (hodnota). */
  ink: string;
  /** Vodovka symbolů. */
  wash: string;
  /** Oblečení figur. */
  cloth: string;
}

/** Tiskové barvy karet: ♠♣ čerň (oblečení figur námořnická), ♥♦ rumělka; pro barvoslepé ♦ modrá, ♣ zelená. */
const SUIT_INKS: Readonly<Record<SuitScheme, Readonly<Record<Suit, SuitInk>>>> = {
  classic: {
    S: { ink: '#1a1714', wash: '#1a1714', cloth: '#22365c' },
    H: { ink: '#b8302a', wash: '#d7442c', cloth: '#d7442c' },
    D: { ink: '#b8302a', wash: '#d7442c', cloth: '#d7442c' },
    C: { ink: '#1a1714', wash: '#1a1714', cloth: '#22365c' },
  },
  four: {
    S: { ink: '#1a1714', wash: '#1a1714', cloth: '#22365c' },
    H: { ink: '#b8302a', wash: '#d7442c', cloth: '#d7442c' },
    D: { ink: '#2f5fa8', wash: '#2f5fa8', cloth: '#2f5fa8' },
    C: { ink: '#2f6b3a', wash: '#2f6b3a', cloth: '#2f6b3a' },
  },
};

/** Aktuální schéma podle třídy `.colorblind` na <html> (bez dokumentu klasické). */
export function currentSuitScheme(): SuitScheme {
  return typeof document !== 'undefined' && document.documentElement?.classList.contains('colorblind')
    ? 'four'
    : 'classic';
}

const ID = '%ID%';
const PAPER_RX = 18;

// ─────────────────────────── Pomocné kreslení ───────────────────────────

const r1 = (n: number): string => String(Math.round(n * 100) / 100);
const r3 = (n: number): string => String(Math.round(n * 1000) / 1000);

/** Transformace symbolu barvy (cesta v boxu 512 × 512) na střed (cx, cy) a velikost; `flip` = otočený o 180°. */
function suitTransform(cx: number, cy: number, size: number, flip = false): string {
  const s = size / 512;
  const move = `translate(${r1(cx - size / 2)} ${r1(cy - size / 2)}) scale(${r3(s)})`;
  return flip ? `rotate(180 ${r1(cx)} ${r1(cy)}) ${move}` : move;
}

/** Symbol barvy jako tvar bez barvy (pro lavírování / tuš). */
function suitShape(suit: Suit, cx: number, cy: number, size: number, flip = false): string {
  return `<path d="${SUIT_PATH_D[suit]}" transform="${suitTransform(cx, cy, size, flip)}"/>`;
}

/**
 * Tahy znaků rohového indexu (box 26 × 40, tah 5,5) — kreslené cestami, ne písmem, aby byl index ostrý a stejný
 * všude (i v bitmapě, kde webové písmo není). Znaky, které tu nejsou, se vykreslí textem.
 */
const INDEX_GLYPHS: Readonly<Record<string, { d: string; w: number }>> = {
  '0': { d: 'M13 0C6 0 3 9 3 20s3 20 10 20s10-9 10-20s-3-20-10-20z', w: 26 },
  '1': { d: 'M5 7l8-7v40', w: 18 },
  '2': { d: 'M3 10C3 3 9 0 13 0c6 0 10 4 10 10c0 7-7 12-20 30h21', w: 26 },
  '3': {
    d: 'M3 4c3-3 6-4 10-4c6 0 10 4 10 9c0 6-5 10-11 10c7 0 12 4 12 10c0 7-5 11-11 11c-5 0-9-2-11-5',
    w: 26,
  },
  '4': { d: 'M18 40V0L2 28h24', w: 26 },
  '5': { d: 'M22 1H6L4 18c3-2 6-3 9-3c7 0 11 5 11 12c0 8-5 13-12 13c-4 0-8-2-10-5', w: 26 },
  '6': {
    d: 'M21 3c-3-2-6-3-8-3C6 0 2 8 2 20c0 13 4 20 11 20c7 0 11-5 11-13c0-7-4-12-11-12c-6 0-10 4-11 9',
    w: 26,
  },
  '7': { d: 'M2 1h22c-8 11-13 24-15 39', w: 26 },
  '8': {
    d: 'M13 19c-6 0-10-4-10-9.5S7 0 13 0s10 4 10 9.5S19 19 13 19c-7 0-11 5-11 10.5S7 40 13 40s11-4 11-10.5S20 19 13 19z',
    w: 26,
  },
  '9': {
    d: 'M5 37c3 2 6 3 8 3c7 0 11-8 11-20C24 7 20 0 13 0C6 0 2 5 2 13c0 7 4 12 11 12c6 0 10-4 11-9',
    w: 26,
  },
  J: { d: 'M20 0v29c0 7-4 11-9 11s-9-3-9-9', w: 24 },
  Q: { d: 'M13 0C6 0 2 8 2 19s4 19 11 19s11-8 11-19S20 0 13 0zM15 30l9 10', w: 26 },
  K: { d: 'M3 0v40M23 0L3 24M10 16l14 24', w: 26 },
  A: { d: 'M2 40L13 0l11 40M6 27h14', w: 26 },
};

/** Hodnota v rohu: tahy znaků vycentrované na x = 30, výška 44 od y = 18. Širší popisky (10) se zúží. */
function rankGlyphs(label: string, color: string): string {
  const chars = [...label];
  if (chars.length === 0 || chars.some((ch) => !INDEX_GLYPHS[ch])) {
    return `<text x="30" y="60" text-anchor="middle" class="pc-rank" font-size="46" font-weight="700" fill="${color}">${escapeXml(label)}</text>`;
  }
  const scale = 1.1;
  const maxWidth = 38;
  const gap = 3;
  const width = chars.reduce((sum, ch) => sum + (INDEX_GLYPHS[ch]?.w ?? 0), 0) + gap * (chars.length - 1);
  const sx = Math.min(scale, maxWidth / width);
  let x = 0;
  let d = '';
  for (const ch of chars) {
    const g = INDEX_GLYPHS[ch];
    if (!g) continue;
    d += `<path d="${g.d}" transform="translate(${x} 0)"/>`;
    x += g.w + gap;
  }
  const tx = 30 - (width * sx) / 2;
  return (
    `<g class="pc-rank" transform="translate(${r1(tx)} 18) scale(${r3(sx)} ${scale})" fill="none" stroke="${color}" ` +
    `stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round">${d}</g>`
  );
}

/** Rohový index (hodnota + barva) v levém horním rohu; druhý roh je otočený o 180°. */
function cornerIndex(suit: Suit, rank: Rank, si: SuitInk): string {
  const glyph = suitShape(suit, 30, 89, 28);
  const one =
    `<g class="pc-corner">${rankGlyphs(t(`ranks.${rank}.short`), si.ink)}` +
    `<g class="pc-csuit">${wash(glyph, si.wash, { op: 0.85, dx: 0.8, dy: 0.6 })}${ink(glyph, 1, { scale: 28 / 512, op: 0.7 })}</g></g>`;
  return `${one}<g transform="rotate(180 125 175)">${one}</g>`;
}

/** Rozložení pipů 2–10: [x, y] v jednotkách karty. Spodní polovina (y > 175) se kreslí otočeně. */
const XL = 80;
const XC = 125;
const XR = 170;
const YT = 74;
const YB = 276;
const YM = 175;
const Y13 = YT + (YB - YT) / 3;
const Y23 = YT + ((YB - YT) * 2) / 3;
const PIP_LAYOUT: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  2: [
    [XC, YT],
    [XC, YB],
  ],
  3: [
    [XC, YT],
    [XC, YM],
    [XC, YB],
  ],
  4: [
    [XL, YT],
    [XR, YT],
    [XL, YB],
    [XR, YB],
  ],
  5: [
    [XL, YT],
    [XR, YT],
    [XC, YM],
    [XL, YB],
    [XR, YB],
  ],
  6: [
    [XL, YT],
    [XR, YT],
    [XL, YM],
    [XR, YM],
    [XL, YB],
    [XR, YB],
  ],
  7: [
    [XL, YT],
    [XR, YT],
    [XC, (YT + YM) / 2],
    [XL, YM],
    [XR, YM],
    [XL, YB],
    [XR, YB],
  ],
  8: [
    [XL, YT],
    [XR, YT],
    [XC, (YT + YM) / 2],
    [XL, YM],
    [XR, YM],
    [XC, (YM + YB) / 2],
    [XL, YB],
    [XR, YB],
  ],
  9: [
    [XL, YT],
    [XR, YT],
    [XL, Y13],
    [XR, Y13],
    [XC, YM],
    [XL, Y23],
    [XR, Y23],
    [XL, YB],
    [XR, YB],
  ],
  10: [
    [XL, YT],
    [XR, YT],
    [XC, (YT + Y13) / 2],
    [XL, Y13],
    [XR, Y13],
    [XL, Y23],
    [XR, Y23],
    [XC, (Y23 + YB) / 2],
    [XL, YB],
    [XR, YB],
  ],
};

/** Pipy: jedna cesta na pip ve `.pc-pips` (lavírování), obrysy tuší zvlášť. */
function pips(suit: Suit, rank: Rank, si: SuitInk): string {
  const layout = PIP_LAYOUT[rank] ?? [];
  const size = rank >= 9 ? 46 : 50;
  const shapes = layout.map(([x, y]) => suitShape(suit, x, y, size, y > YM + 0.5)).join('');
  return (
    `<g class="pc-pips">${wash(shapes, si.wash, { op: 0.72 })}</g>` +
    `<g class="pc-pips-ink">${ink(shapes, 1.25, { scale: size / 512, op: 0.75 })}</g>`
  );
}

function ace(suit: Suit, si: SuitInk): string {
  const big = suitShape(suit, 125, 175, 116);
  return (
    `<g class="pc-ace">` +
    ink(shp.circle(125, 175, 84), 1.6, { op: 0.35, extra: 'stroke-dasharray="3 7"' }) +
    ink(shp.circle(125, 175, 92), 1.2, { op: 0.25 }) +
    wash(big, si.wash, { op: 0.74 }) +
    ink(big, 1.6, { scale: 116 / 512, op: 0.85 }) +
    `</g>`
  );
}

// ─────────────────────────── Figury ───────────────────────────

const P = PR_PAL;

/** Obličej (společný pro všechny figury); `lips` = rtěnka (Dáma). */
function face(lips: boolean): string {
  return (
    paint(shp.rect(115, 110, 20, 20), P.skin, 1.5) +
    paint(shp.ellipse(125, 94, 20, 23), P.skin, 2) +
    wash(shp.circle(113, 103, 4.4) + shp.circle(137, 103, 4.4), P.cheek, { op: 0.42 }) +
    inkFill(shp.circle(117, 92, 2.3) + shp.circle(133, 92, 2.3)) +
    ink(shp.path('M112 86q5-3 9 0M129 86q5-3 9 0'), 1.6) +
    ink(shp.path('M125 94q-3 6 1 8'), 1.5) +
    (lips
      ? wash(shp.path('M119.5 108.5q5.5 3.5 11 0q-5.5 5-11 0z'), P.red, { op: 0.85, dx: 0.4, dy: 0.3 })
      : ink(shp.path('M120 108q5 3.5 10 0'), 1.6))
  );
}

/** Lidový kvítek (výšivka): pět lístků kolem středu. */
function folkFlower(cx: number, cy: number, r: number): string {
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    petals += shp.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.62);
  }
  return (
    wash(petals, P.gold, { op: 0.8, dx: 0.5, dy: 0.4 }) +
    wash(shp.circle(cx, cy, r * 0.5), P.red, { op: 0.85, dx: 0.5, dy: 0.4 })
  );
}

/** Kluk: sametová čepice s peřím, vesta s knoflíky a výšivkou. */
function jackHalf(cloth: string): string {
  return (
    paint(shp.path('M60 175V157c0-17 20-28 42-30h46c22 2 42 13 42 30v18z'), cloth, 2) +
    paint(shp.path('M108 126l17 22l17-22z'), null, 1.5) +
    paint(shp.circle(125, 156, 2.8) + shp.circle(125, 167, 2.8), P.gold, 0.8) +
    folkFlower(84, 152, 5) +
    folkFlower(166, 152, 5) +
    face(false) +
    paint(shp.path('M105 92c-2-12 4-18 8-20h24c4 2 10 8 8 20c-3-7-10-11-20-11s-17 4-20 11z'), P.hair, 0) +
    paint(shp.path('M97 80c-2-20 18-30 36-27c20 3 26 16 22 27z'), cloth, 2) +
    paint(shp.rect(98, 75, 57, 8, 3), P.gold, 1.4) +
    paint(shp.path('M147 77c10-16 22-28 40-37c-5 17-17 31-36 40z'), null, 1.4) +
    ink(shp.path('M150 78c11-13 22-25 34-34'), 1) +
    paint(shp.circle(104, 79, 3.2), P.red, 1)
  );
}

/** Dáma: šátek na puntíky (barva karty) uvázaný pod bradou, korále, kroj s bílými rukávci. */
function queenHalf(cloth: string): string {
  const dots = [
    [106, 62],
    [118, 55],
    [132, 55],
    [144, 62],
    [100, 80],
    [150, 80],
    [99, 99],
    [151, 99],
  ]
    .map(([x, y]) => shp.circle(x ?? 0, y ?? 0, 2.6))
    .join('');
  const beads = [
    [111, 129],
    [117, 132],
    [125, 133],
    [133, 132],
    [139, 129],
  ]
    .map(([x, y]) => shp.circle(x ?? 0, y ?? 0, 2.8))
    .join('');
  return (
    paint(shp.ellipse(78, 156, 21, 19), null, 2) +
    paint(shp.ellipse(172, 156, 21, 19), null, 2) +
    ink(shp.path('M70 150q8 6 16 0M164 150q8 6 16 0'), 1) +
    paint(shp.path('M95 175v-38c8-9 52-9 60 0v38z'), cloth, 2) +
    paint(shp.path('M108 128l17 16l17-16z'), null, 1.4) +
    folkFlower(125, 160, 6) +
    paint(shp.path('M96 104c-4-40 12-56 29-56s33 16 29 56c-2 12-8 18-14 20h-30c-6-2-12-8-14-20z'), cloth, 2) +
    knock(dots) +
    face(true) +
    paint(shp.path('M107 85c6-7 30-7 36 0c-6-3-30-3-36 0z'), P.hair, 1) +
    paint(shp.path('M103 86c1-15 11-22 22-22s21 7 22 22c-7-9-14-12-22-12s-15 3-22 12z'), cloth, 1.5) +
    paint(shp.path('M119 120l-13 15l16-6zM131 120l13 15l-16-6z'), cloth, 1.4) +
    paint(shp.circle(125, 123, 4.5), cloth, 1.4) +
    paint(beads, P.red, 0.8)
  );
}

/** Král: koruna, knír s bradkou, plášť (barva karty) se zlatým pruhem, hermelínový límec a žezlo. */
function kingHalf(cloth: string): string {
  const ermine = [
    [99, 133],
    [112, 129],
    [138, 129],
    [151, 133],
  ]
    .map(([x, y]) => `M${x} ${y}v4.5l-1.5 2M${x} ${y}v4.5l1.5 2`)
    .join('');
  const rod = 'M72 175L90 116';
  return (
    ink(shp.path(rod), 6.6, { weight: 1 }) +
    knock(`<path d="${rod}" fill="none" stroke="url(#${ID}-pp)" stroke-width="4" stroke-linecap="round"/>`) +
    wash(
      `<path d="${rod}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`,
      P.gold,
      {
        op: 0.8,
        dx: 0.4,
        dy: 0.3,
      },
    ) +
    paint(shp.circle(91, 112, 6), P.gold, 1.4) +
    paint(shp.path('M60 175V159c0-18 20-29 42-31h46c22 2 42 13 42 31v16z'), cloth, 2) +
    paint(shp.rect(116, 136, 18, 39), P.gold, 1.2) +
    inkFill(shp.path('M125 144l4 5l-4 5l-4-5zM125 160l4 5l-4 5l-4-5z')) +
    face(false) +
    paint(
      shp.path(
        'M88 138c3-13 18-16 37-16s34 3 37 16c-3 6-10 8-16 5c-6-5-13-7-21-7s-15 2-21 7c-6 3-13 1-16-5z',
      ),
      null,
      1.5,
    ) +
    ink(shp.path(ermine), 1.4) +
    paint(shp.path('M102 100c-4-16 2-26 10-28h26c8 2 14 12 10 28c-2-11-9-17-23-17s-21 6-23 17z'), P.hair, 0) +
    paint(shp.path('M112 112c4 14 9 20 13 22c4-2 9-8 13-22c-5 5-21 5-26 0z'), P.hairDark, 0.8) +
    paint(
      shp.path('M105 103c6-6 14-5 20-1c6-4 14-5 20 1c3 5-1 9-6 7c-5-2-9-3-14-1c-5-2-9-1-14 1c-5 2-9-2-6-7z'),
      P.hairDark,
      0.8,
    ) +
    paint(shp.path('M100 76l1-28l12 13l12-19l12 19l12-13l1 28z'), P.gold, 2) +
    paint(shp.rect(99, 70, 52, 9, 2), P.goldDark, 1.5) +
    paint(shp.circle(125, 74.5, 3.2), cloth, 1) +
    wash(shp.circle(110, 74.5, 2.4) + shp.circle(140, 74.5, 2.4), P.red, { op: 0.9, dx: 0.3, dy: 0.2 }) +
    paint(shp.circle(101, 47, 3) + shp.circle(125, 41, 3.2) + shp.circle(149, 47, 3), P.gold, 1)
  );
}

function courtCard(suit: Suit, rank: Rank, si: SuitInk): string {
  const half = rank === 11 ? jackHalf(si.cloth) : rank === 12 ? queenHalf(si.cloth) : kingHalf(si.cloth);
  const mark = suitShape(suit, 66, 54, 20);
  const top =
    `<g class="pc-figure">${half}${wash(mark, si.wash, { op: 0.85, dx: 0.6, dy: 0.4 })}` +
    `${ink(mark, 0.9, { scale: 20 / 512, op: 0.7 })}</g>`;
  return (
    `<g class="pc-court">` +
    wash(shp.rect(50, 36, 150, 278, 6), mixColor(si.wash, '#f4e4c0', 0.86), { op: 0.5, dx: 0, dy: 0 }) +
    `<g clip-path="url(#${ID}-court)">${top}<g transform="rotate(180 125 175)">${top}</g></g>` +
    ink(shp.path('M50 175H200'), 1.3, { color: si.ink, op: 0.55 }) +
    ink(shp.rect(50, 36, 150, 278, 6), 2, { color: si.ink, op: 0.8 }) +
    `</g>`
  );
}

/** Ořez figury do rámečku (každá polovina končí na středové lince). */
const COURT_CLIP = `<clipPath id="${ID}-court"><rect x="50" y="36" width="150" height="278" rx="6"/></clipPath>`;

// ─────────────────────────── Vylepšení a pečetě ───────────────────────────

interface Surface {
  /** Barva papíru (výchozí krémová). */
  paper?: string;
  /** Okraj karty. */
  edge: string;
  defs?: string;
  /** Kresba nad papírem, pod pipy (tónování, rámeček, motiv). */
  under?: string;
  /** Kresba nad vším (lesk, ohnutý roh). */
  over?: string;
}

/** Lavírovaný pruh podél okraje karty (barva vylepšení — čitelné i při malé velikosti). */
function band(color: string, op = 0.55): string {
  return (
    wash(
      `<rect x="11" y="11" width="228" height="328" rx="12" fill="none" stroke="currentColor" stroke-width="12"/>`,
      color,
      {
        op,
        dx: 0,
        dy: 0,
      },
    ) + ink(shp.rect(17, 17, 216, 316, 9), 1.1, { color, op: 0.7 })
  );
}

/** Lavírování celého papíru (tón vylepšení). */
function tint(color: string, op: number): string {
  return wash(shp.rect(6, 6, 238, 338, 15), color, { op, dx: 0, dy: 0 });
}

function surface(enhancement: string | null, reg: ContentRegistry): Surface {
  switch (enhancement) {
    case null:
      return { edge: PR.paperEdge };
    case 'bonus':
      return { edge: '#9fb8dc', under: band('#3d6ab0') };
    case 'mult':
      return { edge: '#e0a294', under: band('#c8463a') };
    case 'glass':
      return {
        edge: '#8ec2d0',
        under: tint('#7fc4d6', 0.28) + band('#5fa8bd', 0.35),
        over:
          `<path d="M24 120L120 24h30L24 150zM44 330L226 148v24L70 330z" fill="#ffffff" opacity="0.5"/>` +
          ink(shp.path('M196 60l12 14l-6 10l10 12'), 1.3, { color: '#3f8094', op: 0.8 }),
      };
    case 'steel':
      return {
        edge: '#7b838e',
        under:
          tint('#8a929c', 0.5) +
          wash(shp.path('M6 120L120 6h60L6 180z'), '#ffffff', { op: 0.2, dx: 0, dy: 0 }) +
          [
            [16, 16],
            [234, 16],
            [16, 334],
            [234, 334],
          ]
            .map(([x, y]) => paint(shp.circle(x ?? 0, y ?? 0, 5), '#c9ced4', 1.2))
            .join(''),
      };
    case 'gold':
      return {
        edge: '#b08a2a',
        under: tint('#e2b33a', 0.55) + band('#c8961a', 0.4),
        over: `<path d="M24 90L90 24h18L24 108z" fill="#fffbe6" opacity="0.55"/>`,
      };
    case 'lucky':
      return {
        edge: '#8cc497',
        under:
          band('#3f8a4d', 0.5) +
          paintIcon('clover', { x: 45, y: 95, size: 160 }, '#5f9a46', { op: 0.16, inkW: 0 }),
      };
    case 'wild':
      return {
        edge: '#b69be0',
        under:
          wash(shp.circle(14, 14, 46), '#c8463a', { op: 0.45, dx: 0, dy: 0 }) +
          wash(shp.circle(236, 14, 46), '#e6b347', { op: 0.5, dx: 0, dy: 0 }) +
          wash(shp.circle(236, 336, 46), '#5f9a46', { op: 0.45, dx: 0, dy: 0 }) +
          wash(shp.circle(14, 336, 46), '#3d6ab0', { op: 0.45, dx: 0, dy: 0 }) +
          ink(shp.rect(17, 17, 216, 316, 9), 1.1, { color: '#7a5aa8', op: 0.6 }),
      };
    case 'worn':
      return {
        edge: '#b89c6a',
        under:
          tint('#d9b77a', 0.3) +
          wash(
            `<circle cx="168" cy="250" r="38" fill="none" stroke="currentColor" stroke-width="5"/>`,
            '#8a5a2a',
            {
              op: 0.28,
              dx: 0,
              dy: 0,
            },
          ) +
          ink(shp.path('M20 210q60 -8 210 6'), 1.2, { color: '#a08050', op: 0.5 }),
        over:
          paint(shp.path('M248 52V2h-50z'), '#d8c393', 1.4) +
          paint(shp.path('M198 2l50 50h-50z'), '#c9b07a', 1.4),
      };
    default: {
      // Neznámé (budoucí) vylepšení: rámeček v barvě jeho obrázku.
      const def = reg.enhancements[enhancement];
      const color = safeColor(def?.art.bg, '#6d28d9');
      return { edge: color, under: band(color) };
    }
  }
}

/** Odznak vylepšení vpravo nahoře (barva a ikona z `EnhancementDef.art`). */
function enhancementBadge(enhancement: string, reg: ContentRegistry): string {
  const art = reg.enhancements[enhancement]?.art;
  if (!art) return '';
  const bg = safeColor(art.bg, '#555555');
  return (
    `<g class="pc-enh-badge">` +
    paint(shp.circle(222, 28, 16), bg, 1.6, { op: 0.85 }) +
    knock(iconKnockShape(art.icon, 211, 17, 22)) +
    `</g>`
  );
}

/** Střed pečeti (viewBox karty 250 × 350); záblesk pečeti v fx.css (`.fx-flash--seal`) míří sem. */
const SEAL_CENTER = { x: 40, y: 306 } as const;

/**
 * Pečeť vlevo dole: vosková pečeť v barvě `SealDef.art` jako nálepka — zubatý kruh s tvrdým černým stínem,
 * vnitřní kroužek a ikona. Velká (asi pětina šířky karty), ať je vidět i na malé kartě.
 */
function sealBadge(seal: string, reg: ContentRegistry): string {
  const art = reg.seals[seal]?.art;
  const bg = safeColor(art?.bg, '#7e22ce');
  const { x, y } = SEAL_CENTER;
  let wax = shp.circle(x, y, 21);
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    wax += shp.circle(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 6.5);
  }
  return (
    `<g class="pc-seal" data-seal="${escapeXml(seal)}">` +
    `<g fill="${PR.ink}" transform="translate(3 3)">${wax}</g>` +
    wash(wax, bg, { op: 0.95, dx: 0, dy: 0 }) +
    ink(shp.circle(x, y, 15), 2.2, { color: mixColor(bg, '#000000', 0.5), op: 0.85 }) +
    knock(iconKnockShape(art?.icon ?? 'star', x - 11, y - 11, 22)) +
    `</g>`
  );
}

/** Kamenná karta: bez hodnoty a barvy — jen kámen. */
function stoneFace(): string {
  const blocks = [
    'M24 30h70l10 52l-46 18l-34-10z',
    'M112 26h112v64l-58 10l-48-26z',
    'M24 104l42-6l30 40l-12 66l-60 8z',
    'M104 96l60 14l62-8v96l-70 18l-48-40z',
    'M24 226l64-10l46 34l-6 76h-104z',
    'M140 248l86-30v108h-92z',
  ];
  return (
    tint('#8b8580', 0.55) +
    blocks.map((d, i) => paint(shp.path(d), i % 2 ? '#a7a198' : '#9a948c', 1.6, { noKnock: true })).join('') +
    ink(shp.path('M70 150l18 24l-8 30M180 140l-14 36l20 22M60 270l30 12'), 1.6, { op: 0.75 })
  );
}

/** Silueta ikony (bez barvy) — papírový výřez na odznaku nebo pečeti. */
function iconKnockShape(name: string, x: number, y: number, size: number): string {
  return iconShape(name, { x, y, size }).markup;
}

// ─────────────────────────── Sestavení ───────────────────────────

function svgRoot(classes: string, style: string, data: string, body: string, defs = ''): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CARD_VIEWBOX}" class="${classes}"${style ? ` style="${style}"` : ''} ${data} focusable="false">` +
    `<defs>${printDefs({ width: CARD_WIDTH, height: CARD_HEIGHT })}${defs}</defs>` +
    body +
    `</svg>`
  );
}

/** Styl kořene: barva karty z CSS proměnné (se zálohou) — pro prvky, které barvu dědí z CSS. */
export function suitColorStyle(suit: Suit): string {
  const v = SUIT_VARS[suit];
  return `color: var(${v.cssVar}, ${v.fallback})`;
}

/** Karton karty se silnou linkou (vylepšení se pozná podle pruhu a tónu, okraj je vždy čerň). */
function paperRect(_sf: Surface): string {
  return `<rect x="3.5" y="3.5" width="243" height="343" rx="${PAPER_RX}" fill="${PR.paper}" stroke="${PR.ink}" stroke-width="6"/>`;
}

function buildFace(card: CardFace, reg: ContentRegistry, scheme: SuitScheme): string {
  beginArt();
  const enh = card.enhancement;
  const noRankSuit = enh !== null && reg.enhancements[enh]?.noRankSuit === true;
  const data =
    `data-suit="${card.suit}" data-rank="${card.rank}"` +
    (enh ? ` data-enhancement="${escapeXml(enh)}"` : '') +
    (card.seal ? ` data-seal="${escapeXml(card.seal)}"` : '');
  const seal = card.seal ? sealBadge(card.seal, reg) : '';
  if (noRankSuit) {
    return svgRoot(
      'pc-svg pc-face pc-stone',
      'color: #57534e',
      data,
      paperRect({ edge: '#6f6a64' }) + stoneFace() + seal + grainOver(CARD_WIDTH, CARD_HEIGHT, PAPER_RX),
    );
  }
  const si = SUIT_INKS[scheme][card.suit];
  const sf = surface(enh, reg);
  const content =
    card.rank === 14
      ? ace(card.suit, si)
      : card.rank >= 11
        ? courtCard(card.suit, card.rank, si)
        : pips(card.suit, card.rank, si);
  const body =
    paperRect(sf) +
    (sf.under ?? '') +
    content +
    cornerIndex(card.suit, card.rank, si) +
    (sf.over ?? '') +
    (enh ? enhancementBadge(enh, reg) : '') +
    seal +
    grainOver(CARD_WIDTH, CARD_HEIGHT, PAPER_RX);
  const defs = (sf.defs ?? '') + (card.rank >= 11 && card.rank <= 13 ? COURT_CLIP : '');
  return svgRoot(`pc-svg pc-face pc-suit-${card.suit}`, suitColorStyle(card.suit), data, body, defs);
}

/** Klíč vzhledu líce (pro keš a pro rozhodnutí, zda kartu překreslit). */
export function cardFaceKey(card: CardFace): string {
  return `${card.suit}${card.rank}|${card.enhancement ?? ''}|${card.seal ?? ''}`;
}

const faceCache = new Map<string, string>();

/**
 * SVG markup líce karty (s placeholderem `%ID%` pro id ve `<defs>` — použij `withUniqueIds`, nebo rovnou
 * `cardFaceElement`). Výsledek se kešuje podle hodnoty, barvy, vylepšení, pečeti a barevného schématu.
 */
export function cardFaceMarkupRaw(
  card: CardFace,
  reg: ContentRegistry = defaultRegistry(),
  scheme: SuitScheme = currentSuitScheme(),
): string {
  const key = `${cardFaceKey(card)}|${scheme}|${iconsLoaded() ? 1 : 0}|${reg === defaultRegistry() ? '' : 'x'}`;
  let markup = faceCache.get(key);
  if (markup === undefined) {
    markup = buildFace(card, reg, scheme);
    if (reg === defaultRegistry()) faceCache.set(key, markup);
  }
  return markup;
}

export { withUniqueIds };

/** SVG markup líce karty připravený k vložení (unikátní id). */
export function cardFaceMarkup(card: CardFace, reg?: ContentRegistry, scheme?: SuitScheme): string {
  return withUniqueIds(cardFaceMarkupRaw(card, reg, scheme));
}

/** Malovaný tulipán (lidový motiv rubu). */
function tulip(cx: number, cy: number, s: number): string {
  const head =
    `M${cx} ${cy}C${cx - 18 * s} ${cy - 2 * s} ${cx - 22 * s} ${cy - 20 * s} ${cx - 16 * s} ${cy - 34 * s}` +
    `C${cx - 8 * s} ${cy - 24 * s} ${cx - 4 * s} ${cy - 26 * s} ${cx} ${cy - 40 * s}` +
    `C${cx + 4 * s} ${cy - 26 * s} ${cx + 8 * s} ${cy - 24 * s} ${cx + 16 * s} ${cy - 34 * s}` +
    `C${cx + 22 * s} ${cy - 20 * s} ${cx + 18 * s} ${cy - 2 * s} ${cx} ${cy}Z`;
  const leaves =
    `M${cx} ${cy + 44 * s}C${cx - 15 * s} ${cy + 28 * s} ${cx - 27 * s} ${cy + 26 * s} ${cx - 37 * s} ${cy + 30 * s}` +
    `C${cx - 27 * s} ${cy + 40 * s} ${cx - 15 * s} ${cy + 44 * s} ${cx} ${cy + 44 * s}Z` +
    `M${cx} ${cy + 44 * s}C${cx + 15 * s} ${cy + 28 * s} ${cx + 27 * s} ${cy + 26 * s} ${cx + 37 * s} ${cy + 30 * s}` +
    `C${cx + 27 * s} ${cy + 40 * s} ${cx + 15 * s} ${cy + 44 * s} ${cx} ${cy + 44 * s}Z`;
  return (
    ink(shp.path(`M${cx} ${cy}V${cy + 52 * s}`), 2.2) +
    paint(shp.path(leaves), PR_PAL.green, 1.6) +
    paint(shp.path(head), PR_PAL.red, 1.8)
  );
}

/**
 * Rub karty: modrý tisk se srdíčky a kartonovým oválem s tulipánem; s `ArtSpec` balíčku v jeho barvách a s jeho
 * ikonou. Markup s placeholderem `%ID%` (jako `cardFaceMarkupRaw`).
 */
export function cardBackMarkupRaw(spec?: ArtSpec): string {
  beginArt();
  const bg = safeColor(spec?.bg, '#3d5a8c');
  const fg = safeColor(spec?.fg, PR_PAL.gold);
  const accent = safeColor(spec?.accent, spec ? fg : '#c8463a');
  let blots = '';
  for (let j = 0, y = 40; y < 330; y += 34, j++) {
    for (let x = 36; x < 230; x += 40) {
      blots += `<path d="${SUIT_PATH_D.H}" transform="${suitTransform(x + (j % 2) * 20, y, 13)}"/>`;
    }
  }
  const emblem = spec
    ? paintIcon(spec.icon, { x: 85, y: 135, size: 80 }, bg, { op: 0.75 })
    : tulip(125, 172, 1.05);
  const body =
    `<rect x="3.5" y="3.5" width="243" height="343" rx="${PAPER_RX}" fill="${PR.paper}" stroke="${PR.ink}" stroke-width="6"/>` +
    `<g clip-path="url(#${ID}-bm)">` +
    wash(shp.rect(16, 16, 218, 318, 8), bg, { op: 1, dx: 0, dy: 0 }) +
    wash(blots, accent, { op: 1, dx: 1.6, dy: 1.2 }) +
    `</g>` +
    `<rect x="16" y="16" width="218" height="318" rx="8" fill="none" stroke="${PR.ink}" stroke-width="4"/>` +
    knock(shp.ellipse(125, 175, 60, 80)) +
    ink(shp.ellipse(125, 175, 60, 80), 2, { color: mixColor(bg, '#000000', 0.3), op: 0.8 }) +
    ink(shp.ellipse(125, 175, 52, 72), 1, {
      color: mixColor(bg, '#000000', 0.3),
      op: 0.5,
      extra: 'stroke-dasharray="4 4"',
    }) +
    emblem +
    grainOver(CARD_WIDTH, CARD_HEIGHT, PAPER_RX);
  const defs = `<clipPath id="${ID}-bm"><rect x="16" y="16" width="218" height="318" rx="8"/></clipPath>`;
  return svgRoot('pc-svg pc-back', '', 'data-back="1"', body, defs);
}

/** Rub karty připravený k vložení (unikátní id). */
export function cardBackMarkup(spec?: ArtSpec): string {
  return withUniqueIds(cardBackMarkupRaw(spec));
}

/** Přístupnost SVG: s popiskem `role="img"`, jinak dekorativní (`aria-hidden`). */
export function labelSvg(el: SVGSVGElement, label?: string): SVGSVGElement {
  if (label) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
  } else {
    el.setAttribute('aria-hidden', 'true');
  }
  return el;
}

/** SVG element líce (nebo rubu, když `faceDown`). */
export function cardFaceElement(
  card: CardFace & { faceDown?: boolean },
  opts: { label?: string; registry?: ContentRegistry; back?: ArtSpec; scheme?: SuitScheme } = {},
): SVGSVGElement {
  const markup = card.faceDown
    ? cardBackMarkupRaw(opts.back)
    : cardFaceMarkupRaw(card, opts.registry, opts.scheme);
  return labelSvg(svgElement(markup), opts.label);
}

/** SVG element rubu karty (balíček, karty lícem dolů). */
export function cardBackElement(opts: { label?: string; spec?: ArtSpec } = {}): SVGSVGElement {
  return labelSvg(svgElement(cardBackMarkupRaw(opts.spec)), opts.label);
}

/** Vyprázdní keš líců (např. po načtení ikon, aby odznaky dostaly skutečné ikony). */
export function clearCardCache(): void {
  faceCache.clear();
}

/**
 * Ručně kreslené scény (tisk ve stylu Sirkárna, src/ui/art/print.ts) pro vybrané žolíky — místo ikony z knihovny
 * celá ilustrace.
 * `ArtSpec.scene` v datech obsahu odkazuje na klíč v `SCENES`; neznámá scéna → obyčejná ikona.
 *
 * Kresba je seznam tahů v souřadnicích karty 250 × 350 (okno obrázku 16–234 × 16–284):
 *  - `['f', role, d, linka]` plocha (papír → inkoust v barvě role → obrys dané tloušťky, 0 = bez obrysu),
 *  - `['l', d, tuš]` linka tuší,
 *  - `['h', d, úhel]` stín (studená lazura přes tvar).
 * Vlastní dílo (Karban, 2026), žádné cizí předlohy.
 */
import {
  BLANIK,
  BRUNCVIK,
  CECH,
  FAUST,
  HONZA,
  HOSTINSKY,
  KOMINIK,
  KRAKONOS,
  LIBUSE,
  ORLOJ,
  VODNIK,
  VRCHNI,
  KARLUV_MOST,
  RYCHLIK,
  SNEHULAK,
  TRUHLA,
  D1,
  HERMELIN,
  JUKEBOX,
  NAHRADNI_BUS,
  RUNDU,
  SILVESTR,
  DEFENESTRACE,
  KOLOTOC,
  KULNA,
  OZVENA,
  SEDMICKA,
  SEKERA,
} from './scenes2';
import { FIGURES } from './figures';
import { SCENE_PATCHES } from './jokers';
import type { SceneOp } from './sceneKit';
import { BEER_MAT, GARDENER, GOLEM } from './scenes1';
import { PR, ink, inkFill, knock, paint, paintIcon, shp, wash } from './print';

export type { SceneOp } from './sceneKit';

/** Barvy rolí (null = papír bez barvy, INK = plná tuš). */
const SCENE_PAL: Readonly<Record<string, string | null>> = {
  wood: '#d8a85a',
  wood2: '#b07a3a',
  sun: '#f2b53a',
  cloth: null,
  skin: '#f2b48e',
  blush: '#e8706a',
  cap: '#6d8f5a',
  cap2: '#4f6e42',
  dark: 'INK',
  nose: '#e8806a',
  hair: '#8a5a34',
  green: '#5f9a46',
  green2: '#3f7334',
  flower: '#f2c24a',
  sky: '#5e7fb0',
  town: '#3b4f78',
  window: '#f2c24a',
  clay: '#a88a6a',
  clay2: '#7d654c',
  paper: null,
  glow: '#ffd34d',
  robe: '#c8463a',
  robe2: null,
  gold: '#e6b347',
  gold2: '#c08f2e',
  hair2: '#5e3a20',
  glass: '#c9dbe0',
  cloud: null,
  daysky: '#a9c4de',
  mount: '#8aa0b8',
  beard: '#dcd8cc',
  hatd: '#4a5a3a',
  pond: '#9dbbb0',
  reed: '#6a8a4a',
  vgreen: '#5a8a6a',
  vgreen2: '#3f6a4e',
  vskin: '#a6c79e',
  vskin2: '#86ad80',
  water: '#6f9fc0',
  blue: '#3d6ab0',
  stone: '#b9ab92',
  dialblue: '#4f7fb8',
  dusk: '#e8a86a',
  night: '#2e3550',
  iron: '#aab2bd',
  plaster: '#eadfc6',
  brick: '#b5653f',
  straw: '#e4c46a',
  bun: '#d9a050',
  dusksky: '#ecc59a',
  fur: '#8a6a4a',
  fur2: '#b08a62',
  nightsky: '#56679a',
  stone2: '#8f8577',
  cave: '#3e3a3a',
  iron2: '#c5ccd4',
  study: '#7a6450',
  purple: '#7b4fb0',
  beardd: '#4a4038',
  devil: '#c0392b',
  fire: '#f0a040',
  soot: '#6a6a70',
  pubwall: '#c9a26a',
  night2: '#4a4f62',
  pine: '#3f6a3a',
};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  gardener: GARDENER,
  golem: GOLEM,
  beerMat: BEER_MAT,
  krakonos: KRAKONOS,
  vodnik: VODNIK,
  orloj: ORLOJ,
  honza: HONZA,
  cech: CECH,
  libuse: LIBUSE,
  blanik: BLANIK,
  bruncvik: BRUNCVIK,
  faust: FAUST,
  kominik: KOMINIK,
  hostinsky: HOSTINSKY,
  vrchni: VRCHNI,
  snehulak: SNEHULAK,
  rychlik: RYCHLIK,
  karluvMost: KARLUV_MOST,
  truhla: TRUHLA,
  rundu: RUNDU,
  hermelin: HERMELIN,
  jukebox: JUKEBOX,
  d1: D1,
  silvestr: SILVESTR,
  nahradniBus: NAHRADNI_BUS,
  defenestrace: DEFENESTRACE,
  sekera: SEKERA,
  kolotoc: KOLOTOC,
  ozvena: OZVENA,
  sedmicka: SEDMICKA,
  kulna: KULNA,
  ...FIGURES,
  // Úpravy a nové scény z dávek src/ui/art/jokers/*.ts (přepíšou i portrét `fig-<id>`).
  ...SCENE_PATCHES,
};

/** Existuje scéna? */
export function hasScene(name: string | undefined): name is string {
  return name !== undefined && Object.hasOwn(SCENES, name);
}

/** Markup scény (bez `<defs>` — potřebuje papír z `printDefs` obrázku). */
export function sceneMarkup(name: string): string {
  const ops = SCENES[name] ?? [];
  /** Role z palety, nebo přímo barva `#rrggbb` (postavy z `figures.ts`). */
  const pal = (role: string): string | null => (role.startsWith('#') ? role : (SCENE_PAL[role] ?? null));
  let out = '';
  for (const op of ops) {
    if (op[0] === 'f') {
      const [, role, d, w] = op;
      const color = pal(role);
      const shape = shp.path(d);
      if (role === 'blush') out += wash(shape, color ?? '#e8706a', { op: 0.4 });
      else if (color === 'INK') out += knock(shape) + inkFill(shape);
      else out += paint(shape, color, w);
    } else if (op[0] === 'l') {
      out += ink(shp.path(op[1]), op[2] * 0.77);
    } else if (op[0] === 's') {
      // Barevná linka: papír pod ni (ať se barva nemíchá s podkladem), inkoust, tenký obrys po okrajích.
      const [, role, d, w] = op;
      const color = pal(role) ?? '#888888';
      const line = (stroke: string, width: number): string =>
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
      out +=
        line('url(#%ID%-pp)', w) +
        wash(line('currentColor', w), color === 'INK' ? PR.ink : (color ?? '#888888'), { op: 0.75 }) +
        ink(shp.path(d), 0.7, { op: 0.5 });
    } else if (op[0] === 'i') {
      // Rekvizita z knihovny ikon, vytištěná plnou barvou s obrysem.
      const [, icon, x, y, size, role] = op;
      out += paintIcon(icon, { x, y, size }, pal(role) ?? '#888888', { knock: true, op: 0.75 });
    } else {
      out += wash(shp.path(op[1]), PR.shadow, { op: 0.24, dx: 0, dy: 0 });
    }
  }
  return out;
}

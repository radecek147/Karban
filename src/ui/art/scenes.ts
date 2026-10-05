/**
 * Ručně kreslené scény (tuš a akvarel, styl E1) pro vybrané žolíky — místo ikony z knihovny celá ilustrace.
 * `ArtSpec.scene` v datech obsahu odkazuje na klíč v `SCENES`; neznámá scéna → obyčejná ikona.
 *
 * Kresba je seznam tahů v souřadnicích karty 250 × 350 (okno obrázku 16–234 × 16–284):
 *  - `['f', role, d, tuš]` plocha (papír → vodovka v barvě role → obrys tuší dané tloušťky, 0 = bez obrysu),
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
} from './scenes2';
import { WC, ink, inkFill, knock, paint, shp, wash } from './watercolor';

export type SceneOp =
  | readonly ['f', string, string, number]
  | readonly ['l', string, number]
  | readonly ['h', string, number]
  | readonly ['s', string, string, number];

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
};

/** Zahrádkář Venca: bekovka, knír, tílko a cuketa před plotem. */
const GARDENER: readonly SceneOp[] = [
  ['f', 'wood', 'M22,280 L22,74 L35,56 L48,74 L48,280 Z', 2],
  ['l', 'M30,120 L31,150 M39,200 L38,236', 1],
  ['f', 'wood', 'M52,280 L52,74 L65,56 L78,74 L78,280 Z', 2],
  ['l', 'M60,120 L61,150 M69,200 L68,236', 1],
  ['f', 'wood', 'M82,280 L82,74 L95,56 L108,74 L108,280 Z', 2],
  ['l', 'M90,120 L91,150 M99,200 L98,236', 1],
  ['f', 'wood', 'M112,280 L112,74 L125,56 L138,74 L138,280 Z', 2],
  ['l', 'M120,120 L121,150 M129,200 L128,236', 1],
  ['f', 'wood', 'M142,280 L142,74 L155,56 L168,74 L168,280 Z', 2],
  ['l', 'M150,120 L151,150 M159,200 L158,236', 1],
  ['f', 'wood', 'M172,280 L172,74 L185,56 L198,74 L198,280 Z', 2],
  ['l', 'M180,120 L181,150 M189,200 L188,236', 1],
  ['f', 'wood', 'M202,280 L202,74 L215,56 L228,74 L228,280 Z', 2],
  ['l', 'M210,120 L211,150 M219,200 L218,236', 1],
  ['f', 'wood2', 'M16,118 L234,112 L234,128 L16,134 Z', 2],
  ['f', 'wood2', 'M16,222 L234,216 L234,232 L16,238 Z', 2],
  ['f', 'sun', 'M180,40 A16,16 0 1,0 212,40 A16,16 0 1,0 180,40 Z', 2],
  [
    'f',
    'skin',
    'M38,284 C40,240 52,214 80,204 C92,200 104,198 110,196 L140,196 C146,198 158,200 170,204 C198,214 210,240 212,284 Z',
    2.4,
  ],
  [
    'f',
    'cloth',
    'M76,284 L80,236 C82,222 86,212 92,204 L102,201 C104,218 112,228 125,228 C138,228 146,218 148,201 L158,204 C164,212 168,222 170,236 L174,284 Z',
    2.4,
  ],
  ['h', 'M150,214 C160,220 166,240 170,284 L156,284 C154,250 152,230 150,214 Z', 60],
  ['l', 'M118,214 l2,5 M126,212 l1,6 M133,214 l-2,5', 1.2],
  ['f', 'skin', 'M106,166 L106,200 C114,210 136,210 144,200 L144,166 Z', 2.4],
  ['h', 'M106,180 C116,192 134,192 144,180 L144,196 C134,204 116,204 106,196 Z', 45],
  ['f', 'skin', 'M92,134 C80,126 76,152 92,156 Z', 2.2],
  ['f', 'skin', 'M158,134 C170,126 174,152 158,156 Z', 2.2],
  [
    'f',
    'skin',
    'M88,140 C86,108 102,90 125,90 C148,90 164,108 162,140 C162,166 148,186 125,186 C102,186 88,166 88,140 Z',
    2.4,
  ],
  ['f', 'blush', 'M95,153 A8,8 0 1,0 111,153 A8,8 0 1,0 95,153 Z', 0],
  ['f', 'blush', 'M139,153 A8,8 0 1,0 155,153 A8,8 0 1,0 139,153 Z', 0],
  ['f', 'cap', 'M84,122 C80,100 96,84 126,82 C156,80 172,96 168,118 C166,124 160,124 150,122 Z', 2.4],
  ['h', 'M86,118 C86,100 100,90 120,86 C104,96 100,108 102,120 Z', 45],
  [
    'f',
    'cap2',
    'M84,122 C98,128 140,128 170,118 C177,121 176,129 166,131 C140,137 104,137 86,131 C80,129 80,124 84,122 Z',
    2.4,
  ],
  ['f', 'cap2', 'M122.5,82 A3.5,3.5 0 1,0 129.5,82 A3.5,3.5 0 1,0 122.5,82 Z', 1.6],
  ['l', 'M103,140 C107,136 113,136 117,139 M133,139 C137,136 143,136 147,140', 2.6],
  ['f', 'dark', 'M108,146 A3,3 0 1,0 114,146 A3,3 0 1,0 108,146 Z', 0],
  ['f', 'dark', 'M136,146 A3,3 0 1,0 142,146 A3,3 0 1,0 136,146 Z', 0],
  ['f', 'nose', 'M125,138 C118,150 114,158 120,161 C124,164 131,163 132,157 C133,152 129,146 125,138 Z', 2.2],
  [
    'f',
    'hair',
    'M96,168 C102,157 116,155 125,161 C134,155 148,157 154,168 C148,173 141,171 136,168 C131,173 119,173 114,168 C109,171 102,173 96,168 Z',
    2.2,
  ],
  ['l', 'M118,177 C122,179 128,179 132,177', 2],
  [
    'f',
    'green',
    'M70,268 C96,250 156,224 196,214 C212,210 220,222 210,232 C180,252 116,276 84,284 C70,288 62,276 70,268 Z',
    2.4,
  ],
  ['h', 'M74,280 C110,272 170,250 210,230 C206,236 190,246 170,254 C130,270 100,280 84,284 Z', -20],
  ['l', 'M92,266 C120,254 160,236 190,226 M100,274 C130,262 166,246 196,234', 1.2],
  ['f', 'green2', 'M204,214 L216,204 L222,210 L212,222 Z', 2],
  ['f', 'flower', 'M70,268 C62,262 56,272 60,278 C56,286 66,290 70,284 Z', 2],
  ['f', 'skin', 'M138,236 C146,228 160,230 164,238 C168,246 164,258 154,260 C146,262 136,256 136,248 Z', 2.2],
  ['l', 'M141,240 l13,-2 M139,247 l15,-2 M141,254 l12,-1', 1.4],
  ['f', 'skin', 'M84,262 C90,254 104,254 108,262 C110,270 104,280 96,280 C88,280 82,270 84,262 Z', 2.2],
  ['l', 'M88,262 l14,0 M87,268 l17,0', 1.4],
];

/** Golem: hliněný obr se šémem na čele, za ním noční Praha. */
const GOLEM: readonly SceneOp[] = [
  ['f', 'sky', 'M16,16 L234,16 L234,284 L16,284 Z', 0],
  ['l', 'M36,44 L44,44 M40,40 L40,48', 1.6],
  ['l', 'M67,70 L73,70 M70,67 L70,73', 1.6],
  ['l', 'M147,40 L153,40 M150,37 L150,43', 1.6],
  ['l', 'M219,110 L225,110 M222,107 L222,113', 1.6],
  ['l', 'M31,120 L37,120 M34,117 L34,123', 1.6],
  ['l', 'M117.5,30 L122.5,30 M120,27.5 L120,32.5', 1.6],
  ['f', 'sun', 'M192,48 A22,22 0 1,0 210,86 A17,17 0 1,1 192,48 Z', 2],
  [
    'f',
    'town',
    'M16,240 L16,196 L30,196 L30,184 L42,172 L54,184 L54,204 L66,204 L66,166 L72,150 L76,124 L80,108 L84,124 L88,150 L94,166 L94,200 L104,200 L104,240 Z',
    2,
  ],
  [
    'f',
    'town',
    'M150,240 L150,192 L158,192 L158,160 L164,146 L168,118 L172,102 L176,118 L180,146 L186,160 L186,186 L198,186 L198,174 L210,164 L222,174 L222,198 L234,198 L234,240 Z',
    2,
  ],
  ['f', 'window', 'M33.5,204 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M43.5,204 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M75.5,176 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M75.5,196 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M163.5,170 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M169.5,196 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M203.5,186 l5,0 l0,7 l-5,0 Z', 0],
  ['f', 'window', 'M223.5,212 l5,0 l0,7 l-5,0 Z', 0],
  [
    'f',
    'clay',
    'M26,284 C28,250 40,226 64,214 C72,210 84,206 96,204 L154,204 C166,206 178,210 186,214 C210,226 222,250 224,284 Z',
    2.6,
  ],
  ['h', 'M96,204 L154,204 C150,216 138,222 125,222 C112,222 100,216 96,204 Z', 0],
  ['l', 'M70,224 C66,246 68,266 72,284 M180,224 C184,246 182,266 178,284', 2.2],
  [
    'l',
    'M92,272 c4,-3 9,-3 12,0 M40,262 c4,-3 9,-3 12,0 M196,252 c4,-3 9,-3 12,0 M150,276 c4,-3 9,-3 12,0',
    1.5,
  ],
  ['l', 'M118,226 l6,10 l-4,8 l6,8 M206,236 l-6,6 l3,7', 1.5],
  ['f', 'clay2', 'M102,186 L102,210 L148,210 L148,186 Z', 2.4],
  [
    'f',
    'clay',
    'M84,108 C84,100 90,96 98,96 L152,96 C160,96 166,100 166,108 L168,168 C168,184 150,196 125,196 C100,196 82,184 82,168 Z',
    2.6,
  ],
  [
    'h',
    'M150,100 C160,100 166,104 166,110 L168,168 C168,180 160,188 150,192 C156,160 156,130 150,100 Z',
    -45,
  ],
  ['l', 'M100,97 c4,-4 8,-4 12,0 M122,97 c4,-3 7,-3 10,0 M140,97 c4,-4 8,-4 12,0', 1.6],
  ['f', 'clay2', 'M94,138 L124,144 L124,150 L96,146 Z', 2],
  ['f', 'clay2', 'M156,138 L126,144 L126,150 L154,146 Z', 2],
  ['f', 'paper', 'M110,107 L140,107 L140,123 L110,123 Z', 2],
  ['f', 'paper', 'M106,115 A4,8 0 1,0 114,115 A4,8 0 1,0 106,115 Z', 1.8],
  ['f', 'paper', 'M136,115 A4,8 0 1,0 144,115 A4,8 0 1,0 136,115 Z', 1.8],
  ['l', 'M118,111 l5,0 l0,8 M127,111 l7,0 M131,111 l0,8', 1.5],
  ['f', 'dark', 'M100,158 A10,7 0 1,0 120,158 A10,7 0 1,0 100,158 Z', 2],
  ['f', 'dark', 'M130,158 A10,7 0 1,0 150,158 A10,7 0 1,0 130,158 Z', 2],
  ['f', 'glow', 'M108.2,158 A2.8,2.8 0 1,0 113.8,158 A2.8,2.8 0 1,0 108.2,158 Z', 0],
  ['f', 'glow', 'M138.2,158 A2.8,2.8 0 1,0 143.8,158 A2.8,2.8 0 1,0 138.2,158 Z', 0],
  ['f', 'clay2', 'M121,152 L129,152 L133,172 L117,172 Z', 2],
  ['l', 'M110,181 L140,181 M107,177 l3,4 M143,177 l-3,4', 2.6],
  ['l', 'M156,112 l-6,10 l4,6 l-5,8 M92,166 c4,-3 8,-3 11,0', 1.5],
];

/** Pivní tácek: půllitr s pěnou na tácku s čárkami. */
const BEER_MAT: readonly SceneOp[] = [
  ['f', 'wood', 'M16,16 L234,16 L234,284 L16,284 Z', 0],
  ['l', 'M16,70 C80,66 160,74 234,68 M16,150 C90,154 170,146 234,152 M16,266 C80,262 170,270 234,264', 1.4],
  ['f', 'paper', 'M21,228 A104,42 0 1,0 229,228 A104,42 0 1,0 21,228 Z', 2.2],
  ['f', 'robe', 'M29,228 A96,37 0 1,0 221,228 A96,37 0 1,0 29,228 Z', 0],
  ['f', 'paper', 'M37,228 A88,31 0 1,0 213,228 A88,31 0 1,0 37,228 Z', 0],
  [
    'l',
    'M46,222 l1,14 M53,221 l1,14 M60,221 l1,14 M67,222 l1,14 M42,233 l30,-10 M182,222 l1,14 M189,221 l1,14 M196,221 l1,14',
    2,
  ],
  ['f', 'gold', 'M88,92 L162,92 L156,226 C150,234 100,234 94,226 Z', 2.4],
  ['h', 'M140,96 L162,92 L156,226 C152,230 146,232 140,232 Z', 0],
  ['f', 'glass', 'M162,112 C196,110 198,186 158,190 L159,176 C182,172 182,126 161,126 Z', 2.2],
  ['l', 'M106,106 L110,222 M124,106 L125,226 M142,106 L139,224', 1.2],
  [
    'l',
    'M111,150 A3,3 0 1,0 117,150 A3,3 0 1,0 111,150 Z M128.5,182 A2.5,2.5 0 1,0 133.5,182 A2.5,2.5 0 1,0 128.5,182 Z M118,124 A2,2 0 1,0 122,124 A2,2 0 1,0 118,124 Z M135.5,204 A2.5,2.5 0 1,0 140.5,204 A2.5,2.5 0 1,0 135.5,204 Z M110,196 A2,2 0 1,0 114,196 A2,2 0 1,0 110,196 Z',
    1.1,
  ],
  [
    'f',
    'cloth',
    'M84,96 C80,72 96,60 110,66 C116,52 138,52 144,64 C158,58 172,72 166,96 C150,104 100,104 84,96 Z',
    2.4,
  ],
  ['f', 'cloth', 'M100,98 C100,114 109,116 108,100 Z', 1.6],
];

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
};

/** Existuje scéna? */
export function hasScene(name: string | undefined): name is string {
  return name !== undefined && Object.hasOwn(SCENES, name);
}

/** Markup scény (bez `<defs>` — potřebuje akvarelovou sadu `wcDefs` obrázku). */
export function sceneMarkup(name: string): string {
  const ops = SCENES[name] ?? [];
  let out = '';
  for (const op of ops) {
    if (op[0] === 'f') {
      const [, role, d, w] = op;
      const color = SCENE_PAL[role] ?? null;
      const shape = shp.path(d);
      if (role === 'blush') out += wash(shape, color ?? '#e8706a', { op: 0.4 });
      else if (color === 'INK') out += knock(shape) + inkFill(shape);
      else out += paint(shape, color, w);
    } else if (op[0] === 'l') {
      out += ink(shp.path(op[1]), op[2] * 0.77);
    } else if (op[0] === 's') {
      // Lavírovaná linka: papír pod ni (ať se barva nemíchá s podkladem), vodovka, tenký obrys tuší po okrajích.
      const [, role, d, w] = op;
      const color = SCENE_PAL[role] ?? '#888888';
      const line = (stroke: string, width: number): string =>
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
      out +=
        line('url(#%ID%-pp)', w) +
        wash(line('currentColor', w), color === 'INK' ? WC.ink : (color ?? '#888888'), { op: 0.75 }) +
        ink(shp.path(d), 0.7, { op: 0.5 });
    } else {
      out += wash(shp.path(op[1]), WC.shadow, { op: 0.24, dx: 0, dy: 0 });
    }
  }
  return out;
}

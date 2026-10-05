/**
 * Portréty postav pro žolíky-lidi (styl E1) skládané z ručně kreslených dílů: pozadí s motivem, oblečení s límcem,
 * obličej (výraz, brýle, vousy), účes, pokrývka hlavy a rekvizita. Každý díl je kresba ve stejném rukopisu
 * jako ostatní scény (`scenes.ts`) — postavy se liší čepicí, účesem, barvami, pozadím a tím, co drží v ruce.
 * Výsledkem jsou tahy scény (`SceneOp`), takže se kreslí stejně jako ručně kreslené scény; klíč je `fig-<id>`.
 * Vlastní dílo (Karban, 2026).
 */
import type { SceneOp } from './scenes';

const c = (cx: number, cy: number, r: number, ry = r): string =>
  `M${cx - r},${cy} A${r},${ry} 0 1,0 ${cx + r},${cy} A${r},${ry} 0 1,0 ${cx - r},${cy} Z`;
const rect = (x: number, y: number, w: number, h: number): string => `M${x},${y} H${x + w} V${y + h} H${x} Z`;

type Hat =
  | 'cap'
  | 'flatcap'
  | 'beret'
  | 'scarf'
  | 'straw'
  | 'bucket'
  | 'chef'
  | 'hard'
  | 'top'
  | 'witch'
  | 'band'
  | 'hood';
type Hair = 'short' | 'part' | 'bald' | 'bob' | 'bun' | 'long' | 'curly' | 'none';
type Beard = 'mustache' | 'walrus' | 'beard' | 'goatee';
type Collar =
  'shirt' | 'tie' | 'bow' | 'uniform' | 'apron' | 'cassock' | 'turtle' | 'vest' | 'plain' | 'vestHi';
type Mood = 'smile' | 'grin' | 'flat' | 'o' | 'sly' | 'sad';
type Motif =
  | 'street'
  | 'pub'
  | 'cemetery'
  | 'classroom'
  | 'kiosk'
  | 'tram'
  | 'forest'
  | 'river'
  | 'office'
  | 'church'
  | 'night'
  | 'fair'
  | 'spa'
  | 'shop'
  | 'sky'
  | 'marsh'
  | 'field'
  | 'workshop'
  | 'gym'
  | 'cabin'
  | 'rain'
  | 'kitchen'
  | 'gallery'
  | 'screen'
  | 'none';

export interface FigureSpec {
  /** Barva pozadí. */
  bg: string;
  motif?: Motif;
  skin?: string;
  /** Barva oblečení. */
  body: string;
  collar?: Collar;
  /** Kravata, motýlek, vesta, odznak. */
  accent?: string;
  hair?: Hair;
  hairColor?: string;
  beard?: Beard;
  beardColor?: string;
  glasses?: boolean;
  hat?: Hat;
  hatColor?: string;
  hatAccent?: string;
  mood?: Mood;
  female?: boolean;
  /** Červený nos (štamgasti). */
  redNose?: boolean;
  /** Rekvizita z knihovny ikon (v pravé ruce). */
  prop?: { icon: string; color: string; x?: number; y?: number; size?: number };
  /** Vlastní tahy navíc (po všem ostatním). */
  extra?: readonly SceneOp[];
}

const SKIN = '#f2b48e';
const BUST = 'M44,284 C48,240 70,218 100,210 L150,210 C180,218 202,240 206,284 Z';

function shade(hex: string, t: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = m[1] as string;
  const ch = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return (
    '#' +
    ch
      .map((x) =>
        Math.round(x * (1 - t))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function motifOps(m: Motif, bg: string): SceneOp[] {
  const ops: SceneOp[] = [['f', bg, rect(16, 16, 218, 268), 0]];
  switch (m) {
    case 'street':
      ops.push(
        ['f', '#eadfc6', 'M16,200 L16,120 L60,120 L60,200 Z', 1.4],
        ['f', '#b5653f', 'M12,122 L38,94 L64,122 Z', 1.4],
        ['f', '#d8c7a6', 'M190,200 L190,110 L234,110 L234,200 Z', 1.4],
        ['f', '#8a5a44', 'M186,112 L212,86 L238,112 Z', 1.4],
        [
          'l',
          'M26,140 h10 v12 h-10 Z M44,140 h10 v12 h-10 Z M200,130 h10 v12 h-10 Z M216,150 h10 v12 h-10 Z',
          1.1,
        ],
      );
      break;
    case 'pub':
      ops.push(
        ['l', 'M16,70 H234 M60,16 V70 M140,16 V70 M200,16 V70', 1],
        ['f', '#8a5a2a', 'M16,118 H234 V126 H16 Z', 1.4],
        ['f', '#c9dbe0', 'M28,118 L30,94 L44,94 L46,118 Z', 1.1],
        ['f', '#c9dbe0', 'M200,118 L202,94 L216,94 L218,118 Z', 1.1],
      );
      break;
    case 'cemetery':
      ops.push(
        ['f', '#6a8a4a', 'M16,214 C70,196 170,204 234,196 L234,284 L16,284 Z', 1.6],
        ['f', '#9a948c', 'M30,214 L30,170 C30,158 54,158 54,170 L54,214 Z', 1.4],
        ['f', '#9a948c', 'M196,206 L196,150 L204,150 L204,166 L216,166 L216,174 L204,174 L204,206 Z', 1.4],
        ['f', '#e6b347', c(200, 50, 14), 1.4],
      );
      break;
    case 'classroom':
      ops.push(
        ['f', '#8a5a2a', 'M24,40 H226 V170 H24 Z', 1.6],
        ['f', '#3f6a4e', 'M30,46 H220 V164 H30 Z', 1.2],
        ['l', 'M44,70 h40 M44,86 h60 M44,102 h34 M150,64 c10,-8 20,8 30,0 M156,96 h30', 1.4],
      );
      break;
    case 'kiosk':
      ops.push(
        ['f', '#c8463a', 'M16,16 H234 V58 H16 Z', 1.4],
        [
          'f',
          '#fffaf0',
          'M40,16 H64 V58 H40 Z M88,16 H112 V58 H88 Z M136,16 H160 V58 H136 Z M184,16 H208 V58 H184 Z',
          0,
        ],
        [
          'l',
          'M16,58 C24,66 32,66 40,58 C48,66 56,66 64,58 C72,66 80,66 88,58 C96,66 104,66 112,58 C120,66 128,66 136,58 C144,66 152,66 160,58 C168,66 176,66 184,58 C192,66 200,66 208,58 C216,66 224,66 234,58',
          1.4,
        ],
        ['f', '#e6b347', rect(28, 90, 30, 40), 1.2],
        ['f', '#3d6ab0', rect(192, 92, 30, 38), 1.2],
      );
      break;
    case 'tram':
      ops.push(
        ['l', 'M16,40 H234 M16,48 H234', 1.2],
        ['f', '#c8463a', 'M20,190 L20,90 C20,80 28,74 38,74 L212,74 C222,74 230,80 230,90 L230,190 Z', 1.8],
        ['f', '#f4e6c8', 'M20,150 L230,150 L230,162 L20,162 Z', 0],
        ['f', '#c9dbe0', rect(34, 90, 38, 40), 1.2],
        ['f', '#c9dbe0', rect(178, 90, 38, 40), 1.2],
      );
      break;
    case 'forest':
      ops.push(
        ['f', '#4f7a40', 'M30,220 L50,140 L70,220 Z', 1.4],
        ['f', '#3f6a3a', 'M12,236 L36,150 L60,236 Z', 1.4],
        ['f', '#4f7a40', 'M184,226 L206,136 L228,226 Z', 1.4],
        ['f', '#3f6a3a', 'M200,240 L224,160 L248,240 Z', 1.4],
        ['f', '#6a8a4a', 'M16,230 C80,216 170,224 234,218 L234,284 L16,284 Z', 1.4],
      );
      break;
    case 'river':
      ops.push(
        ['f', '#6f9fc0', 'M16,214 C70,204 170,220 234,208 L234,284 L16,284 Z', 1.4],
        ['l', 'M30,232 c12,-4 24,4 36,0 M150,240 c12,-4 24,4 36,0', 1.1],
        ['f', '#6a8a4a', 'M22,214 C24,180 28,150 32,120 C36,150 36,186 34,214 Z', 1.2],
        ['f', '#6a8a4a', 'M216,210 C214,176 212,150 206,124 C204,150 206,184 208,210 Z', 1.2],
      );
      break;
    case 'office':
      ops.push(
        ['f', '#8a5a2a', 'M16,100 H234 V106 H16 Z', 1.2],
        ['f', '#e9dcc0', rect(26, 64, 26, 36), 1.1],
        ['f', '#d8c7a6', rect(56, 70, 22, 30), 1.1],
        ['f', '#e9dcc0', rect(176, 62, 24, 38), 1.1],
        ['f', '#d8c7a6', rect(204, 70, 22, 30), 1.1],
        ['l', 'M30,74 h18 M30,82 h18 M180,72 h16 M180,80 h16', 0.9],
      );
      break;
    case 'church':
      ops.push(
        ['f', '#d8c7a6', 'M176,214 L176,90 L210,90 L210,214 Z', 1.6],
        ['f', '#4f7a40', 'M172,92 L193,34 L214,92 Z', 1.6],
        ['l', 'M193,34 L193,20 M188,26 L198,26', 1.2],
        ['f', '#e6b347', c(193, 116, 8), 1.2],
        ['f', '#6a8a4a', 'M16,222 C80,210 170,214 234,208 L234,284 L16,284 Z', 1.4],
      );
      break;
    case 'night':
      ops.push(
        ['f', '#ffd34d', 'M192,48 A22,22 0 1,0 210,86 A17,17 0 1,1 192,48 Z', 1.6],
        [
          'l',
          'M40,44 l4,0 M42,42 l0,4 M70,74 l4,0 M72,72 l0,4 M150,40 l4,0 M152,38 l0,4 M34,120 l4,0 M36,118 l0,4',
          1.4,
        ],
      );
      break;
    case 'fair':
      ops.push(
        ['f', '#c8463a', 'M16,90 L125,30 L234,90 Z', 1.6],
        ['f', '#fffaf0', 'M70,60 L125,30 L100,90 Z M150,90 L125,30 L180,60 Z', 0],
        ['l', 'M16,90 L125,30 L234,90', 1.6],
        ['f', '#e6b347', c(125, 26, 6), 1.2],
      );
      break;
    case 'spa':
      ops.push(
        ['f', '#eadfc6', 'M16,200 L16,60 H234 V200 Z', 1.4],
        ['f', bg, 'M30,200 L30,110 C30,86 62,86 62,110 L62,200 Z', 1.2],
        ['f', bg, 'M188,200 L188,110 C188,86 220,86 220,110 L220,200 Z', 1.2],
        ['l', 'M16,74 H234 M16,82 H234', 1.2],
      );
      break;
    case 'shop':
      ops.push(
        ['f', '#8a5a2a', 'M16,84 H234 V90 H16 Z M16,150 H234 V156 H16 Z', 1.2],
        ['f', '#c8463a', c(34, 72, 10), 1.1],
        ['f', '#e6b347', rect(50, 60, 18, 24), 1.1],
        ['f', '#5f9a46', c(84, 74, 9), 1.1],
        ['f', '#3d6ab0', rect(186, 58, 16, 26), 1.1],
        ['f', '#e6b347', c(216, 74, 9), 1.1],
        ['f', '#d9a050', rect(28, 126, 22, 24), 1.1],
        ['f', '#c8463a', rect(198, 128, 22, 22), 1.1],
      );
      break;
    case 'sky':
      ops.push(
        [
          'f',
          '#fffaf0',
          'M36,80 C34,68 48,62 56,68 C60,56 80,56 84,68 C96,64 102,78 92,84 L42,86 C34,86 32,82 36,80 Z',
          1.3,
        ],
        [
          'f',
          '#fffaf0',
          'M164,54 C162,44 174,40 180,45 C184,36 200,36 202,46 C212,44 216,56 208,60 L170,61 C162,61 160,57 164,54 Z',
          1.3,
        ],
      );
      break;
    case 'marsh':
      ops.push(
        ['f', '#4a6a5a', 'M16,224 C70,212 170,226 234,214 L234,284 L16,284 Z', 1.4],
        [
          'f',
          '#fffaf0',
          'M16,200 C60,192 100,204 140,198 C180,192 210,200 234,196 L234,210 C200,214 170,206 140,212 C100,218 60,206 16,214 Z',
          0,
        ],
        ['f', '#6a8a4a', 'M26,226 C28,196 30,170 34,146 C38,170 38,200 36,226 Z', 1.2],
      );
      break;
    case 'field':
      ops.push(
        ['f', '#f2b53a', c(198, 52, 16), 1.4],
        ['f', '#e4c46a', 'M16,206 C70,194 170,202 234,196 L234,284 L16,284 Z', 1.4],
        [
          'l',
          'M30,214 l4,-14 M44,212 l4,-14 M58,214 l4,-14 M186,208 l4,-14 M200,210 l4,-14 M214,208 l4,-14',
          1.2,
        ],
      );
      break;
    case 'workshop':
      ops.push(
        ['f', '#8a5a2a', 'M16,80 H234 V86 H16 Z', 1.2],
        ['l', 'M36,80 L36,60 M30,60 h12 M206,80 L206,52 M200,52 l12,8 M214,52 l-12,8', 1.6],
        ['f', '#f0a040', 'M196,200 C186,186 192,168 200,160 C208,170 214,186 204,200 Z', 1.4],
      );
      break;
    case 'gym':
      ops.push(
        ['l', 'M16,200 H234 M40,200 L40,60 M210,200 L210,60 M40,80 H210', 1.6],
        ['f', '#c8463a', c(60, 110, 12), 1.4],
        ['l', 'M30,40 l20,20 M200,40 l20,20', 1.2],
      );
      break;
    case 'cabin':
      ops.push(
        ['f', '#a87a4a', 'M150,206 L150,140 L234,140 L234,206 Z', 1.6],
        ['f', '#6a4a30', 'M140,142 L192,96 L244,142 Z', 1.6],
        ['l', 'M150,158 H234 M150,174 H234 M150,190 H234', 1],
        ['f', '#4f7a40', 'M16,226 L36,150 L56,226 Z', 1.4],
        ['f', '#6a8a4a', 'M16,206 C80,196 170,204 234,200 L234,284 L16,284 Z', 1.4],
      );
      break;
    case 'rain':
      ops.push(
        [
          'f',
          '#9aa6b4',
          'M30,70 C28,54 48,46 60,54 C66,40 92,40 96,56 C112,54 118,72 106,78 L38,80 C28,80 26,74 30,70 Z',
          1.3,
        ],
        [
          'f',
          '#9aa6b4',
          'M150,56 C148,44 162,38 172,44 C178,32 200,34 202,46 C216,44 220,60 210,64 L158,66 C148,66 146,60 150,56 Z',
          1.3,
        ],
        ['l', 'M50,96 l-4,10 M70,92 l-4,10 M90,98 l-4,10 M170,82 l-4,10 M190,86 l-4,10 M210,80 l-4,10', 1.3],
      );
      break;
    case 'kitchen':
      ops.push(
        ['l', 'M16,60 H234 M16,100 H234 M56,60 V100 M96,60 V100 M136,60 V100 M176,60 V100 M216,60 V100', 0.9],
        ['f', '#8a929c', 'M26,140 C26,124 64,124 64,140 L60,170 L30,170 Z', 1.4],
        ['f', '#f0a040', 'M30,176 C28,168 36,162 40,170 C44,160 52,162 52,172 C58,168 62,176 58,180 Z', 1.2],
      );
      break;
    case 'gallery':
      ops.push(
        ['f', '#c08f2e', rect(28, 50, 50, 64), 1.6],
        ['f', '#5e7fb0', rect(34, 56, 38, 52), 1.1],
        ['f', '#c08f2e', rect(176, 40, 46, 56), 1.6],
        ['f', '#c8463a', rect(182, 46, 34, 44), 1.1],
      );
      break;
    case 'screen':
      ops.push(
        ['f', '#2e3550', rect(16, 16, 218, 268), 0],
        ['l', 'M30,40 h60 M30,52 h90 M30,64 h40 M150,40 h60 M150,52 h40 M30,80 h80', 1.2],
      );
      break;
    default:
      break;
  }
  return ops;
}

function hairBack(h: Hair, col: string): SceneOp[] {
  switch (h) {
    case 'bob':
      return [['f', col, 'M94,178 C88,128 104,106 125,106 C146,106 162,128 156,178 Z', 1.8]];
    case 'long':
      return [['f', col, 'M92,216 C86,150 100,106 125,106 C150,106 164,150 158,216 Z', 1.8]];
    case 'bun':
      return [['f', col, c(125, 104, 13), 1.8]];
    default:
      return [];
  }
}

function hairFront(h: Hair, col: string): SceneOp[] {
  switch (h) {
    case 'short':
      return [
        [
          'f',
          col,
          'M100,148 C96,124 110,112 126,112 C142,112 156,124 150,148 C146,134 136,128 126,128 C116,128 104,134 100,148 Z',
          1.8,
        ],
      ];
    case 'part':
      return [
        [
          'f',
          col,
          'M99,150 C94,122 110,110 128,110 C146,110 158,124 151,150 C150,138 142,128 130,126 C120,132 110,134 104,142 Z',
          1.8,
        ],
      ];
    case 'bald':
      return [
        ['f', col, 'M99,154 C95,142 98,134 104,130 C103,140 104,148 108,156 Z', 1.3],
        ['f', col, 'M151,154 C155,142 152,134 146,130 C147,140 146,148 142,156 Z', 1.3],
      ];
    case 'bob':
    case 'long':
      return [
        [
          'f',
          col,
          'M101,144 C102,122 114,114 125,114 C136,114 148,122 149,144 C140,132 132,128 125,128 C118,128 110,132 101,144 Z',
          1.6,
        ],
      ];
    case 'bun':
      return [
        [
          'f',
          col,
          'M100,146 C98,124 110,114 125,114 C140,114 152,124 150,146 C144,132 134,126 125,126 C116,126 106,132 100,146 Z',
          1.6,
        ],
      ];
    case 'curly': {
      const ops: SceneOp[] = [];
      for (const [x, y] of [
        [102, 140],
        [104, 126],
        [114, 116],
        [126, 112],
        [138, 116],
        [148, 126],
        [150, 140],
      ] as const)
        ops.push(['f', col, c(x, y, 9), 1.4]);
      return ops;
    }
    default:
      return [];
  }
}

function beardOps(b: Beard | undefined, col: string): SceneOp[] {
  const must: SceneOp = [
    'f',
    col,
    'M108,170 C114,164 121,165 125,168 C129,165 136,164 142,170 C137,174 131,173 125,171 C119,173 113,174 108,170 Z',
    1.4,
  ];
  switch (b) {
    case 'mustache':
      return [must];
    case 'walrus':
      return [
        [
          'f',
          col,
          'M98,172 C106,160 119,160 125,167 C131,160 144,160 152,172 C146,178 138,176 133,173 C129,178 121,178 117,173 C112,176 104,178 98,172 Z',
          1.8,
        ],
      ];
    case 'beard':
      return [
        [
          'f',
          col,
          'M100,160 C98,190 108,206 125,210 C142,206 152,190 150,160 C146,176 136,184 125,184 C114,184 104,176 100,160 Z',
          1.8,
        ],
        must,
      ];
    case 'goatee':
      return [
        [
          'f',
          col,
          'M116,180 C118,192 122,198 125,200 C128,198 132,192 134,180 C130,184 120,184 116,180 Z',
          1.4,
        ],
        must,
      ];
    default:
      return [];
  }
}

function mouthOps(m: Mood, female: boolean): SceneOp[] {
  const ops: SceneOp[] = [];
  switch (m) {
    case 'grin':
      ops.push(['f', '#fffaf0', 'M112,172 C118,184 132,184 138,172 Z', 1.6]);
      break;
    case 'flat':
      ops.push(['l', 'M116,177 L134,177', 1.8]);
      break;
    case 'o':
      ops.push(['f', 'dark', c(125, 177, 3.6), 0]);
      break;
    case 'sly':
      ops.push(['l', 'M114,177 C122,179 130,177 136,171', 1.8]);
      break;
    case 'sad':
      ops.push(['l', 'M114,180 C120,174 130,174 136,180', 1.8]);
      break;
    default:
      ops.push(['l', 'M114,174 C120,180 130,180 136,174', 1.8]);
  }
  if (female && m !== 'grin' && m !== 'o')
    ops.push(['f', '#c8463a', 'M118,175 C122,173 128,173 132,175 C128,179 122,179 118,175 Z', 0.8]);
  return ops;
}

function collarOps(col: Collar, body: string, accent: string): SceneOp[] {
  const shirt: SceneOp = ['f', 'cloud', 'M108,210 L125,244 L142,210 Z', 1.6];
  switch (col) {
    case 'shirt':
      return [shirt];
    case 'tie':
      return [shirt, ['f', accent, 'M121,214 L129,214 L131,240 L125,248 L119,240 Z', 1.4]];
    case 'bow':
      return [shirt, ['f', accent, 'M110,216 L125,224 L140,216 L140,232 L125,224 L110,232 Z', 1.4]];
    case 'uniform':
      return [
        ['l', 'M125,214 L125,284', 1.2],
        ['f', '#e6b347', c(132, 232, 3), 1],
        ['f', '#e6b347', c(132, 250, 3), 1],
        ['f', '#e6b347', c(132, 268, 3), 1],
        ['f', accent, 'M102,212 L114,222 L110,212 Z', 1],
        ['f', accent, 'M148,212 L136,222 L140,212 Z', 1],
      ];
    case 'apron':
      return [
        shirt,
        ['f', 'cloud', 'M94,238 L156,238 L160,284 L90,284 Z', 1.8],
        ['l', 'M96,238 L104,212 M154,238 L146,212', 1.4],
      ];
    case 'cassock':
      return [
        ['f', 'cloud', 'M116,210 L134,210 L134,220 L116,220 Z', 1.2],
        ['l', 'M125,222 L125,284', 1],
      ];
    case 'turtle':
      return [
        [
          'f',
          shade(body, 0.15),
          'M106,204 C114,214 136,214 144,204 L144,218 C136,226 114,226 106,218 Z',
          1.6,
        ],
      ];
    case 'vest':
      return [
        shirt,
        ['f', accent, 'M74,284 L78,238 C82,224 90,216 100,212 L112,240 L112,284 Z', 1.8],
        ['f', accent, 'M176,284 L172,238 C168,224 160,216 150,212 L138,240 L138,284 Z', 1.8],
      ];
    case 'vestHi':
      return [
        [
          'f',
          '#f0a040',
          'M70,284 L74,236 C80,222 90,214 100,212 L150,212 C160,214 170,222 176,236 L180,284 Z',
          1.8,
        ],
        ['l', 'M76,254 L174,254 M74,268 L176,268', 3.2],
      ];
    default:
      return [];
  }
}

function hatOps(h: Hat | undefined, col: string, acc: string): SceneOp[] {
  switch (h) {
    case 'cap':
      return [
        ['f', col, 'M96,132 C96,112 108,104 125,104 C142,104 154,112 154,132 Z', 2.2],
        ['f', shade(col, 0.25), 'M96,124 L154,124 L154,133 L96,133 Z', 1.4],
        ['f', '#2f3542', 'M94,133 C106,146 144,146 156,133 C148,140 102,140 94,133 Z', 1.6],
        ['f', acc, c(125, 116, 4.5), 1.2],
      ];
    case 'flatcap':
      return [
        ['f', col, 'M94,134 C90,112 106,98 126,96 C150,94 162,108 158,128 C154,132 146,132 140,130 Z', 2.2],
        [
          'f',
          shade(col, 0.2),
          'M94,132 C106,138 142,138 160,128 C166,132 164,138 156,141 C138,147 108,147 96,141 C90,139 90,134 94,132 Z',
          2,
        ],
      ];
    case 'beret':
      return [
        ['f', col, 'M94,132 C88,112 110,98 132,100 C154,102 164,116 156,132 C140,124 110,124 94,132 Z', 2.2],
        ['l', 'M128,100 L130,92', 1.6],
      ];
    case 'scarf':
      return [
        [
          'f',
          col,
          'M94,170 C88,124 104,104 125,104 C146,104 162,124 156,170 C154,180 148,184 144,180 C146,150 140,128 125,128 C110,128 104,150 106,180 C102,184 96,180 94,170 Z',
          2,
        ],
        ['f', col, 'M118,190 L104,206 L122,198 Z M132,190 L146,206 L128,198 Z', 1.4],
        ['f', 'cloud', c(110, 114, 2.6), 0],
        ['f', 'cloud', c(125, 110, 2.6), 0],
        ['f', 'cloud', c(140, 114, 2.6), 0],
        ['f', 'cloud', c(100, 140, 2.6), 0],
        ['f', 'cloud', c(150, 140, 2.6), 0],
      ];
    case 'straw':
      return [
        ['f', col, 'M98,134 C96,110 110,100 125,100 C140,100 154,110 152,134 Z', 2],
        ['f', acc, 'M98,124 L152,124 L152,132 L98,132 Z', 1.2],
        ['f', col, 'M62,136 C74,124 176,124 188,136 C176,148 74,148 62,136 Z', 2],
      ];
    case 'bucket':
      return [
        ['f', col, 'M92,138 C94,108 106,98 125,98 C144,98 156,108 158,138 Z', 2],
        ['f', shade(col, 0.15), 'M82,140 C96,130 154,130 168,140 C162,152 88,152 82,140 Z', 2],
      ];
    case 'chef':
      return [
        [
          'f',
          'cloud',
          'M100,134 L102,98 C92,92 96,74 110,78 C112,64 138,64 140,78 C154,74 158,92 148,98 L150,134 Z',
          2,
        ],
        ['l', 'M102,124 L148,124', 1.2],
      ];
    case 'hard':
      return [
        ['f', col, 'M94,134 C92,106 106,94 125,94 C144,94 158,106 156,134 Z', 2.2],
        ['f', col, 'M86,134 L164,134 L164,141 L86,141 Z', 1.8],
        ['l', 'M125,96 L125,132', 1.2],
      ];
    case 'top':
      return [
        ['f', col, 'M100,130 L104,78 L146,78 L150,130 Z', 2.4],
        ['f', acc, 'M102,114 L148,114 L149,124 L101,124 Z', 1.4],
        ['f', col, 'M82,132 C92,122 158,122 168,132 C158,142 92,142 82,132 Z', 2.4],
      ];
    case 'witch':
      return [
        ['f', col, 'M100,134 C104,104 114,78 140,56 C134,82 144,108 150,134 Z', 2.2],
        ['f', acc, 'M102,124 L148,124 L150,132 L100,132 Z', 1.2],
        ['f', col, 'M76,136 C96,126 154,126 174,136 C154,148 96,148 76,136 Z', 2.2],
      ];
    case 'band':
      return [['f', col, 'M99,128 L151,128 L152,138 L98,138 Z', 1.6]];
    case 'hood':
      return [
        [
          'f',
          col,
          'M90,180 C82,124 100,96 125,96 C150,96 168,124 160,180 C156,190 150,190 148,182 C150,146 140,124 125,124 C110,124 100,146 102,182 C100,190 94,190 90,180 Z',
          2,
        ],
      ];
    default:
      return [];
  }
}

/** Sestaví portrét. */
export function figure(f: FigureSpec): SceneOp[] {
  const skin = f.skin ?? SKIN;
  const hairCol = f.hairColor ?? '#6b4423';
  const accent = f.accent ?? '#c8463a';
  const ops: SceneOp[] = [...motifOps(f.motif ?? 'none', f.bg)];
  const hood = f.hat === 'hood';
  if (!hood) ops.push(...hairBack(f.hair ?? 'short', hairCol));
  ops.push(['f', f.body, BUST, 2.4]);
  ops.push(['h', 'M150,210 C180,218 202,240 206,284 L178,284 C176,252 168,228 150,210 Z', 45]);
  ops.push(...collarOps(f.collar ?? 'plain', f.body, accent));
  ops.push(['f', skin, 'M110,182 L110,214 C116,220 134,220 140,214 L140,182 Z', 2]);
  ops.push(['f', skin, 'M99,150 C91,144 89,164 100,166 Z', 1.8]);
  ops.push(['f', skin, 'M151,150 C159,144 161,164 150,166 Z', 1.8]);
  ops.push(['f', skin, c(125, 156, 26, 30), 2.4]);
  ops.push(['f', 'blush', c(108, 168, 6), 0], ['f', 'blush', c(142, 168, 6), 0]);
  ops.push(['l', 'M107,144 C111,140 117,140 120,143 M130,143 C133,140 139,140 143,144', 1.8]);
  ops.push(['f', 'dark', c(114, 152, 2.5), 0], ['f', 'dark', c(136, 152, 2.5), 0]);
  if (f.female) ops.push(['l', 'M109,149 l-3,-2 M141,149 l3,-2', 1.2]);
  if (f.redNose) ops.push(['f', 'nose', 'M125,150 C119,160 118,166 123,168 C129,170 133,165 131,159 Z', 1.6]);
  else ops.push(['l', 'M125,152 C121,162 122,166 127,165', 1.5]);
  ops.push(...mouthOps(f.mood ?? 'smile', !!f.female));
  ops.push(...beardOps(f.beard, f.beardColor ?? hairCol));
  if (!hood) ops.push(...hairFront(f.hair ?? 'short', hairCol));
  if (f.glasses)
    ops.push([
      'l',
      `${c(114, 152, 8)} ${c(136, 152, 8)} M122,151 L128,151 M106,150 L99,148 M144,150 L151,148`,
      1.8,
    ]);
  ops.push(...hatOps(f.hat, f.hatColor ?? '#4a5a3a', f.hatAccent ?? '#c8463a'));
  if (f.prop) {
    const size = f.prop.size ?? 64;
    const x = f.prop.x ?? 158;
    const y = f.prop.y ?? 196;
    ops.push(['i', f.prop.icon, x, y, size, f.prop.color]);
    ops.push(['f', skin, c(x + size * 0.45, y + size * 0.92, 11, 9), 1.8]);
    ops.push([
      'l',
      `M${x + size * 0.45 - 9},${y + size * 0.92 - 3} l18,0 M${x + size * 0.45 - 9},${y + size * 0.92 + 3} l18,0`,
      1.1,
    ]);
  }
  if (f.extra) ops.push(...f.extra);
  return ops;
}

/** Postavy žolíků (klíč scény `fig-<id žolíka>`). */
const SPECS: Readonly<Record<string, FigureSpec>> = {
  hearts_man: {
    bg: '#e9b9b0',
    motif: 'street',
    body: '#8e1b2c',
    collar: 'shirt',
    hair: 'part',
    hairColor: '#3b2a1a',
    beard: 'mustache',
    hat: 'beret',
    hatColor: '#8e1b2c',
    mood: 'smile',
    prop: { icon: 'hearts', color: '#c8463a' },
  },
  gravedigger: {
    bg: '#8a9aa8',
    motif: 'cemetery',
    body: '#4a4f62',
    collar: 'plain',
    hair: 'short',
    hairColor: '#2f2a26',
    hat: 'flatcap',
    hatColor: '#3a3f4a',
    mood: 'flat',
    beard: 'goatee',
    prop: { icon: 'old-lantern', color: '#e6b347', size: 66 },
  },
  jeweler: {
    bg: '#d9c9e6',
    motif: 'shop',
    body: '#2f3542',
    collar: 'bow',
    accent: '#7b4fb0',
    hair: 'bald',
    hairColor: '#8a7a6a',
    glasses: true,
    mood: 'sly',
    prop: { icon: 'diamonds', color: '#5fb8d6' },
  },
  crusader: {
    bg: '#cfd8e0',
    motif: 'church',
    body: '#f4ecd8',
    collar: 'plain',
    hair: 'short',
    hairColor: '#8a5a34',
    beard: 'beard',
    mood: 'flat',
    extra: [
      [
        'f',
        '#c8463a',
        'M118,226 L132,226 L132,244 L150,244 L150,256 L132,256 L132,284 L118,284 L118,256 L100,256 L100,244 L118,244 Z',
        1.4,
      ],
    ],
    prop: { icon: 'broadsword', color: '#8d97a5', size: 72 },
  },
  early_bird: {
    bg: '#f4d9a8',
    motif: 'field',
    body: '#5f9a46',
    collar: 'shirt',
    hair: 'short',
    hairColor: '#c9a060',
    hat: 'straw',
    hatColor: '#e4c46a',
    mood: 'grin',
    prop: { icon: 'rooster', color: '#c8463a', size: 70 },
  },
  night_shift: {
    bg: '#3e4a6a',
    motif: 'night',
    body: '#3d6ab0',
    collar: 'uniform',
    accent: '#e6b347',
    hair: 'short',
    hairColor: '#2f2a26',
    hat: 'cap',
    hatColor: '#2f3e5a',
    hatAccent: '#e6b347',
    mood: 'sad',
    prop: { icon: 'alarm-clock', color: '#e6b347' },
  },
  meteorologist: {
    bg: '#b8c6d4',
    motif: 'rain',
    body: '#3d4a66',
    collar: 'tie',
    accent: '#e6b347',
    hair: 'part',
    hairColor: '#5e3a20',
    glasses: true,
    mood: 'smile',
    prop: { icon: 'umbrella', color: '#c8463a', size: 70 },
  },
  pe_teacher: {
    bg: '#c9dbe0',
    motif: 'gym',
    body: '#c8463a',
    collar: 'turtle',
    hair: 'short',
    hairColor: '#3b2a1a',
    hat: 'band',
    hatColor: '#fffaf0',
    beard: 'mustache',
    mood: 'o',
    prop: { icon: 'stopwatch', color: '#e6b347' },
  },
  party_for_two: {
    bg: '#e6c6d8',
    motif: 'pub',
    body: '#7b4fb0',
    collar: 'shirt',
    female: true,
    hair: 'long',
    hairColor: '#c9a060',
    mood: 'smile',
    prop: { icon: 'wine-glass', color: '#c8463a' },
  },
  piggy_bank: {
    bg: '#f2d0d6',
    motif: 'shop',
    body: '#5e7fb0',
    collar: 'shirt',
    hair: 'curly',
    hairColor: '#8a5a34',
    mood: 'grin',
    prop: { icon: 'piggy-bank', color: '#e8a0b0', size: 70 },
  },
  flea_trader: {
    bg: '#e0d0b0',
    motif: 'fair',
    body: '#8a6a4a',
    collar: 'vest',
    accent: '#4a5a3a',
    hair: 'bald',
    hairColor: '#5e3a20',
    beard: 'walrus',
    beardColor: '#5e3a20',
    mood: 'sly',
    prop: { icon: 'coins-pile', color: '#e6b347' },
  },
  helpline_aunt: {
    bg: '#e8d8f0',
    motif: 'office',
    body: '#c86a8a',
    collar: 'plain',
    female: true,
    hair: 'curly',
    hairColor: '#b0b0b0',
    glasses: true,
    mood: 'smile',
    prop: { icon: 'rotary-phone', color: '#2f3542' },
  },
  weekend_cottager: {
    bg: '#c9dbc0',
    motif: 'cabin',
    body: '#3f7334',
    collar: 'shirt',
    hair: 'short',
    hairColor: '#5e3a20',
    hat: 'bucket',
    hatColor: '#d8c7a6',
    beard: 'beard',
    beardColor: '#6b4423',
    mood: 'grin',
    prop: { icon: 'battle-axe', color: '#8d97a5', size: 70 },
  },
  shooting_gallery: {
    bg: '#f0d8a8',
    motif: 'fair',
    body: '#3d6ab0',
    collar: 'vest',
    accent: '#c8463a',
    hair: 'part',
    hairColor: '#3b2a1a',
    mood: 'sly',
    prop: { icon: 'trophy', color: '#e6b347' },
  },
  tobacconist: {
    bg: '#e8d8b8',
    motif: 'kiosk',
    body: '#6a4a3a',
    collar: 'vest',
    accent: '#3d4a66',
    hair: 'bald',
    hairColor: '#8a7a6a',
    glasses: true,
    beard: 'mustache',
    beardColor: '#8a7a6a',
    mood: 'flat',
    prop: { icon: 'newspaper', color: '#eadfc6', size: 70 },
  },
  ticket_inspector: {
    bg: '#d0d8c8',
    motif: 'tram',
    body: '#2f3e5a',
    collar: 'uniform',
    accent: '#e6b347',
    hair: 'short',
    hairColor: '#2f2a26',
    hat: 'cap',
    hatColor: '#2f3e5a',
    hatAccent: '#e6b347',
    beard: 'mustache',
    beardColor: '#2f2a26',
    mood: 'sly',
    prop: { icon: 'ticket', color: '#e6b347' },
  },
  doorman: {
    bg: '#d8ccb8',
    motif: 'office',
    body: '#4a5a3a',
    collar: 'uniform',
    accent: '#e6b347',
    hair: 'bald',
    hairColor: '#b0b0b0',
    hat: 'cap',
    hatColor: '#4a5a3a',
    hatAccent: '#e6b347',
    beard: 'walrus',
    beardColor: '#b0b0b0',
    mood: 'flat',
    prop: { icon: 'key', color: '#e6b347' },
  },
  goldsmith: {
    bg: '#f0e0b0',
    motif: 'workshop',
    body: '#6a4a3a',
    collar: 'apron',
    hair: 'short',
    hairColor: '#5e3a20',
    glasses: true,
    beard: 'beard',
    beardColor: '#5e3a20',
    mood: 'smile',
    prop: { icon: 'gold-bar', color: '#e6b347' },
  },
  paver: {
    bg: '#d8d0c0',
    motif: 'street',
    body: '#5e7fb0',
    collar: 'vestHi',
    hair: 'short',
    hairColor: '#3b2a1a',
    hat: 'hard',
    hatColor: '#e6b347',
    beard: 'mustache',
    beardColor: '#3b2a1a',
    mood: 'flat',
    prop: { icon: 'warhammer', color: '#8d97a5', size: 70 },
  },
  postman: {
    bg: '#e6d8b0',
    motif: 'street',
    body: '#3d6ab0',
    collar: 'uniform',
    accent: '#e6b347',
    hair: 'short',
    hairColor: '#8a5a34',
    hat: 'cap',
    hatColor: '#3d6ab0',
    hatAccent: '#e6b347',
    mood: 'grin',
    prop: { icon: 'present', color: '#d9a050' },
  },
  grocer: {
    bg: '#dcd8b0',
    motif: 'shop',
    body: '#5f9a46',
    collar: 'apron',
    hair: 'bald',
    hairColor: '#5e3a20',
    beard: 'walrus',
    beardColor: '#5e3a20',
    mood: 'smile',
    redNose: true,
    prop: { icon: 'potato', color: '#c9a060' },
  },
  grill_dad: {
    bg: '#c9dbc0',
    motif: 'cabin',
    body: '#c8463a',
    collar: 'apron',
    hair: 'bald',
    hairColor: '#6b4423',
    beard: 'mustache',
    beardColor: '#6b4423',
    mood: 'grin',
    redNose: true,
    prop: { icon: 'roast-chicken', color: '#d9a050', size: 70 },
  },
  teacher: {
    bg: '#d8e0d0',
    motif: 'classroom',
    body: '#7b4fb0',
    collar: 'plain',
    female: true,
    hair: 'bun',
    hairColor: '#5e3a20',
    glasses: true,
    mood: 'flat',
    prop: { icon: 'open-book', color: '#eadfc6', size: 70 },
  },
  tram_driver: {
    bg: '#d8d0c0',
    motif: 'tram',
    body: '#3d4a66',
    collar: 'uniform',
    accent: '#c8463a',
    hair: 'short',
    hairColor: '#3b2a1a',
    hat: 'cap',
    hatColor: '#c8463a',
    hatAccent: '#e6b347',
    mood: 'smile',
    prop: { icon: 'ringing-bell', color: '#e6b347' },
  },
  punter: {
    bg: '#cfe0c8',
    motif: 'pub',
    body: '#6a5a4a',
    collar: 'shirt',
    hair: 'part',
    hairColor: '#2f2a26',
    hat: 'flatcap',
    hatColor: '#6a5a4a',
    mood: 'sly',
    redNose: true,
    prop: { icon: 'coinflip', color: '#e6b347' },
  },
  pavlac_gossip: {
    bg: '#e8dcc8',
    motif: 'street',
    body: '#5e7fb0',
    collar: 'plain',
    female: true,
    hair: 'none',
    hat: 'scarf',
    hatColor: '#c8463a',
    mood: 'o',
    prop: { icon: 'eyeball', color: '#fffaf0', size: 58 },
  },
  temp_worker: {
    bg: '#f0dca8',
    motif: 'field',
    body: '#5e7fb0',
    collar: 'turtle',
    hair: 'curly',
    hairColor: '#c9a060',
    hat: 'cap',
    hatColor: '#c8463a',
    hatAccent: '#fffaf0',
    mood: 'smile',
    prop: { icon: 'wheat', color: '#e4c46a', size: 70 },
  },
  fisherman: {
    bg: '#b8cfd8',
    motif: 'river',
    body: '#4a5a3a',
    collar: 'turtle',
    hair: 'short',
    hairColor: '#6b4423',
    hat: 'bucket',
    hatColor: '#6a8a4a',
    beard: 'beard',
    beardColor: '#8a7a6a',
    mood: 'smile',
    prop: { icon: 'tropical-fish', color: '#6f9fc0', size: 70 },
  },
  garbage_man: {
    bg: '#d0d8c8',
    motif: 'street',
    body: '#5e7fb0',
    collar: 'vestHi',
    hair: 'short',
    hairColor: '#2f2a26',
    hat: 'cap',
    hatColor: '#f0a040',
    hatAccent: '#fffaf0',
    mood: 'grin',
    prop: { icon: 'broken-bottle', color: '#5f9a46', size: 64 },
  },
  pig_slaughter: {
    bg: '#f0d8d0',
    motif: 'kitchen',
    body: '#fffaf0',
    collar: 'apron',
    hair: 'short',
    hairColor: '#3b2a1a',
    hat: 'chef',
    beard: 'walrus',
    beardColor: '#3b2a1a',
    mood: 'grin',
    redNose: true,
    prop: { icon: 'sausage', color: '#c8463a' },
  },
  mushroom_picker: {
    bg: '#cfdcc0',
    motif: 'forest',
    body: '#8a6a4a',
    collar: 'turtle',
    female: true,
    hair: 'none',
    hat: 'scarf',
    hatColor: '#3d6ab0',
    mood: 'grin',
    prop: { icon: 'mushroom', color: '#b5653f', size: 66 },
  },
  herbalist: {
    bg: '#d8e0c0',
    motif: 'forest',
    body: '#6a5a3a',
    collar: 'plain',
    female: true,
    hair: 'none',
    hat: 'scarf',
    hatColor: '#5f9a46',
    mood: 'sly',
    prop: { icon: 'garlic', color: '#eadfc6' },
  },
  regular: {
    bg: '#d8c09a',
    motif: 'pub',
    body: '#5e7fb0',
    collar: 'shirt',
    hair: 'bald',
    hairColor: '#8a7a6a',
    hat: 'flatcap',
    hatColor: '#6d8f5a',
    beard: 'walrus',
    beardColor: '#6b4423',
    mood: 'smile',
    redNose: true,
    prop: { icon: 'beer-stein', color: '#e6b347', size: 70 },
  },
  beer_sommelier: {
    bg: '#e0c890',
    motif: 'pub',
    body: '#2f3542',
    collar: 'bow',
    accent: '#c8463a',
    hair: 'part',
    hairColor: '#8a7a6a',
    beard: 'goatee',
    beardColor: '#8a7a6a',
    mood: 'sly',
    prop: { icon: 'beer-bottle', color: '#5f9a46' },
  },
  archivist: {
    bg: '#d8ccb0',
    motif: 'office',
    body: '#6a5a4a',
    collar: 'turtle',
    hair: 'bald',
    hairColor: '#b0b0b0',
    glasses: true,
    beard: 'beard',
    beardColor: '#b0b0b0',
    mood: 'flat',
    prop: { icon: 'papers', color: '#eadfc6' },
  },
  fair_magician: {
    bg: '#d8c0e0',
    motif: 'fair',
    body: '#2f3542',
    collar: 'bow',
    accent: '#e6b347',
    hair: 'part',
    hairColor: '#2f2a26',
    hat: 'top',
    hatColor: '#2f3542',
    hatAccent: '#7b4fb0',
    beard: 'goatee',
    beardColor: '#2f2a26',
    mood: 'sly',
    prop: { icon: 'rabbit', color: '#fffaf0', size: 62 },
  },
  tour_guide: {
    bg: '#c9dbe8',
    motif: 'sky',
    body: '#e6b347',
    collar: 'shirt',
    female: true,
    hair: 'bob',
    hairColor: '#8a5a34',
    mood: 'grin',
    prop: { icon: 'umbrella', color: '#3d6ab0', size: 70 },
  },
  spa_guest: {
    bg: '#d0e0dc',
    motif: 'spa',
    body: '#eadfc6',
    collar: 'shirt',
    hair: 'bald',
    hairColor: '#b0b0b0',
    beard: 'walrus',
    beardColor: '#b0b0b0',
    hat: 'top',
    hatColor: '#3d4a66',
    hatAccent: '#e6b347',
    mood: 'smile',
    prop: { icon: 'glass-shot', color: '#fffaf0', size: 56 },
  },
  chronicler: {
    bg: '#e0d4b8',
    motif: 'office',
    body: '#4a5a3a',
    collar: 'plain',
    hair: 'part',
    hairColor: '#8a7a6a',
    hat: 'beret',
    hatColor: '#2f3542',
    glasses: true,
    mood: 'flat',
    prop: { icon: 'quill-ink', color: '#2f3542' },
  },
  glassblower: {
    bg: '#f0d8b0',
    motif: 'workshop',
    body: '#6a4a3a',
    collar: 'apron',
    hair: 'short',
    hairColor: '#3b2a1a',
    beard: 'beard',
    beardColor: '#3b2a1a',
    mood: 'o',
    prop: { icon: 'wine-bottle', color: '#5fb8d6' },
  },
  notary_public: {
    bg: '#d8d0c8',
    motif: 'office',
    body: '#2f3542',
    collar: 'tie',
    accent: '#8e1b2c',
    hair: 'part',
    hairColor: '#b0b0b0',
    glasses: true,
    mood: 'flat',
    prop: { icon: 'scroll-unfurled', color: '#eadfc6', size: 70 },
  },
  witch: {
    bg: '#b8a8c8',
    motif: 'night',
    body: '#3d3a4a',
    collar: 'plain',
    female: true,
    hair: 'long',
    hairColor: '#8a8a8a',
    hat: 'witch',
    hatColor: '#2f2a3a',
    hatAccent: '#7b4fb0',
    mood: 'sly',
    skin: '#d8c9a8',
    prop: { icon: 'cat', color: '#3d3a4a', size: 66 },
  },
  will_o_wisp: {
    bg: '#3a5a50',
    motif: 'marsh',
    body: '#c9dbe0',
    collar: 'plain',
    female: true,
    hair: 'long',
    hairColor: '#e4e0c0',
    mood: 'sly',
    skin: '#e8eedc',
    prop: { icon: 'lantern', color: '#ffd34d' },
  },
  noon_witch: {
    bg: '#f0dca0',
    motif: 'field',
    body: '#8a8478',
    collar: 'plain',
    female: true,
    hair: 'none',
    hat: 'scarf',
    hatColor: '#6a6a60',
    mood: 'flat',
    skin: '#d8c9a8',
    prop: { icon: 'scythe', color: '#8d97a5', size: 76 },
  },
  klekanice: {
    bg: '#2e3550',
    motif: 'night',
    body: '#e8e4dc',
    collar: 'plain',
    hair: 'none',
    hat: 'hood',
    hatColor: '#e8e4dc',
    mood: 'o',
    skin: '#c8ccd0',
    prop: { icon: 'ringing-bell', color: '#e6b347' },
  },
  parish_priest: {
    bg: '#e0d8c8',
    motif: 'church',
    body: '#2f2a2a',
    collar: 'cassock',
    hair: 'bald',
    hairColor: '#b0b0b0',
    glasses: true,
    mood: 'smile',
    redNose: true,
    prop: { icon: 'candle-light', color: '#fffaf0' },
  },
  seer: {
    bg: '#c8b0d8',
    motif: 'night',
    body: '#7b4fb0',
    collar: 'plain',
    female: true,
    hair: 'long',
    hairColor: '#2f2a26',
    hat: 'scarf',
    hatColor: '#e6b347',
    mood: 'sly',
    prop: { icon: 'crystal-ball', color: '#a8c4e8' },
  },
  court_painter: {
    bg: '#e8dcc8',
    motif: 'gallery',
    body: '#5e7fb0',
    collar: 'bow',
    accent: '#c8463a',
    hair: 'curly',
    hairColor: '#6b4423',
    hat: 'beret',
    hatColor: '#c8463a',
    beard: 'goatee',
    beardColor: '#6b4423',
    mood: 'smile',
    prop: { icon: 'sunflower', color: '#e6b347', size: 70 },
  },
  colorblind_uncle: {
    bg: '#d0e0c8',
    motif: 'street',
    body: '#c86a8a',
    collar: 'tie',
    accent: '#5f9a46',
    hair: 'bald',
    hairColor: '#8a7a6a',
    glasses: true,
    beard: 'mustache',
    beardColor: '#8a7a6a',
    mood: 'grin',
    prop: { icon: 'spectacles', color: '#3d6ab0', size: 60 },
  },
  anonymous_commenter: {
    bg: '#2e3550',
    motif: 'screen',
    body: '#4a4f62',
    collar: 'plain',
    hair: 'none',
    hat: 'hood',
    hatColor: '#5a5f72',
    mood: 'sly',
    skin: '#c8ccd0',
    prop: { icon: 'laptop', color: '#8d97a5', size: 70 },
  },
  brno_native: {
    bg: '#d8d0c0',
    motif: 'street',
    body: '#c8463a',
    collar: 'shirt',
    hair: 'short',
    hairColor: '#3b2a1a',
    hat: 'flatcap',
    hatColor: '#3d4a66',
    mood: 'grin',
    prop: { icon: 'dragon-head', color: '#5f9a46', size: 70 },
  },
};

/** Tahy všech portrétů (klíč `fig-<id>`). */
export const FIGURES: Readonly<Record<string, readonly SceneOp[]>> = Object.fromEntries(
  Object.entries(SPECS).map(([id, spec]) => [`fig-${id}`, figure(spec)]),
);

/** Id žolíků, které mají portrét. */
export const FIGURE_IDS: readonly string[] = Object.keys(SPECS);

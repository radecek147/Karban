/**
 * Sdílené nástroje pro ručně kreslené scény a portréty (tisk ve stylu Sirkárna): typ tahu `SceneOp` a pomocné
 * cesty. Bez závislostí na ostatních modulech kresby — importují ho scény, postavy i dávky úprav žolíků
 * (src/ui/art/jokers/*.ts).
 *
 * Kresba je seznam tahů v souřadnicích karty 250 × 350 (okno obrázku 16–234 × 16–284):
 *  - `['f', barva, d, linka]` plocha (papír → inkoust v barvě → obrys dané tloušťky, 0 = bez obrysu); barva je
 *    `#rrggbb`, role z palety scén (`dark` = plná tuš, `cloth`/`paper`/`cloud` = papír bez barvy, `blush` = lazura),
 *  - `['l', d, tuš]` linka tuší,
 *  - `['s', barva, d, šířka]` barevná linka (pruh, provaz, paprsek),
 *  - `['h', d, úhel]` stín (studená lazura přes tvar),
 *  - `['i', ikona, x, y, velikost, barva]` ikona z knihovny (src/ui/art/icons.ts) jako rekvizita.
 */

export type SceneOp =
  | readonly ['f', string, string, number]
  | readonly ['l', string, number]
  | readonly ['h', string, number]
  | readonly ['s', string, string, number]
  | readonly ['i', string, number, number, number, string];

/** Kruh / elipsa jako cesta. */
export const c = (cx: number, cy: number, r: number, ry = r): string =>
  `M${cx - r},${cy} A${r},${ry} 0 1,0 ${cx + r},${cy} A${r},${ry} 0 1,0 ${cx - r},${cy} Z`;

/** Obdélník jako cesta. */
export const rect = (x: number, y: number, w: number, h: number): string =>
  `M${x},${y} H${x + w} V${y + h} H${x} Z`;

/** Ztmavení barvy `#rrggbb` o podíl `t` (0–1); jiný zápis vrátí beze změny. */
export function shade(hex: string, t: number): string {
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

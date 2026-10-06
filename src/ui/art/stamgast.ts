/**
 * Postavička Štamgasta pro tutoriál (DESIGN 13.5) ve stylu Sirkárna (tisk, src/ui/art/print.ts):
 * pivní tácek, hlava s bekovkou, knír a červený nos, v ruce půllitr. Vlastní kresba, dekorativní.
 */
import { withUniqueIds } from './svg';
import { PR, PR_PAL, beginArt, ink, inkFill, knock, paint, shp, wash, printDefs } from './print';

const ID = '%ID%';

/** SVG markup Štamgasta s placeholdery `%ID%` (viewBox 0 0 64 64). */
function stamgastRaw(): string {
  beginArt();
  const body =
    knock(shp.circle(32, 32, 31)) +
    wash(
      `<circle cx="32" cy="32" r="27.5" fill="none" stroke="currentColor" stroke-width="3"/>`,
      PR_PAL.red,
      {
        op: 0.7,
        dx: 0,
        dy: 0,
      },
    ) +
    `<g clip-path="url(#${ID}-cl)">` +
    paint(shp.path('M12 62c2-12 10-17 20-17s18 5 20 17z'), '#3d6ab0', 1.2, { dx: 0.4, dy: 0.3 }) +
    paint(shp.path('M27 45l5 7 5-7z'), null, 0.9) +
    paint(shp.ellipse(20, 30, 2.5, 3.5) + shp.ellipse(44, 30, 2.5, 3.5), PR_PAL.skin, 0.9, {
      dx: 0.3,
      dy: 0.2,
    }) +
    paint(shp.ellipse(32, 29, 12, 13), PR_PAL.skin, 1.2, { dx: 0.4, dy: 0.3 }) +
    wash(shp.circle(25.5, 33, 2.6) + shp.circle(38.5, 33, 2.6), PR_PAL.cheek, { op: 0.4, dx: 0, dy: 0 }) +
    paint(shp.path('M18 23c0-8 7-12 14-12s15 4 15 11c-3-1-8-2-15-2s-11 1-14 3z'), '#6d8f5a', 1.1, {
      dx: 0.4,
      dy: 0.3,
    }) +
    paint(
      shp.path('M17 24c4-2 9-3 15-3s12 1 17 3c0 2-1 3-2 3-4-1-9-2-15-2s-10 1-14 2c-1 0-1-2-1-3z'),
      '#4f6e42',
      1.1,
      { dx: 0.3, dy: 0.2 },
    ) +
    ink(shp.path('M24.5 26c1.5-1 3-1 4.5 0M35 26c1.5-1 3-1 4.5 0'), 0.9) +
    inkFill(shp.circle(27, 29, 1.3) + shp.circle(37, 29, 1.3)) +
    paint(shp.ellipse(32, 33, 2.6, 2.2), '#e8806a', 0.8, { dx: 0.2, dy: 0.2 }) +
    paint(
      shp.path(
        'M23.5 38c3-3.5 6.5-3.5 8.5-1.2c2-2.3 5.5-2.3 8.5 1.2c-2.5 1.6-5.5 1.6-8.5-.2c-3 1.8-6 1.8-8.5.2z',
      ),
      PR_PAL.hairDark,
      0.9,
      { dx: 0.2, dy: 0.2 },
    ) +
    paint(shp.path('M41 44h12l-1 15c-.2 1.5-1.4 2-3 2h-4c-1.6 0-2.8-.5-3-2z'), PR_PAL.gold, 1.1, {
      dx: 0.3,
      dy: 0.2,
    }) +
    paint(shp.path('M53 47c4 0 4.5 8 .5 8.5v-2c2-.5 2-4.3-.5-4.5z'), '#c9dbe0', 0.9) +
    paint(
      shp.path('M40 45c-1-3 1.5-5 3.5-4c1-2 4.5-2 5.5 0c2-1 4.5 1 3.5 4c-3 1.5-9.5 1.5-12.5 0z'),
      null,
      1,
    ) +
    `</g>` +
    ink(shp.circle(32, 32, 31), 1.3, { color: PR.ink, op: 0.75 });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="stamgast" aria-hidden="true" focusable="false">' +
    `<defs>${printDefs({ width: 64, height: 64, scale: 0.3 })}<clipPath id="${ID}-cl"><circle cx="32" cy="32" r="30"/></clipPath></defs>` +
    body +
    '</svg>'
  );
}

/** SVG markup Štamgasta (viewBox 0 0 64 64, unikátní id). */
export function stamgastMarkup(): string {
  return withUniqueIds(stamgastRaw());
}

/** Element Štamgasta (dekorativní). */
export function stamgastElement(className = 'stamgast-avatar'): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = className;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = stamgastMarkup();
  return wrap;
}

/**
 * SVG z markupu: tiskové obrázky (src/ui/art/print.ts) nemají filtry, takže se vkládají přímo do stránky — ostré
 * v každé velikosti, bez bitmapové keše. Každá instance dostane vlastní prefix id ve `<defs>` (`withUniqueIds`).
 */

const ID = '%ID%';
let uid = 0;

/** Nahradí placeholder id unikátním prefixem (každá instance SVG má vlastní `<defs>`). */
export function withUniqueIds(markup: string): string {
  if (!markup.includes(ID)) return markup;
  uid += 1;
  return markup.split(ID).join(`ka${uid}`);
}

/** SVG element z markupu s placeholdery `%ID%` (parsuje HTML parser přes `<template>` — správný jmenný prostor). */
export function svgElement(markup: string): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = withUniqueIds(markup);
  return tpl.content.firstElementChild as SVGSVGElement;
}

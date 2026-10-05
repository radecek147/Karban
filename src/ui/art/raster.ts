/**
 * Rastrová keš akvarelových obrázků (styl E1, src/ui/art/watercolor.ts).
 *
 * Akvarel stojí na SVG filtrech (šum, rozpití, tmavší okraje). Kdyby zůstaly „živé“ v DOM, prohlížeč by je
 * přepočítával při každém překreslení vrstvy — animace karet by se trhaly. Proto se každý obrázek (klíčem je jeho
 * markup) jednou vykreslí do bitmapy (SVG → `<img>` → `<canvas>` → WebP/PNG blob) a v DOM zůstane jen kořenové
 * `<svg>` (třídy, `data-*`, přístupnost) s jediným `<image>`. Hotové bitmapy se sdílejí mezi všemi instancemi.
 *
 * Dokud bitmapa není hotová, ukáže se tentýž obrázek bez filtrů (plochý, ale rychlý) a po dokončení se vymění.
 * Bez canvasu (testy v happy-dom, starý prohlížeč) se vrací plný markup jako dřív — nic se nerozbije.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const ID_PLACEHOLDER = '%ID%';

let supported: boolean | null = null;
let forced: boolean | null = null;

/** Umí prostředí kreslit SVG do canvasu a vyrábět bloby? */
export function rasterSupported(): boolean {
  if (forced !== null) return forced;
  if (supported !== null) return supported;
  try {
    supported =
      typeof document !== 'undefined' &&
      typeof Image !== 'undefined' &&
      typeof Blob !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.toBlob === 'function' &&
      document.createElement('canvas').getContext('2d') !== null;
  } catch {
    supported = false;
  }
  return supported;
}

/** Vynutí zapnutí/vypnutí rastrování (testy, ladění); `null` = podle prostředí. */
export function forceRaster(on: boolean | null): void {
  forced = on;
}

interface Entry {
  url: string | null;
  failed: boolean;
  waiters: Set<SVGSVGElement>;
}

const cache = new Map<string, Entry>();
const queue: (() => Promise<void>)[] = [];
let running = false;
let uid = 0;

function nextPrefix(): string {
  uid += 1;
  return `kr${uid}`;
}

/** Nahradí placeholder id unikátním prefixem. */
function uniqueIds(markup: string): string {
  return markup.includes(ID_PLACEHOLDER) ? markup.split(ID_PLACEHOLDER).join(nextPrefix()) : markup;
}

function parse(markup: string): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup;
  return tpl.content.firstElementChild as SVGSVGElement;
}

function viewBoxOf(el: Element): [number, number] {
  const vb = (el.getAttribute('viewBox') ?? '0 0 250 350')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const w = vb[2] ?? 250;
  const h = vb[3] ?? 350;
  return [w > 0 ? w : 250, h > 0 ? h : 350];
}

/** Šířka bitmapy v pixelech: karty ~200 CSS px, kulaté žetony ~120 CSS px, × hustota displeje (max. 2). */
function rasterWidth(vbW: number): number {
  const dpr = typeof window !== 'undefined' ? Math.min(2, Math.max(1, window.devicePixelRatio || 1)) : 1;
  const css = vbW >= 200 ? 200 : 120;
  return Math.round(css * dpr);
}

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (
      window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    ).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 60 });
    else setTimeout(resolve, 0);
  });
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const job = queue.shift();
    if (job) {
      try {
        await job();
      } catch {
        /* chyba jednoho obrázku nesmí zastavit frontu */
      }
    }
    await idle();
  }
  running = false;
}

async function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9));
  if (webp && webp.type === 'image/webp') return webp;
  return new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
}

/** Vykreslí markup do bitmapy; vrací URL blobu. */
async function render(markup: string, vbW: number, vbH: number): Promise<string> {
  const pxW = rasterWidth(vbW);
  const pxH = Math.round((pxW * vbH) / vbW);
  let xml = markup.split(ID_PLACEHOLDER).join('r');
  if (!/^<svg[^>]*\sxmlns=/.test(xml)) xml = xml.replace('<svg', `<svg xmlns="${SVG_NS}"`);
  xml = xml.replace('<svg', `<svg width="${pxW}" height="${pxH}"`);
  const src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d');
    ctx.drawImage(img, 0, 0, pxW, pxH);
    const blob = await toBlob(canvas);
    if (!blob) throw new Error('toBlob');
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(src);
  }
}

/** Vymění obsah kořene za jedinou bitmapu (atributy kořene zůstanou). */
function applyRaster(root: SVGSVGElement, url: string): void {
  const [w, h] = viewBoxOf(root);
  const img = document.createElementNS(SVG_NS, 'image');
  img.setAttribute('href', url);
  img.setAttribute('width', String(w));
  img.setAttribute('height', String(h));
  img.setAttribute('preserveAspectRatio', 'none');
  root.replaceChildren(img);
  root.setAttribute('data-raster', '1');
}

/** Rychlá náhrada: tentýž obrázek bez filtrů. */
function stripFilters(root: SVGSVGElement): void {
  for (const el of root.querySelectorAll('[filter]')) el.removeAttribute('filter');
}

function schedule(markup: string, entry: Entry): void {
  queue.push(async () => {
    const [w, h] = viewBoxOf(parse(markup.slice(0, markup.indexOf('>') + 1) + '</svg>'));
    try {
      entry.url = await render(markup, w, h);
    } catch {
      entry.failed = true;
    }
    const url = entry.url;
    for (const el of entry.waiters) {
      if (url) applyRaster(el, url);
      else el.replaceChildren(...parse(uniqueIds(markup)).childNodes);
    }
    entry.waiters.clear();
  });
  void pump();
}

/**
 * SVG element z markupu (s placeholdery `%ID%`). V prohlížeči ho nahradí sdílenou bitmapou (hned, je-li v keši,
 * jinak po vykreslení); bez canvasu vrátí plný markup.
 */
export function rasterSvg(markup: string): SVGSVGElement {
  if (!rasterSupported()) return parse(uniqueIds(markup));
  let entry = cache.get(markup);
  if (entry?.url) {
    const root = parse(markup.slice(0, markup.indexOf('>') + 1) + '</svg>');
    applyRaster(root, entry.url);
    return root;
  }
  const el = parse(uniqueIds(markup));
  if (entry?.failed) return el;
  stripFilters(el);
  if (!entry) {
    entry = { url: null, failed: false, waiters: new Set() };
    cache.set(markup, entry);
    entry.waiters.add(el);
    schedule(markup, entry);
  } else {
    entry.waiters.add(el);
  }
  return el;
}

/** Předpřipraví bitmapy (např. všech karet balíčku na začátku runu) bez vkládání do DOM. */
export function prewarmRaster(markups: readonly string[]): void {
  if (!rasterSupported()) return;
  for (const markup of markups) {
    if (cache.has(markup)) continue;
    const entry: Entry = { url: null, failed: false, waiters: new Set() };
    cache.set(markup, entry);
    schedule(markup, entry);
  }
}

/** Počet obrázků v keši (testy, ladění). */
export function rasterCacheSize(): number {
  return cache.size;
}

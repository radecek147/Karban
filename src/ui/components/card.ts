/**
 * Interaktivní hrací karta (ruka, stůl, náhled balíčku, Večerka).
 *
 *   const el = createCardView(card, { selected, keyHint: '1', onClick: () => controller.toggleSelect(card.id) });
 *   updateCardView(el, card, { selected: true });   // jen přepne stav, SVG překreslí, až když se změní vzhled
 *
 * - interaktivní karta je `<button>` s `aria-pressed` (výběr) a `aria-label` s názvem a úpravami,
 *   neinteraktivní je `<div role="img">`,
 * - `data-card-id`, třídy stavu `is-selected` / `is-debuffed` / `is-face-down`, edice `ed-<id>`,
 *   vylepšení `enh-<id>` (styles/cards.css; výběr = posun nahoru s pérováním, hover = povytažení, náklon za
 *   myší a odlesk — src/ui/fx/tilt.ts; vše jen transform/opacity),
 * - mezerník na zaměřené kartě přepne výběr; Enter propadne k obrazovce (ve hře = Zahrát, DESIGN 13.3),
 * - tooltip (hover/focus/dlouhý stisk) s detailem karty.
 */
import '../styles/cards.css';
import type { ArtSpec, ContentRegistry } from '../../engine/content-types';
import type { Card, Modifiers } from '../../engine/types';
import { registry as defaultRegistry } from '../../content';
import { cardFaceElement, cardFaceKey, currentSuitScheme, type SuitScheme } from '../art/cards';
import { cardLabel } from '../describe';
import { h } from '../dom';
import { bindTilt } from '../fx/tilt';
import { attachTooltip, cardTooltip } from './tooltip';

export interface CardViewOptions {
  /** Vybraná (posunutá nahoru, `aria-pressed="true"`). */
  selected?: boolean;
  /** Klik / Enter / mezerník / tap. Bez něj je karta neinteraktivní (`role="img"`), pokud `interactive` neurčí jinak. */
  onClick?: (card: Readonly<Card>, event: MouseEvent) => void;
  interactive?: boolean;
  /** Klávesová zkratka zobrazená v rohu (`1`–`8`) a v `aria-keyshortcuts`. */
  keyHint?: string;
  /** Tooltip s detailem (výchozí true). */
  tooltip?: boolean;
  /** Šířka karty v px (jinak CSS proměnná `--card-w` z kontejneru). */
  width?: number;
  /** Rub pro kartu lícem dolů (ArtSpec balíčku). */
  back?: ArtSpec;
  /** Modifikátory runu (pevné čipy, pravděpodobnosti v tooltipu). */
  mods?: Partial<Pick<Modifiers, 'probabilityMult' | 'fixedCardChips'>>;
  /** Proč je karta mimo provoz / lícem dolů (pravidlo šéfa) — řádek v tooltipu, jen u takové karty. */
  reason?: string | null;
  registry?: ContentRegistry;
  className?: string;
  /** Barvy karet (jinak podle barvoslepého režimu na <html>) — galerie porovnává obě schémata. */
  scheme?: SuitScheme;
}

type CardEl = HTMLElement & {
  __card?: Readonly<Card>;
  __opts?: CardViewOptions;
  __detach?: () => void;
  /** Vzhled podržený presenterem (stav před změnou, kterou teprve ukáže animace) — viz `holdCardVisual`. */
  __hold?: Readonly<Card>;
};

/** Barvy jsou v obrázku karty zapečené (bitmapová keš), proto je schéma součástí klíče vzhledu. */
function visualKey(card: Readonly<Card>, scheme: SuitScheme): string {
  return `${cardFaceKey(card)}|${scheme}|${card.faceDown ? 'down' : 'up'}`;
}

const schemeOf = (opts: CardViewOptions): SuitScheme => opts.scheme ?? currentSuitScheme();

let schemeWatched = false;

/** Přepnutí barvoslepého režimu (třída na <html>) překreslí karty, které už jsou na obrazovce. */
function watchSuitScheme(): void {
  if (schemeWatched || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  schemeWatched = true;
  let last = currentSuitScheme();
  new MutationObserver(() => {
    const now = currentSuitScheme();
    if (now === last) return;
    last = now;
    refreshCardColors();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

/** Překreslí hrací karty v `root`, jejichž barvy neodpovídají aktuálnímu schématu. */
export function refreshCardColors(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('.pcard')) {
    const cel = el as CardEl;
    if (cel.__card) updateCardView(cel, cel.__card);
  }
}

function applyState(el: CardEl, card: Readonly<Card>, opts: CardViewOptions): void {
  const reg = opts.registry ?? defaultRegistry();
  const selected = !!opts.selected;
  el.classList.toggle('is-selected', selected);
  el.classList.toggle('is-debuffed', card.debuffed && !card.faceDown);
  el.classList.toggle('is-face-down', card.faceDown);
  // Edice a vylepšení jako třídy (lícem dolů se neprozradí).
  for (const cls of [...el.classList])
    if (cls.startsWith('ed-') || cls.startsWith('enh-')) el.classList.remove(cls);
  if (!card.faceDown) {
    if (card.edition) el.classList.add(`ed-${card.edition}`);
    if (card.enhancement) el.classList.add(`enh-${card.enhancement}`);
  }
  el.dataset.cardId = String(card.id);
  el.setAttribute('aria-label', cardLabel(card, reg));
  if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', selected ? 'true' : 'false');
  const key = el.querySelector<HTMLElement>('.pcard__key');
  if (opts.keyHint) {
    el.setAttribute('aria-keyshortcuts', opts.keyHint);
    if (key) key.textContent = opts.keyHint;
  } else {
    el.removeAttribute('aria-keyshortcuts');
    if (key) key.textContent = '';
  }
}

function renderArt(el: CardEl, card: Readonly<Card>, opts: CardViewOptions): void {
  const inner = el.querySelector<HTMLElement>('.pcard__inner');
  if (!inner) return;
  const scheme = schemeOf(opts);
  const svgEl = cardFaceElement(card, { registry: opts.registry, back: opts.back, scheme });
  const old = inner.querySelector('svg');
  if (old) old.replaceWith(svgEl);
  else inner.prepend(svgEl);
  el.dataset.visual = visualKey(card, scheme);
}

/** Vytvoří hrací kartu. */
export function createCardView(card: Readonly<Card>, opts: CardViewOptions = {}): HTMLElement {
  const interactive = opts.interactive ?? opts.onClick !== undefined;
  const el = h(
    interactive ? 'button' : 'div',
    {
      type: interactive ? 'button' : undefined,
      role: interactive ? undefined : 'img',
      class: ['pcard', opts.className],
      style: opts.width ? { '--card-w': `${opts.width}px` } : undefined,
    },
    h('span', { class: 'pcard__inner' }, h('span', { class: 'kshine', 'aria-hidden': 'true' })),
    h('span', { class: 'pcard__key', 'aria-hidden': 'true' }),
  ) as CardEl;
  el.__card = card;
  el.__opts = opts;
  watchSuitScheme();
  renderArt(el, card, opts);
  applyState(el, card, opts);
  bindTilt(el);

  if (interactive) {
    el.addEventListener('click', (e) => {
      const current = el.__card;
      if (current) el.__opts?.onClick?.(current, e);
    });
    // Mezerník na zaměřené kartě = výběr (nativní aktivace tlačítka). Enter propadne k obrazovce: herní
    // obrazovka z něj v kole udělá Zahrát (DESIGN 13.3), jinde ho tlačítko zpracuje samo. Přeskočení animace
    // mezerníkem řeší App už ve fázi zachytávání, takže ho tohle nezablokuje.
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ') e.stopPropagation();
    });
  }
  if (opts.tooltip !== false) {
    el.__detach = attachTooltip(el, () => {
      const current = el.__card;
      return current
        ? cardTooltip(current, {
            registry: el.__opts?.registry,
            mods: el.__opts?.mods,
            reason: current.debuffed || current.faceDown ? el.__opts?.reason : null,
          })
        : null;
    });
  }
  return el;
}

/**
 * Aktualizuje existující kartu: stav (výběr, debuff, zkratka) vždy, SVG jen při změně vzhledu
 * (hodnota, barva, vylepšení, pečeť, líc/rub). Volby se slučují s původními.
 */
export function updateCardView(
  el: HTMLElement,
  card: Readonly<Card>,
  opts: Partial<CardViewOptions> = {},
): void {
  const cel = el as CardEl;
  const merged: CardViewOptions = { ...(cel.__opts ?? {}), ...opts };
  cel.__card = card;
  cel.__opts = merged;
  // Podržený vzhled (presenter teprve ukáže změnu): obrázek, edice a vylepšení zůstávají podle podrženého stavu,
  // výběr, zkratka a klik podle skutečné karty.
  const shown = cel.__hold ?? card;
  const before = cel.dataset.visual;
  if (before !== visualKey(shown, schemeOf(merged))) {
    renderArt(cel, shown, merged);
    // Karta se otočila (Bílá paní, odkrytí zahrané karty lícem dolů) — krátké „překlopení“ (jen transform).
    if (before !== undefined && before.endsWith('|down') !== shown.faceDown) flipCard(cel);
  }
  applyState(cel, shown, merged);
}

/**
 * Podrží vzhled karty (`shown`) i přes překreslení obrazovky — presenter tak ukáže změnu karty (babská rada,
 * razítko, žolík) až animací, i když se mezitím obrazovka překreslí podle hotového stavu enginu. Volání s novým
 * `shown` vzhled hned překreslí (odhalení změny uprostřed otočení karty).
 */
export function holdCardVisual(el: HTMLElement, shown: Readonly<Card>): void {
  const cel = el as CardEl;
  cel.__hold = shown;
  updateCardView(cel, cel.__card ?? shown);
}

/** Uvolní podržený vzhled — karta se překreslí podle skutečného stavu. */
export function releaseCardVisual(el: HTMLElement): void {
  const cel = el as CardEl;
  if (!cel.__hold) return;
  cel.__hold = undefined;
  if (cel.__card) updateCardView(cel, cel.__card);
}

/** Drží presenter vzhled karty? (testy) */
export function isCardVisualHeld(el: HTMLElement): boolean {
  return (el as CardEl).__hold !== undefined;
}

/** Překlopení karty: CSS animace `pcard-flip` na vnitřku (styles/cards.css; vypnuté animace ji ruší). */
function flipCard(el: HTMLElement): void {
  el.classList.remove('is-flipping');
  // Vynucený reflow jen u otočené karty (pár za tah), aby se animace spustila znovu.
  void el.offsetWidth;
  el.classList.add('is-flipping');
  el.addEventListener('animationend', () => el.classList.remove('is-flipping'), { once: true });
}

/** Odpojí posluchače tooltipu (při ručním odstranění karty; překreslení obrazovky to nepotřebuje). */
export function disposeCardView(el: HTMLElement): void {
  (el as CardEl).__detach?.();
}

/** Karta zobrazená rubem (balíček, dobírací hromádka). */
export function createCardBack(
  opts: { label?: string; back?: ArtSpec; width?: number; className?: string } = {},
): HTMLElement {
  const svgEl = cardFaceElement(
    { suit: 'S', rank: 2, enhancement: null, seal: null, faceDown: true },
    { back: opts.back },
  );
  return h(
    'div',
    {
      class: ['pcard', 'is-face-down', 'pcard--back', opts.className],
      role: opts.label ? 'img' : undefined,
      'aria-label': opts.label,
      'aria-hidden': opts.label ? undefined : 'true',
      style: opts.width ? { '--card-w': `${opts.width}px` } : undefined,
    },
    h('span', { class: 'pcard__inner' }, svgEl),
  );
}

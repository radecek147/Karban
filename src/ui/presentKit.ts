/**
 * Společné části presenteru (src/ui/present.ts, src/ui/presentEffects.ts): rozhraní herní obrazovky
 * `PresentView`, bubliny nad zdrojem efektu, měření prvků a kontext jedné dávky událostí.
 *
 * Bubliny jsou dvojí: dřívější „pilulky“ (hlášky, skóre ruky) a **velké nápisy s obrysem** (`fx: true`) pro efekty —
 * modré čipy, červený mult, výraznější ×mult, zlaté peníze, opakování, změna karty, nová úroveň. Velký nápis se
 * objeví s přestřelem, chvíli drží a odpluje; nový nápis u stejného zdroje (`anchor`) ten starší odsune, takže se
 * rychlé řetězy nepřekrývají. Bez animací se bubliny nevytvářejí.
 */
import type { BlindKind, Card, HandType } from '../engine';
import { hasKey, t } from '../i18n/cs';
import type { AnimQueue } from './anim/queue';
import { toast, type ToastKind } from './components/toast';
import type { GameController } from './controller';
import { h } from './dom';
import type { Particles, RectLike } from './fx/particles';

export type BubbleTone =
  'chips' | 'mult' | 'xmult' | 'money' | 'message' | 'score' | 'bad' | 'again' | 'change' | 'level';

/** Co presenter potřebuje od herní obrazovky. */
export interface PresentView {
  readonly anim: AnimQueue;
  readonly controller: GameController;
  readonly particles: Particles;
  /** Překreslí obrazovku podle aktuálního stavu enginu. */
  refresh(): void;
  /** Hrací karta podle id — nejdřív na stole, pak v ruce. */
  cardEl(id: number): HTMLElement | null;
  jokerEl(uid: number): HTMLElement | null;
  consumableEl(uid: number): HTMLElement | null;
  /** Rámeček kombinace v levém panelu (zdroj kroků `hand` a `boss`). */
  handInfoEl(): HTMLElement | null;
  /** Stůl se zahranými kartami. */
  tableEl(): HTMLElement | null;
  /** Balíček vpravo dole (odtud se rozdává). */
  deckEl(): HTMLElement | null;
  moneyEl(): HTMLElement | null;
  roundScoreEl(): HTMLElement | null;
  /** Vrstva pro bubliny (position: fixed přes obrazovku). */
  fxLayer(): HTMLElement | null;
  /** Kombinace a čipy × mult v levém panelu během skórování; null = zpět na živý náhled. */
  showScoring(s: { hand: HandType; level: number; chips: number; mult: number } | null): void;
  setChipsMult(chips: number, mult: number): void;
  setRoundScore(n: number): void;
  setMoney(n: number): void;
  /** Zatřese hrou s intenzitou 0–1 (src/ui/fx/shake.ts), pokud to nastavení dovolí. */
  shake(intensity?: number): void;
  /** Velké skóre: zlatý záblesk přes obrazovku a záře počítadla skóre kola (síla 0–1; nepovinné — testy). */
  bigScore?(strength: number): void;
  /** Čísla čipů a multu v levém panelu (krátké „povyskočení“ při změně; nepovinné). */
  chipsEl?(): HTMLElement | null;
  multEl?(): HTMLElement | null;
  /** Hlášení pro čtečky obrazovky (živá oblast). */
  announce(text: string): void;
  /** Příchod šéfa: plakát se jménem, pravidlem a hláškou nad stolem (nepovinné — testy bez DOM). */
  showBossIntro?(bossId: string, kind: BlindKind): void;
  /** Schová plakát šéfa (hráč zahrál nebo zahodil). */
  hideBossIntro?(): void;
  /** Vykreslená karta obsahu s tímto uid kdekoli na obrazovce (slot, Večerka, obálka) — nepovinné. */
  itemEl?(uid: number): HTMLElement | null;
  /** Obrázek možnosti obálky (hrací karta, která jde do balíčku) — nepovinné. */
  boosterOptionEl?(index: number): HTMLElement | null;
  /** Překreslí jednoho žolíka podle stavu (proměna, nová edice uprostřed otočení) — nepovinné. */
  redrawJoker?(uid: number): void;
  /** Řada karet v ruce, řada žolíků a kapsa spotřebek (cíl letu nových položek) — nepovinné. */
  handRowEl?(): HTMLElement | null;
  jokerRowEl?(): HTMLElement | null;
  consumableRowEl?(): HTMLElement | null;
}

/** Obdélník prvku (jedno čtení layoutu), nebo null pro chybějící / neviditelný prvek. */
export function measure(el: Element | null | undefined): RectLike | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0 ? null : r;
}

/** Nejmenší odstup kotvy pilulky od horního okraje okna (výška bubliny + rezerva, px). */
const BUBBLE_MIN_TOP = 44;
/** Totéž pro velký nápis s obrysem. */
const FX_MIN_TOP = 64;
/** Výška řádku velkého nápisu (stohování víc nápisů jednoho kroku nad sebou, px). */
export const FX_LINE = 38;

export interface BubbleOptions {
  /** Posun nahoru (px) — víc bublin jednoho kroku nad sebou. */
  offset?: number;
  /** Velká bublina uprostřed obdélníku (stůl). */
  big?: boolean;
  /** Obří zlatá bublina velkého skóre. */
  huge?: boolean;
  /** Velký nápis s obrysem (efekty skórování, změny karet, nová úroveň). */
  fx?: boolean;
  /** Menší a kratší varianta velkého nápisu (čipy hodnoty karty). */
  quick?: boolean;
  /** Malý popisek pod nápisem — odkud efekt je („Zlatá pečeť“, „Prémiová“). */
  caption?: string;
  /** Zdroj (např. `card:12`): nový velký nápis u stejného zdroje ten starší rychle odsune. */
  anchor?: string;
  /** Nápis zarovnaný k levému okraji zdroje (úzký levý panel — dlouhý text roste doprava). */
  alignStart?: boolean;
}

/** Poslední velký nápis u každého zdroje (pro odsunutí staršího). */
const anchored = new WeakMap<HTMLElement, Map<string, HTMLElement>>();

/** Živý velký nápis: kde stojí a jak je zhruba široký (odhad podle délky textu — bez měření layoutu). */
interface LiveFx {
  el: HTMLElement;
  /** Střed a spodní hrana (nápis roste nahoru od `y`). */
  x: number;
  y: number;
  w: number;
  h: number;
  until: number;
}
const live = new WeakMap<HTMLElement, LiveFx[]>();

/** Velikost písma velkého nápisu v rem podle tónu (styles/fx.css). */
function fxFontRem(tone: BubbleTone, quick: boolean): number {
  if (quick) return 1.45;
  if (tone === 'xmult') return 2.55;
  if (tone === 'again') return 2.2;
  if (tone === 'change') return 1.6;
  if (tone === 'level') return 1.55;
  return 2;
}

/**
 * Posune nový velký nápis nahoru, dokud se nepřekrývá s jiným živým nápisem (sousední karty, karta a žolík nad
 * ní…). Šířka je odhad podle počtu znaků — měřit hotové bubliny by znamenalo vynucený přepočet layoutu.
 */
function avoidOverlap(
  layer: HTMLElement,
  x: number,
  y: number,
  w: number,
  h: number,
  alignStart: boolean,
): number {
  const now = performance.now();
  const list = (live.get(layer) ?? []).filter(
    (b) => b.until > now && b.el.isConnected && !b.el.classList.contains('is-superseded'),
  );
  live.set(layer, list);
  const left = alignStart ? x : x - w / 2;
  for (let tries = 0; tries < 5; tries++) {
    const hit = list.find((b) => {
      const bl = b.x - b.w / 2;
      return left < bl + b.w && bl < left + w && y - h < b.y && b.y - b.h < y;
    });
    if (!hit) break;
    // Nad překážející nápis (s malou mezerou).
    y = hit.y - hit.h - 4;
  }
  return y;
}

/**
 * Bublina nad prvkem nebo už změřeným obdélníkem (+čipy, +mult, hláška…). Bez animací se nevytváří.
 * Vrací vytvořený prvek (testy), jinak null.
 */
export function bubble(
  view: Pick<PresentView, 'fxLayer' | 'anim'>,
  target: Element | RectLike | null | undefined,
  text: string,
  tone: BubbleTone,
  opts: BubbleOptions = {},
): HTMLElement | null {
  const layer = view.fxLayer();
  if (!layer || !target || view.anim.instant || !text) return null;
  const r = 'getBoundingClientRect' in target ? target.getBoundingClientRect() : target;
  if (r.width === 0 && r.height === 0) return null;
  const fx = !!opts.fx && !opts.big;
  const x = Math.round(opts.alignStart ? r.left + 4 : r.left + r.width / 2);
  const offset = opts.offset ?? 0;
  let y = Math.round(r.top + (opts.big ? r.height / 2 : 0) - offset - (fx ? 4 : 0));
  // Nad zdrojem není místo (žolíci u horního okraje okna) — bublina se ukáže pod ním, ať ji okraj neořízne.
  const minTop = fx ? FX_MIN_TOP : BUBBLE_MIN_TOP;
  if (!opts.big && y < minTop) y = Math.round(r.top + r.height + minTop - 8 + offset);
  let width = 0;
  let height = 0;
  if (fx) {
    // Odhad šířky: ~0,62 em na znak (pixelové písmo) + obrys; rem podle kořene (18 px × měřítko UI není potřeba přesně).
    const font = fxFontRem(tone, !!opts.quick) * 18;
    width = Math.round(text.length * font * 0.62 + 12);
    // Výška: řádek písma + obrys, s popiskem zdroje ještě jeho řádek.
    height = Math.round(font + 8 + (opts.caption ? 22 : 0));
    y = avoidOverlap(layer, x, y, width, height, !!opts.alignStart);
    if (y < 8) y = 8;
  }
  const el = h(
    'div',
    {
      class: [
        'game-bubble',
        `game-bubble--${tone}`,
        opts.big || opts.huge ? 'game-bubble--big' : '',
        opts.huge ? 'game-bubble--huge' : '',
        fx ? 'game-bubble--fx' : '',
        fx && opts.quick ? 'game-bubble--quick' : '',
        opts.alignStart ? 'game-bubble--start' : '',
      ],
      style: { transform: `translate(${x}px, ${y}px)` },
    },
    h(
      'span',
      { class: 'game-bubble__text' },
      text,
      fx && opts.caption ? h('span', { class: 'game-bubble__caption' }, opts.caption) : null,
    ),
  );
  if (fx && opts.anchor) {
    let map = anchored.get(layer);
    if (!map) anchored.set(layer, (map = new Map()));
    const prev = map.get(opts.anchor);
    // Starší nápis u stejného zdroje rychle odpluje (vlastní krátká animace, pak se odstraní).
    if (prev?.isConnected) prev.classList.add('is-superseded');
    map.set(opts.anchor, el);
  }
  layer.appendChild(el);
  if (fx) {
    const list = live.get(layer) ?? [];
    const center = opts.alignStart ? x + width / 2 : x;
    list.push({
      el,
      x: center,
      y,
      w: width,
      h: height,
      until: performance.now() + view.anim.duration(opts.quick ? 820 : 1150),
    });
    live.set(layer, list);
  }
  const remove = (): void => el.remove();
  el.addEventListener('animationend', (e) => {
    if (e.target === el) remove();
  });
  // Pojistka (vypnuté CSS animace, přeskočení): bublina zmizí nejpozději po 2,5 s.
  window.setTimeout(remove, 2500);
  return el;
}

/** Text hlášky z i18n klíče, nebo null (neznámý klíč nesmí do konzole sypat varování). */
export function messageText(
  key: string | undefined,
  params?: Record<string, string | number>,
): string | null {
  if (!key || !hasKey(key)) return null;
  return t(key, params);
}

export function say(message: string, kind: ToastKind = 'info'): void {
  toast(message, { kind, testId: `toast-game-${kind}` });
}

/** Kontext jedné dávky událostí (jedna akce hráče). */
export interface Batch {
  /** Peníze, jak je ukazuje levý panel během přehrávání. */
  money: { value: number };
  /** Štítky, které se v dávce spotřebovaly (`tagTriggered`). */
  tagsTriggered: ReadonlySet<string>;
  /** Štítky už ohlášené při přeskočení — jejich `tagTriggered` se v dávce neopakuje. */
  announced: Set<string>;
  /** Vzhled karet podržený do odhalení změny (id → prvek a ukazovaný stav), viz `holdCardVisual`. */
  holds: Map<number, { el: HTMLElement; shown: Card }>;
  /** Události, které přehraje jiná událost (změny karet a úrovně během skórování ruky přehraje `presentHand`). */
  deferred: Set<unknown>;
  /** Události, jejichž zvuk už zazněl dřív (spotřebka odlétá ze slotu hned na začátku dávky). */
  silenced: Set<unknown>;
  /** Nové položky, které po překreslení na konci dávky naskočí (žolíci, spotřebky, karty v ruce). */
  arrived: { kind: 'joker' | 'consumable' | 'card'; id: number; label: string | null }[];
  /** Spotřebky vytvořené kartou v ruce na konci kola (uid → id karty) — ukáže je rozpis `roundRewards`. */
  heldConsumables: Map<number, number>;
  /** Animace, které ještě dobíhají (postupné otáčení karet) — dávka na ně na konci počká. */
  pending: Promise<void>[];
  /** Ukazuje levý panel animaci nové úrovně (po ní se vrátí živý náhled). */
  levelShown: boolean;
  /** Počet zvýšení úrovně v dávce (víc najednou = kratší animace každého). */
  levelCount: number;
}

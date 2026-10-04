/**
 * Výrazné efekty na kartách, žolících a spotřebkách (šťáva 2, DESIGN 13.6, DECISIONS 2026-10-04):
 *
 *   trigger(anim, el, 'normal');            // zdroj efektu poskočí (náklon, zvětšení, dopružení) + třída is-triggered
 *   flashOrigin(anim, el, 'seal', '#d4a72c'); // záblesk pečeti / vylepšení / edice na kartě
 *   await flipReveal(anim, el, () => holdCardVisual(el, next)); // zvednutí, otočení, překreslení uprostřed
 *   await flyCoins(layer, anim, fromRect, toRect, 4);           // mince k panelu Peníze
 *   ghostFly(layer, anim, sourceEl, toRect, { fade: true });    // „duch“ prvku (spotřebka odlétá, kopie karty)
 *   await crumble(anim, el);                 // zničená karta se rozpadne
 *   popIn(anim, el);                         // nová položka naskočí
 *
 * Animuje se jen transform/opacity (Web Animations přes `animate`, překryvy CSS animacemi ve styles/fx.css).
 * Respektuje rychlost hry, vypnuté animace (nic se nevytváří, `swap` proběhne hned), přeskočení mezerníkem
 * a `prefers-reduced-motion` (místo třesení a otáčení jen krátké klidné zvětšení, překryvy se zkrátí).
 * Pohyb karet běží na vnitřku karty (`.pcard__inner`, `.kcard__inner`) — povytažení vybrané karty a hover
 * na obalu zůstávají.
 */
import type { ScoreStepOrigin } from '../../engine';
import { animate, EASE_SPRING, reducedMotion } from '../anim/animate';
import type { AnimQueue } from '../anim/queue';
import { h } from '../dom';
import type { RectLike } from './particles';

export type TriggerStrength = 'soft' | 'normal' | 'strong';

/** Třída prvku, který právě spustil efekt (CSS ho zvedne nad sousedy, testy ji hledají). */
export const TRIGGER_CLASS = 'is-triggered';

const TRIGGER_FRAMES: Readonly<Record<TriggerStrength, Keyframe[]>> = {
  soft: [
    { transform: 'translateY(0) scale(1)' },
    { transform: 'translateY(-8px) scale(1.1)', offset: 0.35 },
    { transform: 'translateY(0) scale(1)' },
  ],
  normal: [
    { transform: 'translateY(0) scale(1) rotate(0deg)' },
    { transform: 'translateY(-14px) scale(1.2) rotate(-6deg)', offset: 0.18 },
    { transform: 'translateY(-11px) scale(1.15) rotate(5deg)', offset: 0.36 },
    { transform: 'translateY(-6px) scale(1.08) rotate(-3deg)', offset: 0.54 },
    { transform: 'translateY(-2px) scale(1.03) rotate(1.2deg)', offset: 0.74 },
    { transform: 'translateY(0) scale(1) rotate(0deg)' },
  ],
  strong: [
    { transform: 'translateY(0) scale(1) rotate(0deg)' },
    { transform: 'translateY(-20px) scale(1.3) rotate(-8deg)', offset: 0.16 },
    { transform: 'translateY(-15px) scale(1.22) rotate(7deg)', offset: 0.32 },
    { transform: 'translateY(-9px) scale(1.12) rotate(-4.5deg)', offset: 0.5 },
    { transform: 'translateY(-3px) scale(1.05) rotate(2deg)', offset: 0.7 },
    { transform: 'translateY(0) scale(1) rotate(0deg)' },
  ],
};

/** Délka poskočení (ms při 1×). */
export const TRIGGER_MS: Readonly<Record<TriggerStrength, number>> = { soft: 240, normal: 460, strong: 540 };

/** Klidná náhrada pro `prefers-reduced-motion`: krátké zvětšení bez náklonu a třesení. */
const CALM_PULSE: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.06)', offset: 0.4 },
  { transform: 'scale(1)' },
];

/** Vnitřek karty / žolíka (tam běží pohyb, aby obal držel povytažení a hover). */
export function motionTarget(el: Element): Element {
  return el.querySelector(':scope > .pcard__inner, :scope > .kcard__inner') ?? el;
}

/** Kolik efektů právě drží třídu `is-triggered` (překrývající se poskočení ji nesmí sundat předčasně). */
const triggerCount = new WeakMap<Element, number>();

/**
 * Zdroj efektu poskočí: zvětšení s náklonem a dopružením na vnitřku prvku, obal dostane `is-triggered`
 * (aspoň po dobu poskočení — i bez Web Animations, aby šla třída v testech zachytit). Bez animací nic.
 */
export async function trigger(
  anim: AnimQueue,
  el: Element | null | undefined,
  strength: TriggerStrength = 'normal',
): Promise<void> {
  if (!el || anim.instant) return;
  const ms = TRIGGER_MS[strength];
  triggerCount.set(el, (triggerCount.get(el) ?? 0) + 1);
  el.classList.add(TRIGGER_CLASS);
  try {
    await Promise.all([
      animate(anim, motionTarget(el), TRIGGER_FRAMES[strength], ms, {
        easing: 'ease-out',
        reduced: CALM_PULSE,
      }),
      anim.wait(ms),
    ]);
  } finally {
    const left = (triggerCount.get(el) ?? 1) - 1;
    triggerCount.set(el, left);
    if (left <= 0) el.classList.remove(TRIGGER_CLASS);
  }
}

/** Za jak dlouho se překryv záblesku sám uklidí (ms při 1×; CSS animace je kratší). */
const FLASH_MS = 900;

/**
 * Záblesk části karty, která efekt způsobila: pečeť (vlevo dole), vylepšení (odznak vpravo nahoře, u kamenné celá
 * karta), edice (lesk přes celou kartu), hodnota (jemné světlo). `color` = barva pečeti / vylepšení z obsahu.
 * Překryv je nový prvek s CSS animací (opacity/transform) — žádné vynucené přepočty layoutu.
 */
export function flashOrigin(
  anim: AnimQueue,
  el: Element | null | undefined,
  origin: ScoreStepOrigin,
  color?: string,
): void {
  if (!el || anim.instant) return;
  const inner = el.querySelector(':scope > .pcard__inner, :scope > .kcard__inner');
  // Lesk edice a světlo hodnoty patří dovnitř karty (oříznuté zaoblením), záblesk pečeti / odznaku přesahuje okraj.
  const insideCard = origin === 'edition' || origin === 'rank';
  const host = insideCard ? (inner ?? el) : el;
  const flash = h('span', {
    class: ['fx-flash', `fx-flash--${origin}`],
    'aria-hidden': 'true',
    style: color ? { '--flash-color': color } : undefined,
  });
  host.appendChild(flash);
  const remove = (): void => flash.remove();
  flash.addEventListener(
    'animationend',
    (e) => {
      if (!(e as AnimationEvent).pseudoElement) remove();
    },
    { once: false },
  );
  window.setTimeout(remove, Math.max(120, anim.duration(FLASH_MS)) + 200);
}

/** Délka otočení karty (ms při 1×). */
export const FLIP_MS = 600;

/**
 * Změna karty: karta se zvedne, otočí (přes scaleX — bez 3D), uprostřed otočky se zavolá `swap` (překreslení na
 * nový vzhled) a dosedne s dopružením. Bez animací / při reduced motion se `swap` zavolá hned (karta jen pulzne).
 */
export async function flipReveal(
  anim: AnimQueue,
  el: Element | null | undefined,
  swap: () => void,
): Promise<void> {
  if (!el || anim.instant) {
    swap();
    return;
  }
  triggerCount.set(el, (triggerCount.get(el) ?? 0) + 1);
  el.classList.add(TRIGGER_CLASS);
  try {
    if (reducedMotion()) {
      swap();
      await Promise.all([
        animate(anim, motionTarget(el), CALM_PULSE, 300, { reduced: CALM_PULSE }),
        anim.wait(300),
      ]);
      return;
    }
    const frames: Keyframe[] = [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(-22px) scale(1.12, 1.12)', offset: 0.2 },
      { transform: 'translateY(-24px) scale(0.03, 1.14)', offset: 0.42 },
      { transform: 'translateY(-24px) scale(0.03, 1.14)', offset: 0.5 },
      { transform: 'translateY(-22px) scale(1.18, 1.18)', offset: 0.7 },
      { transform: 'translateY(-8px) scale(1.05, 1.05)', offset: 0.86 },
      { transform: 'translateY(0) scale(1, 1)' },
    ];
    const done = animate(anim, motionTarget(el), frames, FLIP_MS, { easing: 'ease-in-out' });
    // Překreslení uprostřed otočky (karta je v tu chvíli „hranou“ k hráči).
    await anim.wait(FLIP_MS * 0.46);
    swap();
    await Promise.all([done, anim.wait(FLIP_MS * 0.54)]);
  } finally {
    const left = (triggerCount.get(el) ?? 1) - 1;
    triggerCount.set(el, left);
    if (left <= 0) el.classList.remove(TRIGGER_CLASS);
  }
}

/** Střed obdélníku. */
function center(r: RectLike): { x: number; y: number } {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Délka letu mince (ms při 1×). */
export const COIN_FLIGHT_MS = 420;

/**
 * Mince vyletí od zdroje (karta, žolík) obloukem k panelu Peníze. Promise se splní, když doletí první mince
 * (tehdy má panel poskočit a číslo se přičíst). Bez animací / bez vrstvy hned.
 */
export function flyCoins(
  layer: HTMLElement | null,
  anim: AnimQueue,
  from: RectLike | null,
  to: RectLike | null,
  count = 4,
): Promise<void> {
  if (!layer || !from || !to || anim.instant || reducedMotion()) return Promise.resolve();
  const a = center(from);
  const b = center(to);
  const n = Math.max(1, Math.min(8, Math.round(count)));
  for (let i = 0; i < n; i++) {
    const jitter = (i - (n - 1) / 2) * 9;
    const sx = a.x + jitter;
    const sy = a.y - from.height * 0.15;
    // Oblouk: vrchol nad spojnicí, u každé mince trochu jinde.
    const mx = (sx + b.x) / 2 + jitter * 2;
    const my = Math.min(sy, b.y) - 60 - i * 6;
    const coin = h('span', { class: 'fx-coin', 'aria-hidden': 'true' });
    layer.appendChild(coin);
    void animate(
      anim,
      coin,
      [
        { transform: `translate(${sx}px, ${sy}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy - 26}px) scale(1.15)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${b.x}px, ${b.y}px) scale(0.55)`, opacity: 0.2 },
      ],
      COIN_FLIGHT_MS,
      { delay: i * 45, easing: 'cubic-bezier(0.5, 0, 0.6, 1)', fill: 'forwards' },
    ).then(() => coin.remove());
    window.setTimeout(() => coin.remove(), anim.duration(COIN_FLIGHT_MS + i * 45) + 400);
  }
  return anim.wait(COIN_FLIGHT_MS * 0.92);
}

export interface GhostOptions {
  /** Na konci zmizí (spotřebka odlétá, karta do balíčku). Výchozí true. */
  fade?: boolean;
  /** Délka letu (ms při 1×). */
  ms?: number;
  /** Nejdřív se zdroj zvedne a zvětší (spotřebka se „aktivuje“). */
  lift?: boolean;
  /** Prvek, ze kterého se duch vytvoří, se během letu schová (spotřebka opouští slot). */
  hideSource?: boolean;
  /** Výchozí obdélník, když zdroj není prvek (nová karta uprostřed stolu). */
  from?: RectLike | null;
}

/**
 * „Duch“ prvku letí z jeho místa na `to` (spotřebka odlétá ze slotu ke kartám, kopie karty do ruky, karta do
 * balíčku). Zdroj je prvek (naklonuje se) nebo hotový prvek `source` (nová karta, která ještě není v DOM).
 */
export async function ghostFly(
  layer: HTMLElement | null,
  anim: AnimQueue,
  source: HTMLElement | null,
  to: RectLike | null,
  opts: GhostOptions & { clone?: boolean } = {},
): Promise<void> {
  if (!layer || !source || anim.instant) return;
  const from = opts.from ?? (source.isConnected ? source.getBoundingClientRect() : null);
  if (!from || (from.width === 0 && from.height === 0)) return;
  const node = opts.clone === false ? source : (source.cloneNode(true) as HTMLElement);
  node.removeAttribute('data-testid');
  for (const n of node.querySelectorAll('[data-testid]')) n.removeAttribute('data-testid');
  node.setAttribute('aria-hidden', 'true');
  node.classList.remove(TRIGGER_CLASS, 'is-selected');
  const ghost = h(
    'div',
    {
      class: 'fx-ghost',
      'aria-hidden': 'true',
      style: {
        width: `${from.width}px`,
        height: `${from.height}px`,
        '--card-w': `${from.width}px`,
        // Výchozí místo i bez pohybové animace (reduced motion jen prolne).
        transform: `translate(${from.left}px, ${from.top}px)`,
      },
    },
    node,
  );
  const hidden = opts.hideSource && source.isConnected ? source : null;
  layer.appendChild(ghost);
  if (hidden) hidden.style.opacity = '0';
  const ms = opts.ms ?? 520;
  const target = to ?? from;
  const s = target.width > 0 && from.width > 0 ? target.width / from.width : 1;
  const x0 = from.left;
  const y0 = from.top;
  const x1 = target.left + target.width / 2 - from.width / 2;
  const y1 = target.top + target.height / 2 - from.height / 2;
  const frames: Keyframe[] = opts.lift
    ? [
        { transform: `translate(${x0}px, ${y0}px) scale(1) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x0}px, ${y0 - 26}px) scale(1.25) rotate(-6deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${x0}px, ${y0 - 30}px) scale(1.28) rotate(4deg)`, opacity: 1, offset: 0.45 },
        {
          transform: `translate(${x1}px, ${y1}px) scale(${s * 0.7}) rotate(10deg)`,
          opacity: opts.fade === false ? 1 : 0,
        },
      ]
    : [
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
        { transform: `translate(${x0}px, ${y0 - 18}px) scale(1.12)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x1}px, ${y1}px) scale(${s})`, opacity: opts.fade === false ? 1 : 0.15 },
      ];
  try {
    await Promise.all([
      animate(anim, ghost, frames, ms, {
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards',
        reduced: [{ opacity: 1 }, { opacity: 0 }],
      }),
      anim.wait(ms),
    ]);
  } finally {
    ghost.remove();
  }
}

/**
 * Zničená karta se rozpadne: zatřese se, pak se zmenší, pootočí a zmizí (zůstane neviditelná, dokud ji volající
 * neodstraní). Prach kreslí volající (částice).
 */
export async function crumble(anim: AnimQueue, el: Element | null | undefined): Promise<void> {
  if (!el || anim.instant) return;
  await animate(
    anim,
    motionTarget(el),
    [
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: 'translate(-5px, 0) rotate(-3deg)', offset: 0.2 },
      { transform: 'translate(5px, 0) rotate(3deg)', offset: 0.45 },
      { transform: 'translate(-3px, 0) rotate(-2deg)', offset: 0.7 },
      { transform: 'translate(0, 0) rotate(0deg)' },
    ],
    200,
    { reduced: [{ opacity: 1 }, { opacity: 0.6 }] },
  );
  await animate(
    anim,
    el,
    [
      { opacity: 1, transform: 'scale(1) rotate(0deg)' },
      { opacity: 0, transform: 'scale(0.45) rotate(14deg) translateY(12px)' },
    ],
    300,
    { easing: 'ease-in', fill: 'forwards', reduced: [{ opacity: 1 }, { opacity: 0 }] },
  );
}

/** Nová položka (žolík, spotřebka, karta) naskočí na své místo s přestřelem. */
export function popIn(anim: AnimQueue, el: Element | null | undefined): Promise<void> {
  if (!el || anim.instant) return Promise.resolve();
  return animate(
    anim,
    motionTarget(el),
    [
      { transform: 'translateY(-18px) scale(0.35)', opacity: 0 },
      { transform: 'translateY(-6px) scale(1.18)', opacity: 1, offset: 0.55 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    460,
    { easing: EASE_SPRING, reduced: [{ opacity: 0 }, { opacity: 1 }] },
  );
}

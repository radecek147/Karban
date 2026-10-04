/**
 * Web Animations s ohledem na rychlost hry, vypnuté animace, přeskočení mezerníkem a `prefers-reduced-motion`
 * (src/ui/anim/queue.ts). Animuje se výhradně transform/opacity.
 *
 *   await animate(anim, el, [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }], 300);
 *   await animate(anim, el, frames, 300, { reduced: [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }] });
 *
 * Při `prefers-reduced-motion` se pohybová animace vynechá; s `reduced` se místo ní přehraje klidná náhrada
 * (prolnutí, bez třesení) se zkrácenou délkou. Prostředí bez `Element.animate` (testy) = nic.
 */
import type { AnimQueue } from './queue';

export const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
/** Pružné dosednutí s přestřelem (bublina, poskočení, přílet). */
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** `prefers-reduced-motion` (jeden MediaQueryList — čtení nic nealokuje). */
const reducedMotionQuery: MediaQueryList | null =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

/** Přeje si hráč omezený pohyb? */
export function reducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false;
}

export interface AnimateOptions {
  easing?: string;
  /** Zpoždění (ms při 1×). */
  delay?: number;
  /** `forwards` = prvek zůstane v koncovém stavu (mizení před odstraněním z DOM). Výchozí `backwards`. */
  fill?: FillMode;
  /** Klidná náhrada pro `prefers-reduced-motion` (jen opacity / malé měřítko); bez ní se animace vynechá. */
  reduced?: Keyframe[];
}

function noop(): void {}

/**
 * Web Animation (jen transform/opacity) se zohledněním rychlosti, vypnutých animací a přeskočení.
 * Prostředí bez `Element.animate` (testy) = nic.
 */
export async function animate(
  anim: AnimQueue,
  el: Element | null | undefined,
  frames: Keyframe[],
  ms: number,
  opts: AnimateOptions = {},
): Promise<void> {
  if (!el || anim.instant || typeof (el as HTMLElement).animate !== 'function') return;
  const reduced = reducedMotion();
  if (reduced && !opts.reduced) return;
  const duration = anim.duration(ms);
  if (duration <= 0) return;
  const delay = anim.duration(opts.delay ?? 0);
  let a: Animation;
  try {
    a = el.animate(reduced && opts.reduced ? opts.reduced : frames, {
      duration,
      delay,
      easing: opts.easing ?? EASE_OUT,
      fill: opts.fill ?? 'backwards',
    });
  } catch {
    return;
  }
  await Promise.race([a.finished.then(noop, noop), anim.wait((opts.delay ?? 0) + ms)]);
  // Přeskočení (mezerník): animace doběhne hned do konce.
  if (a.playState === 'running' || a.playState === 'paused') {
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  }
}

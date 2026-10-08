/**
 * Přesměrování ze stránky odkazu na sestavu (`sestava/<id>/index.html` a `404.html`, scripts/preset-pages.ts)
 * do hry s parametrem `?sestava=<id>`.
 *
 * Proč zvláštní stránka: service worker (src/sw/sw.ts) vrací adresu hry z cache a nová verze ho nahradí, až
 * se zavřou všechny karty se starou (žádné `skipWaiting`). Odkaz rovnou na `?sestava=` by tak hráči, který hru
 * už někdy otevřel, spustil starou verzi z cache — a ta sestavy nemusí znát. Tahle stránka leží mimo adresu hry,
 * takže ji žádná verze workeru jako hru z cache nevrátí, a před přesměrováním:
 *  - bez workeru nebo offline jen přesměruje,
 *  - s workerem zkontroluje aktualizaci (`registration.update()`); čeká-li nová verze, instaluje-li se, nebo
 *    kontrola nestihne doběhnout, worker odregistruje — navigace do hry pak jde na síť a načte novou verzi, která
 *    si worker zaregistruje znovu (offline cache se obnoví na pozadí),
 *  - aktuální worker nechá být (hra se načte z cache),
 *  - nepovedená kontrola (výpadek sítě) worker nechá být — bez sítě by nová verze stejně nepřišla.
 *
 * `404.html` cíl počítá z adresy (`<base>sestava/<cokoli>/…` → `<base>?sestava=<cokoli>`, id normalizuje hra);
 * jiné neexistující adresy nechá na stránce „nenalezeno“.
 *
 * Klasický skript bez importů: plugin ho přeloží a vloží do stránky za konstantu `__LINK__` s konfigurací.
 * Prohlížečová API bere z globálních jmen (`navigator`, `location`, `document`, `setTimeout`), testy je podstrčí.
 */

interface LinkConfig {
  /** Cíl relativně ke stránce (stránka sestavy), nebo null = spočítat z adresy (404.html). */
  readonly target: string | null;
  /** Absolutní base hry (`/Karban/`) — jen pro 404.html. */
  readonly base: string | null;
  /** Adresář stránek sestav (`sestava`). */
  readonly dir: string;
  /** Parametr adresy hry (`sestava`). */
  readonly param: string;
  /** Jak dlouho čekat na kontrolu aktualizace workeru (ms). */
  readonly updateTimeoutMs: number;
}

declare const __LINK__: LinkConfig;

/** Absolutní adresa hry se sestavou, nebo null (404.html na adrese, která sestavu neoznačuje). */
function linkTarget(): string | null {
  if (__LINK__.target !== null) return new URL(__LINK__.target, location.href).href;
  const base = __LINK__.base;
  if (base === null || !location.pathname.startsWith(base)) return null;
  const parts = location.pathname.slice(base.length).split('/');
  const raw = parts[1] ?? '';
  if ((parts[0] ?? '').toLowerCase() !== __LINK__.dir || raw === '') return null;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // Rozbité %-kódování nechá být — hra id stejně normalizuje.
  }
  return new URL(`${base}?${__LINK__.param}=${encodeURIComponent(id)}`, location.href).href;
}

/** Zastaralý worker hry odregistruje (viz hlavička); aktuální, chybějící nebo nedostupný nechá být. */
async function retireStaleWorker(scope: string): Promise<void> {
  const container = navigator.serviceWorker as ServiceWorkerContainer | undefined;
  if (!container) return;
  const reg = await container.getRegistration(scope);
  if (!reg || !reg.active) return;
  let stale = reg.installing !== null || reg.waiting !== null;
  if (!stale) {
    if (navigator.onLine === false) return;
    const result = await Promise.race([
      reg.update().then(
        () => 'checked',
        () => 'failed',
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), __LINK__.updateTimeoutMs)),
    ]);
    if (result === 'failed') return;
    stale = result === 'timeout' || reg.installing !== null || reg.waiting !== null;
  }
  if (stale) await reg.unregister();
}

function showRedirecting(): void {
  // 404.html má dva bloky textu: „nenalezeno“ a „přesměrovávám“ (stránka sestavy jen ten druhý).
  document.getElementById('link-missing')?.setAttribute('hidden', '');
  document.getElementById('link-redirect')?.removeAttribute('hidden');
}

const target = linkTarget();
if (target !== null) {
  showRedirecting();
  let done = false;
  const go = (): void => {
    if (done) return;
    done = true;
    location.replace(target);
  };
  // Pojistka: přesměrovat, i kdyby se dotaz na worker zasekl.
  const guard = setTimeout(go, __LINK__.updateTimeoutMs * 2);
  retireStaleWorker(new URL('./', target).href)
    .catch(() => undefined)
    .then(() => {
      clearTimeout(guard);
      go();
    });
}

export {};

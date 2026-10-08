/**
 * Adresa, se kterou se hra spustila (src/main.ts): kořen hry, stránka odkazu na sestavu `<kořen>/sestava/<id>/`
 * (kopie app shellu s `<base>` na kořen, scripts/preset-pages.ts), parametr `?sestava=<id>`, nebo neexistující adresa
 * pod hrou (GitHub Pages vrátí `404.html`, také kopii shellu). Kořen hry = adresář `document.baseURI` — bez `<base>`
 * je to adresář stránky, v kopiích shellu adresa z `<base>`.
 *
 * Čistá funkce bez DOM: dostane `location.href` a `document.baseURI`, vrátí id sestavy (surové — normalizuje ho
 * `jokerPreset`), příznak „nenalezeno“ a adresu, na kterou se má `history.replaceState` přepsat (kořen hry
 * s ostatními parametry a kotvou), ať obnovení stránky pokračuje v rozehrané hře a nezakládá novou.
 */
import { PRESET_DIR, PRESET_PARAM } from '../content/presets';

export interface LinkRoute {
  /** Id sestavy z cesty nebo z parametru (surové), nebo null. */
  readonly presetId: string | null;
  /** Adresa pod hrou, která nic neznamená (stránka 404). */
  readonly notFound: boolean;
  /** Hra se spustila z kopie shellu (stránka sestavy nebo 404), ne z vlastní adresy. */
  readonly viaLinkPage: boolean;
  /** Kam přepsat adresu (`history.replaceState`), nebo null = nechat. */
  readonly cleanUrl: string | null;
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Rozbité %-kódování nechá být — `jokerPreset` id stejně normalizuje.
    return segment;
  }
}

export function linkRoute(href: string, baseUri: string): LinkRoute {
  const url = new URL(href);
  const root = new URL('./', baseUri);
  let presetId = url.searchParams.get(PRESET_PARAM);
  let notFound = false;
  let viaLinkPage = false;
  let changed = presetId !== null;
  url.searchParams.delete(PRESET_PARAM);
  const inside = url.origin === root.origin && url.pathname.startsWith(root.pathname);
  const rest = inside ? url.pathname.slice(root.pathname.length) : '';
  if (rest !== '' && rest !== 'index.html') {
    viaLinkPage = true;
    changed = true;
    const [dir = '', id = ''] = rest.split('/');
    if (dir.toLowerCase() === PRESET_DIR && id !== '') presetId ??= decode(id);
    else notFound = true;
    url.pathname = root.pathname;
  }
  return { presetId, notFound, viaLinkPage, cleanUrl: changed ? url.href : null };
}

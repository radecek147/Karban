/**
 * Vstupní bod aplikace: fonty a styly, aplikace (router, úložiště, profil hráče, registr obsahu), načtení ikon
 * (samostatný chunk), registrace obrazovek, tutoriál Štamgast (vypíná ho `?tutorial=off`), přepočet profilu,
 * globální ošetření chyb, adresa spuštění (odkaz na ukázkovou sestavu `sestava/<id>/` nebo `?sestava=`, stránka 404 —
 * src/ui/linkRoute.ts), první obrazovka (menu, nebo `#gallery`) a service worker (offline, jen produkční build).
 *
 * Code splitting: staticky se načítá jen menu; ostatní obrazovky jsou samostatné chunky (`registerLazy`)
 * a po zobrazení menu se v klidu načtou dopředu (`preloadScreens`), takže přechody zůstávají okamžité.
 */
import './assets/fonts/fonts.css';
import './ui/styles/base.css';
import './ui/styles/screens.css';
// Styly líně načítaných obrazovek patří do hlavního CSS v pevném pořadí (stejná kaskáda jako bez code splittingu;
// CSS chunku připojené až za běhu by jinak přebilo „šťávu“ z fx.css).
import './ui/styles/meta.css';
import './ui/styles/cards.css';
import './ui/styles/game.css';
import './ui/styles/tutorial.css';
import { registry } from './content';
import { JOKER_PRESETS, jokerPreset } from './content/presets';
import { unlockEverything } from './engine/meta';
import { t } from './i18n/cs';
import type { ScreenId } from './ui/app';
import { App } from './ui/app';
import { loadIcons } from './ui/art/icons';
import { installAudio } from './ui/audio/hooks';
import { toast } from './ui/components/toast';
import { h, mount, qs } from './ui/dom';
import { menuScreen } from './ui/screens/menu';
import { showMetaNotices } from './ui/profile';
import { browserStore } from './ui/storage';
import { TabGuard, watchStorageEvents } from './ui/tabGuard';
import { installTabLock } from './ui/tabLock';
import type { LinkRoute } from './ui/linkRoute';
import { linkRoute } from './ui/linkRoute';
import { startRunFlow } from './ui/runStart';
import { randomSeed } from './ui/seed';
import { registerServiceWorker } from './ui/serviceWorker';
import { installTutorial } from './ui/tutorial';
// „Šťáva“ (fáze 9) až za styly obrazovek a karet — přebíjí je při stejné specifičnosti.
import './ui/styles/fx.css';

/** Vývojářská galerie grafiky (`#gallery`) — není běžná obrazovka menu, router ji zná jen pod tímto id. */
const GALLERY = 'gallery' as ScreenId;
const GALLERY_HASH = '#gallery';
/** Nejvýš jedno chybové oznámení za tuto dobu (ať chyba ve smyčce nezaplaví obrazovku). */
const ERROR_TOAST_GAP_MS = 3000;
/** Přednačtení obrazovek nejpozději po této době, i když prohlížeč nemá „volno“. */
const IDLE_TIMEOUT_MS = 2000;
const IDLE_FALLBACK_MS = 500;
/** Ukázková sestava se hraje na základním balíčku a Desítce. */
const PRESET_DECK = 'pub';
const PRESET_STAKE = 1;
/** Oznámení o rozdané sestavě vydrží déle než běžné (název sestavy + věta o statistikách). */
const PRESET_TOAST_MS = 6000;
/** Delší id neznámé sestavy se v oznámení zkrátí. */
const UNKNOWN_ID_MAX = 24;

/** Neošetřené chyby: do konzole celé, hráči vtipná hláška místo tichého zamrznutí. */
function installErrorHandlers(): void {
  let last = -Infinity;
  const report = (label: string, err: unknown): void => {
    console.error(`[karban] ${label}`, err);
    const now = performance.now();
    if (now - last < ERROR_TOAST_GAP_MS) return;
    last = now;
    try {
      toast(t('errors.generic'), { kind: 'error', testId: 'toast-crash' });
    } catch {
      // DOM ještě není připravený — zůstane jen záznam v konzoli.
    }
  };
  window.addEventListener('error', (e) => {
    // Šum prohlížeče, ne chyba hry.
    if (typeof e.message === 'string' && e.message.includes('ResizeObserver loop')) return;
    report('Neošetřená chyba', e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => report('Neošetřený slib', e.reason));
}

function boot(): void {
  installErrorHandlers();
  const route = applyLinkRoute();
  document.title = t('app.documentTitle');
  const root = qs('#app');
  mount(root, h('p', { class: 'boot-loading', role: 'status' }, t('app.loading')));

  const reg = registry();
  // Jedna aktivní karta (src/ui/tabGuard.ts): tahle karta hru převezme ještě před načtením profilu; jiná otevřená
  // karta se zablokuje a nic nepřepíše.
  const guard = new TabGuard(browserStore());
  guard.claim();
  watchStorageEvents(guard);
  // Oznámení odemčení mají ikony — počkají na jejich chunk (pak už jde o jeden mikrotask).
  const app = new App(root, guard.store, reg, {
    notify: (notices) => void loadIcons().then(() => showMetaNotices(notices, reg)),
  });
  installTabLock(app, guard);
  // Zvuk (DESIGN 13.6): AudioContext vznikne až po prvním gestu hráče, hudba podle obrazovky.
  installAudio(app);
  app.register('menu', menuScreen);
  // Literály v import() nechávají Vite vytvořit chunky (a cesty k nim podle `base`, i pro GitHub Pages).
  // Obrazovky s kartami a žolíky se ukážou až s ikonami (jinak by obrázky vznikly s náhradním glyfem).
  app.registerLazy('newGame', () => withIcons(import('./ui/screens/newGame')).then((m) => m.newGameScreen));
  app.registerLazy('game', () => withIcons(import('./ui/screens/game')).then((m) => m.gameScreen));
  app.registerLazy('settings', () =>
    withIcons(import('./ui/screens/settings')).then((m) => m.settingsScreen),
  );
  app.registerLazy('credits', () => withIcons(import('./ui/screens/credits')).then((m) => m.creditsScreen));
  app.registerLazy('collection', () =>
    withIcons(import('./ui/screens/collection')).then((m) => m.collectionScreen),
  );
  app.registerLazy('stats', () => withIcons(import('./ui/screens/stats')).then((m) => m.statsScreen));
  app.registerLazy('challenges', () =>
    withIcons(import('./ui/screens/challenges')).then((m) => m.challengesScreen),
  );
  app.registerLazy('daily', () => withIcons(import('./ui/screens/daily')).then((m) => m.dailyScreen));
  app.registerLazy(GALLERY, () => withIcons(import('./ui/screens/gallery')).then((m) => m.galleryScreen));
  // Tutoriál Štamgast (DESIGN 13.5); `?tutorial=off` ho vypne pro celé sezení (e2e testy).
  if (new URLSearchParams(location.search).get('tutorial') !== 'off') installTutorial(app);

  // Odemčení a achievementy jen ze stavu profilu (nový obsah po aktualizaci, import) — oznámí se toastem.
  app.profiles.refresh();

  window.addEventListener('hashchange', () => {
    if (location.hash === GALLERY_HASH) app.go(GALLERY);
    else if (app.screenId === GALLERY) app.go('menu');
  });
  app.go(location.hash === GALLERY_HASH ? GALLERY : 'menu');
  handleLinkRoute(app, route);
  // Ikony (~345 kB) a ostatní obrazovky se stahují až po vykreslení menu, ať nebrzdí první vykreslení — menu
  // ikony nepotřebuje; obrazovky s kartami na ně počkají (`withIcons`), kdyby hráč klikl dřív.
  // Chyba načtení ikon hru nezastaví (náhradní glyfy).
  whenIdle(() => {
    void loadIcons();
    void app.preloadScreens();
  });
  // Kopie shellu běží v nové verzi i pod starým workerem — oznámení „nová verze naskočí příště“ by tu mátlo.
  registerServiceWorker({ quietUpdate: route.viaLinkPage });
}

/**
 * Adresa spuštění (src/ui/linkRoute.ts). Odkaz na sestavu nebo stránka 404 (kopie shellu): adresa se hned přepíše
 * na kořen hry, ať ji tak vidí i zbytek startu (kotva #gallery, ?tutorial) a obnovení stránky pokračuje v rozehrané
 * hře. Pak už `<base>` kopie shellu není potřeba (adresa stránky je kořen hry) — odebere se, ať se odkazy `#id`
 * v kresbách (SVG `<use>`, `url(#…)`) počítají vůči stránce i v prohlížečích, které je jinak berou vůči `<base>`.
 * Chyba tady start hry nezastaví.
 */
function applyLinkRoute(): LinkRoute {
  try {
    const route = linkRoute(location.href, document.baseURI);
    if (route.cleanUrl !== null) history.replaceState(history.state, '', route.cleanUrl);
    if (route.viaLinkPage) document.querySelector('base')?.remove();
    return route;
  } catch (err) {
    console.warn('[karban] Adresu odkazu se nepodařilo přečíst', err);
    return { presetId: null, notFound: false, viaLinkPage: false, cleanUrl: null };
  }
}

/**
 * Sestava z odkazu: rovnou založí seedovaný run (Hospodský balíček, Desítka) s ukázkovou sestavou žolíků — přes
 * stejný start jako výzvy, takže se rozehraná hra bez potvrzení nepřepíše. Neznámá sestava a stránka 404 jen oznámí,
 * že tu nic není (hráč zůstane v menu).
 */
function handleLinkRoute(app: App, route: LinkRoute): void {
  if (route.presetId === null) {
    if (route.notFound) toast(t('app.notFound'), { kind: 'info', testId: 'toast-not-found' });
    return;
  }
  const id = route.presetId;
  const preset = jokerPreset(id);
  if (!preset) {
    // Po znacích, ne po UTF-16 jednotkách (emoji v id by se rozpůlilo).
    const chars = [...id];
    const shown = chars.length > UNKNOWN_ID_MAX ? `${chars.slice(0, UNKNOWN_ID_MAX).join('')}…` : id;
    const ids = JOKER_PRESETS.map((p) => p.id).join(', ');
    toast(t('newGame.preset.unknown', { id: shown, ids }), {
      kind: 'warning',
      testId: 'toast-preset-unknown',
    });
    return;
  }
  const name = t(`newGame.preset.names.${preset.id}`);
  // Odkaz je předváděčka: rovnou odemkne všechny žolíky, balíčky, kupóny, výzvy a síly piva (přání hráče
  // 2026-10-08, stejné jako „Odemknout vše“ v Nastavení — statistiky, achievementy ani sbírku nemění).
  const unlocked = unlockEverything(app.profile, app.registry);
  if (unlocked > 0) app.profiles.save();
  const req = {
    deckId: PRESET_DECK,
    stake: PRESET_STAKE,
    seed: randomSeed(),
    seeded: true,
    presetJokers: preset.jokers,
  };
  const overwrite = {
    title: t('newGame.preset.overwrite.title'),
    message: t('newGame.preset.overwrite.message', { name }),
    confirmLabel: t('newGame.preset.overwrite.confirm'),
  };
  void startRunFlow(app, req, 'newGame.failed', overwrite).then((started) => {
    if (!started) return;
    toast(t('newGame.preset.started'), {
      kind: 'success',
      title: name,
      duration: PRESET_TOAST_MS,
      testId: 'toast-preset',
    });
    if (unlocked > 0) {
      toast(t('settings.unlockAll.done', { count: unlocked }), {
        kind: 'success',
        testId: 'toast-unlock-all',
      });
    }
  });
}

/** Modul obrazovky, až budou načtené i ikony. */
function withIcons<T>(screen: Promise<T>): Promise<T> {
  return Promise.all([screen, loadIcons()]).then(([mod]) => mod);
}

/** Spustí `fn`, až má prohlížeč volno (bez `requestIdleCallback` po krátké pauze). */
function whenIdle(fn: () => void): void {
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
  else window.setTimeout(fn, IDLE_FALLBACK_MS);
}

try {
  boot();
} catch (err: unknown) {
  console.error('[karban] Start aplikace selhal', err);
  toast(t('errors.generic'), { kind: 'error', duration: 0, testId: 'toast-crash' });
}

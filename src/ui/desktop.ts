/**
 * Desktopová aplikace (Tauri, macOS .dmg — docs/ARCHITECTURE.md „Desktopová aplikace“).
 *
 * Hra je stejná jako na webu. V aplikaci (systémový WebView) jdou jinou cestou jen tři věci:
 *  - export uložení: prohlížečové stažení (`<a download>`) v aplikaci nefunguje → nativní dialog „Uložit“
 *    (příkaz `save_export` v `src-tauri/src/lib.rs`),
 *  - celá obrazovka: místo Fullscreen API se přepíná okno aplikace,
 *  - service worker: hra je přibalená v aplikaci, offline cache není potřeba.
 *
 * Aplikace zapíná `withGlobalTauri`, takže API je na `window.__TAURI__` a hra nepotřebuje žádný balíček navíc.
 * Mimo aplikaci (web, testy) `isDesktopApp()` vrací false a nic z toho se nepoužije.
 */

interface TauriWindow {
  setFullscreen(on: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
}

interface TauriApi {
  core: { invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> };
  window: { getCurrentWindow(): TauriWindow };
}

function tauri(): TauriApi | null {
  return (globalThis as { __TAURI__?: TauriApi }).__TAURI__ ?? null;
}

function requireTauri(): TauriApi {
  const api = tauri();
  if (!api) throw new Error('[desktop] Tauri API není k dispozici');
  return api;
}

/** Běží hra v desktopové aplikaci? */
export function isDesktopApp(): boolean {
  return tauri() !== null;
}

/** Uloží export přes nativní dialog. Vrací cestu k souboru, nebo null, když hráč dialog zavřel. */
export function saveExportFile(fileName: string, contents: string): Promise<string | null> {
  return requireTauri().core.invoke<string | null>('save_export', { fileName, contents });
}

/** Je okno aplikace přes celou obrazovku? */
export function isDesktopFullscreen(): Promise<boolean> {
  return requireTauri().window.getCurrentWindow().isFullscreen();
}

/** Přepne okno aplikace na celou obrazovku (nebo zpět). Vrací stav po přepnutí. */
export async function setDesktopFullscreen(on: boolean): Promise<boolean> {
  const win = requireTauri().window.getCurrentWindow();
  await win.setFullscreen(on);
  return win.isFullscreen();
}

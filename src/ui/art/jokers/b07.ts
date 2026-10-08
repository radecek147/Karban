/**
 * Obrázky žolíků — dávka 07 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - regular — Stálý host: portrét `fig-regular` (FIGURES['regular'])
 *  - beer_belly — Pivní břicho: portrét `fig-beer_belly` (FIGURES['beer_belly'])
 *  - carousel — Kolotoč na pouti: scéna `kolotoc` (SCENES['kolotoc'])
 *  - echo — Ozvěna z propasti: scéna `ozvena` (SCENES['ozvena'])
 *  - lucky_seven — Šťastná sedmička: scéna `sedmicka` (SCENES['sedmicka'])
 *  - tab — Sekera: scéna `sekera` (SCENES['sekera'])
 *  - office_connection — Známý na úřadě: portrét `fig-office_connection` (FIGURES['office_connection'])
 *  - chronicler — Kronikář: portrét `fig-chronicler` (FIGURES['chronicler'])
 *  - chimney_sweep — Kominík: scéna `kominik` (SCENES['kominik'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import type { SceneOp } from '../sceneKit';

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {};

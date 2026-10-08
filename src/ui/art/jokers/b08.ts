/**
 * Obrázky žolíků — dávka 08 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - glassblower — Sklář: portrét `fig-glassblower` (FIGURES['glassblower'])
 *  - notary_public — Notář: portrét `fig-notary_public` (FIGURES['notary_public'])
 *  - witch — Čarodějnice: portrét `fig-witch` (FIGURES['witch'])
 *  - water_goblin — Vodník: scéna `vodnik` (SCENES['vodnik'])
 *  - will_o_wisp — Bludička: portrét `fig-will_o_wisp` (FIGURES['will_o_wisp'])
 *  - noon_witch — Polednice: portrét `fig-noon_witch` (FIGURES['noon_witch'])
 *  - klekanice — Klekánice: portrét `fig-klekanice` (FIGURES['klekanice'])
 *  - parish_priest — Pan farář: portrét `fig-parish_priest` (FIGURES['parish_priest'])
 *  - seer — Vědma: portrét `fig-seer` (FIGURES['seer'])
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

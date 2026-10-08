/**
 * Obrázky žolíků — dávka 06 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - recount_committee — Volební komise: portrét `fig-recount_committee` (FIGURES['recount_committee'])
 *  - football_fan — Fotbalový fanoušek: portrét `fig-football_fan` (FIGURES['football_fan'])
 *  - crown_goldsmith — Zlatník: portrét `fig-crown_goldsmith` (FIGURES['crown_goldsmith'])
 *  - beggar — Žebrák: portrét `fig-beggar` (FIGURES['beggar'])
 *  - building_savings — Stavební spoření: nová scéna `j-building_savings` (SCENES['j-building_savings'], zatím jen ikona)
 *  - late_train — Zpožděný rychlík: scéna `rychlik` (SCENES['rychlik'])
 *  - head_waiter — Pan vrchní: scéna `vrchni` (SCENES['vrchni'])
 *  - old_guard — Stará garda: portrét `fig-old_guard` (FIGURES['old_guard'])
 *  - herbalist — Kořenářka: portrét `fig-herbalist` (FIGURES['herbalist'])
 *
 * `FIGURES`: úpravy portrétů (klíč = id žolíka; sloučí se přes základní popis ve figures.ts, pole se nahrazují celá).
 * `SCENES`: nové nebo přepsané scény (klíč = název scény z `art.scene`; přepíše i portrét `fig-<id>`).
 * Kreslicí nástroje: src/ui/art/sceneKit.ts (tahy a cesty), src/ui/art/figureKit.ts (`figure` a díly postav).
 * Vlastní dílo (Karban, 2026).
 */
import type { FigureSpec } from '../figureKit';
import { rect } from '../sceneKit';
import type { SceneOp } from '../sceneKit';

export const FIGURES: Readonly<Record<string, Partial<FigureSpec>>> = {};

export const SCENES: Readonly<Record<string, readonly SceneOp[]>> = {
  // Zatím jen ikona na pozadí — nahradit vlastní scénou.
  'j-building_savings': [
    ['f', '#24496b', rect(16, 16, 218, 268), 0],
    ['i', 'bank', 60, 80, 130, '#eef5fb'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'bank', 150, 200, 60, '#eef5fb'],
  ],
};

/**
 * Obrázky žolíků — dávka 11 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - tour_guide — Turistický průvodce: portrét `fig-tour_guide` (FIGURES['tour_guide'])
 *  - spartakiada — Spartakiáda: portrét `fig-spartakiada` (FIGURES['spartakiada'])
 *  - voucher_privatization — Kupónová privatizace: nová scéna `j-voucher_privatization` (SCENES['j-voucher_privatization'], zatím jen ikona)
 *  - spa_guest — Lázeňský host: portrét `fig-spa_guest` (FIGURES['spa_guest'])
 *  - brass_band — Dechovka: portrét `fig-brass_band` (FIGURES['brass_band'])
 *  - charles_bridge — Karlův most: scéna `karluvMost` (SCENES['karluvMost'])
 *  - d1_motorway — Dálnice D1: scéna `d1` (SCENES['d1'])
 *  - exchange_office — Směnárna: nová scéna `j-exchange_office` (SCENES['j-exchange_office'], zatím jen ikona)
 *  - new_years_eve — Silvestr: scéna `silvestr` (SCENES['silvestr'])
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
  'j-voucher_privatization': [
    ['f', '#4b4f58', rect(16, 16, 218, 268), 0],
    ['i', 'factory', 60, 80, 130, '#f1f3f5'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'factory', 150, 200, 60, '#f1f3f5'],
  ],
  // Zatím jen ikona na pozadí — nahradit vlastní scénou.
  'j-exchange_office': [
    ['f', '#1e4d2b', rect(16, 16, 218, 268), 0],
    ['i', 'banknote', 60, 80, 130, '#eefbea'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'banknote', 150, 200, 60, '#eefbea'],
  ],
};

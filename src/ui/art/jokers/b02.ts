/**
 * Obrázky žolíků — dávka 02 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - party_for_two — Párty pro dva: portrét `fig-party_for_two` (FIGURES['party_for_two'])
 *  - gardener — Zahrádkář Venca: scéna `gardener` (SCENES['gardener'])
 *  - svejk — Švejk: nová scéna `j-svejk` (SCENES['j-svejk'], zatím jen ikona)
 *  - piggy_bank — Pokladnička: portrét `fig-piggy_bank` (FIGURES['piggy_bank'])
 *  - flea_trader — Bazarník: portrét `fig-flea_trader` (FIGURES['flea_trader'])
 *  - golem — Golem: scéna `golem` (SCENES['golem'])
 *  - helpline_aunt — Teta z poradny: portrét `fig-helpline_aunt` (FIGURES['helpline_aunt'])
 *  - weekend_cottager — Chatař: portrét `fig-weekend_cottager` (FIGURES['weekend_cottager'])
 *  - shooting_gallery — Střelec z pouti: portrét `fig-shooting_gallery` (FIGURES['shooting_gallery'])
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
  'j-svejk': [
    ['f', '#5a6b3a', rect(16, 16, 218, 268), 0],
    ['i', 'smoking-pipe', 60, 80, 130, '#f3efd9'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'smoking-pipe', 150, 200, 60, '#f3efd9'],
  ],
};

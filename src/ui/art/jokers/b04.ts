/**
 * Obrázky žolíků — dávka 04 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - hejkal — Hejkal: portrét `fig-hejkal` (FIGURES['hejkal'])
 *  - tram_driver — Tramvaják: portrét `fig-tram_driver` (FIGURES['tram_driver'])
 *  - punter — Sázkař: portrét `fig-punter` (FIGURES['punter'])
 *  - pavlac_gossip — Drbna z pavlače: portrét `fig-pavlac_gossip` (FIGURES['pavlac_gossip'])
 *  - round_for_everyone — Rundu všem: scéna `rundu` (SCENES['rundu'])
 *  - pickled_cheese — Nakládaný hermelín: scéna `hermelin` (SCENES['hermelin'])
 *  - thirteenth_salary — Třináctý plat: nová scéna `j-thirteenth_salary` (SCENES['j-thirteenth_salary'], zatím jen ikona)
 *  - temp_worker — Brigádník: portrét `fig-temp_worker` (FIGURES['temp_worker'])
 *  - fisherman — Rybář: portrét `fig-fisherman` (FIGURES['fisherman'])
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
  'j-thirteenth_salary': [
    ['f', '#22333b', rect(16, 16, 218, 268), 0],
    ['i', 'money-stack', 60, 80, 130, '#f1faee'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'money-stack', 150, 200, 60, '#f1faee'],
  ],
};

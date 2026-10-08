/**
 * Obrázky žolíků — dávka 09 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - court_painter — Dvorní malíř: portrét `fig-court_painter` (FIGURES['court_painter'])
 *  - colorblind_uncle — Barvoslepý strýc: portrét `fig-colorblind_uncle` (FIGURES['colorblind_uncle'])
 *  - trodden_path — Vyšlapaná pěšina: nová scéna `j-trodden_path` (SCENES['j-trodden_path'], zatím jen ikona)
 *  - war_loot — Válečná kořist: nová scéna `j-war_loot` (SCENES['j-war_loot'], zatím jen ikona)
 *  - anonymous_commenter — Anonymní diskutér: portrét `fig-anonymous_commenter` (FIGURES['anonymous_commenter'])
 *  - viral_video — Virální video: portrét `fig-viral_video` (FIGURES['viral_video'])
 *  - carbon_paper — Kopírák: nová scéna `j-carbon_paper` (SCENES['j-carbon_paper'], zatím jen ikona)
 *  - defenestration — Defenestrace: scéna `defenestrace` (SCENES['defenestrace'])
 *  - brno_native — Brňák: portrét `fig-brno_native` (FIGURES['brno_native'])
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
  'j-trodden_path': [
    ['f', '#55702f', rect(16, 16, 218, 268), 0],
    ['i', 'footprint', 60, 80, 130, '#f4f9e4'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'footprint', 150, 200, 60, '#f4f9e4'],
  ],
  // Zatím jen ikona na pozadí — nahradit vlastní scénou.
  'j-war_loot': [
    ['f', '#5a4a2f', rect(16, 16, 218, 268), 0],
    ['i', 'flail', 60, 80, 130, '#f7efdc'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'flail', 150, 200, 60, '#f7efdc'],
  ],
  // Zatím jen ikona na pozadí — nahradit vlastní scénou.
  'j-carbon_paper': [
    ['f', '#1e3a6e', rect(16, 16, 218, 268), 0],
    ['i', 'save', 60, 80, 130, '#e6efff'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'save', 150, 200, 60, '#e6efff'],
  ],
};

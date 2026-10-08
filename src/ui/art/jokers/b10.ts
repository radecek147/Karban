/**
 * Obrázky žolíků — dávka 10 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - social_bubble — Sociální bublina: nová scéna `j-social_bubble` (SCENES['j-social_bubble'], zatím jen ikona)
 *  - snowman — Sněhulák: scéna `snehulak` (SCENES['snehulak'])
 *  - mushroom_picker — Sběrač hub: portrét `fig-mushroom_picker` (FIGURES['mushroom_picker'])
 *  - impersonator — Napodobitel: portrét `fig-impersonator` (FIGURES['impersonator'])
 *  - innkeeper — Hostinský: scéna `hostinsky` (SCENES['hostinsky'])
 *  - grandmas_chest — Babiččina truhla: scéna `truhla` (SCENES['truhla'])
 *  - beer_sommelier — Pivní sommelier: portrét `fig-beer_sommelier` (FIGURES['beer_sommelier'])
 *  - archivist — Archivář: portrét `fig-archivist` (FIGURES['archivist'])
 *  - fair_magician — Kouzelník z pouti: portrét `fig-fair_magician` (FIGURES['fair_magician'])
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
  'j-social_bubble': [
    ['f', '#2b5f8a', rect(16, 16, 218, 268), 0],
    ['i', 'thumb-up', 60, 80, 130, '#eaf6ff'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'thumb-up', 150, 200, 60, '#eaf6ff'],
  ],
};

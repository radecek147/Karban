/**
 * Obrázky žolíků — dávka 05 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - garbage_man — Popelář: portrét `fig-garbage_man` (FIGURES['garbage_man'])
 *  - jukebox — Hudební automat: scéna `jukebox` (SCENES['jukebox'])
 *  - tool_shed — Kůlna: scéna `kulna` (SCENES['kulna'])
 *  - replacement_bus — Náhradní autobus: scéna `nahradniBus` (SCENES['nahradniBus'])
 *  - pig_slaughter — Řezník z rohu: portrét `fig-pig_slaughter` (FIGURES['pig_slaughter'])
 *  - derby_fans — Červená a černá: portrét `fig-derby_fans` (FIGURES['derby_fans'])
 *  - pub_quiz — Hospodský kvíz: portrét `fig-pub_quiz` (FIGURES['pub_quiz'])
 *  - scrap_yard — Sběrna surovin: nová scéna `j-scrap_yard` (SCENES['j-scrap_yard'], zatím jen ikona)
 *  - fair_photographer — Fotograf z pouti: portrét `fig-fair_photographer` (FIGURES['fair_photographer'])
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
  'j-scrap_yard': [
    ['f', '#495057', rect(16, 16, 218, 268), 0],
    ['i', 'cog', 60, 80, 130, '#f8f9fa'],
    ['l', rect(26, 26, 198, 248), 1.2],
    ['i', 'cog', 150, 200, 60, '#f8f9fa'],
  ],
};

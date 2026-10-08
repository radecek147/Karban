/**
 * Obrázky žolíků — dávka 01 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - beer_mat — Pivní tácek: scéna `beerMat` (SCENES['beerMat'])
 *  - hearts_man — Srdcař: portrét `fig-hearts_man` (FIGURES['hearts_man'])
 *  - gravedigger — Hrobník: portrét `fig-gravedigger` (FIGURES['gravedigger'])
 *  - jeweler — Klenotník: portrét `fig-jeweler` (FIGURES['jeweler'])
 *  - crusader — Křižák: portrét `fig-crusader` (FIGURES['crusader'])
 *  - early_bird — Ranní ptáče: portrét `fig-early_bird` (FIGURES['early_bird'])
 *  - night_shift — Noční směna: portrét `fig-night_shift` (FIGURES['night_shift'])
 *  - meteorologist — Meteorolog: portrét `fig-meteorologist` (FIGURES['meteorologist'])
 *  - pe_teacher — Tělocvikář: portrét `fig-pe_teacher` (FIGURES['pe_teacher'])
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

/**
 * Obrázky žolíků — dávka 03 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - tobacconist — Trafikant: portrét `fig-tobacconist` (FIGURES['tobacconist'])
 *  - ticket_inspector — Revizor: portrét `fig-ticket_inspector` (FIGURES['ticket_inspector'])
 *  - doorman — Vrátný: portrét `fig-doorman` (FIGURES['doorman'])
 *  - goldsmith — Pozlacovač: portrét `fig-goldsmith` (FIGURES['goldsmith'])
 *  - paver — Dlaždič: portrét `fig-paver` (FIGURES['paver'])
 *  - postman — Pošťák: portrét `fig-postman` (FIGURES['postman'])
 *  - grocer — Hokynář: portrét `fig-grocer` (FIGURES['grocer'])
 *  - grill_dad — Táta u grilu: portrét `fig-grill_dad` (FIGURES['grill_dad'])
 *  - teacher — Učitelka: portrét `fig-teacher` (FIGURES['teacher'])
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

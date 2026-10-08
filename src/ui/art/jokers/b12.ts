/**
 * Obrázky žolíků — dávka 12 (docs/DECISIONS.md 2026-10-08 „Obrázky žolíků s detaily podle názvu“):
 *  - forefather — Praotec Čech: scéna `cech` (SCENES['cech'])
 *  - libuse — Kněžna Libuše: scéna `libuse` (SCENES['libuse'])
 *  - blanik_knights — Blaničtí rytíři: scéna `blanik` (SCENES['blanik'])
 *  - bruncvik_sword — Bruncvíkův meč: scéna `bruncvik` (SCENES['bruncvik'])
 *  - faust — Doktor Faust: scéna `faust` (SCENES['faust'])
 *  - krakonos — Krakonoš: scéna `krakonos` (SCENES['krakonos'])
 *  - silly_honza — Hloupý Honza: scéna `honza` (SCENES['honza'])
 *  - astro_clock — Orloj: scéna `orloj` (SCENES['orloj'])
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

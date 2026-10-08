// @vitest-environment happy-dom
/**
 * Dávky obrázků žolíků (src/ui/art/jokers/*.ts): klíče se mezi dávkami neopakují, úpravy portrétů patří existujícím
 * portrétům, scény patří žolíkům, každý žolík se scénou se vykreslí jako scéna (ne ikona) a kresba není přehnaně
 * velká (výkon karty v ruce).
 */
import { describe, expect, it } from 'vitest';
import { registry } from '../../src/content';
import { contentArt } from '../../src/ui/art/art';
import { FIGURE_IDS } from '../../src/ui/art/figures';
import { ART_BATCHES } from '../../src/ui/art/jokers';
import { SCENES, hasScene, sceneMarkup } from '../../src/ui/art/scenes';

const REG = registry();
/** Strop velikosti kresby jedné scény (znaky SVG) — hustá scéna zpomalí ruku plnou žolíků. */
const MAX_SCENE_MARKUP = 400_000;

describe('dávky obrázků žolíků', () => {
  it('klíče úprav se mezi dávkami neopakují', () => {
    const seen = new Map<string, string>();
    for (const [name, batch] of Object.entries(ART_BATCHES)) {
      for (const key of [
        ...Object.keys(batch.FIGURES).map((k) => `fig:${k}`),
        ...Object.keys(batch.SCENES),
      ]) {
        expect(seen.get(key), `${key} v ${name} i ${seen.get(key)}`).toBeUndefined();
        seen.set(key, name);
      }
    }
  });

  it('úpravy portrétů patří existujícím portrétům, scény žolíkům', () => {
    const jokerScenes = new Set(Object.values(REG.jokers).map((j) => j.art.scene));
    for (const [name, batch] of Object.entries(ART_BATCHES)) {
      for (const id of Object.keys(batch.FIGURES)) expect(FIGURE_IDS, `${name}: ${id}`).toContain(id);
      for (const scene of Object.keys(batch.SCENES))
        expect(jokerScenes.has(scene), `${name}: ${scene}`).toBe(true);
    }
  });

  it('každý žolík má scénu, vykreslí ji místo ikony a kresba má rozumnou velikost', () => {
    for (const j of Object.values(REG.jokers)) {
      expect(j.art.scene, j.id).toBeDefined();
      expect(hasScene(j.art.scene), j.id).toBe(true);
      const el = contentArt('joker', j.id);
      expect(el.getAttribute('data-scene'), j.id).toBe(j.art.scene);
      const size = sceneMarkup(j.art.scene!).length;
      expect(size, j.id).toBeGreaterThan(1000);
      expect(size, j.id).toBeLessThan(MAX_SCENE_MARKUP);
    }
    expect(Object.keys(SCENES).length).toBeGreaterThanOrEqual(Object.keys(REG.jokers).length);
  });
});

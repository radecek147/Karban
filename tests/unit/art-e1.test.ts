// @vitest-environment happy-dom
/**
 * Styl E1 (tuš a akvarel): akvarelová sada, stabilní markup (klíč bitmapové keše), scény, barevná schémata karet
 * a bitmapová keš bez canvasu (happy-dom).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { registry } from '../../src/content';
import type { Card } from '../../src/engine/types';
import { artMarkupRaw, contentArt } from '../../src/ui/art/art';
import {
  cardBackMarkupRaw,
  cardFaceElement,
  cardFaceMarkupRaw,
  prewarmCardArt,
} from '../../src/ui/art/cards';
import { loadIcons } from '../../src/ui/art/icons';
import {
  forceRaster,
  prewarmRaster,
  rasterCacheSize,
  rasterSupported,
  rasterSvg,
} from '../../src/ui/art/raster';
import { hasScene, SCENES, sceneMarkup } from '../../src/ui/art/scenes';
import { stamgastMarkup } from '../../src/ui/art/stamgast';
import { beginArt, iconRef, ink, mixColor, paint, wash, wcDefs } from '../../src/ui/art/watercolor';
import { createCardView, refreshCardColors } from '../../src/ui/components/card';

const REG = registry();

function card(rank: Card['rank'], suit: Card['suit'], patch: Partial<Card> = {}): Card {
  return {
    id: 1,
    suit,
    rank,
    enhancement: null,
    seal: null,
    edition: null,
    bonusChips: 0,
    debuffed: false,
    faceDown: false,
    ...patch,
  };
}

beforeAll(() => loadIcons());

afterEach(() => {
  forceRaster(null);
  document.documentElement.classList.remove('colorblind');
});

describe('akvarelová sada', () => {
  it('defs obsahují papír, lavírování, tuš, natrhlý okraj a zrno s placeholdery id', () => {
    const defs = wcDefs({ width: 250, height: 350 });
    for (const id of ['pe', 'pp', 'we', 'wi', 'mb', 'ge', 'gp']) expect(defs).toContain(`id="%ID%-${id}"`);
    expect(defs).toContain('feDisplacementMap');
    expect(defs).toContain('feDiffuseLighting');
  });

  it('lavírování, tuš a malba mají filtr a barvu; po odstranění filtrů zůstane plochá kresba', () => {
    const w = wash('<rect width="10" height="10"/>', '#c8463a', { op: 0.5 });
    expect(w).toContain('filter="url(#%ID%-we)"');
    expect(w).toContain('fill="#c8463a"');
    expect(w).toContain('opacity="0.5"');
    expect(ink('<path d="M0 0L5 5"/>', 2)).toContain('stroke-width="2"');
    const p = paint('<circle r="4"/>', '#3d6ab0', 2);
    expect(p).toContain('url(#%ID%-pp)');
    expect(p).toContain('#3d6ab0');
    // Nebezpečná barva z dat se nepropustí.
    expect(wash('<rect/>', 'red;"><script>')).not.toContain('<script>');
  });

  it('sdílené ikony se číslují od začátku každého obrázku (stejný vstup = stejný markup)', () => {
    beginArt();
    const a = iconRef('beer-stein', { x: 0, y: 0, size: 50 });
    beginArt();
    const b = iconRef('beer-stein', { x: 0, y: 0, size: 50 });
    expect(a.def).toBe(b.def);
    expect(a.use).toContain('href="#%ID%-ic1"');
  });

  it('míchání barev', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#c8463a', '#c8463a', 0.3)).toBe('#c8463a');
  });
});

describe('stabilní markup (klíč bitmapové keše)', () => {
  it('obrázky obsahu i karty dávají při opakování stejný markup', () => {
    for (const [id, def] of Object.entries(REG.jokers).slice(0, 20)) {
      expect(artMarkupRaw('joker', def.art, { rarity: def.rarity }), id).toBe(
        artMarkupRaw('joker', def.art, { rarity: def.rarity }),
      );
    }
    expect(cardBackMarkupRaw()).toBe(cardBackMarkupRaw());
    expect(cardFaceMarkupRaw(card(12, 'H'), REG, 'classic')).toBe(
      cardFaceMarkupRaw(card(12, 'H'), REG, 'classic'),
    );
  });

  it('barevné schéma karet je zapečené v markupu (♦ červená klasicky, modrá pro barvoslepé)', () => {
    const classic = cardFaceMarkupRaw(card(7, 'D'), REG, 'classic');
    const four = cardFaceMarkupRaw(card(7, 'D'), REG, 'four');
    expect(classic).not.toBe(four);
    expect(classic).toContain('#c8463a');
    expect(four).toContain('#2f62b8');
    // Srdce jsou v obou schématech stejná.
    expect(cardFaceMarkupRaw(card(7, 'H'), REG, 'classic')).toBe(
      cardFaceMarkupRaw(card(7, 'H'), REG, 'four'),
    );
  });
});

describe('ručně kreslené scény', () => {
  it('každá scéna má tahy a vykreslí se; žolíci se scénou ji použijí místo ikony', () => {
    for (const name of Object.keys(SCENES)) {
      expect(hasScene(name)).toBe(true);
      expect(sceneMarkup(name).length, name).toBeGreaterThan(1000);
    }
    expect(hasScene('neexistuje')).toBe(false);
    expect(hasScene(undefined)).toBe(false);
    for (const id of ['gardener', 'golem', 'beer_mat']) {
      const scene = REG.jokers[id]?.art.scene;
      expect(hasScene(scene), id).toBe(true);
      const el = contentArt('joker', id);
      expect(el.getAttribute('data-scene'), id).toBe(scene);
      expect(el.querySelector('.art-icon'), id).toBeNull();
    }
  });

  it('Štamgast je vlastní kresba bez ikon z knihovny', () => {
    const m = stamgastMarkup();
    expect(m).toContain('class="stamgast"');
    expect(m).not.toContain('data-icon=');
    expect(m).not.toContain('%ID%');
  });
});

describe('bitmapová keš', () => {
  it('bez canvasu (happy-dom) vrací plný markup s filtry a unikátními id', () => {
    expect(rasterSupported()).toBe(false);
    const markup = cardBackMarkupRaw();
    const a = rasterSvg(markup);
    const b = rasterSvg(markup);
    expect(a.tagName.toLowerCase()).toBe('svg');
    expect(a.querySelector('[filter]')).not.toBeNull();
    expect(a.getAttribute('data-raster')).toBeNull();
    const idA = a.querySelector('[id]')?.getAttribute('id');
    expect(idA).toBeTruthy();
    expect(b.querySelector(`[id="${idA}"]`)).toBeNull();
    expect(a.outerHTML).not.toContain('%ID%');
  });

  it('předkreslení bez canvasu nic nedělá', () => {
    const before = rasterCacheSize();
    prewarmRaster([cardBackMarkupRaw()]);
    prewarmCardArt([card(2, 'S'), card(3, 'S')]);
    expect(rasterCacheSize()).toBe(before);
  });

  it('cardFaceElement respektuje schéma a popisek', () => {
    const el = cardFaceElement(card(9, 'C'), { scheme: 'four', label: 'Křížová devítka' });
    expect(el.getAttribute('aria-label')).toBe('Křížová devítka');
    expect(el.outerHTML).toContain('#2f8a4a');
  });
});

describe('komponenta karty a barvoslepý režim', () => {
  it('klíč vzhledu obsahuje schéma; přepnutí režimu karty na stránce překreslí', async () => {
    const el = createCardView(card(5, 'D'));
    document.body.append(el);
    expect(el.dataset.visual).toContain('|classic|');
    const before = el.querySelector('svg');
    document.documentElement.classList.add('colorblind');
    await new Promise((r) => setTimeout(r, 0)); // MutationObserver
    expect(el.dataset.visual).toContain('|four|');
    expect(el.querySelector('svg')).not.toBe(before);
    expect(el.querySelector('svg')?.outerHTML).toContain('#2f62b8');
    // Ruční obnovení je bezpečné i bez změny.
    refreshCardColors();
    expect(el.dataset.visual).toContain('|four|');
    el.remove();
  });

  it('galerie může schéma vynutit', () => {
    const el = createCardView(card(5, 'D'), { scheme: 'four' });
    expect(el.dataset.visual).toContain('|four|');
    expect(el.querySelector('svg')?.outerHTML).toContain('#2f62b8');
  });
});

// @vitest-environment happy-dom
/**
 * Styl „Sirkárna“ (retro tisk, src/ui/art/print.ts): tisková sada bez filtrů, inkousty, stabilní markup, scény,
 * barevná schémata karet a SVG vkládané přímo do stránky.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { registry } from '../../src/content';
import type { Card } from '../../src/engine/types';
import { artMarkupRaw, contentArt } from '../../src/ui/art/art';
import { cardBackMarkupRaw, cardFaceElement, cardFaceMarkupRaw } from '../../src/ui/art/cards';
import { loadIcons } from '../../src/ui/art/icons';
import {
  INKS,
  INK_WEIGHT,
  PR,
  beginArt,
  iconRef,
  ink,
  inkOf,
  mixColor,
  paint,
  printDefs,
  wash,
} from '../../src/ui/art/print';
import { hasScene, SCENES, sceneMarkup } from '../../src/ui/art/scenes';
import { stamgastMarkup } from '../../src/ui/art/stamgast';
import { svgElement } from '../../src/ui/art/svg';
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
  document.documentElement.classList.remove('colorblind');
});

describe('tisková sada', () => {
  it('defs mají papír s placeholderem id a žádné filtry', () => {
    const defs = printDefs({ width: 250, height: 350 });
    expect(defs).toContain('id="%ID%-pp"');
    expect(defs).not.toContain('<filter');
  });

  it('barvy se přitáhnou k nejbližšímu inkoustu; jiné zápisy beze změny', () => {
    for (const c of INKS) expect(inkOf(c)).toBe(c);
    expect(INKS).toContain(inkOf('#c8463a'));
    expect(inkOf('#c8463a')).toBe('#d7442c');
    expect(inkOf('#f2b48e')).toBe('#f2b38c');
    expect(inkOf('currentColor')).toBe('currentColor');
  });

  it('silná plocha = plný inkoust posunutý vedle linky, slabá = rastr; linka bez filtru', () => {
    beginArt();
    const solid = wash('<rect width="10" height="10"/>', '#c8463a', { op: 0.8 });
    expect(solid).toContain('fill="#d7442c"');
    expect(solid).toContain('transform="translate(2.2 1.6)"');
    const tint = wash('<rect/>', '#c8463a', { op: 0.2, dx: 0, dy: 0 });
    expect(tint).toContain('<pattern id="%ID%-htd7442c-');
    expect(tint).toContain('fill="url(#%ID%-htd7442c-');
    // Stejný rastr v jednom obrázku se definuje jen jednou.
    expect(wash('<rect/>', '#c8463a', { op: 0.2 })).not.toContain('<pattern');
    const line = ink('<path d="M0 0L5 5"/>', 2);
    expect(line).toContain(`stroke-width="${Math.round(2 * INK_WEIGHT * 100) / 100}"`);
    expect(line).toContain(`stroke="${PR.ink}"`);
    expect(line).not.toContain('filter');
    // Barevné ozdobné tahy a přesná tloušťka (`weight: 1`) zůstávají bez váhy.
    expect(ink('<path/>', 2, { color: '#3d6ab0' })).toBe(
      '<g fill="none" stroke="#3d6ab0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path/></g>',
    );
    expect(ink('<path/>', 6.6, { weight: 1 })).toContain('stroke-width="6.6"');
    const p = paint('<circle r="4"/>', '#3d6ab0', 2);
    expect(p).toContain(`fill="${PR.paper}"`);
    expect(p).toContain(inkOf('#3d6ab0'));
    // Nebezpečná barva z dat se nepropustí.
    expect(wash('<rect/>', 'red;"><script>')).not.toContain('<script>');
  });

  it('sdílené ikony a rastry se číslují od začátku každého obrázku (stejný vstup = stejný markup)', () => {
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

  it('žádný obrázek nemá filtry ani prolínání (vkládá se přímo jako SVG)', () => {
    const all = [
      ...Object.values(REG.jokers).map((d) => artMarkupRaw('joker', d.art, { rarity: d.rarity, title: 'X' })),
      ...Object.values(REG.consumables).map((d) =>
        artMarkupRaw('consumable', d.art, { consumableKind: d.kind }),
      ),
      ...Object.values(REG.bosses).map((d) => artMarkupRaw('boss', d.art, { color: d.color })),
      cardBackMarkupRaw(),
      cardFaceMarkupRaw(card(13, 'H'), REG, 'classic'),
      stamgastMarkup(),
    ];
    for (const m of all) {
      expect(m).not.toContain('filter=');
      expect(m).not.toContain('mix-blend-mode');
    }
  });

  it('žolík má jméno na štítku (verzálky, dlouhé se stáhne)', () => {
    const def = REG.jokers.gardener!;
    const m = artMarkupRaw('joker', def.art, { rarity: def.rarity, title: 'Zahrádkář Venca' });
    expect(m).toContain('class="art-title"');
    expect(m).toContain('ZAHRÁDKÁŘ VENCA');
    expect(m).toContain('textLength=');
    const el = contentArt('joker', 'gardener');
    expect(el.querySelector('.art-title')?.textContent).toBe('ZAHRÁDKÁŘ VENCA');
  });
});

describe('stabilní markup', () => {
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
    expect(classic).toContain('#d7442c');
    expect(four).toContain('#2f5fa8');
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
    expect(Object.values(REG.jokers).filter((j) => j.art.scene).length).toBeGreaterThanOrEqual(15);
    for (const id of Object.keys(REG.jokers).filter((j) => REG.jokers[j]?.art.scene)) {
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

describe('SVG ve stránce', () => {
  it('každá instance dostane vlastní prefix id', () => {
    const markup = cardBackMarkupRaw();
    const a = svgElement(markup);
    const b = svgElement(markup);
    expect(a.tagName.toLowerCase()).toBe('svg');
    const idA = a.querySelector('[id]')?.getAttribute('id');
    expect(idA).toBeTruthy();
    expect(b.querySelector(`[id="${idA}"]`)).toBeNull();
    expect(a.outerHTML).not.toContain('%ID%');
  });

  it('cardFaceElement respektuje schéma a popisek', () => {
    const el = cardFaceElement(card(9, 'C'), { scheme: 'four', label: 'Křížová devítka' });
    expect(el.getAttribute('aria-label')).toBe('Křížová devítka');
    expect(el.outerHTML).toContain('#2f6b3a');
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
    expect(el.querySelector('svg')?.outerHTML).toContain('#2f5fa8');
    // Ruční obnovení je bezpečné i bez změny.
    refreshCardColors();
    expect(el.dataset.visual).toContain('|four|');
    el.remove();
  });

  it('galerie může schéma vynutit', () => {
    const el = createCardView(card(5, 'D'), { scheme: 'four' });
    expect(el.dataset.visual).toContain('|four|');
    expect(el.querySelector('svg')?.outerHTML).toContain('#2f5fa8');
  });
});

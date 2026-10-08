/**
 * Žolíci patche 1.0.2 „Pouť a volby“ (src/content/jokers/extra.ts, docs/DECISIONS.md 2026-10-07): přesná čísla přes
 * skutečné skórování, kombo Fotografa z pouti s opakováním (×mult při každé aktivaci, výjimka ze stropu), peníze
 * Zlatníka a Žebráka, hraniční případy (debuff, kamenná karta, „všechny karty jsou figury“), texty a `ArtSpec`.
 */
import { describe, expect, it } from 'vitest';
import { isIconName } from '../../src/assets/icons/index';
import { buildRegistry } from '../../src/content/index';
import { EXTRA_JOKERS } from '../../src/content/jokers/extra';
import { EPIC2_JOKERS } from '../../src/content/jokers/epic2';
import { RARE2_JOKERS } from '../../src/content/jokers/rare2';
import type { ContentRegistry, JokerDef } from '../../src/engine/content-types';
import type { Game } from '../../src/engine/run/game';
import type { ScoreResult } from '../../src/engine/types';
import { hasKey, t } from '../../src/i18n/cs';
import { NBSP } from '../../src/i18n/format';
import { hasScene } from '../../src/ui/art/scenes';
import {
  joker as testJoker,
  makeGame,
  makeRegistry,
  play,
  setupRound,
  type JokerSpec,
} from './fixtures/registry';

// ─────────────────────────── Pomocníci ───────────────────────────

/** Testovací žolík „všechny karty jsou figury“ (jako Dvorní malíř). */
const ALL_FACES = testJoker('all_faces', { hooks: { passive: () => ({ allFaces: true }) } });
/** Testovací žolík s ×2 mult za každou skórující kartu (bez výjimky ze stropu ×mult). */
const PLAIN_X2 = testJoker('plain_x2', { hooks: { onCardScored: () => ({ xmult: 2 }) } });

const reg: ContentRegistry = makeRegistry({ jokers: [...EXTRA_JOKERS, ALL_FACES, PLAIN_X2] });
/** Skuteční kopírující žolíci (Archivář, Kopírák). */
const COPIERS = [...EPIC2_JOKERS, ...RARE2_JOKERS].filter(
  (j) => j.id === 'archivist' || j.id === 'carbon_paper',
);

const IDS = [
  'fair_photographer',
  'recount_committee',
  'football_fan',
  'crown_goldsmith',
  'beggar',
  'building_savings',
];

function def(id: string): JokerDef {
  const d = EXTRA_JOKERS.find((j) => j.id === id);
  if (!d) throw new Error(`Chybí žolík ${id}`);
  return d;
}

/** Hra v Malé útratě s danými žolíky a nedosažitelným cílem; `chance` = jistota (true) / nemožnost (false). */
function roundGame(jokers: (string | JokerSpec)[] = [], chance?: boolean): Game {
  const game = makeGame({ registry: reg, jokers, round: true });
  game._core.state.round!.target = 1e12;
  if (chance !== undefined) game._core.api.addPermanentModifier({ probabilityMult: chance ? 100 : 0 });
  return game;
}

function playHand(game: Game, hand: string): ScoreResult {
  return play(game, setupRound(game, hand)).result;
}

const score = (jokers: string[], hand: string): [number, number, number] => {
  const r = playHand(roundGame(jokers), hand);
  return [r.chips, r.mult, r.score];
};

const money = (jokers: string[], hand: string, chance?: boolean): number =>
  playHand(roundGame(jokers, chance), hand).moneyEarned;

// ─────────────────────────── Definice ───────────────────────────

describe('žolíci patche 1.0.2 – definice', () => {
  it('6 žolíků: 4 běžní, Fotbalový fanoušek a Stavební spoření vzácní; čísla v params', () => {
    expect(EXTRA_JOKERS.map((j) => j.id)).toEqual(IDS);
    expect(Object.fromEntries(EXTRA_JOKERS.map((j) => [j.id, [j.rarity, j.cost, j.params]]))).toEqual({
      fair_photographer: ['common', 5, { xmult: 2 }],
      recount_committee: ['common', 5, { retriggers: 2 }],
      football_fan: ['rare', 6, { retriggers: 1 }],
      crown_goldsmith: ['common', 5, { money: 1 }],
      beggar: ['common', 4, { chance: 1, odds: 2, money: 1 }],
      building_savings: ['rare', 6, { money: 5 }],
    });
  });

  it('jsou ve skutečném registru obsahu (odemčení od začátku), texty a obrázky existují', () => {
    const full = buildRegistry();
    for (const j of EXTRA_JOKERS) {
      expect(full.jokers[j.id], j.id).toBe(j);
      expect(j.unlock, j.id).toBeUndefined();
      for (const key of ['name', 'desc', 'flavor']) expect(hasKey(`jokers.${j.id}.${key}`), j.id).toBe(true);
      expect(isIconName(j.art.icon), j.id).toBe(true);
      expect(isIconName(j.art.prop!), j.id).toBe(true);
      if (j.art.scene) expect(hasScene(j.art.scene), j.id).toBe(true);
    }
  });

  it('jména a popisky (Zlatník je nový, starý pozlacovací žolík se jmenuje Pozlacovač)', () => {
    const desc = (id: string) => t(`jokers.${id}.desc`, def(id).params).replaceAll(NBSP, ' ');
    expect(IDS.map((id) => t(`jokers.${id}.name`).replaceAll(NBSP, ' '))).toEqual([
      'Fotograf z pouti',
      'Volební komise',
      'Fotbalový fanoušek',
      'Zlatník',
      'Žebrák',
      'Stavební spoření',
    ]);
    expect(t('jokers.goldsmith.name')).toBe('Pozlacovač');
    expect(desc('crown_goldsmith')).toBe('Každá skórující figura dá 1 Kč.');
    expect(desc('beggar')).toBe('Každá skórující karta bez figury má šanci 1 ze 2, že dá 1 Kč.');
    expect(desc('building_savings')).toBe('Strop úroku je o 5 Kč vyšší.');
  });
});

// ─────────────────────────── Fotograf z pouti ───────────────────────────

describe('Fotograf z pouti (fair_photographer)', () => {
  it('první skórující figura ×2 mult, další figury ani nefigury nic', () => {
    // Dvojice králů: 12 + 10 + 10 = 32 čipů, 2 × 2 = 4 mult.
    expect(score(['fair_photographer'], 'KS KH')).toEqual([32, 4, 128]);
    expect(score(['fair_photographer'], '2S 2H')).toEqual([16, 2, 32]);
    // Dvě dvojice s figurou až na konci: násobí se jen jednou.
    expect(score(['fair_photographer'], '5S 5H QD QC')[1]).toBe(4);
  });

  it('debuffnutá figura se přeskočí (násobí další), „všechny karty jsou figury“ násobí první kartu', () => {
    expect(score(['fair_photographer'], 'KS! KH')).toEqual([22, 4, 88]);
    expect(score(['all_faces', 'fair_photographer'], '9S 9H')[1]).toBe(4);
  });

  it('s červenou pečetí násobí při obou aktivacích', () => {
    // KS 2× (12 + 20 + 10 = 42 čipů), mult 2 × 2 × 2 = 8.
    expect(score(['fair_photographer'], 'KS@red KH')).toEqual([42, 8, 336]);
  });

  it('kombo s Volební komisí: 3 aktivace první figury = ×8 (nad strop ×mult opakování)', () => {
    // KS 3× (12 + 30 + 10 = 52 čipů), mult 2 × 2³ = 16.
    expect(score(['fair_photographer', 'recount_committee'], 'KS KH')).toEqual([52, 16, 832]);
    // Obyčejný ×mult na kartu se nad 2 aktivace nenásobí (strop platí dál): 2 × 2 × 2 (KS 2×) × 2 (KH).
    expect(score(['plain_x2', 'recount_committee'], 'KS KH')[1]).toBe(16);
  });

  it('kombo s Fotbalovým fanouškem a Komisí: 4 aktivace = ×16', () => {
    // Fanoušek: KS i KH skórují 2× (12 + 20 + 20 = 52), Fotograf ×2 × 2.
    expect(score(['fair_photographer', 'football_fan'], 'KS KH')).toEqual([52, 8, 416]);
    // + Komise: KS 4× (12 + 40 + 20 = 72), mult 2 × 2⁴ = 32.
    expect(score(['fair_photographer', 'recount_committee', 'football_fan'], 'KS KH')).toEqual([
      72, 32, 2304,
    ]);
  });
});

// ─────────────────────────── Volební komise ───────────────────────────

describe('Volební komise (recount_committee)', () => {
  it('první skórující karta skóruje ještě 2×', () => {
    expect(score(['recount_committee'], 'KS KH')).toEqual([52, 2, 104]);
    // Vysoká karta: skóruje jen devítka (6 + 3 × 9).
    expect(score(['recount_committee'], '5S 9H')).toEqual([33, 1, 33]);
  });

  it('debuffnutá karta se přeskočí — opakuje se první karta, která skóruje', () => {
    // 12 + 0 + 3 × 10.
    expect(score(['recount_committee'], 'KS! KH')).toEqual([42, 2, 84]);
  });

  it('dvě komise = první karta skóruje ještě 4×', () => {
    expect(score(['recount_committee', 'recount_committee'], 'KS KH')[0]).toBe(12 + 50 + 10);
  });
});

// ─────────────────────────── Fotbalový fanoušek ───────────────────────────

describe('Fotbalový fanoušek (football_fan)', () => {
  it('každá skórující figura skóruje ještě 1×', () => {
    expect(score(['football_fan'], 'KS KH')).toEqual([52, 2, 104]);
    // Dvě dvojice figur: 24 + 2 × 40.
    expect(score(['football_fan'], 'JS JH QD QC')[0]).toBe(104);
  });

  it('nefigury, eso ani debuffnutá figura ne; „všechny karty jsou figury“ ano', () => {
    expect(score(['football_fan'], '9S 9H')[0]).toBe(30);
    expect(score(['football_fan'], 'AS AH')[0]).toBe(34);
    expect(score(['football_fan'], 'KS! KH')[0]).toBe(12 + 20);
    expect(score(['all_faces', 'football_fan'], '9S 9H')[0]).toBe(12 + 36);
  });
});

// ─────────────────────────── Zlatník ───────────────────────────

describe('Zlatník (crown_goldsmith)', () => {
  it('1 Kč za každou skórující figuru, za každou její aktivaci', () => {
    expect(money(['crown_goldsmith'], 'KS KH')).toBe(2);
    expect(money(['crown_goldsmith'], 'JS JH QD QC')).toBe(4);
    expect(money(['crown_goldsmith', 'football_fan'], 'KS KH')).toBe(4);
    expect(money(['crown_goldsmith'], 'KS@red KH')).toBe(3);
  });

  it('nefigury, neskórující ani debuffnutá figura nic; „všechny karty jsou figury“ ano', () => {
    expect(money(['crown_goldsmith'], '9S 9H')).toBe(0);
    expect(money(['crown_goldsmith'], '9S 9H KD')).toBe(0);
    expect(money(['crown_goldsmith'], 'KS! KH')).toBe(1);
    expect(money(['all_faces', 'crown_goldsmith'], '9S 9H')).toBe(2);
  });

  it('peníze se připíšou hned po ruce', () => {
    const game = roundGame(['crown_goldsmith']);
    const before = game.state.money;
    playHand(game, 'QS QH');
    expect(game.state.money).toBe(before + 2);
  });
});

// ─────────────────────────── Žebrák ───────────────────────────

describe('Žebrák (beggar)', () => {
  it('se štěstím 1 Kč za každou skórující kartu bez figury, bez štěstí nic', () => {
    expect(money(['beggar'], '9S 9H', true)).toBe(2);
    expect(money(['beggar'], '2H 5H 7H 9H JH', true)).toBe(4);
    expect(money(['beggar'], '9S 9H', false)).toBe(0);
  });

  it('figury, kamenná ani debuffnutá karta nic; eso ano', () => {
    expect(money(['beggar'], 'KS KH', true)).toBe(0);
    expect(money(['beggar'], '9S 9H 2C:stone', true)).toBe(2);
    expect(money(['beggar'], '9S! 9H', true)).toBe(1);
    expect(money(['beggar'], 'AS AH', true)).toBe(2);
  });

  it('se šancí 1 z 2 dá přes mnoho rukou zhruba polovinu (deterministicky podle seedu)', () => {
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const game = makeGame({ registry: reg, jokers: ['beggar'], round: true, seed: `BEGGAR-${i}` });
      game._core.state.round!.target = 1e12;
      total += playHand(game, '2H 5H 7H 9H 10H').moneyEarned;
    }
    // 200 hodů, očekávání 100.
    expect(total).toBeGreaterThan(70);
    expect(total).toBeLessThan(130);
    const again = makeGame({ registry: reg, jokers: ['beggar'], round: true, seed: 'BEGGAR-0' });
    again._core.state.round!.target = 1e12;
    const first = makeGame({ registry: reg, jokers: ['beggar'], round: true, seed: 'BEGGAR-0' });
    first._core.state.round!.target = 1e12;
    expect(playHand(again, '2H 5H 7H 9H 10H').moneyEarned).toBe(
      playHand(first, '2H 5H 7H 9H 10H').moneyEarned,
    );
  });
});

// ─────────────────────────── Stavební spoření ───────────────────────────

describe('Stavební spoření (building_savings)', () => {
  /** Vyhraje kolo jednou kartou s `money` Kč v kapse a vrátí úrok z rozpisu odměn. */
  function interestWith(jokers: string[], money: number): number {
    const game = roundGame(jokers);
    game._core.state.money = money;
    game._core.state.round!.target = 1;
    play(game, setupRound(game, 'KS'));
    expect(game.state.phase).toBe('round_end');
    return game.state.rewards!.interest;
  }

  it('strop úroku 5 → 10 Kč; pod stropem se nic nemění', () => {
    expect(interestWith([], 60)).toBe(5);
    expect(interestWith(['building_savings'], 60)).toBe(10);
    expect(interestWith(['building_savings'], 37)).toBe(7);
    expect(interestWith(['building_savings'], 12)).toBe(interestWith([], 12));
  });

  it('nejde kopírovat; když zmizí, strop se vrátí', () => {
    expect(def('building_savings').copyable).toBe(false);
    const game = roundGame(['building_savings']);
    expect(game.modifiers().interestCap).toBe(10);
    game._core.api.destroyJoker(game.state.jokers[0]!.uid, 'test');
    expect(game.modifiers().interestCap).toBe(5);
  });
});

describe('Fotograf z pouti – strop', () => {
  it('nejde kopírovat: Archivář ani Kopírák vedle něj nepřidají další ×2 za aktivaci', () => {
    const full = makeRegistry({ jokers: [...EXTRA_JOKERS, ...COPIERS] });
    const game = (jokers: string[]) => {
      const g = makeGame({ registry: full, jokers, round: true });
      g._core.state.round!.target = 1e12;
      return g;
    };
    const alone = playHand(game(['fair_photographer']), 'KS@red KH');
    expect(def('fair_photographer').copyable).toBe(false);
    // Bez jiného cíle kopie nic nepřidají (Archivář kopíruje souseda vlevo, Kopírák posledního běžného/vzácného).
    expect(playHand(game(['fair_photographer', 'archivist']), 'KS@red KH').mult).toBe(alone.mult);
    expect(playHand(game(['fair_photographer', 'carbon_paper']), 'KS@red KH').mult).toBe(alone.mult);
  });

  it('nejvýš ×1024 na jedné figuře (10 aktivací): s Komisí, Fanouškem a červenou pečetí ×32', () => {
    expect(score(['fair_photographer', 'recount_committee', 'football_fan'], 'KS@red')[1]).toBe(32);
  });
});

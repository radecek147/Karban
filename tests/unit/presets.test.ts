/**
 * Ukázkové sestavy žolíků z odkazu `?sestava=` (src/content/presets.ts) a `NewRunOptions.presetJokers` v enginu.
 */
import { describe, expect, it } from 'vitest';
import { registry } from '../../src/content';
import { JOKER_PRESETS, jokerPreset } from '../../src/content/presets';
import { Game } from '../../src/engine';

const REG = registry();

describe('presetJokers v enginu', () => {
  it('žolíci jsou ve slotech v zadaném pořadí, bez nálepek; onAcquire se volá (Napodobitel duhový)', () => {
    const ids = ['fair_photographer', 'lucky_seven', 'fair_magician', 'recount_committee', 'impersonator'];
    const g = Game.newRun({ seed: 'SESTAVA1', deckId: 'pub', stake: 1, presetJokers: ids }, REG);
    expect(g.state.jokers.map((j) => j.defId)).toEqual(ids);
    expect(g.state.jokers.every((j) => j.stickers.length === 0)).toBe(true);
    expect(g.state.jokers.find((j) => j.defId === 'impersonator')?.edition).toBe('poly');
    expect(g.state.jokers.find((j) => j.defId === 'fair_photographer')?.edition).toBeNull();
    expect(g.state.phase).toBe('blind_select');
    expect(new Set(g.state.jokers.map((j) => j.uid)).size).toBe(ids.length);
  });

  it('neznámá id přeskočí, limit slotů neplatí', () => {
    const ids = [
      'jukebox',
      'nic_takoveho',
      'echo',
      'football_fan',
      'recount_committee',
      'beggar',
      'goldsmith',
    ];
    const g = Game.newRun({ seed: 'SESTAVA2', deckId: 'pub', stake: 1, presetJokers: ids }, REG);
    expect(g.state.jokers.map((j) => j.defId)).toEqual(ids.filter((id) => id !== 'nic_takoveho'));
  });

  it('bez sestavy se run nemění (stejný seed = stejný stav)', () => {
    const a = Game.newRun({ seed: 'SESTAVA3', deckId: 'pub', stake: 1 }, REG);
    const b = Game.newRun({ seed: 'SESTAVA3', deckId: 'pub', stake: 1, presetJokers: [] }, REG);
    expect(b.state).toEqual(a.state);
  });

  it('žolíci sestavy jdou po žolících výzvy', () => {
    const ch = Object.values(REG.challenges).find((c) => (c.startingJokers ?? []).length > 0)!;
    const g = Game.newRun(
      { seed: 'SESTAVA4', deckId: 'pub', stake: 1, challengeId: ch.id, presetJokers: ['jukebox'] },
      REG,
    );
    const defIds = g.state.jokers.map((j) => j.defId);
    expect(defIds.at(-1)).toBe('jukebox');
    expect(defIds.slice(0, ch.startingJokers!.length)).toEqual(ch.startingJokers!.map((j) => j.defId));
  });
});

describe('ukázkové sestavy', () => {
  it('všechny sestavy mají známé, neopakované žolíky a vejdou se do 5 slotů', () => {
    expect(JOKER_PRESETS.length).toBeGreaterThan(0);
    expect(new Set(JOKER_PRESETS.map((p) => p.id)).size).toBe(JOKER_PRESETS.length);
    for (const p of JOKER_PRESETS) {
      expect(p.id).toMatch(/^[a-z-]+$/);
      expect(p.jokers.length).toBeGreaterThan(0);
      expect(p.jokers.length).toBeLessThanOrEqual(5);
      expect(new Set(p.jokers).size).toBe(p.jokers.length);
      for (const id of p.jokers) expect(REG.jokers[id], `${p.id}: ${id}`).toBeDefined();
    }
  });

  it('nejsilnější sestava odpovídá laboratoři kombinací (docs/SYNERGIE.md)', () => {
    expect(jokerPreset('nejsilnejsi')?.jokers).toEqual([
      'fair_photographer',
      'lucky_seven',
      'fair_magician',
      'recount_committee',
      'impersonator',
    ]);
  });

  it('hledání podle id: velikost písmen a mezery nevadí, neznámé nebo prázdné = undefined', () => {
    expect(jokerPreset(' Nejsilnejsi ')?.id).toBe('nejsilnejsi');
    expect(jokerPreset('BEZ-FOTOGRAFA')?.id).toBe('bez-fotografa');
    expect(jokerPreset('photochad')).toBeUndefined();
    expect(jokerPreset('')).toBeUndefined();
    expect(jokerPreset(null)).toBeUndefined();
  });

  it('Napodobitel v nejsilnější sestavě kopíruje Šťastnou sedmičku', () => {
    const g = Game.newRun(
      { seed: 'SESTAVA5', deckId: 'pub', stake: 1, presetJokers: jokerPreset('nejsilnejsi')!.jokers },
      REG,
    );
    expect(g.dispatch({ type: 'selectBlind' }).ok).toBe(true);
    const imp = g.state.jokers.find((j) => j.defId === 'impersonator')!;
    const hand = g.state.round!.hand.slice(0, 1);
    expect(g.dispatch({ type: 'play', cardIds: hand }).ok).toBe(true);
    const target = g.state.jokers.find((j) => j.uid === imp.state.target);
    expect(target?.defId).toBe('lucky_seven');
  });
});

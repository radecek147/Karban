/**
 * Údaje pro animaci efektů (šťáva 2, docs/DECISIONS.md 2026-10-04): původ kroku karty (`ScoreStep.origin`),
 * popis změny karty v `cardChanged` (`change`), okamžik změny během skórování (`scoreStep` u `cardChanged`
 * a `handLeveled`), zdroj kopie (`cardAdded.copyOf`) a efekty karet v ruce na konci kola (`roundRewards.heldCards`).
 * Všechno jsou nepovinné údaje jen pro UI — pravidla, skóre ani stav se nemění (simulace dává stejné výsledky).
 */
import { describe, expect, it } from 'vitest';
import { registry } from '../../src/content';
import { HAND_TYPE_DEFS } from '../../src/content/hands';
import { Game, type GameEvent, type RunState, type ScoreStep } from '../../src/engine';
import { joker, makeGame, makeRegistry, play, setupRound, winNextHand } from './fixtures/registry';

/** [zdroj, id karty / žolíka, původ, co krok dal] — čitelný přehled kroků. */
function origins(steps: readonly ScoreStep[]): [string, number | undefined, string | undefined, string][] {
  return steps.map((s) => {
    const what = s.chips
      ? `+${s.chips}`
      : s.mult
        ? `+${s.mult}m`
        : s.xmult
          ? `x${s.xmult}`
          : s.money
            ? `${s.money}Kc`
            : (s.message ?? '');
    return [s.source, s.source === 'joker' ? s.jokerUid : s.cardId, s.origin, what];
  });
}

function eventsOf<T extends GameEvent['type']>(events: readonly GameEvent[], type: T) {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

describe('ScoreStep.origin — původ kroku karty', () => {
  it('pracovní příklad DESIGN 3.2: hodnota, vylepšení, edice, pečeť (opakování), ocel v ruce, edice žolíků', () => {
    const game = makeGame({
      registry: { ...makeRegistry(), handTypes: HAND_TYPE_DEFS },
      jokers: [
        { id: 'heart_fan', edition: 'holo' },
        { id: 'coaster' },
        { id: 'late_train', edition: 'poly' },
      ],
    });
    game._core.api.addPermanentModifier({ probabilityMult: 0 });
    const [kh, ks, kd, c5, h5, qs] = setupRound(
      game,
      'KH:mult KS~foil KD 5C:bonus 5H:glass@red QS:steel QC 7D',
      {
        levels: { full_house: 2 },
      },
    );
    const [fan, coaster, train] = game.state.jokers.map((j) => j.uid);
    const { result } = play(game, [kh!, ks!, kd!, c5!, h5!]);
    expect(origins(result.steps)).toEqual([
      ['hand', undefined, undefined, '+123'],
      ['card', kh!.id, 'rank', '+10'],
      ['card', kh!.id, 'enhancement', '+5m'],
      ['joker', fan, undefined, '+5'],
      ['joker', fan, undefined, '+2m'],
      ['card', ks!.id, 'rank', '+10'],
      ['card', ks!.id, 'edition', '+50'],
      ['card', kd!.id, 'rank', '+10'],
      ['card', c5!.id, 'rank', '+5'],
      ['card', c5!.id, 'enhancement', '+25'],
      ['card', h5!.id, 'rank', '+5'],
      ['card', h5!.id, 'enhancement', 'x2'],
      ['joker', fan, undefined, '+5'],
      ['joker', fan, undefined, '+2m'],
      // Opakování z červené pečeti: „Znovu!“ patří pečeti, další kroky zase svým zdrojům.
      ['card', h5!.id, 'seal', 'score.again'],
      ['card', h5!.id, 'rank', '+5'],
      ['card', h5!.id, 'enhancement', 'x2'],
      ['joker', fan, undefined, '+5'],
      ['joker', fan, undefined, '+2m'],
      ['held', qs!.id, 'enhancement', 'x1.5'],
      ['joker', fan, 'edition', '+10m'],
      ['joker', coaster, undefined, '+10'],
      ['joker', coaster, undefined, '+2m'],
      ['joker', train, undefined, 'x1.5'],
      ['joker', train, 'edition', 'x1.5'],
    ]);
  });

  it('zlatá pečeť: peníze s původem pečeť; Ohmataná po ruce s původem vylepšení', () => {
    const game = makeGame({ round: true });
    const [a, b] = setupRound(game, 'KS@gold KH:worn');
    const { result } = play(game, [a!, b!]);
    expect(result.steps.find((s) => s.money)).toMatchObject({ cardId: a!.id, origin: 'seal', money: 2 });
    expect(result.steps.at(-1)).toMatchObject({
      cardId: b!.id,
      origin: 'enhancement',
      message: 'score.worn',
    });
  });

  it('opakování od žolíka (ne od pečeti) původ nemá; debuffnutá karta také ne', () => {
    const game = makeGame({ round: true, jokers: ['face_echo'] });
    const [k] = setupRound(game, 'KS');
    const { result } = play(game, [k!]);
    const again = result.steps.filter((s) => s.message === 'score.again');
    expect(again).toHaveLength(1);
    expect(again[0]!.origin).toBeUndefined();
  });

  it('původ nemění čísla: skóre je stejné jako bez něj (jen údaj pro UI)', () => {
    const game = makeGame({ round: true });
    const [a, b, c] = setupRound(game, 'KS@gold KH:bonus KD:mult~holo');
    const { result } = play(game, [a!, b!, c!]);
    const chips = result.steps.reduce((n, s) => n + (s.chips ?? 0), 0);
    expect(chips).toBe(result.chips);
    expect(result.steps.every((s) => s.source === 'hand' || s.origin !== undefined)).toBe(true);
  });
});

describe('cardChanged — popis změny a okamžik během skórování', () => {
  it('modifyCard zapíše jen opravdu změněná pole; debuff od šéfa se přidá, když se změní', () => {
    const game = makeGame({ round: true });
    const core = game._core;
    const [c] = setupRound(game, '9S:bonus');
    core.takeEvents();
    core.api.modifyCard(c!.id, { rank: 10, enhancement: 'bonus', seal: 'gold' });
    expect(core.takeEvents()).toEqual([
      {
        type: 'cardChanged',
        cardId: c!.id,
        change: { rank: { from: 9, to: 10 }, seal: { from: null, to: 'gold' } },
      },
    ]);
  });

  it('otočení lícem dolů a očista (Česnek na krk) popíšou faceDown / debuffed', () => {
    const game = makeGame({ round: true });
    const core = game._core;
    const [c] = setupRound(game, '9S');
    core.takeEvents();
    core.api.setCardFaceDown(c!.id, true);
    expect(core.takeEvents()).toEqual([
      { type: 'cardChanged', cardId: c!.id, change: { faceDown: { from: false, to: true } } },
    ]);
    c!.debuffed = true;
    core.api.cleanseCard(c!.id);
    expect(core.takeEvents()).toEqual([
      {
        type: 'cardChanged',
        cardId: c!.id,
        change: { debuffed: { from: true, to: false }, faceDown: { from: true, to: false } },
      },
    ]);
  });

  it('změna před skórováním (beforeScoring) má scoreStep 0, po skórování (afterHandScored) počet kroků', () => {
    const reg = makeRegistry({
      jokers: [
        joker('stamper', {
          hooks: {
            beforeScoring: (ctx) => {
              ctx.api.modifyCard(ctx.scoring[0]!.id, { seal: 'gold' });
              return null;
            },
          },
        }),
        joker('painter', {
          hooks: {
            afterHandScored: (ctx) => ctx.api.modifyCard(ctx.scoring[0]!.id, { rank: 13 }),
          },
        }),
      ],
    });
    const game = makeGame({ registry: reg, jokers: ['stamper', 'painter'], round: true });
    const [a] = setupRound(game, '9S');
    const { result, events } = play(game, [a!]);
    const changes = eventsOf(events, 'cardChanged');
    expect(changes.map((e) => [e.scoreStep, e.change])).toEqual([
      [0, { seal: { from: null, to: 'gold' } }],
      [result.steps.length, { rank: { from: 9, to: 13 } }],
    ]);
    // Zlatá pečeť ze změny před skórováním platí hned (krok s penězi).
    expect(result.steps.some((s) => s.money === 2 && s.origin === 'seal')).toBe(true);
  });

  it('mimo skórování (spotřebka) scoreStep chybí', () => {
    const REG = registry();
    const g = Game.newRun({ deckId: 'pub', stake: 1, seed: 'ORIGIN01' }, REG);
    g.dispatch({ type: 'selectBlind' });
    const s = g.state as RunState;
    s.consumables = [{ uid: 9001, defId: 'notarized', edition: null }];
    const target = s.round!.hand[0]!;
    s.deck.find((c) => c.id === target)!.seal = null;
    const res = g.dispatch({ type: 'useConsumable', uid: 9001, targetIds: [target] });
    expect(res.ok).toBe(true);
    const changed = res.ok ? eventsOf(res.events, 'cardChanged') : [];
    expect(changed).toEqual([
      { type: 'cardChanged', cardId: target, change: { seal: { from: null, to: 'gold' } } },
    ]);
  });

  it('handLeveled: scoreStep jen během skórování (pranostika ho nemá)', () => {
    const game = makeGame({ round: true, jokers: ['leveler'] });
    const [a, b] = setupRound(game, '9S 9H');
    const { events } = play(game, [a!, b!]);
    expect(eventsOf(events, 'handLeveled')).toEqual([
      { type: 'handLeveled', hand: 'pair', level: 2, delta: 1, scoreStep: 0 },
    ]);
    game._core.takeEvents();
    game._core.api.levelUpHand('pair', 1);
    expect(game._core.takeEvents()).toEqual([{ type: 'handLeveled', hand: 'pair', level: 3, delta: 1 }]);
  });
});

describe('cardAdded.copyOf a roundRewards.heldCards', () => {
  it('copyCard i Jabloň (kopie do ruky) řeknou, ze které karty je kopie', () => {
    const game = makeGame({ round: true });
    const core = game._core;
    const [src] = setupRound(game, 'QH:glass');
    core.takeEvents();
    const copy = core.api.copyCard(src!.id, { toHand: true })!;
    expect(core.takeEvents()).toContainEqual({
      type: 'cardAdded',
      cardId: copy.id,
      source: 'copy',
      copyOf: src!.id,
    });

    const REG = registry();
    const g = Game.newRun({ deckId: 'pub', stake: 1, seed: 'ORIGIN02' }, REG);
    g.dispatch({ type: 'selectBlind' });
    const s = g.state as RunState;
    s.consumables = [{ uid: 9002, defId: 'apple_tree', edition: null }];
    const target = s.round!.hand[2]!;
    const res = g.dispatch({ type: 'useConsumable', uid: 9002, targetIds: [target] });
    expect(res.ok).toBe(true);
    const added = res.ok ? eventsOf(res.events, 'cardAdded') : [];
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ source: 'rada', copyOf: target });
  });

  it('zlatá karta a modrá pečeť v ruce: událost roundRewards nese, co která karta udělala; stav ne', () => {
    const game = makeGame({ round: true });
    const [a, gold, blue, plain] = setupRound(game, 'AS KH:gold QD@blue 2C');
    winNextHand(game);
    const { events } = play(game, [a!]);
    const rewards = eventsOf(events, 'roundRewards')[0]!;
    const created = eventsOf(events, 'consumableAdded').map((e) => e.uid);
    expect(created).toHaveLength(1);
    expect(rewards.heldCards).toEqual([
      { cardId: gold!.id, money: 4 },
      { cardId: blue!.id, consumables: created },
    ]);
    expect(rewards.heldCards!.some((h) => h.cardId === plain!.id)).toBe(false);
    // Rozpis ve stavu zůstává beze změny (bez `heldCards`).
    expect(game.state.rewards).not.toHaveProperty('heldCards');
    expect(game.state.rewards!.extra).toContainEqual({ source: 'held', amount: 4 });
  });

  it('bez efektů karet v ruce událost heldCards nemá', () => {
    const game = makeGame({ round: true });
    const [a] = setupRound(game, 'AS 2C 3D');
    winNextHand(game);
    const { events } = play(game, [a!]);
    expect(eventsOf(events, 'roundRewards')[0]).not.toHaveProperty('heldCards');
  });
});

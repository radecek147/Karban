// @vitest-environment happy-dom
/**
 * Šťáva 2 (docs/DECISIONS.md 2026-10-04): viditelné efekty karet a spotřebek v presenteru — velký nápis peněz se
 * zlatou pečetí a třída spuštění na kartě, zvýraznění pečeti, bublina se změnou karty po babské radě (otočení,
 * překreslení až uprostřed animace — do té doby podržený vzhled), nová úroveň kombinace v levém panelu, texty změn
 * karet, délky kroků a skládání nápisů nad sebe. Bez animací nic z toho nevzniká a karta se jen překreslí.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registry } from '../../src/content';
import type { Card, HandType, RunState } from '../../src/engine';
import { t } from '../../src/i18n/cs';
import { AnimQueue } from '../../src/ui/anim/queue';
import {
  createCardView,
  holdCardVisual,
  isCardVisualHeld,
  releaseCardVisual,
  updateCardView,
} from '../../src/ui/components/card';
import { GameController } from '../../src/ui/controller';
import { cardChangeTexts, cardChangeVisible } from '../../src/ui/describe';
import { TRIGGER_CLASS } from '../../src/ui/fx/cardFx';
import { Particles } from '../../src/ui/fx/particles';
import { createPresenter, effectStepDuration, isQuickStep, stepDuration } from '../../src/ui/present';
import { bubble, type PresentView } from '../../src/ui/presentKit';
import { memoryStore } from '../../src/ui/storage';

const REG = registry();

/** Testovací herní obrazovka: ruka, stůl, žolíci, peníze, levý panel a vrstva bublin — skutečné prvky v DOM. */
class FakeView implements PresentView {
  readonly anim: AnimQueue;
  readonly particles = new Particles(null, () => false);
  readonly root = document.createElement('div');
  readonly hand = document.createElement('div');
  readonly table = document.createElement('div');
  readonly fx = document.createElement('div');
  readonly money = document.createElement('dd');
  readonly handInfo = document.createElement('section');
  readonly deck = document.createElement('button');
  readonly cards = new Map<number, HTMLElement>();
  scoring: { hand: HandType; level: number; chips: number; mult: number } | null = null;
  readonly scoringLog: ({ hand: HandType; level: number } | null)[] = [];
  /** Třídy všech přidaných bublin a spuštění (`is-triggered`) zachycené za běhu. */
  readonly bubbles: HTMLElement[] = [];
  readonly triggered = new Set<Element>();
  private readonly observer: MutationObserver;

  constructor(
    readonly controller: GameController,
    enabled = true,
  ) {
    this.anim = new AnimQueue(() => ({ speed: 4, enabled }));
    this.hand.className = 'gb-hand';
    this.handInfo.className = 'gs-box gs-hand';
    this.root.append(this.handInfo, this.money, this.table, this.hand, this.deck, this.fx);
    document.body.appendChild(this.root);
    this.observer = new MutationObserver((list) => {
      for (const m of list) {
        if (
          m.type === 'attributes' &&
          m.target instanceof Element &&
          m.target.classList.contains(TRIGGER_CLASS)
        )
          this.triggered.add(m.target);
        for (const n of m.addedNodes)
          if (n instanceof HTMLElement && n.classList.contains('game-bubble')) this.bubbles.push(n);
      }
    });
    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    this.refresh();
  }

  dispose(): void {
    this.observer.disconnect();
    this.root.remove();
  }

  refresh(): void {
    const c = this.controller;
    for (const id of c.handIds()) {
      const card = c.engine.card(id);
      if (!card) continue;
      let el = this.cards.get(id);
      if (!el) {
        el = createCardView(card, { registry: REG, onClick: () => undefined });
        this.cards.set(id, el);
        this.hand.appendChild(el);
      } else updateCardView(el, card);
    }
  }

  cardEl(id: number): HTMLElement | null {
    const el = this.cards.get(id);
    return el?.isConnected ? el : null;
  }
  jokerEl(): HTMLElement | null {
    return null;
  }
  consumableEl(): HTMLElement | null {
    return null;
  }
  handInfoEl(): HTMLElement {
    return this.handInfo;
  }
  tableEl(): HTMLElement {
    return this.table;
  }
  deckEl(): HTMLElement {
    return this.deck;
  }
  moneyEl(): HTMLElement {
    return this.money;
  }
  roundScoreEl(): HTMLElement | null {
    return null;
  }
  fxLayer(): HTMLElement {
    return this.fx;
  }
  showScoring(s: { hand: HandType; level: number; chips: number; mult: number } | null): void {
    this.scoring = s;
    this.scoringLog.push(s ? { hand: s.hand, level: s.level } : null);
  }
  setChipsMult(): void {}
  setRoundScore(): void {}
  setMoney(n: number): void {
    this.money.textContent = String(n);
  }
  shake(): void {}
  announce(): void {}
}

/** Controller v Malé útratě s upraveným stavem (karty, spotřebky). */
async function controllerWith(prep: (s: RunState) => void): Promise<GameController> {
  const c = GameController.newRun(
    { deckId: 'pub', stake: 1, seed: 'JUICE2UT' },
    { registry: REG, store: memoryStore() },
  );
  await c.act({ type: 'selectBlind' });
  prep(c.state as RunState);
  return c;
}

const cardOf = (c: GameController, id: number): Card => (c.state as RunState).deck.find((x) => x.id === id)!;

let view: FakeView | null = null;

beforeEach(() => {
  document.body.innerHTML = '';
  // happy-dom nemá layout (obdélníky 0 × 0) — prvky dostanou rozměr karty, ať presenter má kam bubliny dát.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({ left: 400, top: 300, width: 90, height: 126, right: 490, bottom: 426, x: 400, y: 300 }) as DOMRect,
  );
});

afterEach(() => {
  view?.dispose();
  view = null;
  vi.restoreAllMocks();
});

describe('skórování: zlatá pečeť je vidět', () => {
  it('karta poskočí (is-triggered), pečeť se zvýrazní a nad kartou je velký nápis peněz s popiskem', async () => {
    let id = 0;
    const c = await controllerWith((s) => {
      id = s.round!.hand[0]!;
      const card = s.deck.find((x) => x.id === id)!;
      card.seal = 'gold';
      card.enhancement = null;
      card.edition = null;
    });
    view = new FakeView(c);
    const el = view.cardEl(id)!;
    const flashes: string[] = [];
    new MutationObserver((list) => {
      for (const m of list)
        for (const n of m.addedNodes) if (n instanceof HTMLElement) flashes.push(n.className);
    }).observe(el, { childList: true, subtree: true });
    c.setPresenter(createPresenter(view));
    const res = await c.act({ type: 'play', cardIds: [id] });
    expect(res.ok).toBe(true);
    const money = view.bubbles.find((b) => b.classList.contains('game-bubble--money'));
    expect(money, 'bublina peněz').toBeDefined();
    expect(money!.classList.contains('game-bubble--fx')).toBe(true);
    expect(money!.textContent).toContain(t('game.bubble.money', { n: 2 }));
    expect(money!.querySelector('.game-bubble__caption')?.textContent).toBe(t('seals.gold.name'));
    expect(view.triggered.has(el), 'karta dostala třídu spuštění').toBe(true);
    expect(flashes).toContain('fx-flash fx-flash--seal');
    // Čipy hodnoty karty jsou rychlý krok (menší nápis), efekt pečeti plnohodnotný.
    const chips = view.bubbles.find((b) => b.classList.contains('game-bubble--chips'));
    expect(chips?.classList.contains('game-bubble--quick')).toBe(true);
    // Po přehrání žádná karta nedrží třídu spuštění.
    expect(document.querySelectorAll(`.${TRIGGER_CLASS}`)).toHaveLength(0);
  });

  it('bez animací žádné bubliny ani spuštění; peníze se jen přepíšou', async () => {
    let id = 0;
    const c = await controllerWith((s) => {
      id = s.round!.hand[0]!;
      s.deck.find((x) => x.id === id)!.seal = 'gold';
    });
    view = new FakeView(c, false);
    c.setPresenter(createPresenter(view));
    await c.act({ type: 'play', cardIds: [id] });
    expect(view.bubbles).toEqual([]);
    expect(view.triggered.size).toBe(0);
  });
});

describe('babská rada na kartách: otočení a bublina se změnou', () => {
  it('Heřmánek: obě karty se otočí, překreslí se až animací a nad nimi je „Prémiová karta!“', async () => {
    let ids: number[] = [];
    const c = await controllerWith((s) => {
      s.consumables = [{ uid: 9100, defId: 'chamomile', edition: null }];
      ids = s.round!.hand.slice(0, 2);
      for (const id of ids) s.deck.find((x) => x.id === id)!.enhancement = null;
    });
    view = new FakeView(c);
    const els = ids.map((id) => view!.cardEl(id)!);
    // Překreslení obrazovky uprostřed dávky (rozdání karet) nesmí změnu prozradit předčasně.
    const heldDuring: boolean[] = [];
    const presenter = createPresenter(view);
    c.setPresenter(async (events, ctrl) => {
      const run = presenter(events, ctrl);
      view!.refresh();
      heldDuring.push(isCardVisualHeld(els[1]!) && !els[1]!.classList.contains('enh-bonus'));
      await run;
    });
    const res = await c.act({ type: 'useConsumable', uid: 9100, targetIds: ids });
    expect(res.ok).toBe(true);
    const texts = view.bubbles
      .filter((b) => b.classList.contains('game-bubble--change'))
      .map((b) => b.textContent);
    const expected = t('game.fx.change.enhancement', { name: t('enhancements.bonus.name') });
    expect(texts).toEqual([expected, expected]);
    for (const el of els) {
      expect(view.triggered.has(el)).toBe(true);
      expect(el.classList.contains('enh-bonus')).toBe(true);
      expect(isCardVisualHeld(el)).toBe(false);
    }
    expect(heldDuring).toEqual([true]);
    expect(cardOf(c, ids[0]!).enhancement).toBe('bonus');
  });

  it('bez animací se karty rovnou překreslí a nic nezůstane podržené', async () => {
    let id = 0;
    const c = await controllerWith((s) => {
      s.consumables = [{ uid: 9101, defId: 'notarized', edition: null }];
      id = s.round!.hand[3]!;
      s.deck.find((x) => x.id === id)!.seal = null;
    });
    view = new FakeView(c, false);
    c.setPresenter(createPresenter(view));
    await c.act({ type: 'useConsumable', uid: 9101, targetIds: [id] });
    const el = view.cardEl(id)!;
    expect(view.bubbles).toEqual([]);
    expect(isCardVisualHeld(el)).toBe(false);
    expect(el.dataset.visual).toContain('|gold|');
  });
});

describe('pranostika: nová úroveň v levém panelu', () => {
  it('panel ukáže starou a pak novou úroveň, nápis „Barva úr. 2!“, pak zpět na živý náhled', async () => {
    const c = await controllerWith((s) => {
      s.consumables = [{ uid: 9102, defId: 'medard_drop', edition: null }];
    });
    view = new FakeView(c);
    c.setPresenter(createPresenter(view));
    await c.act({ type: 'useConsumable', uid: 9102, targetIds: [] });
    const level = view.bubbles.find((b) => b.classList.contains('game-bubble--level'));
    expect(level?.textContent).toBe(t('game.fx.levelUp', { hand: t('hands.flush.name'), level: 2 }));
    expect(view.scoringLog).toContainEqual({ hand: 'flush', level: 1 });
    expect(view.scoringLog).toContainEqual({ hand: 'flush', level: 2 });
    expect(view.scoring).toBeNull();
  });
});

describe('podržený vzhled karty', () => {
  it('překreslení podle enginu podržený vzhled nezmění; uvolnění ukáže skutečný stav', () => {
    const card: Card = {
      id: 77,
      suit: 'S',
      rank: 9,
      enhancement: null,
      seal: null,
      edition: null,
      bonusChips: 0,
      debuffed: false,
      faceDown: false,
    };
    const el = createCardView(card, { registry: REG });
    holdCardVisual(el, { ...card });
    updateCardView(el, { ...card, enhancement: 'bonus', seal: 'gold' }, { selected: true });
    expect(el.classList.contains('enh-bonus')).toBe(false);
    expect(el.classList.contains('is-selected')).toBe(true);
    holdCardVisual(el, { ...card, seal: 'gold' });
    expect(el.dataset.visual).toContain('|gold|');
    releaseCardVisual(el);
    expect(el.classList.contains('enh-bonus')).toBe(true);
    expect(isCardVisualHeld(el)).toBe(false);
  });
});

describe('texty změn karet', () => {
  it('vylepšení, pečeť, edice, barva, hodnota, čipy navíc, očista; otočení lícem dolů nic', () => {
    expect(
      cardChangeTexts({
        enhancement: { from: null, to: 'gold' },
        seal: { from: null, to: 'red' },
        edition: { from: null, to: 'holo' },
        suit: { from: 'S', to: 'H' },
        rank: { from: 9, to: 10 },
        bonusChips: { from: 0, to: 15 },
      }),
    ).toEqual([
      'Zlatá karta!',
      'Červená pečeť!',
      'Holografická!',
      '♠ → ♥',
      '9 → 10',
      t('game.fx.change.bonusChips', { n: 15 }),
    ]);
    expect(cardChangeTexts({ rank: { from: 10, to: 11 } })).toEqual(['10 → J']);
    expect(cardChangeTexts({ seal: { from: 'gold', to: null } })).toEqual([t('game.fx.change.sealLost')]);
    expect(cardChangeTexts({ debuffed: { from: true, to: false } })).toEqual([t('game.fx.change.cleansed')]);
    expect(cardChangeTexts({ faceDown: { from: false, to: true } })).toEqual([]);
    expect(cardChangeTexts(undefined)).toEqual([]);
    expect(cardChangeVisible({ bonusChips: { from: 0, to: 3 } })).toBe(false);
    expect(cardChangeVisible({ seal: { from: null, to: 'blue' } })).toBe(true);
  });
});

describe('časování a skládání nápisů', () => {
  it('efekty mají při 1× aspoň 0,4 s, dlouhé řetězy se zkracují nejvýš na 0,3 s; čipy hodnoty jsou rychlé', () => {
    expect(effectStepDuration(1)).toBeGreaterThanOrEqual(400);
    expect(effectStepDuration(10)).toBeGreaterThanOrEqual(400);
    expect(effectStepDuration(20)).toBeLessThan(effectStepDuration(5));
    expect(effectStepDuration(200)).toBe(300);
    expect(stepDuration(5)).toBeLessThan(effectStepDuration(5));
    expect(isQuickStep({ source: 'card', origin: 'rank', chips: 9, chipsAfter: 0, multAfter: 0 })).toBe(true);
    expect(isQuickStep({ source: 'card', origin: 'seal', money: 2, chipsAfter: 0, multAfter: 0 })).toBe(
      false,
    );
    expect(isQuickStep({ source: 'joker', jokerUid: 1, mult: 4, chipsAfter: 0, multAfter: 0 })).toBe(false);
  });

  it('dva velké nápisy na stejném místě se nepřekryjí — druhý je výš; stejný zdroj starší odsune', () => {
    const fx = document.createElement('div');
    document.body.appendChild(fx);
    const v = { fxLayer: () => fx, anim: new AnimQueue(() => ({ speed: 1, enabled: true })) };
    const rect = { left: 400, top: 300, width: 90, height: 126 };
    const a = bubble(v, rect, '+2 Kč', 'money', { fx: true, anchor: 'card:1' })!;
    const b = bubble(v, rect, '+25', 'chips', { fx: true, anchor: 'card:2' })!;
    const ya = Number(/,\s*(-?\d+)px/.exec(a.style.transform)![1]);
    const yb = Number(/,\s*(-?\d+)px/.exec(b.style.transform)![1]);
    expect(yb).toBeLessThan(ya);
    const c = bubble(v, rect, '+5 mult', 'mult', { fx: true, anchor: 'card:1' })!;
    expect(a.classList.contains('is-superseded')).toBe(true);
    expect(c.classList.contains('game-bubble--fx')).toBe(true);
    // Bez animací se nevytváří nic.
    const off = { fxLayer: () => fx, anim: new AnimQueue(() => ({ speed: 1, enabled: false })) };
    expect(bubble(off, rect, '+2 Kč', 'money', { fx: true })).toBeNull();
    fx.remove();
  });
});

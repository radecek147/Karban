/**
 * Viditelné efekty mimo kroky skórování (šťáva 2, DECISIONS 2026-10-04): co udělala spotřebka, žolík nebo konec
 * kola s kartami, žolíky a kombinacemi.
 *
 *  - **spotřebka** odletí ze slotu (obálky, Večerky) ke kartám, kterých se týká,
 *  - **změna karty** (`cardChanged` s `change` z enginu): karta se zvedne, otočí, uprostřed se překreslí na nový
 *    vzhled, zajiskří a bublina řekne co („Zlatá pečeť!“, „♠ → ♥“, „9 → 10“); víc karet postupně,
 *  - **nová karta** přiletí do ruky nebo do balíčku (kopie vyletí z původní karty), **zničená** se rozpadne,
 *  - **nová úroveň kombinace** se ukáže v levém panelu (úroveň, čipy a mult naskočí, „Barva úr. 3!“, jiskry),
 *  - **konec kola**: zlatá karta, modrá pečeť a peníze žolíků / balíčku se ukážou na nich, než se otevře rozpis,
 *  - **nový žolík / spotřebka** po překreslení na konci dávky naskočí na své místo.
 *
 * Vzhled změněných karet drží presenter (`holdCardVisual`) od začátku dávky do odhalení — obrazovka se mezitím
 * smí překreslit podle hotového stavu enginu (rozdání karet) a změnu neprozradí předčasně.
 */
import type { Card, CardChange, GameEvent, HandType, ScoreStepOrigin } from '../engine';
import { handValueAtLevel } from '../engine';
import { t } from '../i18n/cs';
import { soundForEvent } from './audio/hooks';
import { createCardView, holdCardVisual, releaseCardVisual, updateCardView } from './components/card';
import { createConsumableCard } from './components/consumableCard';
import { cardChangeTexts, cardChangeVisible } from './describe';
import {
  crumble,
  FLIP_MS,
  flashOrigin,
  flipReveal,
  ghostFly,
  motionTarget,
  popIn,
  trigger,
} from './fx/cardFx';
import type { RectLike } from './fx/particles';
import { FX_LINE, bubble, measure, type Batch, type PresentView } from './presentKit';

type Ev<T extends GameEvent['type']> = Extract<GameEvent, { type: T }>;

/** Odstup mezi kartami, které mění jedna spotřebka (ms při 1×) — karty se otáčejí postupně. */
export const CARD_STAGGER_MS = 260;
/** Délka jednoho efektu karty / žolíka na konci kola (ms při 1×). */
export const ROUND_END_STEP_MS = 520;

// ─────────────────────────── Dávka ───────────────────────────

/** Stav karty s hodnotami z `change` (před = `from`, po = `to`). */
function withChange(card: Card, change: CardChange, side: 'from' | 'to'): Card {
  const next: Card = { ...card };
  for (const [key, value] of Object.entries(change) as [keyof CardChange, { from: unknown; to: unknown }][])
    Object.assign(next, { [key]: value[side] });
  return next;
}

/**
 * Připraví kontext dávky: peníze před akcí, štítky, změny karet a úrovní, které přehraje zahraná ruka (nastaly
 * před událostí `handPlayed`), spotřebky vytvořené kartami v ruce na konci kola a podržený vzhled karet, jejichž
 * změnu teprve ukáže animace.
 */
export function prepareBatch(view: PresentView, events: readonly GameEvent[]): Batch {
  const s = view.controller.state;
  const batch: Batch = {
    // Peníze před akcí = konečný stav − všechny změny v dávce; krok skórování s penězi je přičte postupně.
    money: { value: events.reduce((m, e) => (e.type === 'moneyChanged' ? m - e.delta : m), s.money) },
    tagsTriggered: new Set(events.flatMap((e) => (e.type === 'tagTriggered' ? [e.defId] : []))),
    announced: new Set(),
    holds: new Map(),
    deferred: new Set(),
    silenced: new Set(),
    arrived: [],
    heldConsumables: new Map(),
    pending: [],
    levelShown: false,
    levelCount: events.filter((e) => e.type === 'handLeveled').length,
  };
  // Změny karet a úrovní před zahranou rukou (žolíci před / během skórování, kupón po ruce) přehraje ruka sama.
  const handAt = events.findIndex((e) => e.type === 'handPlayed');
  const played = handAt >= 0 ? (events[handAt] as Ev<'handPlayed'>).result.playedIds : [];
  events.forEach((e, i) => {
    if (i >= handAt || handAt < 0) return;
    if (e.type === 'handLeveled' || (e.type === 'cardChanged' && played.includes(e.cardId)))
      batch.deferred.add(e);
  });
  for (const e of events) {
    if (e.type !== 'roundRewards') continue;
    for (const held of e.heldCards ?? [])
      for (const uid of held.consumables ?? []) batch.heldConsumables.set(uid, held.cardId);
  }
  if (view.anim.instant) return batch;
  // Podržet vzhled karet, které se v dávce viditelně změní: stav před první změnou (u každého pole jeho první `from`).
  const before = new Map<number, Card>();
  const seen = new Map<number, Set<string>>();
  for (const e of events) {
    if (e.type !== 'cardChanged' || !e.change || !cardChangeVisible(e.change)) continue;
    const base = before.get(e.cardId) ?? (view.controller.engine.card(e.cardId) as Card | undefined);
    if (!base) continue;
    const fields = seen.get(e.cardId) ?? new Set<string>();
    const first: CardChange = {};
    for (const [key, value] of Object.entries(e.change)) {
      if (fields.has(key)) continue;
      fields.add(key);
      Object.assign(first, { [key]: value });
    }
    seen.set(e.cardId, fields);
    before.set(e.cardId, withChange(base, first, 'from'));
  }
  for (const [id, shown] of before) {
    const el = view.cardEl(id);
    if (!el) continue;
    holdCardVisual(el, shown);
    batch.holds.set(id, { el, shown });
  }
  return batch;
}

/** Ukáže změnu karty (nový vzhled) — u podržené karty posune podržený stav, jinak překreslí podle enginu. */
function reveal(view: PresentView, batch: Batch, e: Ev<'cardChanged'>): void {
  const hold = batch.holds.get(e.cardId);
  if (hold && e.change) {
    hold.shown = withChange(hold.shown, e.change, 'to');
    holdCardVisual(hold.el, hold.shown);
    return;
  }
  const el = view.cardEl(e.cardId);
  const card = view.controller.engine.card(e.cardId);
  if (el && card) updateCardView(el, card);
}

/** Uvolní podržený vzhled všech karet (konec dávky). */
export function releaseHolds(batch: Batch): void {
  for (const { el } of batch.holds.values()) releaseCardVisual(el);
  batch.holds.clear();
}

/**
 * Konec dávky: počká na dobíhající animace (postupné otáčení karet, odlétající spotřebka), vrátí levý panel na
 * živý náhled, uvolní podržené karty a nové položky (žolíci, spotřebky, karty v ruce) po překreslení naskočí.
 */
export async function finishBatch(view: PresentView, batch: Batch): Promise<void> {
  if (batch.pending.length > 0) await Promise.all(batch.pending);
  batch.pending = [];
  if (batch.levelShown) {
    view.showScoring(null);
    batch.levelShown = false;
  }
  releaseHolds(batch);
  const anim = view.anim;
  if (batch.arrived.length === 0 || anim.instant) return;
  view.refresh();
  const items = batch.arrived.map((a) => ({
    a,
    el:
      a.kind === 'joker'
        ? view.jokerEl(a.id)
        : a.kind === 'consumable'
          ? view.consumableEl(a.id)
          : view.cardEl(a.id),
  }));
  // Nejdřív změřit všechno, pak zapisovat.
  const rects = items.map(({ el }) => measure(el));
  items.forEach(({ a, el }, i) => {
    if (!el) return;
    void popIn(anim, el);
    view.particles.sparkle(rects[i], 0, 12);
    if (a.label)
      bubble(view, rects[i], a.label, 'change', { fx: true, quick: true, anchor: `${a.kind}:${a.id}` });
  });
}

// ─────────────────────────── Spotřebka ───────────────────────────

/** Kam spotřebka „letí“: první karta, které se dávka týká, levý panel (pranostika) nebo střed stolu. */
function consumableTarget(view: PresentView, events: readonly GameEvent[]): RectLike | null {
  for (const e of events) {
    if (e.type === 'cardChanged' || e.type === 'cardDestroyed') {
      const r = measure(view.cardEl(e.cardId));
      if (r) return r;
    }
    if (e.type === 'cardAdded' && e.copyOf !== undefined) {
      const r = measure(view.cardEl(e.copyOf));
      if (r) return r;
    }
    if (e.type === 'handLeveled') {
      const r = measure(view.handInfoEl());
      if (r) return r;
    }
  }
  return null;
}

/**
 * Začátek dávky s použitou spotřebkou: spotřebka se ve slotu (obálce, Večerce) zvedne a odletí ke kartám, kterých
 * se týká (pranostika do levého panelu). Událost `consumableUsed` přijde až za efekty — zvuk tedy zazní tady.
 */
export async function presentConsumableUse(
  view: PresentView,
  events: readonly GameEvent[],
  batch: Batch,
): Promise<void> {
  const anim = view.anim;
  if (anim.instant) return;
  for (const e of events) {
    if (e.type !== 'consumableUsed') continue;
    const el = view.consumableEl(e.uid) ?? view.itemEl?.(e.uid) ?? null;
    if (!el) continue;
    soundForEvent(e, anim);
    batch.silenced.add(e);
    // Pranostika: levý panel s kombinací se ukáže hned (mimo kolo je jinak schovaný), ať je kam letět.
    const level = events.find((x): x is Ev<'handLeveled'> => x.type === 'handLeveled');
    if (level) showLevel(view, level.hand, level.level - level.delta, batch);
    const from = measure(el);
    const to = consumableTarget(view, events);
    const up = from ? { left: from.left, top: from.top - 90, width: from.width, height: from.height } : null;
    batch.pending.push(
      ghostFly(view.fxLayer(), anim, el, to ?? up, { lift: true, hideSource: true, ms: 640 }),
    );
    await anim.wait(440);
  }
}

// ─────────────────────────── Karty ───────────────────────────

/** Barva pečeti / vylepšení z obsahu (záblesk a jiskry ladí s odznakem). */
export function originColor(
  view: PresentView,
  card: Card | undefined,
  origin: ScoreStepOrigin,
): string | undefined {
  if (!card) return undefined;
  const reg = view.controller.registry;
  if (origin === 'seal' && card.seal) return reg.seals[card.seal]?.art?.bg;
  if (origin === 'enhancement' && card.enhancement) return reg.enhancements[card.enhancement]?.art?.bg;
  return undefined;
}

/** Odstín jisker podle změny: pečeť / vylepšení zlatě, barva a hodnota modře, edice bíle. */
function sparkTone(change: CardChange): number {
  if (change.edition) return 3;
  if (change.suit || change.rank) return 2;
  return 0;
}

/** Karta, jak ji teď ukazuje obrazovka (podržený stav, jinak engine). */
export function shownCard(view: PresentView, batch: Batch, id: number): Card | undefined {
  return batch.holds.get(id)?.shown ?? (view.controller.engine.card(id) as Card | undefined);
}

/**
 * Změna karty: karta se zvedne a otočí, uprostřed otočky se překreslí, zajiskří a bublina řekne, co se změnilo.
 * Další karta začne po krátkém odstupu (`CARD_STAGGER_MS`), dobíhající otočky počkají na konci dávky.
 * Otočení lícem dolů (šéf) a trvalé čipy přidané během skórování se jen překreslí — ty ukazují kroky skórování.
 */
export async function presentCardChange(
  view: PresentView,
  e: Ev<'cardChanged'>,
  batch: Batch,
): Promise<void> {
  const anim = view.anim;
  const change = e.change;
  const el = view.cardEl(e.cardId);
  const visible = cardChangeVisible(change);
  const texts =
    e.scoreStep !== undefined && !visible ? [] : cardChangeTexts(change, view.controller.registry);
  if (!el || !change || anim.instant || (!visible && texts.length === 0)) {
    reveal(view, batch, e);
    return;
  }
  const rect = measure(el);
  if (texts.length > 0) view.announce(texts.join(', '));
  const target = withChange(shownCard(view, batch, e.cardId) ?? ({} as Card), change, 'to');
  const flip = visible ? flipReveal(anim, el, () => reveal(view, batch, e)) : trigger(anim, el, 'normal');
  if (!visible) reveal(view, batch, e);
  const show = (async () => {
    if (visible) await anim.wait(FLIP_MS * 0.5);
    texts.forEach((text, i) =>
      bubble(view, rect, text, 'change', { fx: true, offset: i * FX_LINE, anchor: `card:${e.cardId}:${i}` }),
    );
    view.particles.sparkle(rect, sparkTone(change), 16);
    if (change.seal?.to) flashOrigin(anim, el, 'seal', originColor(view, target, 'seal'));
    else if (change.enhancement?.to)
      flashOrigin(anim, el, 'enhancement', originColor(view, target, 'enhancement'));
    else if (change.edition?.to) flashOrigin(anim, el, 'edition');
    await flip;
  })();
  batch.pending.push(show);
  await anim.wait(CARD_STAGGER_MS);
}

/** Kam v ruce přiletí nová karta: vpravo za poslední kartou (po překreslení se zařadí na své místo). */
function handSlotRect(view: PresentView): RectLike | null {
  const row = view.handRowEl?.() ?? null;
  const last = measure(row?.lastElementChild ?? null);
  if (last)
    return { left: last.left + last.width * 0.8, top: last.top, width: last.width, height: last.height };
  return measure(row);
}

/**
 * Nová karta: kopie vyletí z původní karty („Kopie!“), karta z obálky z obálky, jinak ze středu stolu — a letí do
 * ruky (po překreslení naskočí na své místo) nebo do balíčku („Do balíčku!“).
 */
export async function presentCardAdded(
  view: PresentView,
  e: Ev<'cardAdded'>,
  batch: Batch,
  events: readonly GameEvent[],
): Promise<void> {
  const c = view.controller;
  const card = c.engine.card(e.cardId);
  if (!card) return;
  const inHand = c.handIds().includes(e.cardId);
  if (inHand) batch.arrived.push({ kind: 'card', id: e.cardId, label: null });
  const anim = view.anim;
  const layer = view.fxLayer();
  if (anim.instant || !layer) return;
  // Měření: zdroj (kopírovaná karta / možnost obálky / stůl), cíl (konec ruky / balíček).
  const src = e.copyOf !== undefined ? view.cardEl(e.copyOf) : null;
  let from = measure(src);
  if (!from) {
    const picked = events
      .slice(events.indexOf(e))
      .find((x): x is Ev<'boosterPicked'> => x.type === 'boosterPicked');
    if (picked) from = measure(view.boosterOptionEl?.(picked.index) ?? null);
  }
  const stage = measure(view.tableEl()) ?? measure(layer);
  if (!from && stage) {
    const w = measure(view.deckEl())?.width ?? 90;
    from = {
      left: stage.left + stage.width / 2 - w / 2,
      top: stage.top + stage.height / 2 - w * 0.7,
      width: w,
      height: w * 1.4,
    };
  }
  const deck = measure(view.deckEl());
  const to = inHand ? handSlotRect(view) : deck;
  if (!from) return;
  if (src) {
    void trigger(anim, src, 'normal');
    bubble(view, from, t('game.fx.copy'), 'change', { fx: true, anchor: `card:${e.copyOf}` });
  }
  const ghost = createCardView(card, { registry: c.registry, tooltip: false, width: from.width });
  await ghostFly(layer, anim, ghost, to, { from, clone: false, fade: !inHand, ms: 560 });
  if (!inHand) {
    void trigger(anim, view.deckEl(), 'soft');
    bubble(view, deck, t('game.fx.toDeck'), 'change', { fx: true, quick: true, anchor: 'deck' });
  }
}

/** Zničená karta (spotřebka, efekt; ne sklo ze skórování — to roztříští `presentHand`) se rozpadne. */
export async function presentCardDestroyed(view: PresentView, e: Ev<'cardDestroyed'>): Promise<void> {
  const el = view.cardEl(e.cardId);
  if (!el) return;
  const anim = view.anim;
  const rect = anim.instant ? null : measure(el);
  if (e.reason !== 'score')
    bubble(view, rect, t('game.fx.destroyed'), 'bad', { fx: true, anchor: `card:${e.cardId}` });
  if (el.classList.contains('enh-glass')) view.particles.glass(rect);
  else view.particles.dust(rect);
  await crumble(anim, el);
  el.remove();
}

// ─────────────────────────── Úroveň kombinace ───────────────────────────

/** Levý panel ukáže kombinaci na dané úrovni (čipy a mult podle úrovně). */
function showLevel(view: PresentView, hand: HandType, level: number, batch: Batch): void {
  const def = view.controller.registry.handTypes[hand];
  if (!def) return;
  const v = handValueAtLevel(def, Math.max(1, level));
  view.showScoring({ hand, level: Math.max(1, level), chips: v.chips, mult: v.mult });
  batch.levelShown = true;
}

/**
 * Nová úroveň kombinace (pranostika, žolík, kupón, štítek): levý panel ukáže kombinaci na staré úrovni, panel
 * poskočí, úroveň, čipy a mult naskočí na nové hodnoty, „Barva úr. 3!“ a jiskry. Víc úrovní v dávce (Úřední hodiny:
 * všechny kombinace) = kratší animace každé. `keep` = panel zůstane (skórování ruky si ho převezme).
 */
export async function presentLevelUp(
  view: PresentView,
  e: Ev<'handLeveled'>,
  batch: Batch,
  opts: { keep?: boolean } = {},
): Promise<void> {
  const anim = view.anim;
  const reg = view.controller.registry;
  if (!reg.handTypes[e.hand]) return;
  const name = t(`hands.${e.hand}.name`);
  const text = t(e.delta > 0 ? 'game.fx.levelUp' : 'game.fx.levelDown', { hand: name, level: e.level });
  view.announce(t('game.events.leveled', { hand: name, level: e.level }));
  const many = batch.levelCount > 2;
  showLevel(view, e.hand, e.level - e.delta, batch);
  if (!anim.instant) await anim.wait(many ? 60 : 160);
  const box = view.handInfoEl();
  const rect = anim.instant ? null : measure(box);
  void trigger(anim, box, many ? 'soft' : 'normal');
  showLevel(view, e.hand, e.level, batch);
  const chips = view.chipsEl?.() ?? null;
  const mult = view.multEl?.() ?? null;
  void trigger(anim, chips, 'soft');
  void trigger(anim, mult, 'soft');
  // Nápis vpravo vedle rámečku kombinace (na suknu) — nad ním by zakryl skóre kola v úzkém levém panelu.
  const beside = rect
    ? { left: rect.left + rect.width + 10, top: rect.top + rect.height * 0.7, width: 1, height: 1 }
    : null;
  bubble(view, beside, text, e.delta > 0 ? 'level' : 'bad', {
    fx: true,
    anchor: 'hand-info',
    alignStart: true,
  });
  view.particles.sparkle(rect, 0, many ? 8 : 22);
  await anim.wait(many ? Math.max(240, Math.round(1600 / batch.levelCount)) : 950);
  if (opts.keep) batch.levelShown = false;
}

// ─────────────────────────── Konec kola ───────────────────────────

/**
 * Konec kola, než se otevře rozpis odměn: zlatá karta v ruce („+3 Kč“, záblesk vylepšení), modrá pečeť (záblesk
 * pečeti, nová pranostika vyletí z karty do kapsy), peníze žolíků a balíčku (zdroj poskočí, „+X Kč“). Peníze se
 * vyplatí až tlačítkem Vyplatit — tady se jen ukazuje, odkud přijdou.
 */
export async function presentRoundRewards(
  view: PresentView,
  e: Ev<'roundRewards'>,
  batch: Batch,
): Promise<void> {
  const anim = view.anim;
  if (anim.instant) return;
  const c = view.controller;
  const reg = c.registry;
  const layer = view.fxLayer();
  const held = e.heldCards ?? [];
  const jokers = e.extra.filter((x) => x.jokerUid !== undefined && x.amount !== 0);
  const deckMoney = e.extra.find((x) => x.source.startsWith('deck:'));
  if (held.length === 0 && jokers.length === 0 && !deckMoney) return;
  const slots = measure(view.consumableRowEl?.() ?? null);

  for (const h of held) {
    const el = view.cardEl(h.cardId);
    if (!el) continue;
    const card = shownCard(view, batch, h.cardId);
    const rect = measure(el);
    void trigger(anim, el, 'normal');
    let offset = 0;
    if (h.money) {
      flashOrigin(anim, el, 'enhancement', originColor(view, card, 'enhancement'));
      const caption = card?.enhancement ? t(`enhancements.${card.enhancement}.name`) : undefined;
      bubble(view, rect, t('game.fx.roundMoney', { n: h.money }), 'money', {
        fx: true,
        caption,
        anchor: `card:${h.cardId}`,
      });
      view.particles.coins(rect, 5);
      offset += FX_LINE;
    }
    for (const uid of h.consumables ?? []) {
      const inst = c.state.consumables.find((x) => x.uid === uid);
      if (!inst) continue;
      flashOrigin(anim, el, 'seal', originColor(view, card, 'seal'));
      const kind = reg.consumables[inst.defId]?.kind ?? 'pranostika';
      bubble(view, rect, t('game.fx.newConsumable', { kind: t(`art.consumableKind.${kind}`) }), 'change', {
        fx: true,
        offset,
        anchor: `card:${h.cardId}:c`,
      });
      offset += FX_LINE;
      const ghost = createConsumableCard(inst, { registry: reg, tooltip: false });
      const to = slots
        ? { left: slots.left + slots.width - 70, top: slots.top, width: 60, height: 60 }
        : null;
      batch.pending.push(ghostFly(layer, anim, ghost, to, { from: rect, clone: false, ms: 620 }));
    }
    await anim.wait(ROUND_END_STEP_MS);
  }
  for (const j of jokers) {
    const el = view.jokerEl(j.jokerUid!);
    if (!el) continue;
    const rect = measure(el);
    void trigger(anim, el, 'normal');
    bubble(view, rect, t('game.fx.roundMoney', { n: j.amount }), j.amount > 0 ? 'money' : 'bad', {
      fx: true,
      anchor: `joker:${j.jokerUid}`,
    });
    if (j.amount > 0) view.particles.coins(rect, 5);
    await anim.wait(ROUND_END_STEP_MS);
  }
  if (deckMoney && deckMoney.amount !== 0) {
    const el = view.deckEl();
    const rect = measure(el);
    void trigger(anim, el, 'normal');
    bubble(
      view,
      rect,
      t('game.fx.roundMoney', { n: deckMoney.amount }),
      deckMoney.amount > 0 ? 'money' : 'bad',
      {
        fx: true,
        anchor: 'deck',
      },
    );
    await anim.wait(ROUND_END_STEP_MS);
  }
}

// ─────────────────────────── Žolíci a nové položky ───────────────────────────

/** Edice žolíka podle tříd prvku (`ed-<id>`), jak ji ukazuje obrazovka. */
function shownEdition(el: HTMLElement): string | null {
  for (const cls of el.classList) if (cls.startsWith('ed-')) return cls.slice(3);
  return null;
}

/**
 * Žolík se změnil (nová edice, proměna, sundané nálepky): otočí se, uprostřed se překreslí a bublina řekne co.
 * Co se změnilo, se pozná porovnáním s tím, co ukazuje obrazovka (id a edice na prvku).
 */
export async function presentJokerChanged(view: PresentView, e: Ev<'jokerChanged'>): Promise<void> {
  const el = view.jokerEl(e.uid);
  const j = view.controller.state.jokers.find((x) => x.uid === e.uid);
  if (!el || !j) return;
  const anim = view.anim;
  const reg = view.controller.registry;
  const edition = shownEdition(el);
  let text: string;
  if (el.dataset.defId !== j.defId) text = t('game.fx.jokerTransform');
  else if (edition !== j.edition)
    text =
      cardChangeTexts({ edition: { from: edition, to: j.edition } }, reg)[0] ?? t('game.fx.jokerTransform');
  else text = t('game.fx.jokerStickers');
  const rect = anim.instant ? null : measure(el);
  // Překreslení vymění vnitřek žolíka — otáčí se celý prvek, ne jeho vnitřek.
  await flipReveal(anim, el.parentElement?.classList.contains('gt-item') ? el.parentElement : el, () =>
    view.redrawJoker?.(e.uid),
  );
  bubble(view, rect, text, 'change', { fx: true, anchor: `joker:${e.uid}` });
  view.particles.sparkle(rect, j.edition ? 3 : 0, 16);
}

/** Byl žolík / spotřebka v dávce koupen nebo vzat z obálky (pak bez bubliny — hráč ví, co si vzal)? */
function acquiredByPlayer(events: readonly GameEvent[]): boolean {
  return events.some((e) => e.type === 'itemBought' || e.type === 'boosterPicked');
}

/** Nový žolík: po překreslení na konci dávky naskočí (z efektu i s bublinou „Nový žolík!“). */
export function noteJokerAdded(e: Ev<'jokerAdded'>, batch: Batch, events: readonly GameEvent[]): void {
  batch.arrived.push({
    kind: 'joker',
    id: e.uid,
    label: acquiredByPlayer(events) ? null : t('game.fx.newJoker'),
  });
}

/**
 * Nová spotřebka: po překreslení naskočí do kapsy (z efektu s bublinou „+ Pranostika“). Spotřebku z modré pečeti
 * ukáže rozpis konce kola (vyletí z karty), tady jen naskočí.
 */
export function noteConsumableAdded(
  view: PresentView,
  e: Ev<'consumableAdded'>,
  batch: Batch,
  events: readonly GameEvent[],
): void {
  const kind = view.controller.registry.consumables[e.defId]?.kind;
  const label =
    batch.heldConsumables.has(e.uid) || acquiredByPlayer(events) || !kind
      ? null
      : t('game.fx.newConsumable', { kind: t(`art.consumableKind.${kind}`) });
  batch.arrived.push({ kind: 'consumable', id: e.uid, label });
}

/** Má dávka viditelný efekt spotřebky (pak není potřeba hláška „Použito: …“)? */
export function hasVisibleEffect(events: readonly GameEvent[]): boolean {
  return events.some(
    (e) =>
      (e.type === 'cardChanged' && cardChangeTexts(e.change).length > 0) ||
      e.type === 'cardAdded' ||
      e.type === 'cardDestroyed' ||
      e.type === 'handLeveled' ||
      e.type === 'jokerAdded' ||
      e.type === 'jokerChanged' ||
      e.type === 'consumableAdded',
  );
}

/** Prvek, na kterém se pohyb karty děje (pro testy a ladění). */
export { motionTarget };

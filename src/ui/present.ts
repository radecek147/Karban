/**
 * Presenter — přehrává události enginu na herní obrazovce (ARCHITECTURE 4, DESIGN 13.2 a 13.6).
 *
 *   controller.setPresenter(createPresenter(view));
 *
 * Engine po akci vrátí hotový stav i seznam událostí; obrazovka mezitím ještě ukazuje stav *před* akcí.
 * Presenter události přehraje jednu po druhé (zahrané karty na stůl, `ScoreStep` po jednom s bublinami
 * +čipy / +mult / ×mult / Kč, počítadla, rozdání, zahození, peníze, hlášky) a obrazovku průběžně synchronizuje
 * (`view.refresh()`); controller ji po doběhnutí překreslí ještě jednou.
 *
 * Časování jde přes `app.anim` (AnimQueue): rychlost 1×–4×, vypnuté animace i mezerník (přeskočit) — každé
 * čekání pak skončí hned a DOM se jen dorovná. Animuje se výhradně transform/opacity (Web Animations API).
 *
 * „Šťáva“ (DESIGN 13.6): částice (src/ui/fx/particles.ts — mince, střepy, plamínky ×mult, obláčky +čipy / +mult,
 * prach, konfety), screen shake (src/ui/fx/shake.ts — od poloviny cíle lehce, od cíle podle převýšení, šéf, sklo)
 * a efekt velkého skóre (ruka ≥ cíl kola: obří bublina, zlatý záblesk, jiskry, záře počítadla). Každý krok
 * nejdřív změří, co potřebuje (obdélník zdroje), a teprve pak zapisuje — žádné vynucené přepočty layoutu ve smyčce.
 *
 * Šťáva 2 (DECISIONS 2026-10-04): každý efekt je čitelný — zdroj (karta, žolík) výrazně poskočí, nad ním velký
 * nápis s obrysem v barvě typu (čipy modře, mult červeně, ×mult výrazněji, peníze zlatě), záblesk části karty,
 * která efekt způsobila (`ScoreStep.origin`: pečeť, vylepšení, edice), mince letí k panelu Peníze a efekty
 * vylepšení / pečetí / edic / žolíků mají při 1× aspoň ~0,5 s. Změny karet, nové a zničené karty, nové úrovně,
 * konec kola a nové položky ukazuje src/ui/presentEffects.ts.
 */
import type { GameEvent, ScoreResult, ScoreStep } from '../engine';
import { MSG } from '../engine/constants';
import { t } from '../i18n/cs';
import { formatNumber } from '../i18n/format';
import { animate } from './anim/animate';
import type { AnimQueue } from './anim/queue';
import { blindArt } from './art/art';
import { sound, soundForEvent, soundScoreStep } from './audio/hooks';
import { updateCardView } from './components/card';
import { createContentCard } from './components/consumableCard';
import { toast } from './components/toast';
import { bossTexts, tagTexts } from './describe';
import type { Presenter } from './controller';
import { COIN_FLIGHT_MS, crumble, flashOrigin, flyCoins, trigger } from './fx/cardFx';
import type { RectLike } from './fx/particles';
import { SHAKE, shakeForScore } from './fx/shake';
import {
  finishBatch,
  hasVisibleEffect,
  noteConsumableAdded,
  noteJokerAdded,
  originColor,
  prepareBatch,
  presentCardAdded,
  presentCardChange,
  presentCardDestroyed,
  presentConsumableUse,
  presentJokerChanged,
  presentLevelUp,
  presentRoundRewards,
  releaseHolds,
  shownCard,
} from './presentEffects';
import { FX_LINE, bubble, measure, messageText, say, type Batch, type PresentView } from './presentKit';

export { animate } from './anim/animate';
export { bubble, type BubbleTone, type PresentView } from './presentKit';

// ─────────────────────────── Pomocné animace ───────────────────────────

/** Krátké „povyskočení“ zdroje efektu. */
function pop(anim: AnimQueue, el: Element | null | undefined, scale = 1.12): Promise<void> {
  return animate(
    anim,
    el,
    [
      { transform: 'translateY(0) scale(1)' },
      { transform: `translateY(-6px) scale(${scale})`, offset: 0.35 },
      { transform: 'translateY(0) scale(1)' },
    ],
    260,
  );
}

/**
 * Délka počítadla skóre (ms při 1×) podle přírůstku: malé číslo doběhne rychle, miliony déle — ale nikdy přes
 * 1 s, ať hráč nečeká.
 */
export function countDuration(delta: number): number {
  const d = Math.abs(delta);
  if (!Number.isFinite(d) || d < 1) return 0;
  return Math.round(Math.min(1000, 420 + 110 * Math.log10(Math.max(10, d))));
}

/** Plynulé zpomalení na konci (exponenciální ease-out — čísla „dojíždějí“ jako počítadlo benzínu). */
function easeOutExpo(p: number): number {
  return p >= 1 ? 1 : 1 - 2 ** (-10 * p);
}

/**
 * Počítadlo „tik tik“: číslo v prvku doběhne z `from` na `to` (rychlost hry, přeskočení mezerníkem i vypnuté
 * animace respektuje — pak rovnou ukáže cíl). Text se přepisuje jen při změně; během počítání má prvek třídu
 * `is-counting` (CSS ho jemně zvětší).
 */
export function tickNumber(
  anim: AnimQueue,
  el: Element | null | undefined,
  from: number,
  to: number,
  ms: number,
  format: (n: number) => string = formatNumber,
): Promise<void> {
  if (!el) return Promise.resolve();
  const duration = anim.duration(ms);
  if (duration <= 0 || from === to || !Number.isFinite(from) || !Number.isFinite(to)) {
    el.textContent = format(to);
    return Promise.resolve();
  }
  const start = performance.now();
  let shown = '';
  el.classList.add('is-counting');
  return new Promise((resolve) => {
    const step = (now: number): void => {
      const p = anim.instant ? 1 : Math.min(1, (now - start) / duration);
      const text = format(p >= 1 ? to : Math.floor(from + (to - from) * easeOutExpo(p)));
      if (text !== shown) {
        shown = text;
        el.textContent = text;
      }
      if (p >= 1) {
        el.classList.remove('is-counting');
        resolve();
      } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// ─────────────────────────── Skórování ───────────────────────────

/** Délka rychlého kroku skórování (ms při 1×: základ kombinace, čipy hodnoty karty) — dlouhé řetězy se zrychlují. */
export function stepDuration(steps: number): number {
  return Math.max(150, Math.min(380, 520 - steps * 15));
}

/**
 * Délka kroku efektu (vylepšení, pečeť, edice, žolík, opakování; ms při 1×): aspoň ~0,5 s, ať se dá zaznamenat,
 * co se stalo — u dlouhých řetězů (víc než 10 efektů) se postupně zkracuje až na 0,3 s.
 */
export function effectStepDuration(effects: number): number {
  return Math.round(Math.max(300, Math.min(480, 480 - (effects - 10) * 12)));
}

/** Rychlý krok: čipy hodnoty karty bez hlášky (ostatní kroky jsou efekty s delší prodlevou). */
export function isQuickStep(step: ScoreStep): boolean {
  return step.source === 'card' && step.origin === 'rank' && !step.message;
}

function stepTarget(view: PresentView, step: ScoreStep): Element | null {
  if (step.source === 'joker' && step.jokerUid !== undefined) return view.jokerEl(step.jokerUid);
  if ((step.source === 'card' || step.source === 'held') && step.cardId !== undefined)
    return view.cardEl(step.cardId);
  return view.handInfoEl();
}

/** Klíč zdroje kroku pro bubliny (nový nápis u stejného zdroje odsune starší). */
function stepAnchor(step: ScoreStep): string {
  if (step.source === 'joker') return `joker:${step.jokerUid ?? ''}`;
  if (step.cardId !== undefined) return `card:${step.cardId}`;
  return step.source;
}

/** Popisek zdroje efektu karty pod nápisem: název vylepšení, pečeti nebo edice („Zlatá pečeť“). */
function originCaption(view: PresentView, batch: Batch, step: ScoreStep): string | undefined {
  if (step.cardId === undefined || (step.source !== 'card' && step.source !== 'held')) return undefined;
  const card = shownCard(view, batch, step.cardId);
  if (!card) return undefined;
  if (step.origin === 'enhancement' && card.enhancement) return t(`enhancements.${card.enhancement}.name`);
  if (step.origin === 'seal' && card.seal) return t(`seals.${card.seal}.name`);
  if (step.origin === 'edition' && card.edition) return t(`editions.${card.edition}.name`);
  return undefined;
}

/** Časování kroků jedné ruky. */
interface StepTiming {
  quick: number;
  effect: number;
}

function stepTiming(steps: readonly ScoreStep[]): StepTiming {
  const effects = steps.filter((s) => s.source !== 'hand' && !isQuickStep(s)).length;
  return { quick: stepDuration(steps.length), effect: effectStepDuration(effects) };
}

async function presentStep(
  view: PresentView,
  step: ScoreStep,
  timing: StepTiming,
  batch: Batch,
): Promise<void> {
  const anim = view.anim;
  const money = batch.money;
  soundScoreStep(step, anim);
  if (step.source === 'hand') {
    view.setChipsMult(step.chipsAfter, step.multAfter);
    void pop(anim, view.handInfoEl(), 1.05);
    await anim.wait(timing.quick);
    return;
  }
  // Šéf přepočítal výsledek (Pan starosta): hláška uprostřed stolu u zahraných karet — nad náhledem kombinace v levém
  // panelu by zakryla číslo Skóre kola.
  const bossStep = step.source === 'boss';
  const target = bossStep ? (view.tableEl() ?? stepTarget(view, step)) : stepTarget(view, step);
  const quick = isQuickStep(step);
  const again = step.message === MSG.again;
  // Nejdřív změřit (zdroj kroku, peníze), pak zapisovat — bubliny, mince i částice použijí stejné obdélníky.
  const rect = anim.instant ? null : measure(target);
  const moneyRect = step.money && !anim.instant ? measure(view.moneyEl()) : null;
  const cardOfJoker = step.source === 'joker' && step.cardId !== undefined ? view.cardEl(step.cardId) : null;
  if (bossStep) {
    const msg = messageText(step.message);
    if (msg) bubble(view, rect, msg, 'bad', { big: true });
  } else {
    // Zdroj výrazně poskočí (×mult a opakování ještě víc); čipy hodnoty karty jen lehce.
    void trigger(anim, target, step.xmult || again ? 'strong' : quick ? 'soft' : 'normal');
    if (cardOfJoker) void trigger(anim, cardOfJoker, 'soft');
    if (step.origin && step.origin !== 'rank') {
      const card = step.cardId !== undefined ? shownCard(view, batch, step.cardId) : undefined;
      flashOrigin(anim, target, step.origin, originColor(view, card, step.origin));
    }
    const anchor = stepAnchor(step);
    let caption = originCaption(view, batch, step);
    let offset = 0;
    const add = (text: string, tone: Parameters<typeof bubble>[3]): void => {
      bubble(view, rect, text, tone, {
        fx: true,
        quick,
        caption,
        offset,
        anchor: offset ? undefined : anchor,
      });
      caption = undefined;
      offset += FX_LINE;
    };
    const msg = messageText(step.message);
    if (msg) {
      if (again) add(msg, 'again');
      else {
        bubble(view, rect, msg, 'message', { offset });
        offset += 26;
      }
    }
    if (step.chips) add(t('game.bubble.chips', { n: step.chips }), 'chips');
    if (step.mult) add(t('game.bubble.mult', { n: step.mult }), 'mult');
    if (step.xmult) add(t('game.bubble.xmult', { n: step.xmult }), 'xmult');
    if (step.money) add(t('game.bubble.money', { n: step.money }), step.money > 0 ? 'money' : 'bad');
  }
  if (step.money) {
    money.value += step.money;
    view.particles.coins(rect, 3, step.money > 0 ? 'up' : 'down');
    // Mince letí k panelu Peníze; když doletí, panel poskočí a číslo se přičte.
    const landed =
      step.money > 0 ? flyCoins(view.fxLayer(), anim, rect, moneyRect, Math.min(6, 2 + step.money)) : null;
    if (!landed || anim.instant) view.setMoney(money.value);
    else
      void landed.then(() => {
        view.setMoney(money.value);
        void trigger(anim, view.moneyEl(), 'normal');
      });
  }
  if (rect && !bossStep) {
    // ×mult = plamínky (síla podle násobku), +čipy / +mult = obláček v barvě.
    if (step.xmult) view.particles.xmult(rect, Math.min(2, 0.7 + (step.xmult - 1) * 0.6));
    else if (step.mult) view.particles.puff(rect, 'mult');
    if (step.chips) view.particles.puff(rect, 'chips', quick ? 5 : 9);
    if (again) view.particles.sparkle(rect, 0, 12);
  }
  view.setChipsMult(step.chipsAfter, step.multAfter);
  if (step.chips) void pop(anim, view.chipsEl?.(), 1.25);
  if (step.mult || step.xmult) void pop(anim, view.multEl?.(), step.xmult ? 1.4 : 1.25);
  // Peníze: krok počká, než mince doletí (aspoň zčásti), ať se nepřekrývá s dalším efektem.
  const wait = quick ? timing.quick : timing.effect;
  await anim.wait(step.money ? Math.max(wait, COIN_FLIGHT_MS * 0.8) : wait);
}

/** Události, které zahraná ruka přehraje v okamžiku, kdy nastaly (změny karet a úrovně během skórování). */
function handDeferred(batch: Batch, events: readonly GameEvent[]): (GameEvent & { scoreStep?: number })[] {
  return events.filter((e) => batch.deferred.has(e)) as (GameEvent & { scoreStep?: number })[];
}

async function presentDeferred(view: PresentView, e: GameEvent, batch: Batch): Promise<void> {
  soundForEvent(e, view.anim);
  if (e.type === 'cardChanged') await presentCardChange(view, e, batch);
  else if (e.type === 'handLeveled') await presentLevelUp(view, e, batch, { keep: true });
}

/** Zahraná ruka: karty na stůl, kroky skórování, výsledek, přičtení ke skóre kola, úklid stolu. */
async function presentHand(
  view: PresentView,
  result: ScoreResult,
  roundScore: number,
  batch: Batch,
  events: readonly GameEvent[],
): Promise<void> {
  const anim = view.anim;
  const c = view.controller;
  const table = view.tableEl();
  view.hideBossIntro?.();
  const els = result.playedIds
    .map((id) => [id, view.cardEl(id)] as const)
    .filter((p): p is readonly [number, HTMLElement] => p[1] !== null);

  // 1) FLIP: změř karty v ruce, přesuň je na stůl, změř znovu a odanimuj rozdíl.
  const before = els.map(([, el]) => el.getBoundingClientRect());
  for (const [id, el] of els) {
    const card = c.engine.card(id);
    if (card) updateCardView(el, card, { selected: false, keyHint: undefined });
    else el.classList.remove('is-selected');
    el.classList.add('is-played');
    el.classList.toggle('is-scoring', result.hand.scoringIds.includes(id));
    el.tabIndex = -1;
    table?.appendChild(el);
  }
  const after = els.map(([, el]) => el.getBoundingClientRect());
  await Promise.all(
    els.map(([, el], i) => {
      const dx = (before[i]?.left ?? 0) - (after[i]?.left ?? 0);
      const dy = (before[i]?.top ?? 0) - (after[i]?.top ?? 0);
      return animate(anim, el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], 340, {
        delay: i * 45,
      });
    }),
  );

  // 2) Kombinace a kroky skórování. Změny karet a úrovní během skórování (žolíci) se ukážou ve chvíli, kdy nastaly
  // (`scoreStep`), ostatní (kupón po ruce) až po skórování.
  const deferred = handDeferred(batch, events);
  const type = result.hand.type;
  const levelDelta = deferred.reduce(
    (n, e) => (e.type === 'handLeveled' && e.hand === type ? n + e.delta : n),
    0,
  );
  const level = (c.state.handLevels[type]?.level ?? 1) - levelDelta;
  view.showScoring({ hand: type, level, chips: 0, mult: 0 });
  await anim.wait(180);
  const timing = stepTiming(result.steps);
  let shownLevel = level;
  for (let i = 0; i < result.steps.length; i++) {
    const now = deferred.filter((e) => e.scoreStep === i);
    for (const e of now) await presentDeferred(view, e, batch);
    const leveled = now.filter(
      (e): e is Extract<GameEvent, { type: 'handLeveled' }> => e.type === 'handLeveled',
    );
    if (leveled.length > 0) {
      // Levý panel zase patří zahrané ruce (na nové úrovni) s průběžnými čipy a multem.
      shownLevel += leveled.reduce((n, e) => (e.hand === type ? n + e.delta : n), 0);
      const prev = result.steps[i - 1];
      view.showScoring({
        hand: type,
        level: shownLevel,
        chips: prev?.chipsAfter ?? 0,
        mult: prev?.multAfter ?? 0,
      });
    }
    await presentStep(view, result.steps[i]!, timing, batch);
  }
  for (const e of deferred)
    if (e.scoreStep === undefined || e.scoreStep >= result.steps.length)
      await presentDeferred(view, e, batch);
  batch.levelShown = false;

  // 3) Výsledek ruky.
  const target = c.state.round?.target ?? Infinity;
  const handName = t(`hands.${result.hand.type}.name`);
  if (result.blockedReason) {
    const reason = messageText(result.blockedReason) ?? '';
    bubble(view, table, reason, 'bad', { big: true });
    say(t('game.events.blocked', { reason }), 'warning');
  } else {
    // Velké skóre (DESIGN 13.6): ruka sama dosáhla cíle kola — obří bublina, záblesk, jiskry, silný shake podle
    // převýšení. Od poloviny cíle jen lehké „ťuknutí“.
    const big = result.score >= target;
    const tableRect = anim.instant ? null : measure(table);
    bubble(view, tableRect, t('game.bubble.score', { n: result.score }), 'score', { big: true, huge: big });
    const shake = shakeForScore(result.score, target);
    if (big) {
      sound('bigScore');
      const strength = Math.min(1, 0.45 + 0.35 * Math.log10(result.score / target + 1));
      // „To je rána!“ nad obří bublinou (ne přes počítadlo skóre v liště).
      if (tableRect)
        bubble(
          view,
          {
            left: tableRect.left,
            top: tableRect.top + tableRect.height / 2 - 46,
            width: tableRect.width,
            height: 1,
          },
          t('game.events.bigScore'),
          'score',
        );
      view.bigScore?.(strength);
      view.particles.bigScore(tableRect, strength);
    }
    if (shake > 0) view.shake(shake);
  }
  view.announce(t('game.events.scoredLive', { hand: handName, score: result.score, round: roundScore }));
  await tickNumber(
    anim,
    view.roundScoreEl(),
    roundScore - result.score,
    roundScore,
    countDuration(result.score),
  );
  await anim.wait(250);

  // 4) Zničené karty (sklo) se roztříští, ostatní odjedou ze stolu. Obdélníky zničených karet se změří najednou.
  const destroyed = new Set(result.destroyedCardIds);
  const broken = anim.instant ? [] : els.filter(([id]) => destroyed.has(id)).map(([, el]) => el);
  const brokenRects = broken.map((el) => measure(el));
  if (els.some(([id]) => destroyed.has(id))) sound('glassBreak');
  broken.forEach((el, i) => shatter(view, el, brokenRects[i] ?? null));
  if (broken.some((el) => el.classList.contains('enh-glass'))) view.shake(SHAKE.glass);
  await Promise.all(
    els.map(([id, el], i) => {
      if (destroyed.has(id)) {
        return animate(
          anim,
          el,
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(0.6)' },
          ],
          260,
        );
      }
      return animate(
        anim,
        el,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translate(60px, -40px) rotate(8deg)' },
        ],
        280,
        { easing: 'ease-in', delay: i * 30 },
      );
    }),
  );
  for (const [, el] of els) el.remove();
  view.showScoring(null);
}

/** Zahozené karty odletí z ruky. */
async function presentDiscard(view: PresentView, ids: readonly number[]): Promise<void> {
  view.hideBossIntro?.();
  const els = ids.map((id) => view.cardEl(id)).filter((el): el is HTMLElement => el !== null);
  await Promise.all(
    els.map((el, i) =>
      animate(
        view.anim,
        el,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translate(160px, 70px) rotate(22deg)' },
        ],
        300,
        { easing: 'ease-in', delay: i * 35 },
      ),
    ),
  );
  for (const el of els) el.remove();
}

/** Nově líznuté karty přiletí z balíčku. */
async function presentDraw(view: PresentView, ids: readonly number[]): Promise<void> {
  view.refresh();
  const deck = view.deckEl()?.getBoundingClientRect();
  const els = ids.map((id) => view.cardEl(id)).filter((el): el is HTMLElement => el !== null);
  if (!deck || els.length === 0) return;
  const rects = els.map((el) => el.getBoundingClientRect());
  await Promise.all(
    els.map((el, i) => {
      const r = rects[i]!;
      const dx = deck.left + deck.width / 2 - (r.left + r.width / 2);
      const dy = deck.top + deck.height / 2 - (r.top + r.height / 2);
      return animate(
        view.anim,
        el,
        [
          { opacity: 0, transform: `translate(${dx}px, ${dy}px) rotate(-10deg) scale(0.7)` },
          { opacity: 1, transform: 'none' },
        ],
        380,
        { delay: i * 60 },
      );
    }),
  );
}

/** Rozbitá karta: skleněná se roztříští na střepy, ostatní se rozpadnou v prach. */
function shatter(view: PresentView, el: Element, rect: RectLike | null): void {
  if (el.classList.contains('enh-glass')) view.particles.glass(rect);
  else view.particles.dust(rect);
}

// ─────────────────────────── Presenter ───────────────────────────

/** Vytvoří presenter pro herní obrazovku. */
export function createPresenter(view: PresentView): Presenter {
  return (events) =>
    view.anim.sequence(async () => {
      const batch = prepareBatch(view, events);
      try {
        // Použitá spotřebka odletí ze slotu hned (její událost přijde až za efekty).
        await presentConsumableUse(view, events, batch);
        for (let i = 0; i < events.length; i++) {
          const e = events[i]!;
          if (batch.deferred.has(e)) continue;
          await presentEvent(view, e, batch, events);
          // Animace nové úrovně v náhledu kombinace skončila — zpátky na živý náhled (další úroveň ho ukáže znovu).
          if (batch.levelShown && events[i + 1]?.type !== 'handLeveled') {
            view.showScoring(null);
            batch.levelShown = false;
          }
        }
        await finishBatch(view, batch);
      } finally {
        releaseHolds(batch);
      }
    });
}

async function presentEvent(
  view: PresentView,
  e: GameEvent,
  batch: Batch,
  events: readonly GameEvent[],
): Promise<void> {
  const anim = view.anim;
  if (!batch.silenced.has(e)) soundForEvent(e, anim);
  const money = batch.money;
  switch (e.type) {
    case 'blindSelected': {
      // Příchod šéfa (u Velké útraty na Imperialu jeho pravidlo navíc): plakát nad stolem + hlášení čtečce.
      const reg = view.controller.registry;
      if (!e.bossId || !reg.bosses[e.bossId]) return;
      const tx = bossTexts(e.bossId, { registry: reg });
      view.showBossIntro?.(e.bossId, e.blind);
      view.shake(SHAKE.boss);
      view.announce(
        t('game.events.bossArrived', { name: tx.name, rule: tx.rule, intro: tx.intro ?? '' }).trim(),
      );
      await anim.wait(900);
      return;
    }
    case 'blindSkipped': {
      // Hláška se žetonem štítku. Štítek použitý hned (peníze, obálka) se ohlásí tady i s tím, co udělal — jeho
      // `tagTriggered` v téže dávce se pak už neopakuje; jinak štítek čeká v horní liště.
      const reg = view.controller.registry;
      if (!e.tagId || !reg.tags[e.tagId]) {
        say(t('game.events.skipped'));
        return;
      }
      const tx = tagTexts(e.tagId, { registry: reg });
      const now = batch.tagsTriggered.has(e.tagId);
      if (now) batch.announced.add(e.tagId);
      toast(now ? tx.desc : t('game.events.skippedTag', { tag: tx.name }), {
        kind: now ? 'success' : 'info',
        title: now ? t('game.events.skippedTag', { tag: tx.name }) : undefined,
        media: createContentCard('tag', e.tagId, { registry: reg, tooltip: false }),
        className: 'toast--tag',
        testId: 'toast-game-info',
      });
      return;
    }
    case 'jokerDebuffChanged': {
      // Šéf žolíka vypnul (Exekutor, Krajský úřad, Jednooký hejtman…) nebo ho zase pustil (Výpadek proudu po první
      // ruce). Na konci kola se vypnutí ruší všem naráz — to už se neohlašuje.
      if (!e.debuffed && view.controller.state.phase !== 'round') return;
      const el = view.jokerEl(e.uid);
      void pop(anim, el);
      bubble(
        view,
        el,
        t(e.debuffed ? 'game.bubble.jokerOff' : 'game.bubble.jokerOn'),
        e.debuffed ? 'bad' : 'message',
      );
      await anim.wait(220);
      return;
    }
    case 'cardsDrawn':
      return presentDraw(view, e.cardIds);
    case 'handPlayed':
      return presentHand(view, e.result, e.roundScore, batch, events);
    case 'cardsDiscarded':
      return presentDiscard(view, e.cardIds);
    case 'cardDestroyed':
      return presentCardDestroyed(view, e);
    case 'cardChanged':
      return presentCardChange(view, e, batch);
    case 'cardAdded':
      return presentCardAdded(view, e, batch, events);
    case 'handShuffled':
      view.refresh();
      return;
    case 'roundWon': {
      const table = measure(view.tableEl());
      bubble(view, table, t('game.events.roundWon'), 'score', { big: true });
      view.particles.coins(table, 16);
      await anim.wait(700);
      return;
    }
    case 'roundRewards':
      return presentRoundRewards(view, e, batch);
    case 'gameOver':
      await anim.wait(500);
      return;
    case 'victory':
      view.refresh();
      view.particles.confetti();
      await anim.wait(400);
      return;
    case 'moneyChanged': {
      // Peníze ze skórování ukazují kroky (bublina + mince k panelu); ostatní změny tady.
      if (e.reason === 'score') return;
      const el = view.moneyEl();
      const rect = anim.instant ? null : measure(el);
      // Výplata / prodej = mince vyletí, placení (Večerka, šéf, úrok dluhu) = mince padají. Změřit před zápisem.
      if (e.delta !== 0)
        view.particles.coins(
          rect,
          e.delta > 0 ? Math.min(18, 4 + e.delta) : Math.min(8, 2 - e.delta),
          e.delta > 0 ? 'up' : 'down',
        );
      // Peníze z efektu (spotřebka, žolík, šéf): nápis u panelu Peníze; nákup a prodej ukazuje Večerka sama.
      if (e.delta !== 0 && e.reason !== 'purchase' && e.reason !== 'sell')
        bubble(view, rect, t('game.bubble.money', { n: e.delta }), e.delta > 0 ? 'money' : 'bad', {
          fx: true,
          quick: true,
          anchor: 'money',
        });
      money.value = e.money;
      view.setMoney(e.money);
      void trigger(anim, el, e.delta > 0 ? 'normal' : 'soft');
      return;
    }
    case 'jokerTriggered': {
      const text = messageText(e.message);
      const el = view.jokerEl(e.uid);
      void trigger(anim, el, 'normal');
      if (text) bubble(view, el, text, 'message');
      await anim.wait(text ? 450 : 200);
      return;
    }
    case 'jokerSold':
      view.particles.coins(view.jokerEl(e.uid), 8);
      say(t('game.joker.sold', { price: e.price }), 'success');
      return;
    case 'jokerDestroyed': {
      const el = view.jokerEl(e.uid);
      view.particles.dust(el);
      await crumble(anim, el);
      return;
    }
    case 'jokerChanged':
      return presentJokerChanged(view, e);
    case 'jokerAdded':
      noteJokerAdded(e, batch, events);
      return;
    case 'consumableAdded':
      noteConsumableAdded(view, e, batch, events);
      return;
    case 'consumableUsed':
      // Hláška jen u spotřebky bez viditelného efektu (peníze, nový žolík…); změny karet a úrovní jsou vidět samy.
      if (!hasVisibleEffect(events) || anim.instant)
        say(t('game.consumable.used', { name: t(`consumables.${e.defId}.name`) }), 'success');
      return;
    case 'handLeveled':
      return presentLevelUp(view, e, batch);
    case 'handDiscovered': {
      // Tajná kombinace: hláška jmenuje i její pranostiku, kterou nabídne nejbližší Večerka (src/engine/shop/shop.ts).
      const hand = t(`hands.${e.hand}.name`);
      const pran = Object.values(view.controller.registry.consumables).find(
        (d) => d.kind === 'pranostika' && d.hand === e.hand,
      );
      say(
        pran
          ? t('game.events.discoveredPranostika', { hand, pranostika: t(`consumables.${pran.id}.name`) })
          : t('game.events.discovered', { hand }),
        'success',
      );
      return;
    }
    case 'anteChanged':
      say(t('game.events.ante', { ante: e.ante }));
      return;
    case 'bossDefeated': {
      const reg = view.controller.registry;
      if (!reg.bosses[e.bossId]) return;
      const tx = bossTexts(e.bossId, { registry: reg });
      toast(tx.defeat ? t('art.tooltip.flavor', { text: tx.defeat }) : t('game.events.bossDefeated'), {
        kind: 'success',
        title: t('game.events.bossDefeatedTitle', { name: tx.name }),
        media: blindArt('boss', e.bossId, { registry: reg }),
        className: 'toast--boss',
        testId: 'toast-boss-defeat',
      });
      return;
    }
    case 'tagTriggered': {
      // Štítek se právě použil (spotřeboval) — co udělal. Hned po přeskočení ho už ohlásilo `blindSkipped`.
      const reg = view.controller.registry;
      if (!reg.tags[e.defId] || batch.announced.delete(e.defId)) return;
      const tx = tagTexts(e.defId, { registry: reg });
      toast(tx.desc, {
        kind: 'success',
        title: t('game.events.tagTriggered', { name: tx.name }),
        media: createContentCard('tag', e.defId, { registry: reg, tooltip: false }),
        className: 'toast--tag',
        testId: 'toast-tag',
      });
      return;
    }
    case 'endlessStarted':
      say(t('game.victory.endlessStarted'), 'warning');
      return;
    case 'message': {
      const text = messageText(e.key, e.params);
      if (text) say(text);
      return;
    }
    default:
      return;
  }
}

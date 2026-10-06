/**
 * Horní řada: žolíci (x/sloty) a spotřebky (x/sloty) — DESIGN 13.2.
 *
 * - Žolíci: klik = detail s Prodat a posunem, tažení myší i prstem = změna pořadí (`reorderJokers`) přes
 *   `attachDragSort` (společné s rukou): čistě transform, po puštění se uzly přeskládají hned (bez probliknutí),
 *   žolík dosedne na místo a pošle se akce.
 * - Spotřebky: klik = detail s Použít (vybrané karty v ruce jako cíle) a Prodat.
 * - Klíčované překreslování: prvek žolíka se překreslí jen při změně vzhledu nebo ceny.
 * Funguje obecně pro libovolný obsah z registru (žolíky doplňuje jiný workflow).
 */
import type { ConsumableInstance, JokerInstance } from '../../../engine';
import { t } from '../../../i18n/cs';
import { createConsumableCard } from '../../components/consumableCard';
import { attachDragSort } from '../../components/dragSort';
import { createJokerCard, updateJokerCard } from '../../components/jokerCard';
import { hideTooltip } from '../../components/tooltip';
import { copyTargetUid } from '../../describe';
import { h } from '../../dom';
import { animate } from '../../anim/animate';
import type { GameCtx } from './shared';
import { consumableSlots, jokerSlots } from './shared';

export interface TopRow {
  el: HTMLElement;
  update(): void;
  jokerEl(uid: number): HTMLElement | null;
  consumableEl(uid: number): HTMLElement | null;
  /** Překreslí jednoho žolíka podle stavu (presenter: proměna / nová edice uprostřed otočení). */
  redrawJoker(uid: number): void;
  /** Řada žolíků a kapsa spotřebek (cíl letu nových položek). */
  jokerRow: HTMLElement;
  consumableRow: HTMLElement;
}

export interface TopRowActions {
  openJoker(uid: number): void;
  openConsumable(uid: number): void;
}

interface Item {
  li: HTMLElement;
  card: HTMLElement;
  sig: string;
}

export function createTopRow(ctx: GameCtx, actions: TopRowActions): TopRow {
  const c = ctx.controller;

  const jokerCount = h('span', { class: 'gt-count', 'data-testid': 'joker-count' });
  const jokerList = h('ul', {
    class: 'gt-row gt-row--jokers',
    role: 'list',
    'aria-describedby': 'gt-drag-hint',
    'data-testid': 'joker-row',
  });
  const jokerEmpty = h('p', { class: 'gt-empty' }, t('game.rows.jokersEmpty'));
  const consCount = h('span', { class: 'gt-count', 'data-testid': 'consumable-count' });
  const consList = h('ul', {
    class: 'gt-row gt-row--consumables',
    role: 'list',
    'data-testid': 'consumable-row',
  });
  const consEmpty = h('p', { class: 'gt-empty' }, t('game.rows.consumablesEmpty'));

  // Volná místa (sloty) jako čárkované obrysy pod kartami — hráč vidí, kolik se jich ještě vejde.
  const jokerSlotsEl = h('div', { class: 'gt-slots', 'aria-hidden': 'true' });
  const consSlotsEl = h('div', { class: 'gt-slots', 'aria-hidden': 'true' });
  const jokerGroup = h(
    'section',
    { class: 'gt-group gt-group--jokers', 'aria-labelledby': 'gt-jokers-title' },
    h('h2', { class: 'gt-title', id: 'gt-jokers-title' }, t('game.rows.jokers'), ' ', jokerCount),
    h('div', { class: 'gt-stack' }, jokerSlotsEl, jokerList, jokerEmpty),
    h('p', { class: 'visually-hidden', id: 'gt-drag-hint' }, t('game.rows.dragHint')),
  );
  const consGroup = h(
    'section',
    { class: 'gt-group gt-group--consumables', 'aria-labelledby': 'gt-cons-title' },
    h('h2', { class: 'gt-title', id: 'gt-cons-title' }, t('game.rows.consumables'), ' ', consCount),
    h('div', { class: 'gt-stack' }, consSlotsEl, consList, consEmpty),
  );

  /** Počet obrysů slotů (nejméně tolik, kolik je karet — negativní edice přidává místa). */
  const syncSlots = (host: HTMLElement, slots: number, items: number): void => {
    const n = Math.max(slots, items, 0);
    host.parentElement?.style.setProperty('--slots', String(Math.max(1, n)));
    while (host.childElementCount < n) host.append(h('span', { class: 'gt-slot' }));
    while (host.childElementCount > n) host.lastElementChild?.remove();
  };
  const el = h('section', { class: 'game-top' }, jokerGroup, consGroup);

  const jokers = new Map<number, Item>();
  const consumables = new Map<number, Item>();

  // ─────────────── Žolíci ───────────────

  type Copying = { defId: string; dir: -1 | 1 } | null;

  const jokerSig = (
    j: Readonly<JokerInstance>,
    debuffed: boolean,
    sell: number,
    copying: Copying,
    copiedBy: readonly string[],
  ): string =>
    `${j.defId}|${j.edition ?? ''}|${j.debuffed ? 1 : 0}|${debuffed ? 1 : 0}|${j.stickers.join(',')}|${
      j.perishRounds ?? ''
    }|${sell}|${copying ? `${copying.defId}${copying.dir}` : ''}|${copiedBy.join(',')}`;

  /** Kdo koho kopíruje (Napodobitel): kopírující → cíl a směr, cíl → seznam kopírujících. */
  const copyMap = (): { copying: Map<number, Copying>; copiedBy: Map<number, string[]> } => {
    const s = c.state;
    const copying = new Map<number, Copying>();
    const copiedBy = new Map<number, string[]>();
    s.jokers.forEach((j, i) => {
      const uid = copyTargetUid(s, j, ctx.registry);
      if (uid === null) return;
      const ti = s.jokers.findIndex((x) => x.uid === uid);
      const target = s.jokers[ti];
      if (!target) return;
      copying.set(j.uid, { defId: target.defId, dir: ti < i ? -1 : 1 });
      copiedBy.set(uid, [...(copiedBy.get(uid) ?? []), j.defId]);
    });
    return { copying, copiedBy };
  };

  const updateJokers = (): void => {
    const s = c.state;
    const roundDebuffs = s.round?.jokerDebuffs ?? [];
    const copies = copyMap();
    const seen = new Set<number>();
    const order: HTMLElement[] = [];
    for (const j of s.jokers) {
      seen.add(j.uid);
      const debuffed = roundDebuffs.includes(j.uid);
      const sell = c.engine.sellValue(j.uid);
      const copying = copies.copying.get(j.uid) ?? null;
      const copiedBy = copies.copiedBy.get(j.uid) ?? [];
      const sig = jokerSig(j, debuffed, sell, copying, copiedBy);
      let item = jokers.get(j.uid);
      if (!item) {
        const card = createJokerCard(j, {
          registry: ctx.registry,
          debuffed,
          sellValue: sell,
          mods: c.engine.modifiers(),
          run: () => c.state,
          copying,
          copiedBy,
          // Klik po tažení pohltí `attachDragSort` (fáze capture), sem dojde jen skutečný klik.
          onClick: (joker) => actions.openJoker(joker.uid),
        });
        card.dataset.jokerUid = String(j.uid);
        const li = h('li', { class: 'gt-item', 'data-uid': j.uid }, card);
        item = { li, card, sig };
        jokers.set(j.uid, item);
      } else if (item.sig !== sig) {
        updateJokerCard(item.card, j, {
          debuffed,
          sellValue: sell,
          mods: c.engine.modifiers(),
          copying,
          copiedBy,
        });
        item.card.dataset.jokerUid = String(j.uid);
        item.sig = sig;
      }
      order.push(item.li);
    }
    for (const [uid, item] of jokers) {
      if (!seen.has(uid)) {
        item.li.remove();
        jokers.delete(uid);
      }
    }
    syncOrder(jokerList, order);
    jokerCount.textContent = t('game.rows.count', { n: s.jokers.length, max: jokerSlots(ctx) });
    syncSlots(jokerSlotsEl, jokerSlots(ctx), s.jokers.length);
    jokerList.setAttribute(
      'aria-label',
      t('game.rows.jokersLabel', { n: s.jokers.length, max: jokerSlots(ctx) }),
    );
    jokerEmpty.hidden = s.jokers.length > 0;
  };

  // ─────────────── Spotřebky ───────────────

  const consSig = (x: Readonly<ConsumableInstance>, sell: number): string =>
    `${x.defId}|${x.edition ?? ''}|${sell}`;

  const updateConsumables = (): void => {
    const s = c.state;
    const seen = new Set<number>();
    const order: HTMLElement[] = [];
    for (const x of s.consumables) {
      seen.add(x.uid);
      const sell = c.engine.sellValue(x.uid);
      const sig = consSig(x, sell);
      let item = consumables.get(x.uid);
      if (!item || item.sig !== sig) {
        const card = createConsumableCard(x, {
          registry: ctx.registry,
          sellValue: sell,
          mods: c.engine.modifiers(),
          onClick: () => actions.openConsumable(x.uid),
        });
        card.dataset.consumableUid = String(x.uid);
        if (item) {
          item.card.replaceWith(card);
          item.card = card;
          item.sig = sig;
        } else {
          item = { li: h('li', { class: 'gt-item' }, card), card, sig };
          consumables.set(x.uid, item);
        }
      }
      order.push(item.li);
    }
    for (const [uid, item] of consumables) {
      if (!seen.has(uid)) {
        item.li.remove();
        consumables.delete(uid);
      }
    }
    syncOrder(consList, order);
    consCount.textContent = t('game.rows.count', { n: s.consumables.length, max: consumableSlots(ctx) });
    syncSlots(consSlotsEl, consumableSlots(ctx), s.consumables.length);
    consList.setAttribute(
      'aria-label',
      t('game.rows.consumablesLabel', { n: s.consumables.length, max: consumableSlots(ctx) }),
    );
    consEmpty.hidden = s.consumables.length > 0;
  };

  // ─────────────── Tažení žolíků (myš i dotyk) ───────────────

  const sorter = attachDragSort(jokerList, {
    item: (target) => {
      const li = target.closest<HTMLElement>('.gt-item');
      return li && li.parentElement === jokerList ? li : null;
    },
    canStart: () => !c.busy && c.state.jokers.length > 1,
    onStart: () => hideTooltip(),
    settle: (li, dx) =>
      void animate(ctx.app.anim, li, [{ translate: `${dx}px 0` }, { translate: '0 0' }], 160),
    onDrop: (ordered) => {
      const uids = ordered.map((li) => Number(li.dataset.uid));
      void ctx.act({ type: 'reorderJokers', uids });
    },
  });

  return {
    el,
    update() {
      if (sorter.dragging) return;
      updateJokers();
      updateConsumables();
    },
    jokerEl: (uid) => jokers.get(uid)?.card ?? null,
    consumableEl: (uid) => consumables.get(uid)?.card ?? null,
    redrawJoker(uid) {
      const item = jokers.get(uid);
      const j = c.state.jokers.find((x) => x.uid === uid);
      if (!item || !j) return;
      updateJokerCard(item.card, j, {
        debuffed: (c.state.round?.jokerDebuffs ?? []).includes(uid),
        sellValue: c.engine.sellValue(uid),
        mods: c.engine.modifiers(),
      });
      item.card.dataset.jokerUid = String(uid);
      // Podpis se nechá starý — další překreslení řady žolíka srovná se vším ostatním (kopírování, nálepky).
    },
    jokerRow: jokerList,
    consumableRow: consList,
  };
}

/** Seřadí děti kontejneru podle pole (přesouvá jen to, co je jinde). */
export function syncOrder(container: HTMLElement, order: readonly HTMLElement[]): void {
  order.forEach((node, i) => {
    if (container.children[i] !== node) container.insertBefore(node, container.children[i] ?? null);
  });
}

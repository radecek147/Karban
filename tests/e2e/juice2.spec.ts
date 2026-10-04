import { expect, test, type Page } from '@playwright/test';
import { t } from '../../src/i18n/cs';
import {
  consumable,
  continueRun,
  expectCleanConsole,
  handCard,
  idle,
  presetSettings,
  roundState,
  seedSavedRun,
  selectByKeys,
  watchConsole,
} from './helpers';

/**
 * Šťáva 2 (docs/DECISIONS.md 2026-10-04) v prohlížeči — viewport 1366 × 768:
 *  1. karta se zlatou pečetí při skórování poskočí (třída `is-triggered`), pečeť se zvýrazní a nad kartou je velký
 *     nápis „+2 Kč“ s popiskem „Zlatá pečeť“,
 *  2. babská rada (Heřmánek) na dvou kartách: karty se otočí, nad nimi „Prémiová karta!“ a na konci jsou prémiové,
 *  3. `prefers-reduced-motion`: nápisy zůstanou (kratší, bez pohybu).
 * Konzole bez chyb a varování.
 */

interface FxRecord {
  bubbles: { cls: string; text: string; caption: string }[];
  triggered: string[];
  flashes: string[];
}

/** Záznam přidaných bublin, záblesků a karet / žolíků se třídou spuštění. */
async function recordFx(page: Page): Promise<void> {
  await page.evaluate(() => {
    const rec: FxRecord = { bubbles: [], triggered: [], flashes: [] };
    (window as unknown as { __fx: FxRecord }).__fx = rec;
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'attributes') {
          const el = m.target as HTMLElement;
          if (el.classList.contains('is-triggered')) {
            const id = el.dataset.cardId ? `card:${el.dataset.cardId}` : el.className.split(' ')[0]!;
            if (!rec.triggered.includes(id)) rec.triggered.push(id);
          }
          continue;
        }
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.classList.contains('game-bubble'))
            rec.bubbles.push({
              cls: node.className,
              text: node.querySelector('.game-bubble__text')?.firstChild?.textContent ?? '',
              caption: node.querySelector('.game-bubble__caption')?.textContent ?? '',
            });
          if (node.classList.contains('fx-flash')) rec.flashes.push(node.className);
        }
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
}

function fxRecord(page: Page): Promise<FxRecord> {
  return page.evaluate(() => (window as unknown as { __fx: FxRecord }).__fx);
}

test('zlatá pečeť při skórování: karta poskočí, pečeť blikne, velký nápis „+2 Kč“', async ({ page }) => {
  const log = watchConsole(page);
  await presetSettings(page, { speed: 2 });
  const state = roundState('JUICE2E1');
  const id = state.round!.hand[0]!;
  const card = state.deck.find((c) => c.id === id)!;
  card.seal = 'gold';
  card.enhancement = null;
  card.edition = null;
  await seedSavedRun(page, state);
  await continueRun(page);
  await recordFx(page);
  await selectByKeys(page, state.round!.hand, [id]);
  await page.keyboard.press('Enter');
  await idle(page);
  const rec = await fxRecord(page);
  const money = rec.bubbles.find((b) => b.cls.includes('game-bubble--money'));
  expect(money, 'bublina peněz').toBeDefined();
  expect(money!.cls).toContain('game-bubble--fx');
  expect(money!.text).toBe(t('game.bubble.money', { n: 2 }));
  expect(money!.caption).toBe(t('seals.gold.name'));
  expect(rec.triggered).toContain(`card:${id}`);
  expect(rec.flashes).toContain('fx-flash fx-flash--seal');
  // Peníze se přičetly (5 Kč na startu + 2 Kč).
  await expect(page.getByTestId('money')).toContainText('7');
  expectCleanConsole(log);
});

test('babská rada na kartách: otočení, „Prémiová karta!“ a nový vzhled', async ({ page }) => {
  const log = watchConsole(page);
  await presetSettings(page, { speed: 2 });
  const state = roundState('JUICE2E2', [consumable(9201, 'chamomile')]);
  const ids = state.round!.hand.slice(1, 3);
  for (const id of ids) state.deck.find((c) => c.id === id)!.enhancement = null;
  await seedSavedRun(page, state);
  await continueRun(page);
  await recordFx(page);
  await selectByKeys(page, state.round!.hand, ids);
  await page.getByTestId('consumable-row').locator('[data-consumable-uid="9201"]').click();
  await page.getByTestId('consumable-use').click();
  await idle(page);
  const rec = await fxRecord(page);
  const label = t('game.fx.change.enhancement', { name: t('enhancements.bonus.name') });
  expect(rec.bubbles.filter((b) => b.cls.includes('game-bubble--change')).map((b) => b.text)).toEqual([
    label,
    label,
  ]);
  for (const id of ids) {
    expect(rec.triggered).toContain(`card:${id}`);
    await expect(handCard(page, id)).toHaveClass(/enh-bonus/);
  }
  // Spotřebka odletěla ze slotu (duch) a ve slotu už není.
  await expect(page.getByTestId('consumable-row').locator('[data-consumable-uid="9201"]')).toHaveCount(0);
  expectCleanConsole(log);
});

test('omezený pohyb: nápisy zůstanou, jen bez pohybu', async ({ page }) => {
  const log = watchConsole(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await presetSettings(page, { speed: 1 });
  const state = roundState('JUICE2E3', [consumable(9202, 'notarized')]);
  const id = state.round!.hand[2]!;
  state.deck.find((c) => c.id === id)!.seal = null;
  await seedSavedRun(page, state);
  await continueRun(page);
  await recordFx(page);
  await selectByKeys(page, state.round!.hand, [id]);
  await page.getByTestId('consumable-row').locator('[data-consumable-uid="9202"]').click();
  await page.getByTestId('consumable-use').click();
  await idle(page);
  const rec = await fxRecord(page);
  expect(rec.bubbles.map((b) => b.text)).toContain(t('game.fx.change.seal', { name: t('seals.gold.name') }));
  // Nápis se v omezeném pohybu jen prolne (bez přestřelu a houpání).
  const anim = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'game-bubble game-bubble--fx game-bubble--change';
    el.innerHTML = '<span class="game-bubble__text">x</span>';
    document.querySelector('.game-fx')!.appendChild(el);
    const name = getComputedStyle(el.firstElementChild!).animationName;
    el.remove();
    return name;
  });
  expect(anim).toBe('bubble-calm');
  expectCleanConsole(log);
});

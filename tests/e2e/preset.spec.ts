import { expect, test, type Page } from '@playwright/test';
import { t } from '../../src/i18n/cs';
import { expectCleanConsole, idle, newState, readRun, seedSavedRun, watchConsole } from './helpers';

/**
 * Odkaz s ukázkovou sestavou žolíků (`?sestava=<id>`, src/main.ts, src/content/presets.ts): rovnou rozehraný
 * seedovaný run se sestavou ve slotech; parametr zmizí z adresy, rozehraná hra se bez potvrzení nepřepíše.
 */

const screen = (page: Page) => page.locator('#app');

test('?sestava=nejsilnejsi založí run s nejsilnější sestavou', async ({ page }) => {
  const log = watchConsole(page);
  await page.goto('/?sestava=nejsilnejsi&tutorial=off');
  await expect(screen(page)).toHaveAttribute('data-screen', 'game');
  await idle(page);
  await expect(page.getByTestId('joker-count')).toHaveText('5/5');
  await expect(page.getByTestId('toast-preset')).toContainText(t('jokers.fair_photographer.name'));
  // Parametr sestavy z adresy zmizí, ostatní zůstanou.
  expect(new URL(page.url()).searchParams.get('sestava')).toBeNull();
  expect(new URL(page.url()).searchParams.get('tutorial')).toBe('off');
  const run = await readRun(page);
  expect(run.jokers.map((j) => j.defId)).toEqual([
    'fair_photographer',
    'lucky_seven',
    'fair_magician',
    'recount_committee',
    'impersonator',
  ]);
  // Obnovení stránky už nový run nezakládá — v menu jde pokračovat ve stejném.
  await page.reload();
  await expect(screen(page)).toHaveAttribute('data-screen', 'menu');
  await expect(page.getByTestId('menu-continue')).toBeEnabled();
  expect((await readRun(page)).seed).toBe(run.seed);
  expectCleanConsole(log);
});

test('rozehraná hra se bez potvrzení nepřepíše', async ({ page }) => {
  const saved = newState('ROZEHRAN');
  await seedSavedRun(page, saved);
  await page.goto('/?sestava=fotograf&tutorial=off');
  await expect(page.getByTestId('overwrite-confirm')).toBeVisible();
  await page.getByTestId('confirm-cancel').click();
  await expect(screen(page)).toHaveAttribute('data-screen', 'menu');
  const run = await readRun(page);
  expect(run.seed).toBe('ROZEHRAN');
  expect(run.jokers).toEqual([]);
});

test('neznámá sestava jen oznámí, že ji tu neznají', async ({ page }) => {
  await page.goto('/?sestava=zlata-rybka&tutorial=off');
  await expect(page.getByTestId('toast-preset-unknown')).toContainText('zlata-rybka');
  await expect(screen(page)).toHaveAttribute('data-screen', 'menu');
  expect(new URL(page.url()).searchParams.get('sestava')).toBeNull();
});

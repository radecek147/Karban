import { expect, test, type Page } from '@playwright/test';
import { t } from '../../src/i18n/cs';
import { expectCleanConsole, idle, newState, readRun, seedSavedRun, watchConsole } from './helpers';

/**
 * Odkaz s ukázkovou sestavou žolíků (src/content/presets.ts): sdílená stránka `sestava/<id>/` je kopie app shellu
 * (scripts/preset-pages.ts), hra si sestavu přečte z cesty nebo z `?sestava=<id>` (src/ui/linkRoute.ts) a rovnou
 * rozdá seedovaný run se sestavou ve slotech; adresa se přepíše na kořen hry, rozehraná hra se bez potvrzení
 * nepřepíše. Starý service worker (odkaz z doby před aktualizací) ověřuje scénář se dvěma buildy
 * v docs/DECISIONS.md 2026-10-08.
 */

const screen = (page: Page) => page.locator('#app');

test('?sestava=nejsilnejsi založí run s nejsilnější sestavou', async ({ page }) => {
  const log = watchConsole(page);
  await page.goto('/?sestava=nejsilnejsi&tutorial=off');
  await expect(screen(page)).toHaveAttribute('data-screen', 'game');
  await idle(page);
  await expect(page.getByTestId('joker-count')).toHaveText('5/5');
  await expect(page.getByTestId('toast-preset')).toContainText(t('newGame.preset.names.nejsilnejsi'));
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
  await expect(page.getByTestId('overwrite-confirm')).toContainText(t('newGame.preset.overwrite.title'));
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

test('stránka sestava/fotograf/ rovnou spustí hru se sestavou a adresu přepíše na kořen', async ({
  page,
}) => {
  const log = watchConsole(page);
  await page.goto('/sestava/fotograf/?tutorial=off');
  await expect(screen(page)).toHaveAttribute('data-screen', 'game');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).searchParams.get('sestava')).toBeNull();
  await idle(page);
  expect((await readRun(page)).jokers.map((j) => j.defId)).toEqual([
    'fair_photographer',
    'recount_committee',
    'football_fan',
    'jukebox',
    'echo',
  ]);
  await expect(page.getByTestId('toast-preset')).toContainText(t('newGame.preset.names.fotograf'));
  // Kopie shellu nese náhled odkazu; po startu hry je titulek zase hry.
  await expect(page).toHaveTitle(t('app.documentTitle'));
  expect(new URL(page.url()).searchParams.get('tutorial')).toBe('off');
  // Obnovení po přepsání adresy: kořen hry, žádný nový run.
  const seed = (await readRun(page)).seed;
  await page.reload();
  await expect(screen(page)).toHaveAttribute('data-screen', 'menu');
  expect((await readRun(page)).seed).toBe(seed);
  expectCleanConsole(log);
});

test('stránka sestavy nese náhled odkazu (titulek, Open Graph) a <base> na kořen hry', async ({
  request,
}) => {
  const html = await (await request.get('/sestava/nejsilnejsi/')).text();
  expect(html).toContain('<base href="../../" />');
  expect(html).toContain(
    `<title>${t('newGame.preset.pageTitle', { name: t('newGame.preset.names.nejsilnejsi') })}</title>`,
  );
  expect(html).toContain('property="og:description"');
});

test('s aktuálním service workerem jde odkaz přes cache a worker zůstane', async ({ page }) => {
  await page.goto('/?tutorial=off');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.goto('/sestava/nejsilnejsi/');
  await expect(screen(page)).toHaveAttribute('data-screen', 'game');
  // Odregistrovaný worker by stránku hry neovládal.
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(1);
  expect((await readRun(page)).jokers).toHaveLength(5);
});

test('seznam sestav vede na všechny sestavy', async ({ page }) => {
  await page.goto('/sestava/');
  const links = page.locator('li a');
  await expect(links).toHaveCount(3);
  await expect(links.first()).toHaveText(t('newGame.preset.names.nejsilnejsi'));
  await links.nth(2).click();
  await expect(screen(page)).toHaveAttribute('data-screen', 'game');
  expect((await readRun(page)).jokers[0]?.defId).toBe('charles_bridge');
});

test('rozbitý odkaz z chatu (dvojtečka za id) sestavu pořád najde', async ({ page }) => {
  await page.goto('/?sestava=fotograf:&tutorial=off');
  await expect(screen(page)).toHaveAttribute('data-screen', 'game');
  expect((await readRun(page)).jokers[0]?.defId).toBe('fair_photographer');
});

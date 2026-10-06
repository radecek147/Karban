import { expect, test } from '@playwright/test';

const PANGRAM = 'Příliš žluťoučký kůň úpěl ďábelské ódy';

test('hlavní menu se načte bez chyb; ukázka písma v Nastavení vykreslí češtinu oběma písmy', async ({
  page,
}) => {
  // CLAUDE.md kap. 8: konzole bez chyb a varování (včetně chybějících i18n klíčů „[i18n] …“).
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });

  // Statické texty v index.html dosazuje při buildu plugin z src/i18n/cs.ts (vite.config.ts).
  const rawHtml = await (await page.request.get('/')).text();
  expect(rawHtml).not.toContain('{{t:');
  expect(rawHtml).toMatch(/<title>Karban/);

  await page.goto('/?tutorial=off');

  await expect(page).toHaveTitle(/Karban/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Karban');
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'menu');
  await expect(page.getByTestId('menu-new-game')).toBeEnabled();
  await expect(page.getByTestId('loading-tip')).not.toBeEmpty();
  await expect(page.getByTestId('version')).toContainText('verze');
  await page.screenshot({ path: 'test-results/smoke-title.png', fullPage: true });

  // Kontrolní věta s celou diakritikou je v Nastavení → Zobrazení (ukázka písma), ne v menu.
  await expect(page.getByTestId('typo-test')).toHaveCount(0);
  await page.getByTestId('menu-settings').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen', 'settings');
  await expect(page.getByTestId('typo-test')).toBeVisible();
  await expect(page.getByTestId('typo-test')).toContainText(PANGRAM);

  // Text: Barlow Semi Condensed (500, 500 kurzíva na hlášky, 700); nadpisy: Big Shoulders Display (800).
  const fonts = await page.evaluate(async (text) => {
    await document.fonts.ready;
    const text500 = await document.fonts.load('500 16px "Barlow Semi Condensed"', text);
    const textItalic = await document.fonts.load('italic 500 16px "Barlow Semi Condensed"', text);
    const text700 = await document.fonts.load('700 16px "Barlow Semi Condensed"', text);
    const display = await document.fonts.load('800 16px "Big Shoulders Display"', text.toUpperCase());
    return {
      check: document.fonts.check('500 16px "Barlow Semi Condensed"', text),
      checkDisplay: document.fonts.check('800 16px "Big Shoulders Display"', text.toUpperCase()),
      // Česká písmena (latin-ext) i základní latinka: oba podsoubory písma se opravdu načetly.
      textFaces: text500.length,
      italicFaces: textItalic.filter((f) => f.style === 'italic').length,
      boldFaces: text700.filter((f) => f.weight === '700').length,
      displayFaces: display.length,
      typoFont: getComputedStyle(document.querySelector('[data-testid="typo-test"]')!).fontFamily,
      displayFont: getComputedStyle(document.querySelector('.font-sample__display')!).fontFamily,
    };
  }, PANGRAM);
  expect(fonts.textFaces).toBe(2);
  expect(fonts.italicFaces).toBe(2);
  expect(fonts.boldFaces).toBe(2);
  expect(fonts.displayFaces).toBe(2);
  expect(fonts.check).toBe(true);
  expect(fonts.checkDisplay).toBe(true);
  expect(fonts.typoFont).toContain('Barlow Semi Condensed');
  expect(fonts.displayFont).toContain('Big Shoulders Display');

  await page.screenshot({ path: 'test-results/smoke-settings.png', fullPage: true });

  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
});

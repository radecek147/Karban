/**
 * npx tsx scripts/joker-art-preview.ts --ids beer_mat,svejk [--out .qa-art] [--size 520]
 * npx tsx scripts/joker-art-preview.ts --batch b03 [--out .qa-art/b03]
 *
 * Náhled obrázků žolíků přesně tak, jak je kreslí hra (src/ui/art/art.ts — rám, odznak vzácnosti, scéna, štítek se
 * jménem), bez buildu a bez serveru: SVG se poskládá v Node a vyfotí v Chromiu (Playwright). Pro každého žolíka
 * vznikne `<id>.png` (velký) a celek `sheet.png` (velké i malé jako v ruce ve hře, ať je vidět, co se při malé
 * velikosti slije). Vývojářský nástroj pro dávky src/ui/art/jokers/*.ts (docs/DECISIONS.md 2026-10-08).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { registry } from '../src/content/index';
import { hasKey, t } from '../src/i18n/cs';
import { artMarkup } from '../src/ui/art/art';
import { loadIcons } from '../src/ui/art/icons';
import { ART_BATCHES } from '../src/ui/art/jokers';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = pathToFileURL(path.join(ROOT, 'src/assets/fonts/fonts.css')).href;

/** Žolíci dávky: klíče jejích úprav i žolíci, jejichž scénu dávka kreslí (seznam v hlavičce souboru). */
function batchIds(batch: string, reg: ReturnType<typeof registry>): string[] {
  const b = ART_BATCHES[batch];
  if (!b) throw new Error(`Neznámá dávka ${batch} (${Object.keys(ART_BATCHES).join(', ')})`);
  const scenes = new Set(Object.keys(b.SCENES));
  return Object.values(reg.jokers)
    .filter((j) => j.id in b.FIGURES || (j.art.scene !== undefined && scenes.has(j.art.scene)))
    .map((j) => j.id);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      ids: { type: 'string' },
      batch: { type: 'string' },
      out: { type: 'string', default: '.qa-art' },
      size: { type: 'string', default: '520' },
    },
  });
  const reg = registry();
  const ids = values.batch
    ? batchIds(values.batch, reg)
    : (values.ids ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (ids.length === 0) throw new Error('Zadej --ids a,b nebo --batch bNN');
  for (const id of ids) if (!reg.jokers[id]) throw new Error(`Neznámý žolík ${id}`);
  await loadIcons();
  const out = path.resolve(ROOT, values.out!);
  mkdirSync(out, { recursive: true });
  const size = Number(values.size);
  const cards = ids.map((id) => {
    const def = reg.jokers[id]!;
    const title = hasKey(`jokers.${id}.name`) ? t(`jokers.${id}.name`) : id;
    return { id, title, svg: artMarkup('joker', def.art, { rarity: def.rarity, title }) };
  });
  const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>
body{margin:0;background:#efe4cc;font:14px system-ui,sans-serif;color:#1a1714}
.big{display:inline-block;margin:8px}
.big svg{width:${size}px;height:auto;display:block}
.sheet{display:flex;flex-wrap:wrap;gap:18px;padding:16px;width:1500px}
.cell{display:flex;gap:10px;align-items:flex-end}
.cell .l svg{width:260px;height:auto;display:block}
.cell .s svg{width:96px;height:auto;display:block}
.cell p{margin:4px 0 0;font-weight:700}
</style></head><body>
<div id="bigs">${cards.map((c) => `<div class="big" id="big-${c.id}">${c.svg}</div>`).join('')}</div>
<div class="sheet" id="sheet">${cards
    .map(
      (c) =>
        `<div class="cell"><div><div class="l">${c.svg}</div><p>${c.id}</p></div><div class="s">${c.svg}</div></div>`,
    )
    .join('')}</div>
</body></html>`;
  const file = path.join(out, 'preview.html');
  writeFileSync(file, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  for (const c of cards)
    await page.locator(`#big-${c.id} svg`).screenshot({ path: path.join(out, `${c.id}.png`) });
  await page.locator('#sheet').screenshot({ path: path.join(out, 'sheet.png') });
  await browser.close();
  process.stdout.write(
    `${cards.length} náhledů v ${path.relative(ROOT, out) || '.'} (sheet.png + <id>.png)\n`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});

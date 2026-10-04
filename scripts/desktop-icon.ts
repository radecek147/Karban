/**
 * Ikony desktopové aplikace (Tauri): `src-tauri/icon.svg` → PNG 1024 × 1024 (vykreslí Chromium z Playwrightu)
 * → `tauri icon` vygeneruje `src-tauri/icons/*` (PNG, ICNS pro macOS, ICO pro Windows). Ikony pro mobilní
 * platformy a Microsoft Store se smažou — aplikace je jen pro desktop.
 *
 *   npm run desktop:icon
 *
 * Výstupy se commitují; build aplikace na síti nezávisí.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const SVG = path.join(ROOT, 'src-tauri/icon.svg');
const ICONS = path.join(ROOT, 'src-tauri/icons');
/** Co aplikace potřebuje (`bundle.icon` v tauri.conf.json + icon.png pro okno na Linuxu). */
const KEEP = new Set(['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.ico', 'icon.png']);

const tmp = mkdtempSync(path.join(tmpdir(), 'karban-icon-'));
const png = path.join(tmp, 'icon-1024.png');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  const svg = readFileSync(SVG, 'utf8');
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`,
  );
  await page.locator('svg').screenshot({ path: png, omitBackground: true });
} finally {
  await browser.close();
}

execFileSync('npx', ['tauri', 'icon', png, '--output', ICONS], { cwd: ROOT, stdio: 'inherit' });

for (const entry of readdirSync(ICONS, { withFileTypes: true })) {
  if (!KEEP.has(entry.name)) rmSync(path.join(ICONS, entry.name), { recursive: true, force: true });
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Ikony: ${[...KEEP].join(', ')} → ${path.relative(ROOT, ICONS)}`);

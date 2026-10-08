/**
 * Stránky odkazů na sestavy (scripts/preset-pages.ts): kopie app shellu s `<base>` (stránky sestav, 404.html),
 * náhled odkazu, statický seznam sestav a plugin nad skutečnými texty a sestavami. Rozbor adresy ve hře:
 * tests/unit/link-route.test.ts; skutečný prohlížeč: tests/e2e/preset.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  NOT_FOUND_FILE,
  escapeHtml,
  presetListPage,
  presetPagesPlugin,
  shellCopy,
} from '../../scripts/preset-pages';
import { JOKER_PRESETS, PRESET_DIR } from '../../src/content/presets';
import { t } from '../../src/i18n/cs';

/** Zkrácený tvar index.html, jak ho vydá Vite (absolutní base GitHub Pages). */
const INDEX = [
  '<!doctype html>',
  '<html lang="cs">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
  '    <meta name="description" content="Karban – hospodský roguelike." />',
  '    <title>Karban – hospodský roguelike se žolíky</title>',
  '    <script type="module" crossorigin src="/Karban/assets/index-AAAAAAAA.js"></script>',
  '    <link rel="stylesheet" crossorigin href="/Karban/assets/index-BBBBBBBB.css">',
  '  </head>',
  '  <body><div id="app"></div></body>',
  '</html>',
  '',
].join('\n');

const PREVIEW = {
  title: 'Nejsilnější pětice · Karban',
  description: 'Popis <s> & „uvozovky“',
  siteName: 'Karban',
};

describe('kopie app shellu', () => {
  it('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it('<base> hned za <meta charset>, zbytek shellu beze změny (skripty a styly s otisky)', () => {
    const html = shellCopy(INDEX, '/Karban/');
    expect(html).toContain(
      '<meta charset="UTF-8" />\n    <base href="/Karban/" />\n    <meta name="viewport"',
    );
    expect(html.replace('\n    <base href="/Karban/" />', '')).toBe(INDEX);
    // <base> musí být před prvním prvkem s adresou.
    expect(html.indexOf('<base')).toBeLessThan(html.indexOf('src="/Karban/assets/'));
  });

  it('relativní base (náhled, desktop): <base href="../../"> pro stránku dvě úrovně pod kořenem', () => {
    const relative = INDEX.replace(/\/Karban\//g, './');
    expect(shellCopy(relative, '../../')).toContain('<base href="../../" />');
  });

  it('náhled odkazu: titulek, popis a Open Graph z textů, escapované', () => {
    const html = shellCopy(INDEX, '/Karban/', PREVIEW);
    expect(html).toContain('<title>Nejsilnější pětice · Karban</title>');
    expect(html).toContain('<meta name="description" content="Popis &lt;s&gt; &amp; „uvozovky“" />');
    expect(html).toContain('<meta property="og:title" content="Nejsilnější pětice · Karban" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:locale" content="cs_CZ" />');
    expect(html).toContain('<meta property="og:site_name" content="Karban" />');
    expect(html).not.toContain('hospodský roguelike se žolíky</title>');
    expect(html.match(/<\/head>/g)).toHaveLength(1);
  });

  it('nečekaný tvar index.html shodí build (radši chyba než rozbitý odkaz)', () => {
    expect(() => shellCopy(INDEX.replace('<meta charset="UTF-8" />', ''), '/Karban/')).toThrow(/charset/);
    expect(() => shellCopy(shellCopy(INDEX, '/Karban/'), '/Karban/')).toThrow(/<base>/);
    expect(() => shellCopy(INDEX.replace(/<title>.*<\/title>/, ''), '/Karban/', PREVIEW)).toThrow(/title/);
  });

  it('seznam sestav: odkazy na podadresáře a zpět do hry, bez skriptu', () => {
    const html = presetListPage({
      title: 'Sestavy',
      description: 'Popis',
      siteName: 'Karban',
      heading: 'Sestavy',
      intro: 'Úvod',
      back: 'Do hry',
      items: [{ href: './nejsilnejsi/', name: 'Nejsilnější', jokers: 'A, B' }],
    });
    expect(html).toContain('<li><a href="./nejsilnejsi/">Nejsilnější</a><br><small>A, B</small></li>');
    expect(html).toContain('<a href="../">Do hry</a>');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/(src|href)="(https?:)?\/\//);
  });
});

describe('plugin karban-preset-pages', () => {
  async function emitted(base: string, index = INDEX): Promise<Map<string, string>> {
    const plugin = presetPagesPlugin();
    const files = new Map<string, string>();
    (plugin.configResolved as (c: { base: string }) => void)({ base });
    const generate = plugin.generateBundle as (this: unknown, o: unknown, b: unknown) => Promise<void>;
    await generate.call(
      {
        emitFile: (f: { fileName: string; source: string }) => {
          files.set(f.fileName, f.source);
          return f.fileName;
        },
      },
      {},
      { 'index.html': { type: 'asset', fileName: 'index.html', source: index } },
    );
    return files;
  }

  it('GitHub Pages (absolutní base): kopie shellu pro každou sestavu a 404.html, statický seznam', async () => {
    const files = await emitted('/Karban/');
    expect([...files.keys()].sort()).toEqual(
      [
        NOT_FOUND_FILE,
        `${PRESET_DIR}/index.html`,
        ...JOKER_PRESETS.map((p) => `${PRESET_DIR}/${p.id}/index.html`),
      ].sort(),
    );
    for (const p of JOKER_PRESETS) {
      const html = files.get(`${PRESET_DIR}/${p.id}/index.html`)!;
      const name = t(`newGame.preset.names.${p.id}`);
      expect(html).toContain('<base href="/Karban/" />');
      expect(html).toContain(`<title>${escapeHtml(t('newGame.preset.pageTitle', { name }))}</title>`);
      for (const j of p.jokers) expect(html).toContain(escapeHtml(t(`jokers.${j}.name`)));
      expect(html).toContain('src="/Karban/assets/index-AAAAAAAA.js"');
      expect(html).not.toContain('⟦');
    }
    const notFound = files.get(NOT_FOUND_FILE)!;
    expect(notFound).toContain('<base href="/Karban/" />');
    expect(notFound).toContain('<title>Karban – hospodský roguelike se žolíky</title>');
    const list = files.get(`${PRESET_DIR}/index.html`)!;
    expect(list).toContain(escapeHtml(t('newGame.preset.listHeading')));
    for (const p of JOKER_PRESETS) expect(list).toContain(`href="./${p.id}/"`);
  });

  it('relativní base (náhled, desktop): <base href="../../">, bez 404.html', async () => {
    const files = await emitted('./', INDEX.replace(/\/Karban\//g, './'));
    expect(files.has(NOT_FOUND_FILE)).toBe(false);
    expect(files.get(`${PRESET_DIR}/nejsilnejsi/index.html`)).toContain('<base href="../../" />');
  });

  it('bez index.html v buildu build spadne', async () => {
    const plugin = presetPagesPlugin();
    const generate = plugin.generateBundle as (this: unknown, o: unknown, b: unknown) => Promise<void>;
    await expect(generate.call({ emitFile: () => '' }, {}, {})).rejects.toThrow(/index\.html/);
  });
});

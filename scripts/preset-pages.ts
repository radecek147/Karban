/**
 * Vite plugin `karban-preset-pages`: při buildu vygeneruje stránky odkazů na ukázkové sestavy žolíků
 * (src/content/presets.ts):
 *  - `sestava/<id>/index.html` — sdílený odkaz; je to kopie app shellu (`index.html`) s `<base>` na kořen hry,
 *    takže se na té adrese rovnou spustí hra a sestavu si přečte z cesty (src/ui/linkRoute.ts),
 *  - `sestava/index.html` — seznam sestav s odkazy (statická stránka),
 *  - `404.html` (jen s absolutním `base`, tedy GitHub Pages) — také kopie shellu: pokažené odkazy pod `sestava/`
 *    (`sestava/Nejsilnější!/`, `sestava/fotograf:/`) najdou sestavu, ostatní neexistující adresy skončí v menu.
 *
 * Proč kopie shellu, a ne přesměrování na `?sestava=`: service worker (src/sw/sw.ts, ve všech nasazených verzích)
 * vrací z cache jen navigace na adresu hry (`<base>` a `<base>index.html`). Adresu `sestava/<id>/` pustí na síť
 * a soubory nové verze (jiné otisky v názvech) v jeho cache nejsou, takže se načte nová verze hry — i u hráče,
 * kterému starý worker drží starou verzi, bez odregistrování a bez čekání na instalaci nového workeru.
 * Texty jdou z src/i18n/cs.ts (načtené přes `runnerImport` jako v pluginu karban-i18n-html), nic natvrdo.
 * Viz docs/DECISIONS.md 2026-10-08 „Odkazy na sestavy a service worker“.
 */
import { fileURLToPath } from 'node:url';
import { runnerImport, type Plugin } from 'vite';

const PRESETS_ENTRY = fileURLToPath(new URL('../src/content/presets.ts', import.meta.url));
const I18N_ENTRY = fileURLToPath(new URL('../src/i18n/cs.ts', import.meta.url));

/** Výstup pro neexistující adresy (GitHub Pages ho vrací se stavem 404 pro celý web projektu). */
export const NOT_FOUND_FILE = '404.html';

/** Část API src/content/presets.ts, kterou plugin potřebuje. */
interface PresetsApi {
  JOKER_PRESETS: ReadonlyArray<{ readonly id: string; readonly jokers: readonly string[] }>;
  PRESET_DIR: string;
}

/** Část API src/i18n/cs.ts, kterou plugin potřebuje. */
interface I18nApi {
  t(key: string, params?: Readonly<Record<string, string | number>>): string;
  hasKey(key: string): boolean;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Náhled odkazu v chatu (Open Graph). */
export interface LinkPreview {
  readonly title: string;
  readonly description: string;
  readonly siteName: string;
}

function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  if (!pattern.test(html)) throw new Error(`karban-preset-pages: v index.html chybí ${what}`);
  return html.replace(pattern, () => replacement);
}

/**
 * Kopie app shellu pro jinou adresu: `<base href>` hned za `<meta charset>` (relativní adresy v dokumentu i v kódu
 * hry — registrace workeru `./sw.js` — se počítají od kořene hry) a volitelně vlastní titulek, popis a náhled odkazu.
 */
export function shellCopy(indexHtml: string, baseHref: string, preview?: LinkPreview): string {
  if (/<base\s/i.test(indexHtml)) throw new Error('karban-preset-pages: index.html už má <base>');
  const charset = /<meta charset="[^"]*"\s*\/?>/i.exec(indexHtml);
  if (!charset) throw new Error('karban-preset-pages: v index.html chybí <meta charset>');
  const at = charset.index + charset[0].length;
  let html = `${indexHtml.slice(0, at)}\n    <base href="${escapeHtml(baseHref)}" />${indexHtml.slice(at)}`;
  if (!preview) return html;
  const title = escapeHtml(preview.title);
  const description = escapeHtml(preview.description);
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`, '<title>');
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}" />`,
    '<meta name="description">',
  );
  const og = [
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="cs_CZ" />',
    `<meta property="og:site_name" content="${escapeHtml(preview.siteName)}" />`,
  ]
    .map((line) => `    ${line}\n`)
    .join('');
  return replaceOnce(html, /[ \t]*<\/head>/i, `${og}  </head>`, '</head>');
}

/** Vzhled seznamu sestav: barvy hry (sukno a papír), systémové písmo, nic externího. */
const LIST_STYLE = [
  ':root{color-scheme:dark}',
  'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1f2e4a;color:#f3e8cf;',
  'font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
  'main{box-sizing:border-box;width:calc(100% - 32px);max-width:34rem;margin:16px;padding:24px;background:#f3e8cf;',
  'color:#1a1714;border:3px solid #1a1714;border-radius:12px;box-shadow:6px 6px 0 #0d1526}',
  'h1{margin:0 0 .5em;font-size:1.6rem;line-height:1.2}',
  'a{color:#9e2a17;font-weight:700}',
  'ul{padding-left:1.2em}li{margin:.7em 0}small{color:#4a4238}',
].join('');

export interface PresetListTexts {
  readonly title: string;
  readonly description: string;
  readonly siteName: string;
  readonly heading: string;
  readonly intro: string;
  readonly back: string;
  readonly items: ReadonlyArray<{ readonly href: string; readonly name: string; readonly jokers: string }>;
}

/** Seznam sestav (`sestava/index.html`): odkazy na `./<id>/` a zpět do hry. */
export function presetListPage(texts: PresetListTexts): string {
  const title = escapeHtml(texts.title);
  const description = escapeHtml(texts.description);
  const items = texts.items
    .map(
      (i) =>
        `<li><a href="${escapeHtml(i.href)}">${escapeHtml(i.name)}</a><br><small>${escapeHtml(i.jokers)}</small></li>`,
    )
    .join('');
  return [
    '<!doctype html>',
    '<html lang="cs">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="theme-color" content="#1f2e4a">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="cs_CZ">',
    `<meta property="og:site_name" content="${escapeHtml(texts.siteName)}">`,
    // Bez ikony by prohlížeč žádal /favicon.ico (na GitHub Pages 404).
    '<link rel="icon" href="data:,">',
    `<style>${LIST_STYLE}</style>`,
    '</head>',
    '<body>',
    `<main><h1>${escapeHtml(texts.heading)}</h1><p>${escapeHtml(texts.intro)}</p><ul>${items}</ul>`,
    `<p><a href="../">${escapeHtml(texts.back)}</a></p></main>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** Obsah výstupu buildu jako text (Rollup dává řetězec nebo bajty). */
function assetText(source: string | Uint8Array): string {
  return typeof source === 'string' ? source : new TextDecoder().decode(source);
}

export function presetPagesPlugin(): Plugin {
  let base = './';
  return {
    name: 'karban-preset-pages',
    apply: 'build',
    // Až po vložení index.html do bundlu (vite:build-html) a před pluginem karban-sw (také post, ve vite.config.ts
    // až za tímhle), ať stránky sestav skončí v precache — offline odkaz.
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') throw new Error('karban-preset-pages: v buildu chybí index.html');
      const indexHtml = assetText(index.source);
      const { module: presets } = await runnerImport<PresetsApi>(PRESETS_ENTRY);
      const { module: i18n } = await runnerImport<I18nApi>(I18N_ENTRY);
      const text = (key: string, params?: Readonly<Record<string, string>>): string => {
        if (!i18n.hasKey(key))
          throw new Error(`karban-preset-pages: chybí i18n klíč „${key}“ (src/i18n/cs.ts)`);
        return i18n.t(key, params);
      };
      const { JOKER_PRESETS, PRESET_DIR } = presets;
      const siteName = text('app.title');
      const jokerNames = (ids: readonly string[]): string =>
        ids.map((id) => text(`jokers.${id}.name`)).join(', ');
      // Absolutní base (GitHub Pages) platí z libovolné hloubky; relativní se počítá od stránky sestavy.
      const absolute = base.startsWith('/');

      for (const preset of JOKER_PRESETS) {
        const name = text(`newGame.preset.names.${preset.id}`);
        this.emitFile({
          type: 'asset',
          fileName: `${PRESET_DIR}/${preset.id}/index.html`,
          source: shellCopy(indexHtml, absolute ? base : '../../', {
            title: text('newGame.preset.pageTitle', { name }),
            description: text('newGame.preset.pageDescription', { jokers: jokerNames(preset.jokers) }),
            siteName,
          }),
        });
      }

      this.emitFile({
        type: 'asset',
        fileName: `${PRESET_DIR}/index.html`,
        source: presetListPage({
          title: text('newGame.preset.listTitle'),
          description: text('newGame.preset.listIntro'),
          siteName,
          heading: text('newGame.preset.listHeading'),
          intro: text('newGame.preset.listIntro'),
          back: text('newGame.preset.backToGame'),
          items: JOKER_PRESETS.map((p) => ({
            href: `./${p.id}/`,
            name: text(`newGame.preset.names.${p.id}`),
            jokers: jokerNames(p.jokers),
          })),
        }),
      });

      // 404.html se servíruje z libovolné hloubky — potřebuje absolutní adresu hry (s relativním base nevzniká).
      if (absolute) {
        this.emitFile({ type: 'asset', fileName: NOT_FOUND_FILE, source: shellCopy(indexHtml, base) });
      }
    },
  };
}

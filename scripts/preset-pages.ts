/**
 * Vite plugin `karban-preset-pages`: při buildu vygeneruje stránky odkazů na ukázkové sestavy žolíků
 * (src/content/presets.ts):
 *  - `sestava/<id>/index.html` — sdílený odkaz; přesměruje do hry na `../../?sestava=<id>` (src/sw/linkRedirect.ts
 *    nejdřív odregistruje zastaralý service worker, ať se nenačte stará verze hry z cache),
 *  - `sestava/index.html` — seznam sestav s odkazy,
 *  - `404.html` (jen s absolutním `base`, tedy GitHub Pages) — chytí i pokažené odkazy (`sestava/Nejsilnější!/`,
 *    `sestava/fotograf:/`) a ostatním neexistujícím adresám ukáže „nenalezeno“ s odkazem do hry.
 * Texty jdou z src/i18n/cs.ts (načtené přes `runnerImport` jako v pluginu karban-i18n-html), nic natvrdo.
 * Viz docs/DECISIONS.md 2026-10-08 „Odkazy na sestavy a service worker“.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runnerImport, transformWithOxc, type Plugin } from 'vite';

const LINK_SCRIPT_ENTRY = fileURLToPath(new URL('../src/sw/linkRedirect.ts', import.meta.url));
const PRESETS_ENTRY = fileURLToPath(new URL('../src/content/presets.ts', import.meta.url));
const I18N_ENTRY = fileURLToPath(new URL('../src/i18n/cs.ts', import.meta.url));

/** Výstup pro neexistující adresy (GitHub Pages ho vrací se stavem 404 pro celý web projektu). */
export const NOT_FOUND_FILE = '404.html';
/** Jak dlouho stránka odkazu čeká na kontrolu aktualizace service workeru, než ho radši odregistruje. */
export const UPDATE_TIMEOUT_MS = 5000;

/** Konfigurace skriptu odkazu (`__LINK__` v src/sw/linkRedirect.ts). */
export interface LinkConfig {
  readonly target: string | null;
  readonly base: string | null;
  readonly dir: string;
  readonly param: string;
  readonly updateTimeoutMs: number;
}

/** Část API src/content/presets.ts, kterou plugin potřebuje. */
interface PresetsApi {
  JOKER_PRESETS: ReadonlyArray<{ readonly id: string; readonly jokers: readonly string[] }>;
  PRESET_DIR: string;
  PRESET_PARAM: string;
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

/** Přeložený skript odkazu s konfigurací, zabalený do funkce (žádná globální jména na stránce). */
export async function buildLinkScript(config: LinkConfig): Promise<string> {
  const source = await readFile(LINK_SCRIPT_ENTRY, 'utf8');
  const { code } = await transformWithOxc(source, LINK_SCRIPT_ENTRY, { lang: 'ts' });
  const body = code.replace(/^export\s*\{\s*\};?\s*$/m, '').trim();
  if (/^\s*(import|export)\s/m.test(body))
    throw new Error('karban-preset-pages: linkRedirect.ts nesmí nic importovat');
  if (/<\/script/i.test(body)) throw new Error('karban-preset-pages: skript nesmí obsahovat „</script“');
  // `<` v JSONu jako < — řetězec v konfiguraci nemůže ukončit <script>.
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  return `(() => {\nconst __LINK__ = ${json};\n${body}\n})();`;
}

/** Vzhled stránek odkazů: barvy hry (sukno a papír), systémové písmo, nic externího. */
const STYLE = [
  ':root{color-scheme:dark}',
  'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1f2e4a;color:#f3e8cf;',
  'font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
  'main{box-sizing:border-box;width:calc(100% - 32px);max-width:34rem;margin:16px;padding:24px;background:#f3e8cf;',
  'color:#1a1714;border:3px solid #1a1714;border-radius:12px;box-shadow:6px 6px 0 #0d1526}',
  'h1{margin:0 0 .5em;font-size:1.6rem;line-height:1.2}',
  'a{color:#9e2a17;font-weight:700}',
  'ul{padding-left:1.2em}li{margin:.7em 0}small{color:#4a4238}',
  '[hidden]{display:none}',
].join('');

interface PageParts {
  readonly title: string;
  readonly description: string;
  /** Hotové HTML obsahu (texty už escapované). */
  readonly body: string;
  readonly script?: string;
}

export function htmlPage(p: PageParts): string {
  const title = escapeHtml(p.title);
  const description = escapeHtml(p.description);
  return [
    '<!doctype html>',
    '<html lang="cs">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="theme-color" content="#1f2e4a">',
    '<meta name="robots" content="noindex">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    // Bez ikony by prohlížeč žádal /favicon.ico (na GitHub Pages 404).
    '<link rel="icon" href="data:,">',
    `<style>${STYLE}</style>`,
    '</head>',
    '<body>',
    `<main>${p.body}</main>`,
    p.script ? `<script>${p.script}</script>` : '',
    '</body>',
    '</html>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export interface PresetPageTexts {
  readonly title: string;
  readonly description: string;
  readonly heading: string;
  readonly redirecting: string;
  readonly inSlots: string;
  readonly open: string;
}

/** Stránka jedné sestavy (`sestava/<id>/index.html`); `target` je relativní ke stránce. */
export function presetPage(target: string, texts: PresetPageTexts, script: string): string {
  return htmlPage({
    title: texts.title,
    description: texts.description,
    body: [
      `<h1>${escapeHtml(texts.heading)}</h1>`,
      `<p id="link-redirect" role="status">${escapeHtml(texts.redirecting)}</p>`,
      `<p>${escapeHtml(texts.inSlots)}</p>`,
      `<p><a href="${escapeHtml(target)}">${escapeHtml(texts.open)}</a></p>`,
    ].join(''),
    script,
  });
}

export interface PresetListTexts {
  readonly title: string;
  readonly description: string;
  readonly heading: string;
  readonly intro: string;
  readonly back: string;
  readonly items: ReadonlyArray<{ readonly href: string; readonly name: string; readonly jokers: string }>;
}

/** Seznam sestav (`sestava/index.html`). */
export function presetListPage(texts: PresetListTexts): string {
  const items = texts.items
    .map(
      (i) =>
        `<li><a href="${escapeHtml(i.href)}">${escapeHtml(i.name)}</a><br><small>${escapeHtml(i.jokers)}</small></li>`,
    )
    .join('');
  return htmlPage({
    title: texts.title,
    description: texts.description,
    body: [
      `<h1>${escapeHtml(texts.heading)}</h1>`,
      `<p>${escapeHtml(texts.intro)}</p>`,
      `<ul>${items}</ul>`,
      `<p><a href="../">${escapeHtml(texts.back)}</a></p>`,
    ].join(''),
  });
}

export interface NotFoundTexts {
  readonly title: string;
  readonly description: string;
  readonly heading: string;
  readonly message: string;
  readonly back: string;
  readonly redirectHeading: string;
  readonly redirecting: string;
}

/** `404.html`: „nenalezeno“, nebo (adresa pod `sestava/`) přesměrování na sestavu; `base` je absolutní. */
export function notFoundPage(base: string, texts: NotFoundTexts, script: string): string {
  return htmlPage({
    title: texts.title,
    description: texts.description,
    body: [
      '<div id="link-missing">',
      `<h1>${escapeHtml(texts.heading)}</h1>`,
      `<p>${escapeHtml(texts.message)}</p>`,
      `<p><a href="${escapeHtml(base)}">${escapeHtml(texts.back)}</a></p>`,
      '</div>',
      '<div id="link-redirect" hidden>',
      `<h1>${escapeHtml(texts.redirectHeading)}</h1>`,
      `<p role="status">${escapeHtml(texts.redirecting)}</p>`,
      '</div>',
    ].join(''),
    script,
  });
}

export function presetPagesPlugin(): Plugin {
  let base = './';
  return {
    name: 'karban-preset-pages',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    // Před pluginem karban-sw (enforce: 'post'), ať stránky sestav skončí v precache (offline odkaz).
    async generateBundle() {
      const { module: presets } = await runnerImport<PresetsApi>(PRESETS_ENTRY);
      const { module: i18n } = await runnerImport<I18nApi>(I18N_ENTRY);
      const text = (key: string, params?: Readonly<Record<string, string>>): string => {
        if (!i18n.hasKey(key))
          throw new Error(`karban-preset-pages: chybí i18n klíč „${key}“ (src/i18n/cs.ts)`);
        return i18n.t(key, params);
      };
      const { JOKER_PRESETS, PRESET_DIR, PRESET_PARAM } = presets;
      const config = { base: null, dir: PRESET_DIR, param: PRESET_PARAM, updateTimeoutMs: UPDATE_TIMEOUT_MS };
      const jokerNames = (ids: readonly string[]): string =>
        ids.map((id) => text(`jokers.${id}.name`)).join(', ');

      for (const preset of JOKER_PRESETS) {
        const target = `../../?${PRESET_PARAM}=${encodeURIComponent(preset.id)}`;
        const name = text(`newGame.preset.names.${preset.id}`);
        const jokers = jokerNames(preset.jokers);
        this.emitFile({
          type: 'asset',
          fileName: `${PRESET_DIR}/${preset.id}/index.html`,
          source: presetPage(
            target,
            {
              title: text('newGame.preset.pageTitle', { name }),
              description: text('newGame.preset.pageDescription', { jokers }),
              heading: name,
              redirecting: text('newGame.preset.redirecting'),
              inSlots: text('newGame.preset.inSlots', { jokers }),
              open: text('newGame.preset.open'),
            },
            await buildLinkScript({ ...config, target }),
          ),
        });
      }

      this.emitFile({
        type: 'asset',
        fileName: `${PRESET_DIR}/index.html`,
        source: presetListPage({
          title: text('newGame.preset.listTitle'),
          description: text('newGame.preset.listIntro'),
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

      // 404.html potřebuje absolutní adresu hry — s relativním base (náhled, desktop) nevzniká.
      if (base.startsWith('/')) {
        this.emitFile({
          type: 'asset',
          fileName: NOT_FOUND_FILE,
          source: notFoundPage(
            base,
            {
              title: text('newGame.preset.notFoundTitle'),
              description: text('newGame.preset.notFound'),
              heading: text('newGame.preset.notFoundHeading'),
              message: text('newGame.preset.notFound'),
              back: text('newGame.preset.notFoundBack'),
              redirectHeading: text('newGame.preset.title'),
              redirecting: text('newGame.preset.redirecting'),
            },
            await buildLinkScript({ ...config, base, target: null }),
          ),
        });
      }
    },
  };
}

/**
 * Stránky odkazů na sestavy (scripts/preset-pages.ts) a jejich skript (src/sw/linkRedirect.ts): vygenerované HTML,
 * plugin nad skutečnými texty a sestavami, a chování skriptu nad falešným `navigator.serviceWorker` — zastaralý
 * worker odregistruje (jinak by odkaz otevřel starou verzi hry z cache), aktuální, chybějící a offline nechá být,
 * 404.html pozná adresu sestavy. Skutečný prohlížeč: tests/e2e/preset.spec.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import type { LinkConfig } from '../../scripts/preset-pages';
import {
  NOT_FOUND_FILE,
  buildLinkScript,
  escapeHtml,
  notFoundPage,
  presetListPage,
  presetPage,
  presetPagesPlugin,
} from '../../scripts/preset-pages';
import { JOKER_PRESETS, PRESET_DIR, PRESET_PARAM } from '../../src/content/presets';
import { t } from '../../src/i18n/cs';

const PAGE_TEXTS = {
  title: 'Nejsilnější pětice · Karban',
  description: 'Popis <s> „uvozovkami“ & ampersandem',
  heading: 'Nejsilnější pětice',
  redirecting: 'Míchám karty…',
  inSlots: 'Ve slotech: Fotograf z pouti.',
  open: 'Otevřít hru se sestavou',
};

describe('HTML stránek', () => {
  it('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it('stránka sestavy: česky, cíl v záložním odkazu, texty escapované, nic externího', () => {
    const html = presetPage('../../?sestava=nejsilnejsi', PAGE_TEXTS, '/* skript */');
    expect(html.startsWith('<!doctype html>\n<html lang="cs">')).toBe(true);
    expect(html).toContain('<title>Nejsilnější pětice · Karban</title>');
    expect(html).toContain('<a href="../../?sestava=nejsilnejsi">Otevřít hru se sestavou</a>');
    expect(html).toContain('Popis &lt;s&gt; „uvozovkami“ &amp; ampersandem');
    expect(html).toContain('<p id="link-redirect" role="status">');
    expect(html).toContain('<script>/* skript */</script>');
    expect(html).not.toMatch(/(src|href)="(https?:)?\/\//);
  });

  it('seznam sestav: odkazy na podadresáře a zpět do hry', () => {
    const html = presetListPage({
      title: 'Sestavy',
      description: 'Popis',
      heading: 'Sestavy',
      intro: 'Úvod',
      back: 'Do hry',
      items: [{ href: './nejsilnejsi/', name: 'Nejsilnější', jokers: 'A, B' }],
    });
    expect(html).toContain('<li><a href="./nejsilnejsi/">Nejsilnější</a><br><small>A, B</small></li>');
    expect(html).toContain('<a href="../">Do hry</a>');
    expect(html).not.toContain('<script>');
  });

  it('404.html: blok „nenalezeno“ viditelný, přesměrování skryté, odkaz na absolutní adresu hry', () => {
    const html = notFoundPage(
      '/Karban/',
      {
        title: 'Nenalezeno',
        description: 'Nic',
        heading: 'Tady nic není',
        message: 'Nic tu není.',
        back: 'Zpátky',
        redirectHeading: 'Sestava',
        redirecting: 'Míchám…',
      },
      '/* skript */',
    );
    expect(html).toContain('<div id="link-missing"><h1>Tady nic není</h1>');
    expect(html).toContain('<a href="/Karban/">Zpátky</a>');
    expect(html).toContain('<div id="link-redirect" hidden>');
  });
});

describe('plugin karban-preset-pages', () => {
  async function emitted(base: string): Promise<Map<string, string>> {
    const plugin = presetPagesPlugin();
    const files = new Map<string, string>();
    const configResolved = plugin.configResolved as (c: { base: string }) => void;
    configResolved({ base });
    const generate = plugin.generateBundle as (this: unknown) => Promise<void>;
    await generate.call({
      emitFile: (f: { fileName: string; source: string }) => {
        files.set(f.fileName, f.source);
        return f.fileName;
      },
    });
    return files;
  }

  it('GitHub Pages (absolutní base): stránka každé sestavy, seznam a 404.html s texty z i18n', async () => {
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
      expect(html).toContain(`<h1>${escapeHtml(name)}</h1>`);
      expect(html).toContain(`href="../../?${PRESET_PARAM}=${p.id}"`);
      for (const j of p.jokers) expect(html).toContain(escapeHtml(t(`jokers.${j}.name`)));
      expect(html).toContain(`"target":"../../?${PRESET_PARAM}=${p.id}"`);
      expect(html).not.toContain('⟦');
    }
    const notFound = files.get(NOT_FOUND_FILE)!;
    expect(notFound).toContain('"base":"/Karban/"');
    expect(notFound).toContain('"target":null');
    expect(notFound).toContain(escapeHtml(t('newGame.preset.notFoundHeading')));
    expect(files.get(`${PRESET_DIR}/index.html`)).toContain(escapeHtml(t('newGame.preset.listHeading')));
  });

  it('relativní base (náhled, desktop): bez 404.html — nezná absolutní adresu hry', async () => {
    const files = await emitted('./');
    expect(files.has(NOT_FOUND_FILE)).toBe(false);
    expect(files.has(`${PRESET_DIR}/nejsilnejsi/index.html`)).toBe(true);
  });
});

// ─────────────── Skript odkazu nad falešným prohlížečem ───────────────

const CONFIG: LinkConfig = {
  target: '../../?sestava=nejsilnejsi',
  base: null,
  dir: 'sestava',
  param: 'sestava',
  updateTimeoutMs: 40,
};

interface FakeRegistration {
  active: object | null;
  installing: object | null;
  waiting: object | null;
  update: ReturnType<typeof vi.fn>;
  unregister: ReturnType<typeof vi.fn>;
}

type UpdateBehavior = 'same' | 'new' | 'reject' | 'hang';

function registration(
  opts: { active?: boolean; waiting?: boolean; update?: UpdateBehavior } = {},
  log: string[] = [],
): FakeRegistration {
  const reg: FakeRegistration = {
    active: opts.active === false ? null : {},
    installing: null,
    waiting: opts.waiting ? {} : null,
    update: vi.fn(() => {
      log.push('update');
      switch (opts.update ?? 'same') {
        case 'new':
          reg.installing = {};
          return Promise.resolve();
        case 'reject':
          return Promise.reject(new TypeError('Failed to fetch'));
        case 'hang':
          return new Promise(() => undefined);
        default:
          return Promise.resolve();
      }
    }),
    unregister: vi.fn(() => {
      log.push('unregister');
      return Promise.resolve(true);
    }),
  };
  return reg;
}

interface RunResult {
  /** Kam skript přesměroval (absolutní adresa), nebo null. */
  replaced: string | null;
  log: string[];
  scopes: string[];
  hidden: Record<string, boolean>;
}

async function runLink(
  config: LinkConfig,
  href: string,
  env: { reg?: FakeRegistration | null; noWorkers?: boolean; onLine?: boolean; hangLookup?: boolean } = {},
  log: string[] = [],
): Promise<RunResult> {
  const code = await buildLinkScript(config);
  const scopes: string[] = [];
  const hidden: Record<string, boolean> = { 'link-missing': false, 'link-redirect': true };
  const element = (id: string) => ({
    setAttribute: (name: string) => name === 'hidden' && (hidden[id] = true),
    removeAttribute: (name: string) => name === 'hidden' && (hidden[id] = false),
  });
  return new Promise<RunResult>((resolve) => {
    const done = (replaced: string | null): void => resolve({ replaced, log, scopes, hidden });
    const location = {
      href,
      pathname: new URL(href).pathname,
      replace: (url: string) => {
        log.push('replace');
        done(url);
      },
    };
    const container = {
      getRegistration: (scope: string) => {
        scopes.push(scope);
        return env.hangLookup ? new Promise(() => undefined) : Promise.resolve(env.reg ?? undefined);
      },
    };
    const navigator = { serviceWorker: env.noWorkers ? undefined : container, onLine: env.onLine ?? true };
    const document = { getElementById: element };
    new Function('navigator', 'location', 'document', 'setTimeout', 'clearTimeout', code)(
      navigator,
      location,
      document,
      setTimeout,
      clearTimeout,
    );
    // Bez přesměrování (404 na cizí adrese) skript skončí hned — dáme mu chvilku na případné kroky.
    setTimeout(() => done(null), config.updateTimeoutMs * 4);
  });
}

const PAGE = 'https://hra.example/Karban/sestava/nejsilnejsi/';
const GAME = 'https://hra.example/Karban/?sestava=nejsilnejsi';

describe('skript odkazu (src/sw/linkRedirect.ts)', () => {
  it('build: klasický skript ve funkci, konfigurace bez „<“, žádné import/export ani typy', async () => {
    const code = await buildLinkScript({ ...CONFIG, target: '../../?sestava=</script>' });
    expect(code.startsWith('(() => {\nconst __LINK__ = {')).toBe(true);
    expect(code.endsWith('})();')).toBe(true);
    expect(code).not.toMatch(/<\/script/i);
    expect(code).toContain('\\u003c/script>');
    expect(code).not.toMatch(/^\s*(import|export)\s/m);
    expect(code).not.toMatch(/\binterface\b|declare const/);
  });

  it('bez service workerů jen přesměruje na hru se sestavou', async () => {
    const r = await runLink(CONFIG, PAGE, { noWorkers: true });
    expect(r.replaced).toBe(GAME);
    expect(r.hidden['link-redirect']).toBe(false);
  });

  it('bez registrace nebo bez aktivního workeru přesměruje bez zásahu', async () => {
    expect((await runLink(CONFIG, PAGE, { reg: null })).replaced).toBe(GAME);
    const reg = registration({ active: false });
    const r = await runLink(CONFIG, PAGE, { reg });
    expect(r.replaced).toBe(GAME);
    expect(r.scopes).toEqual(['https://hra.example/Karban/']);
    expect(reg.update).not.toHaveBeenCalled();
    expect(reg.unregister).not.toHaveBeenCalled();
  });

  it('aktuální worker (kontrola nenašla novou verzi) nechá být', async () => {
    const reg = registration({ update: 'same' });
    const r = await runLink(CONFIG, PAGE, { reg });
    expect(r.replaced).toBe(GAME);
    expect(reg.update).toHaveBeenCalledTimes(1);
    expect(reg.unregister).not.toHaveBeenCalled();
  });

  it('nová verze se instaluje → worker odregistruje dřív, než přesměruje', async () => {
    const log: string[] = [];
    const reg = registration({ update: 'new' }, log);
    const r = await runLink(CONFIG, PAGE, { reg }, log);
    expect(r.replaced).toBe(GAME);
    expect(log).toEqual(['update', 'unregister', 'replace']);
  });

  it('nová verze už čeká → odregistruje bez kontroly', async () => {
    const log: string[] = [];
    const reg = registration({ waiting: true }, log);
    await runLink(CONFIG, PAGE, { reg }, log);
    expect(log).toEqual(['unregister', 'replace']);
  });

  it('offline ani nepovedená kontrola worker neodregistrují (bez sítě by nová verze stejně nepřišla)', async () => {
    const offline = registration();
    expect((await runLink(CONFIG, PAGE, { reg: offline, onLine: false })).replaced).toBe(GAME);
    expect(offline.update).not.toHaveBeenCalled();
    expect(offline.unregister).not.toHaveBeenCalled();

    const failed = registration({ update: 'reject' });
    expect((await runLink(CONFIG, PAGE, { reg: failed })).replaced).toBe(GAME);
    expect(failed.unregister).not.toHaveBeenCalled();
  });

  it('kontrola nestihne doběhnout → radši odregistruje (odkaz musí otevřít novou verzi)', async () => {
    const log: string[] = [];
    const reg = registration({ update: 'hang' }, log);
    await runLink(CONFIG, PAGE, { reg }, log);
    expect(log).toEqual(['update', 'unregister', 'replace']);
  });

  it('zaseknutý dotaz na registraci: pojistka přesměruje po dvojnásobku čekání, jen jednou', async () => {
    const log: string[] = [];
    const r = await runLink(CONFIG, PAGE, { hangLookup: true }, log);
    expect(r.replaced).toBe(GAME);
    expect(log).toEqual(['replace']);
  });

  describe('404.html', () => {
    const NF: LinkConfig = { ...CONFIG, target: null, base: '/Karban/' };
    const param = (url: string | null) => (url ? new URL(url).searchParams.get('sestava') : null);

    it('adresa pod sestava/ → hra s id z adresy (i s diakritikou, interpunkcí a velkými písmeny)', async () => {
      const r = await runLink(NF, 'https://hra.example/Karban/sestava/Nejsiln%C4%9Bj%C5%A1%C3%AD!/', {
        noWorkers: true,
      });
      expect(r.replaced?.startsWith('https://hra.example/Karban/?sestava=')).toBe(true);
      expect(param(r.replaced)).toBe('Nejsilnější!');
      expect(r.hidden).toEqual({ 'link-missing': true, 'link-redirect': false });

      const upper = await runLink(NF, 'https://hra.example/Karban/Sestava/fotograf:/navic', {
        noWorkers: true,
      });
      expect(param(upper.replaced)).toBe('fotograf:');
    });

    it('rozbité %-kódování nevadí', async () => {
      const r = await runLink(NF, 'https://hra.example/Karban/sestava/%E0%A4%A/', { noWorkers: true });
      expect(param(r.replaced)).toBe('%E0%A4%A');
    });

    it('jiná neexistující adresa zůstane na stránce „nenalezeno“', async () => {
      for (const href of [
        'https://hra.example/Karban/neco/jineho',
        'https://hra.example/Karban/sestava/',
        'https://hra.example/jiny-projekt/sestava/fotograf/',
      ]) {
        const r = await runLink(NF, href, { noWorkers: true });
        expect(r.replaced, href).toBeNull();
        expect(r.hidden, href).toEqual({ 'link-missing': false, 'link-redirect': true });
      }
    });
  });
});

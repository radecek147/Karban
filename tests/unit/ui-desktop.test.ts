// @vitest-environment happy-dom
/**
 * Desktopová aplikace (src/ui/desktop.ts): v Tauri jde export uložení přes nativní dialog (příkaz `save_export`)
 * a celá obrazovka přes okno aplikace; na webu se nic z toho nepoužije.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registry } from '../../src/content';
import { App } from '../../src/ui/app';
import {
  isDesktopApp,
  isDesktopFullscreen,
  saveExportFile,
  setDesktopFullscreen,
} from '../../src/ui/desktop';
import { downloadExport } from '../../src/ui/screens/settings';
import { memoryStore } from '../../src/ui/storage';

const REG = registry();

interface FakeTauri {
  invoke: ReturnType<typeof vi.fn>;
  fullscreen: boolean;
}

function installTauri(result: string | null = '/Users/hrac/Desktop/karban.json'): FakeTauri {
  const fake: FakeTauri = { invoke: vi.fn(() => Promise.resolve(result)), fullscreen: false };
  (globalThis as Record<string, unknown>).__TAURI__ = {
    core: { invoke: fake.invoke },
    window: {
      getCurrentWindow: () => ({
        setFullscreen: (on: boolean) => {
          fake.fullscreen = on;
          return Promise.resolve();
        },
        isFullscreen: () => Promise.resolve(fake.fullscreen),
      }),
    },
  };
  return fake;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__TAURI__;
  document.body.innerHTML = '';
});

function makeApp(): App {
  document.body.innerHTML = '<div id="app"></div><canvas id="fx"></canvas>';
  return new App(document.querySelector<HTMLElement>('#app')!, memoryStore(), REG, {
    notify: () => undefined,
    onProblem: () => undefined,
  });
}

describe('desktopová aplikace', () => {
  it('na webu se nepozná jako aplikace a API bez Tauri odmítne', async () => {
    expect(isDesktopApp()).toBe(false);
    expect(() => saveExportFile('a.json', '{}')).toThrow();
  });

  it('export uloží přes nativní dialog (save_export) se jménem souboru a obsahem', async () => {
    const fake = installTauri();
    expect(isDesktopApp()).toBe(true);
    await expect(saveExportFile('karban.json', '{"a":1}')).resolves.toBe('/Users/hrac/Desktop/karban.json');
    expect(fake.invoke).toHaveBeenCalledWith('save_export', { fileName: 'karban.json', contents: '{"a":1}' });
  });

  it('downloadExport v aplikaci nevytváří odkaz ke stažení a hlásí zavřený dialog', async () => {
    const app = makeApp();
    const fake = installTauri(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    await expect(downloadExport(app)).resolves.toBe(false);
    expect(click).not.toHaveBeenCalled();
    const [cmd, args] = fake.invoke.mock.calls[0] as [string, { fileName: string; contents: string }];
    expect(cmd).toBe('save_export');
    expect(args.fileName).toMatch(/^karban-ulozeni-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(args.contents)).toMatchObject({ format: 'karban-export' });
    click.mockRestore();
  });

  it('downloadExport v aplikaci po uložení vrátí true', async () => {
    const app = makeApp();
    installTauri('/tmp/karban.json');
    await expect(downloadExport(app)).resolves.toBe(true);
  });

  it('celá obrazovka přepíná okno aplikace', async () => {
    const fake = installTauri();
    await expect(setDesktopFullscreen(true)).resolves.toBe(true);
    expect(fake.fullscreen).toBe(true);
    await expect(isDesktopFullscreen()).resolves.toBe(true);
    await expect(setDesktopFullscreen(false)).resolves.toBe(false);
  });
});

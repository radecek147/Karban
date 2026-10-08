/**
 * Ukázkové sestavy žolíků pro odkaz na rozehranou hru (src/main.ts): hra rovnou založí seedovaný run na Hospodském
 * balíčku a Desítce s těmito žolíky ve slotech (pořadí = pořadí zleva). Seedovaný run se nepočítá do statistik,
 * odemykání ani achievementů. Sestavy a jejich síla: docs/SYNERGIE.md (laboratoř kombinací, 2026-10-08).
 *
 * Sdílí se odkaz `<hra>/sestava/<id>/`: scripts/preset-pages.ts tam dá kopii app shellu s `<base>` na kořen hry
 * (starý service worker ji pustí na síť, takže se načte nová verze) a hra si id přečte z cesty nebo z `?sestava=<id>`
 * (src/ui/linkRoute.ts). Názvy sestav jsou v `newGame.preset.names.<id>` (src/i18n/cs/ui.ts).
 */
export interface JokerPreset {
  /** Id v odkazu: malá písmena bez diakritiky, číslice a pomlčky. */
  readonly id: string;
  readonly jokers: readonly string[];
  /** Další jména, pod kterými sestavu odkaz najde (už normalizovaná, viz `normalizePresetId`). */
  readonly aliases?: readonly string[];
}

/** Parametr adresy hry, který založí run se sestavou (`?sestava=<id>`). */
export const PRESET_PARAM = 'sestava';
/** Adresář stránek s odkazy na sestavy (`<hra>/sestava/<id>/`). */
export const PRESET_DIR = 'sestava';

export const JOKER_PRESETS: readonly JokerPreset[] = [
  // Nejsilnější pětice celkově (beam search, patro 8: ⌀ ×943 proti hře bez žolíků). Napodobitel kopíruje Šťastnou
  // sedmičku (nejdražší běžný/vzácný), Kouzelník nechá skórovat všechny karty, opakování násobí ×2 Fotografa.
  {
    id: 'nejsilnejsi',
    jokers: ['fair_photographer', 'lucky_seven', 'fair_magician', 'recount_committee', 'impersonator'],
    aliases: ['nejsilnejsi-sestava', 'nejlepsi', 'top'],
  },
  // „Photochad“ z běžných a vzácných žolíků: Fotograf + čtyři žolíci na opakování figur.
  {
    id: 'fotograf',
    jokers: ['fair_photographer', 'recount_committee', 'football_fan', 'jukebox', 'echo'],
    aliases: ['photochad', 'fotograf-z-pouti'],
  },
  // Nejsilnější pětice bez Fotografa (bez exponenciály, ⌀ ×37). Silvestr roste až porážkami šéfů.
  {
    id: 'bez-fotografa',
    jokers: ['charles_bridge', 'archivist', 'new_years_eve', 'd1_motorway', 'exchange_office'],
    aliases: ['bezfotografa'],
  },
];

/**
 * Id z odkazu v jednotném tvaru: bez diakritiky, malými písmeny, mezery a podtržítka jako pomlčky, bez interpunkce
 * („Nejsilnější!“ → „nejsilnejsi“, „bez fotografa“ → „bez-fotografa“, „fotograf:“ z rozbitého odkazu → „fotograf“).
 */
export function normalizePresetId(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Sestava podle id nebo jiného jména z odkazu (tolerantně, viz `normalizePresetId`), jinak undefined. */
export function jokerPreset(id: string | null | undefined): JokerPreset | undefined {
  const key = normalizePresetId(id ?? '');
  if (!key) return undefined;
  return JOKER_PRESETS.find((p) => p.id === key || (p.aliases ?? []).includes(key));
}

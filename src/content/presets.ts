/**
 * Ukázkové sestavy žolíků pro odkaz `?sestava=<id>` (src/main.ts): hra rovnou založí seedovaný run na Hospodském
 * balíčku a Desítce s těmito žolíky ve slotech (pořadí = pořadí zleva). Seedovaný run se nepočítá do statistik,
 * odemykání ani achievementů. Sestavy a jejich síla: docs/SYNERGIE.md (laboratoř kombinací, 2026-10-08).
 */
export interface JokerPreset {
  readonly id: string;
  readonly jokers: readonly string[];
}

export const JOKER_PRESETS: readonly JokerPreset[] = [
  // Nejsilnější pětice celkově (beam search, patro 8: ⌀ ×943 proti hře bez žolíků). Napodobitel kopíruje Šťastnou
  // sedmičku (nejdražší běžný/vzácný), Kouzelník nechá skórovat všechny karty, opakování násobí ×2 Fotografa.
  {
    id: 'nejsilnejsi',
    jokers: ['fair_photographer', 'lucky_seven', 'fair_magician', 'recount_committee', 'impersonator'],
  },
  // „Photochad“ z běžných a vzácných žolíků: Fotograf + čtyři žolíci na opakování figur.
  { id: 'fotograf', jokers: ['fair_photographer', 'recount_committee', 'football_fan', 'jukebox', 'echo'] },
  // Nejsilnější pětice bez Fotografa (bez exponenciály, ⌀ ×37). Silvestr roste až porážkami šéfů.
  {
    id: 'bez-fotografa',
    jokers: ['charles_bridge', 'archivist', 'new_years_eve', 'd1_motorway', 'exchange_office'],
  },
];

/** Sestava podle id z odkazu (bez ohledu na velikost písmen), nebo undefined. */
export function jokerPreset(id: string | null | undefined): JokerPreset | undefined {
  const key = (id ?? '').trim().toLowerCase();
  return key ? JOKER_PRESETS.find((p) => p.id === key) : undefined;
}

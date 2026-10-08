/**
 * Žolíci — patch 1.0.2 „Pouť a volby“ (docs/DESIGN.md 4.10, docs/DECISIONS.md 2026-10-07). Texty
 * v src/i18n/cs/jokers/extra.ts. Návod: docs/CONTENT-GUIDE.md.
 *
 * Kombo na figury (přání hráče): Fotograf z pouti násobí první figuru při každé aktivaci (`uncappedXmult`), takže
 * s Volební komisí (první karta skóruje ještě 2×) nebo Fotbalovým fanouškem (figury skórují ještě 1×) roste
 * exponenciálně — nejvýš ×1024 (strop 10 aktivací na kartu); kopírovat nejde. Ekonomika: Zlatník (koruna za figuru), Žebrák (šance na korunu za nefiguru) a Stavební spoření
 * (vyšší strop úroku). Čísla mechanik jsou
 * jen v konstantách níže — stejné hodnoty čte hook i popisek (`params`).
 */
import type { JokerCardCtx, JokerDef } from '../../engine/content-types';
import type { Card } from '../../engine/types';

// ─────────────────────────── Čísla ───────────────────────────

/** Fotograf z pouti: ×mult za první skórující figuru (při každé její aktivaci). */
const PHOTO_XMULT = 2;
/** Volební komise: kolikrát navíc skóruje první skórující karta. */
const RECOUNT_RETRIGGERS = 2;
/** Fotbalový fanoušek: kolikrát navíc skóruje každá skórující figura. */
const FAN_RETRIGGERS = 1;
/** Zlatník: Kč za každou aktivaci skórující figury. */
const CROWN_MONEY = 1;
/** Žebrák: „1 z 2“, že skórující karta bez figury dá Kč. */
const BEGGAR_CHANCE = 1;
const BEGGAR_ODDS = 2;
const BEGGAR_MONEY = 1;
/** Stavební spoření: o kolik Kč se zvedne strop úroku (výchozí 5 Kč). */
const SAVINGS_CAP = 5;

// ─────────────────────────── Pomocníci ───────────────────────────

/** Skórující karty, které opravdu skórují (debuffnutá nedává nic). */
function live(ctx: JokerCardCtx): Card[] {
  return ctx.scoring.filter((c) => !c.debuffed);
}

/** Je `ctx.card` první skórující figura ruky? (Figura podle enginu — respektuje „všechny karty jsou figury“.) */
function isFirstFace(ctx: JokerCardCtx): boolean {
  const first = live(ctx).find((c) => ctx.api.isFace(c));
  return first !== undefined && first.id === ctx.card.id;
}

/** Karta s hodnotou, která není figura (kamenná hodnotu nemá). */
function isPlainRank(ctx: JokerCardCtx, card: Card): boolean {
  return ctx.api.cardRank(card) !== null && !ctx.api.isFace(card);
}

// ─────────────────────────── Žolíci ───────────────────────────

export const EXTRA_JOKERS: JokerDef[] = [
  {
    // ×mult při každé aktivaci první figury (i opakované) — výjimka ze stropu ×mult opakování (`uncappedXmult`).
    // Nejde kopírovat: každá kopie by přidala další ×2 za aktivaci, tedy 2^(instance × aktivace) místo nejvýš ×1024
    // (skeptici testu synergií, DECISIONS 2026-10-08).
    id: 'fair_photographer',
    rarity: 'common',
    cost: 5,
    tags: ['xmult', 'face'],
    params: { xmult: PHOTO_XMULT },
    copyable: false,
    hooks: {
      onCardScored: (ctx) => (isFirstFace(ctx) ? { xmult: PHOTO_XMULT, uncappedXmult: true } : null),
    },
    art: {
      icon: 'sparkles',
      scene: 'fig-fair_photographer',
      prop: 'imperial-crown',
      bg: '#3b2f5c',
      fg: '#fdf3d8',
      accent: '#f2c14e',
      pattern: 'rays',
    },
  },
  {
    // První skórující karta, která skóruje (debuffnutá se přeskočí); kamenná se počítá taky.
    id: 'recount_committee',
    rarity: 'common',
    cost: 5,
    tags: ['retrigger'],
    params: { retriggers: RECOUNT_RETRIGGERS },
    hooks: {
      retriggerScored: (ctx) => (live(ctx)[0]?.id === ctx.card.id ? RECOUNT_RETRIGGERS : 0),
    },
    art: {
      icon: 'quill-ink',
      scene: 'fig-recount_committee',
      prop: 'magnifying-glass',
      bg: '#2f4858',
      fg: '#eef4f2',
      accent: '#e05d5d',
      pattern: 'grid',
    },
  },
  {
    id: 'football_fan',
    rarity: 'rare',
    cost: 6,
    tags: ['retrigger', 'face'],
    params: { retriggers: FAN_RETRIGGERS },
    hooks: {
      retriggerScored: (ctx) => (ctx.api.isFace(ctx.card) ? FAN_RETRIGGERS : 0),
    },
    art: {
      icon: 'megaphone',
      scene: 'fig-football_fan',
      prop: 'beer-horn',
      bg: '#a8322b',
      fg: '#fbf1e8',
      accent: '#f4ede0',
      pattern: 'stripes',
    },
  },
  {
    // Za každou aktivaci figury (opakování Fotbalového fanouška nebo červené pečeti platí taky).
    id: 'crown_goldsmith',
    rarity: 'common',
    cost: 5,
    tags: ['economy', 'face'],
    params: { money: CROWN_MONEY },
    hooks: {
      onCardScored: (ctx) => (ctx.api.isFace(ctx.card) ? { money: CROWN_MONEY } : null),
    },
    art: {
      icon: 'crown-coin',
      scene: 'fig-crown_goldsmith',
      prop: 'anvil',
      bg: '#6b4e16',
      fg: '#fff6dc',
      accent: '#ffd23f',
      pattern: 'checker',
    },
  },
  {
    // Hod při každé aktivaci karty bez figury; kamenná karta (bez hodnoty) nic nedá.
    id: 'beggar',
    rarity: 'common',
    cost: 4,
    tags: ['economy', 'rank'],
    params: { chance: BEGGAR_CHANCE, odds: BEGGAR_ODDS, money: BEGGAR_MONEY },
    hooks: {
      onCardScored: (ctx) =>
        isPlainRank(ctx, ctx.card) && ctx.chance(BEGGAR_CHANCE, BEGGAR_ODDS) ? { money: BEGGAR_MONEY } : null,
    },
    art: {
      icon: 'receive-money',
      scene: 'fig-beggar',
      prop: 'two-coins',
      bg: '#5b5446',
      fg: '#f3ecdc',
      accent: '#c9a227',
      pattern: 'dots',
    },
  },
  {
    // Čistě pravidlo (`passive`) — kopírovat nejde (DESIGN 4.4/7); úrok se počítá při výplatě za kolo.
    id: 'building_savings',
    rarity: 'rare',
    cost: 6,
    tags: ['economy'],
    params: { money: SAVINGS_CAP },
    copyable: false,
    hooks: {
      passive: () => ({ interestCap: SAVINGS_CAP }),
    },
    art: {
      scene: 'j-building_savings',
      icon: 'bank',
      prop: 'house',
      bg: '#24496b',
      fg: '#eef5fb',
      accent: '#7cc6a4',
      pattern: 'grid',
    },
  },
];

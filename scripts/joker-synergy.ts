/**
 * npx tsx scripts/joker-synergy.ts snap   [--seeds 2] [--bots max,flush,pairs] [--antes 4,8] [--out syn-snap.json]
 * npx tsx scripts/joker-synergy.ts mature [--snap syn-snap.json] [--seeds 3] [--out syn-mature.json]
 * npx tsx scripts/joker-synergy.ts pairs  [--snap …] [--mature …] [--shard 1/3] [--only id,…] [--samples 12] [--out …]
 * npx tsx scripts/joker-synergy.ts beam   [--snap …] [--mature …] [--pairs a.json,b.json] [--size 5] [--width 24]
 *                                         [--no-legendary] [--exclude a,b] [--shard 1/3] [--out syn-beam.json]
 *
 * Laboratoř kombinací žolíků (vývojářský nástroj, docs/DECISIONS.md 2026-10-08 „Synergie žolíků“):
 *
 * 1. `snap` — boti (`max`, `flush`, `pairs`) odehrají runy na Desítce a při vstupu do Večerky v zadaných patrech se
 *    uloží stav runu bez žolíků (balíček s vylepšeními, úrovně kombinací, kupóny). To jsou „typické“ stavy pater.
 * 2. `mature` — zralý stav škálujících žolíků: žolík se vloží do runu na začátku patra 2 (s nálepkou Přibitý, ať ho
 *    bot neprodá) a jeho stav se zaznamená při vstupu do Večerky v patře 4 a 7 (medián přes seedy).
 * 3. `pairs` — pro každý stav: 12 typických rukou (náhodné karty z balíčku), u každé široká sada kandidátních tahů
 *    (nejlepší tahy podle odhadu bota, nejvyšší karta, nejlepší dvojice, figury, 5 nejvyšších, 4 v barvě); sestava
 *    žolíků se skóruje přesně (`scoreHand`) na každém kandidátovi a bere se nejlepší tah. Skóre sestavy = součet přes
 *    ruce. Spočítá se prázdná sestava, každý žolík sám a každá dvojice v obou pořadích. Výjimky, NaN a nekonečna se
 *    zapisují jako chyby (testuje se tím i stabilita všech dvojic).
 * 4. `beam` — paprskové hledání nejsilnějších sestav 3–5 žolíků na pozdních stavech (patro 8).
 *
 * Nástroj je deterministický (seedy runů i rukou jsou pevné).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { registry as contentRegistry } from '../src/content/index';
import type { ContentRegistry, JokerDef } from '../src/engine/content-types';
import { addJokerInstance, newJokerInstance } from '../src/engine/effects/api';
import { GameCore } from '../src/engine/effects/core';
import { cyrb128, rngFromState } from '../src/engine/rng/rng';
import { Game } from '../src/engine/run/game';
import { scoreHand } from '../src/engine/scoring/score';
import { createBot, fallbackAction, MAX_CONSECUTIVE_INVALID } from '../src/engine/sim/index';
import type { BotName } from '../src/engine/sim/index';
import { cardValue, makeEnv, planCandidates, RNG_STREAM_NAMES } from '../src/engine/sim/hand-eval';
import type { InstanceState, JokerInstance, RoundState, RunState } from '../src/engine/types';

const reg: ContentRegistry = contentRegistry();
const JOKER_IDS = Object.keys(reg.jokers).sort();
const LAB_MONEY = 30;
const UID_BASE = 9_000_000;
const MAX_ACTIONS = 8000;

// ─────────────────────────── Snapshoty ───────────────────────────

export interface Snap {
  bot: string;
  seed: string;
  ante: number;
  /** JSON stavu runu bez žolíků. */
  state: string;
}

function stripJokers(state: RunState): RunState {
  const st = JSON.parse(JSON.stringify(state)) as RunState;
  st.jokers = [];
  return st;
}

function captureSnapshots(bots: readonly BotName[], seeds: number, antes: readonly number[]): Snap[] {
  const out: Snap[] = [];
  for (const botName of bots) {
    for (let i = 1; i <= seeds; i++) {
      const seed = `SYN-${botName}-${i}`;
      const game = Game.newRun({ seed, deckId: 'pub', stake: 1, challengeId: null }, reg);
      const bot = createBot(botName);
      const want = new Set(antes);
      let streak = 0;
      for (let a = 0; a < MAX_ACTIONS && want.size > 0; a++) {
        const phase = game.state.phase;
        if (phase === 'game_over' || phase === 'victory') break;
        const res = game.dispatch(
          streak >= MAX_CONSECUTIVE_INVALID ? fallbackAction(game) : bot.decide(game),
        );
        if (!res.ok) {
          streak++;
          continue;
        }
        streak = 0;
        for (const e of res.events) {
          if (e.type === 'shopEntered' && want.has(game.state.ante)) {
            want.delete(game.state.ante);
            out.push({
              bot: botName,
              seed,
              ante: game.state.ante,
              state: JSON.stringify(stripJokers(game.state)),
            });
          }
        }
      }
      process.stderr.write(`snap ${seed}: ${antes.filter((x) => !want.has(x)).join(',')}\n`);
    }
  }
  return out;
}

// ─────────────────────────── Zralé stavy ───────────────────────────

/** Žolíci, jejichž stav se během runu mění (počítadla, nabíjení, cíle kopie). */
function hasState(def: JokerDef): boolean {
  return typeof def.initState === 'function';
}

function medianState(states: readonly InstanceState[]): InstanceState | null {
  if (states.length === 0) return null;
  const out: InstanceState = { ...states[0]! };
  for (const key of Object.keys(out)) {
    const nums = states
      .map((s) => s[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (nums.length === states.length) {
      nums.sort((a, b) => a - b);
      out[key] = nums[Math.floor(nums.length / 2)]!;
    }
  }
  return out;
}

export type Mature = Record<string, { mid: InstanceState | null; late: InstanceState | null }>;

function matureStates(seeds: number): Mature {
  const out: Mature = {};
  for (const def of Object.values(reg.jokers)) {
    if (!hasState(def) || def.tags.includes('copy')) continue;
    const mid: InstanceState[] = [];
    const late: InstanceState[] = [];
    for (let i = 1; i <= seeds; i++) {
      const game = Game.newRun({ seed: `SYN-MATURE-${i}`, deckId: 'pub', stake: 1, challengeId: null }, reg);
      const bot = createBot('max');
      let inserted: JokerInstance | null = null;
      let streak = 0;
      let lastState: InstanceState | null = null;
      for (let a = 0; a < MAX_ACTIONS; a++) {
        const phase = game.state.phase;
        if (phase === 'game_over' || phase === 'victory') break;
        const res = game.dispatch(
          streak >= MAX_CONSECUTIVE_INVALID ? fallbackAction(game) : bot.decide(game),
        );
        if (!res.ok) {
          streak++;
          continue;
        }
        streak = 0;
        if (inserted) {
          const live = game.state.jokers.find((j) => j.uid === inserted!.uid);
          if (live) lastState = JSON.parse(JSON.stringify(live.state)) as InstanceState;
        }
        let done = false;
        for (const e of res.events) {
          if (e.type !== 'shopEntered') continue;
          const ante = game.state.ante;
          if (ante === 2 && !inserted) {
            const core = game._core;
            const stickers = def.noEternal ? [] : (['eternal'] as JokerInstance['stickers']);
            const j = newJokerInstance(core, def.id, null, stickers);
            addJokerInstance(core, j, { ignoreSlots: true });
            inserted = j;
          } else if (inserted && lastState && ante === 4) mid.push(lastState);
          else if (inserted && lastState && ante === 7) {
            late.push(lastState);
            done = true;
          }
        }
        if (done) break;
      }
    }
    out[def.id] = { mid: medianState(mid), late: medianState(late) };
    process.stderr.write(`mature ${def.id}: ${JSON.stringify(out[def.id])}\n`);
  }
  return out;
}

// ─────────────────────────── Laboratoř ───────────────────────────

interface Sample {
  hand: number[];
  cands: number[][];
  handsPlayed: number;
}

export interface SnapCtx {
  snap: Snap;
  template: string;
  samples: Sample[];
  hands: number;
  discards: number;
  deckIds: number[];
}

const FACE_RANKS = new Set([11, 12, 13]);

function template(state: RunState, hands: number, discards: number): RunState {
  const st = JSON.parse(JSON.stringify(state)) as RunState;
  st.phase = 'round';
  st.shop = null;
  st.booster = null;
  st.gameOver = null;
  st.money = LAB_MONEY;
  st.nextUid = UID_BASE * 2;
  st.tags = [];
  for (const name of RNG_STREAM_NAMES) st.rng[name] = [1, 0, 0, 0];
  for (const c of st.deck) {
    c.debuffed = false;
    c.faceDown = false;
  }
  st.jokers = [];
  const round: RoundState = {
    blind: 'small',
    bossId: null,
    bossDisabled: false,
    target: Number.MAX_SAFE_INTEGER,
    score: 0,
    handsLeft: hands,
    discardsLeft: discards,
    drawPile: [],
    hand: [],
    discardPile: [],
    playedPile: [],
    handsPlayed: 0,
    discardsUsed: 0,
    handTypesPlayed: [],
    handSizeDelta: 0,
    jokerDebuffs: [],
    cleansedCards: [],
    ruleJokerDebuffs: [],
    flags: {},
  };
  st.round = round;
  return st;
}

export function makeCtx(snap: Snap, nSamples: number): SnapCtx {
  const base = JSON.parse(snap.state) as RunState;
  const g0 = Game.fromState(JSON.parse(snap.state) as RunState, reg);
  const mods = g0.modifiers();
  const hands = Math.max(1, mods.hands);
  const discards = Math.max(0, mods.discards);
  const handSize = Math.max(1, mods.handSize);
  const tpl = template(base, hands, discards);
  const evalGame = Game.fromState(JSON.parse(JSON.stringify(tpl)) as RunState, reg);
  const env = makeEnv(evalGame);
  const rng = rngFromState(cyrb128(`${snap.seed}:${snap.ante}:synergy`));
  const ids = tpl.deck.map((c) => c.id);
  const samples: Sample[] = [];
  for (let k = 0; k < nSamples; k++) {
    const take = Math.min(ids.length, handSize + 2);
    for (let i = 0; i < take; i++) {
      const j = i + Math.floor(rng.next() * (ids.length - i));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    const pile = ids.slice(0, take);
    const cards = pile.map((id) => cardValue(evalGame.card(id)!, env));
    const byId = new Map(pile.map((id) => [id, evalGame.card(id)!]));
    const chipsOf = (id: number): number => {
      const c = byId.get(id)!;
      return (c.rank > 10 ? (c.rank === 14 ? 11 : 10) : c.rank) + c.bonusChips + (c.enhancement ? 5 : 0);
    };
    const order = (play: number[]): number[] =>
      [...play].sort((a, b) => {
        const fa = FACE_RANKS.has(byId.get(a)!.rank) ? 100 : 0;
        const fb = FACE_RANKS.has(byId.get(b)!.rank) ? 100 : 0;
        return fb + chipsOf(b) - (fa + chipsOf(a));
      });
    const cands: number[][] = [];
    const seen = new Set<string>();
    const add = (play: number[]): void => {
      if (play.length === 0 || play.length > env.maxCards) return;
      const key = [...play].sort((a, b) => a - b).join(',');
      if (seen.has(key)) return;
      seen.add(key);
      cands.push(order(play));
    };
    for (const c of planCandidates(evalGame, cards, env, [], 10).slice(0, 6)) add(c.ids);
    const sorted = [...pile].sort((a, b) => chipsOf(b) - chipsOf(a));
    add(sorted.slice(0, 1));
    add(sorted.slice(0, 5));
    const byRank = new Map<number, number[]>();
    for (const id of pile) byRank.set(byId.get(id)!.rank, [...(byRank.get(byId.get(id)!.rank) ?? []), id]);
    const pairs = [...byRank.entries()].filter(([, v]) => v.length >= 2).sort((a, b) => b[0] - a[0]);
    if (pairs[0]) add(pairs[0][1].slice(0, 2));
    add(sorted.filter((id) => FACE_RANKS.has(byId.get(id)!.rank)).slice(0, 5));
    const bySuit = new Map<string, number[]>();
    for (const id of sorted) bySuit.set(byId.get(id)!.suit, [...(bySuit.get(byId.get(id)!.suit) ?? []), id]);
    for (const v of bySuit.values()) if (v.length >= 4) add(v.slice(0, Math.min(5, v.length)));
    for (const v of bySuit.values()) if (v.length >= 4) add(v.slice(0, 4));
    const best = cands[0] ?? [];
    const held = pile.filter((id) => !best.includes(id));
    samples.push({
      hand: [...best, ...held].slice(0, Math.max(handSize, best.length)),
      cands,
      handsPlayed: k % hands,
    });
  }
  return {
    snap,
    template: JSON.stringify(tpl),
    samples,
    hands,
    discards,
    deckIds: tpl.deck.map((c) => c.id),
  };
}

export interface LabError {
  lineup: string[];
  snap: string;
  message: string;
}
const ERRORS: LabError[] = [];

/** Instance sestavy (uid podle pozice; Napodobitel dostane cíl = nejdražší běžný/vzácný kopírovatelný soused). */
export function lineup(ids: readonly string[], mature: Mature, stage: 'mid' | 'late'): JokerInstance[] {
  const st = JSON.parse(JSON.stringify(template(JSON.parse(SCRATCH_STATE) as RunState, 4, 3))) as RunState;
  const core = new GameCore(st, reg);
  const list = ids.map((id, i) => {
    const j = newJokerInstance(core, id);
    j.uid = UID_BASE + i;
    const m = mature[id]?.[stage];
    if (m) j.state = { ...j.state, ...m };
    return j;
  });
  for (const j of list) {
    if (j.defId !== 'impersonator') continue;
    let best: JokerInstance | null = null;
    for (const o of list) {
      const d = reg.jokers[o.defId]!;
      if (o === j || d.copyable === false || (d.rarity !== 'common' && d.rarity !== 'rare')) continue;
      if (!best || d.cost > reg.jokers[best.defId]!.cost) best = o;
    }
    j.state = { ...j.state, target: best?.uid ?? null, round: 0 };
  }
  return list;
}

let SCRATCH_STATE = '';
/** `pairs --only a,b`: jen dvojice s těmito žolíky (přepočet po změně žolíka). */
let ONLY: string[] = [];

/** Součet nejlepších skóre přes typické ruce stavu se sestavou. */
export function scoreLineup(
  ctx: SnapCtx,
  jokers: readonly JokerInstance[],
  names: readonly string[],
): number {
  const jokersJson = JSON.stringify(jokers);
  let total = 0;
  ctx.samples.forEach((sample, k) => {
    let best = 0;
    for (const ids of sample.cands) {
      const st = JSON.parse(ctx.template) as RunState;
      st.jokers = JSON.parse(jokersJson) as JokerInstance[];
      const round = st.round!;
      const inHand = new Set([...sample.hand, ...ids]);
      round.hand = [...ids, ...sample.hand.filter((id) => !ids.includes(id))];
      round.drawPile = ctx.deckIds.filter((id) => !inHand.has(id));
      round.handsPlayed = sample.handsPlayed;
      round.handsLeft = Math.max(1, ctx.hands - sample.handsPlayed);
      round.discardsUsed = Math.min(sample.handsPlayed, ctx.discards);
      round.discardsLeft = Math.max(0, ctx.discards - round.discardsUsed);
      const seed = cyrb128(`${ctx.snap.seed}:${ctx.snap.ante}:rng:${k}`);
      for (const name of RNG_STREAM_NAMES)
        st.rng[name] = [(seed[0]! | 1) >>> 0, seed[1]!, seed[2]!, seed[3]!];
      try {
        const res = scoreHand(new GameCore(st, reg), ids);
        if (
          !Number.isFinite(res.score) ||
          res.score < 0 ||
          Number.isNaN(res.chips) ||
          Number.isNaN(res.mult)
        ) {
          ERRORS.push({
            lineup: [...names],
            snap: `${ctx.snap.seed}@${ctx.snap.ante}`,
            message: `score ${res.score} chips ${res.chips} mult ${res.mult}`,
          });
          continue;
        }
        if (!res.blockedReason && res.score > best) best = res.score;
      } catch (e) {
        if (ERRORS.length < 500)
          ERRORS.push({
            lineup: [...names],
            snap: `${ctx.snap.seed}@${ctx.snap.ante}`,
            message: String((e as Error)?.stack ?? e).slice(0, 400),
          });
      }
    }
    total += best;
  });
  return total;
}

// ─────────────────────────── Režimy ───────────────────────────

function shardOf(spec: string | undefined): [number, number] {
  if (!spec) return [1, 1];
  const [a, b] = spec.split('/').map(Number);
  return [a!, b!];
}

function loadCtxs(snapFile: string, samples: number, antes?: readonly number[]): SnapCtx[] {
  const snaps = (JSON.parse(readFileSync(snapFile, 'utf8')) as Snap[]).filter(
    (s) => !antes || antes.includes(s.ante),
  );
  SCRATCH_STATE = snaps[0]!.state;
  return snaps.map((s) => makeCtx(s, samples));
}

function stageOf(ctx: SnapCtx): 'mid' | 'late' {
  return ctx.snap.ante >= 6 ? 'late' : 'mid';
}

function runPairs(ctxs: SnapCtx[], mature: Mature, shard: [number, number]) {
  const t0 = Date.now();
  const none = ctxs.map((c) => scoreLineup(c, [], []));
  const singles: Record<string, number[]> = {};
  if (shard[0] === 1)
    for (const id of JOKER_IDS)
      singles[id] = ctxs.map((c) => scoreLineup(c, lineup([id], mature, stageOf(c)), [id]));
  const all: [string, string][] = [];
  for (let i = 0; i < JOKER_IDS.length; i++)
    for (let j = i + 1; j < JOKER_IDS.length; j++) all.push([JOKER_IDS[i]!, JOKER_IDS[j]!]);
  const only = new Set(ONLY);
  const mine = all.filter((p, i) =>
    only.size === 0 ? i % shard[1] === shard[0] - 1 : only.has(p[0]) || only.has(p[1]),
  );
  const pairs: { a: string; b: string; ab: number[]; ba: number[] }[] = [];
  mine.forEach(([a, b], n) => {
    const ab = ctxs.map((c) => scoreLineup(c, lineup([a, b], mature, stageOf(c)), [a, b]));
    const ba = ctxs.map((c) => scoreLineup(c, lineup([b, a], mature, stageOf(c)), [b, a]));
    pairs.push({ a, b, ab, ba });
    if (n % 200 === 0)
      process.stderr.write(`pairs ${n}/${mine.length} ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
  });
  return {
    snaps: ctxs.map((c) => ({ bot: c.snap.bot, seed: c.snap.seed, ante: c.snap.ante })),
    none,
    singles,
    pairs,
  };
}

interface BeamEntry {
  ids: string[];
  scores: number[];
  power: number;
}

function geo(xs: readonly number[]): number {
  return Math.exp(xs.reduce((a, x) => a + Math.log(Math.max(1e-9, x)), 0) / Math.max(1, xs.length));
}

function runBeam(
  ctxs: SnapCtx[],
  mature: Mature,
  seeds: string[][],
  size: number,
  width: number,
  pool: readonly string[],
): BeamEntry[] {
  const none = ctxs.map((c) => scoreLineup(c, [], []));
  const evalIds = (ids: string[]): BeamEntry => {
    const scores = ctxs.map((c) => scoreLineup(c, lineup(ids, mature, stageOf(c)), ids));
    return { ids, scores, power: geo(scores.map((s, i) => s / Math.max(1, none[i]!))) };
  };
  let beam = seeds
    .map(evalIds)
    .sort((a, b) => b.power - a.power)
    .slice(0, width);
  const seen = new Set(beam.map((b) => [...b.ids].sort().join('+')));
  for (let n = beam[0]!.ids.length; n < size; n++) {
    const next: BeamEntry[] = [];
    for (const entry of beam) {
      for (const id of pool) {
        if (entry.ids.includes(id)) continue;
        const key = [...entry.ids, id].sort().join('+');
        if (seen.has(key)) continue;
        seen.add(key);
        // Pozice: na konec (×mult vpravo) a na začátek (Brňák, aditivní).
        const a = evalIds([...entry.ids, id]);
        const b = evalIds([id, ...entry.ids]);
        next.push(a.power >= b.power ? a : b);
      }
    }
    beam = next.sort((a, b) => b.power - a.power).slice(0, width);
    process.stderr.write(
      `beam size ${n + 1}: best ${beam[0]?.ids.join(', ')} ×${beam[0]?.power.toFixed(1)}\n`,
    );
  }
  return beam;
}

/** Žebříčky z dat `pairs`: síla (násobek skóre proti prázdné sestavě) a synergie dvojic. */
function report(parts: ReturnType<typeof runPairs>[], errors: LabError[]) {
  const first = parts.find((p) => Object.keys(p.singles).length > 0) ?? parts[0]!;
  const snaps = first.snaps;
  const late = snaps.map((s, i) => (s.ante >= 6 ? i : -1)).filter((i) => i >= 0);
  const mid = snaps.map((s, i) => (s.ante < 6 ? i : -1)).filter((i) => i >= 0);
  const none = first.none;
  const powerOf = (scores: readonly number[], idx: readonly number[]): number =>
    geo(idx.map((i) => scores[i]! / Math.max(1, none[i]!)));
  const single: Record<string, { late: number; mid: number }> = {};
  for (const [id, sc] of Object.entries(first.singles))
    single[id] = { late: powerOf(sc, late), mid: powerOf(sc, mid) };
  const pairs = parts
    .flatMap((p) => p.pairs)
    .map((p) => {
      const best = p.ab.map((x, i) => Math.max(x, p.ba[i]!));
      const sa = first.singles[p.a]!;
      const sb = first.singles[p.b]!;
      const syn = (idx: readonly number[]): number =>
        geo(idx.map((i) => (best[i]! * Math.max(1, none[i]!)) / Math.max(1, sa[i]!) / Math.max(1, sb[i]!)));
      const orderGap = geo(
        late.map((i) => Math.max(p.ab[i]!, p.ba[i]!) / Math.max(1, Math.min(p.ab[i]!, p.ba[i]!))),
      );
      const abBetter = late.reduce((acc, i) => acc + p.ab[i]! - p.ba[i]!, 0) >= 0;
      return {
        ids: abBetter ? [p.a, p.b] : [p.b, p.a],
        late: powerOf(best, late),
        mid: powerOf(best, mid),
        synLate: syn(late),
        synMid: syn(mid),
        orderGap,
      };
    });
  const rarity = (id: string): string => reg.jokers[id]?.rarity ?? '?';
  const top = <T>(xs: T[], key: (x: T) => number, n: number): T[] =>
    [...xs].sort((a, b) => key(b) - key(a)).slice(0, n);
  const partners: Record<string, { id: string; late: number; syn: number }[]> = {};
  for (const id of Object.keys(single)) {
    partners[id] = top(
      pairs.filter((p) => p.ids.includes(id)),
      (p) => p.late,
      5,
    ).map((p) => ({ id: p.ids.find((x) => x !== id)!, late: p.late, syn: p.synLate }));
  }
  return {
    snaps,
    none,
    singles: top(Object.entries(single), ([, v]) => v.late, 200).map(([id, v]) => ({
      id,
      rarity: rarity(id),
      ...v,
    })),
    topPairsLate: top(pairs, (p) => p.late, 120),
    topPairsMid: top(pairs, (p) => p.mid, 60),
    topSynergyLate: top(
      pairs.filter((p) => p.late >= 1.5),
      (p) => p.synLate,
      80,
    ),
    topSynergyMid: top(
      pairs.filter((p) => p.mid >= 1.5),
      (p) => p.synMid,
      40,
    ),
    topNoLegendary: top(
      pairs.filter((p) => p.ids.every((id) => rarity(id) !== 'legendary')),
      (p) => p.late,
      80,
    ),
    topCommonOnly: top(
      pairs.filter((p) => p.ids.every((id) => rarity(id) === 'common')),
      (p) => p.late,
      40,
    ),
    orderSensitive: top(pairs, (p) => p.orderGap, 30),
    partners,
    pairCount: pairs.length,
    errors: errors.slice(0, 200),
    errorCount: errors.length,
  };
}

function main(): void {
  const mode = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      seeds: { type: 'string', default: '2' },
      bots: { type: 'string', default: 'max,flush,pairs' },
      antes: { type: 'string', default: '4,8' },
      snap: { type: 'string', default: 'syn-snap.json' },
      mature: { type: 'string', default: 'syn-mature.json' },
      pairs: { type: 'string' },
      samples: { type: 'string', default: '12' },
      shard: { type: 'string' },
      size: { type: 'string', default: '5' },
      width: { type: 'string', default: '24' },
      'no-legendary': { type: 'boolean', default: false },
      exclude: { type: 'string', default: '' },
      only: { type: 'string', default: '' },
      'beam-antes': { type: 'string', default: '8' },
      out: { type: 'string' },
    },
  });
  const write = (file: string, data: unknown): void => {
    writeFileSync(file, JSON.stringify({ data, errors: ERRORS }, null, 0));
    process.stderr.write(`→ ${file} (${ERRORS.length} chyb)\n`);
  };
  if (mode === 'snap') {
    const snaps = captureSnapshots(
      values.bots!.split(',') as BotName[],
      Number(values.seeds),
      values.antes!.split(',').map(Number),
    );
    writeFileSync(values.out ?? 'syn-snap.json', JSON.stringify(snaps));
    process.stderr.write(`${snaps.length} snapshotů\n`);
  } else if (mode === 'mature') {
    write(values.out ?? 'syn-mature.json', matureStates(Number(values.seeds)));
  } else if (mode === 'pairs') {
    ONLY = values.only!.split(',').filter(Boolean);
    const ctxs = loadCtxs(values.snap!, Number(values.samples));
    const mature = (JSON.parse(readFileSync(values.mature!, 'utf8')) as { data: Mature }).data;
    write(values.out ?? 'syn-pairs.json', runPairs(ctxs, mature, shardOf(values.shard)));
  } else if (mode === 'beam') {
    const ctxs = loadCtxs(values.snap!, Number(values.samples), values['beam-antes']!.split(',').map(Number));
    const mature = (JSON.parse(readFileSync(values.mature!, 'utf8')) as { data: Mature }).data;
    const files = (values.pairs ?? '').split(',').filter(Boolean);
    type PairsData = { data: ReturnType<typeof runPairs> };
    const parts = files.map((f) => (JSON.parse(readFileSync(f, 'utf8')) as PairsData).data);
    const lateIdx = parts[0]!.snaps.map((s, i) => (s.ante >= 6 ? i : -1)).filter((i) => i >= 0);
    const noneL = lateIdx.map((i) => parts[0]!.none[i]!);
    const legendary = (id: string): boolean => reg.jokers[id]?.rarity === 'legendary';
    const excluded = new Set(values.exclude!.split(',').filter(Boolean));
    const okId = (id: string): boolean => !excluded.has(id) && (!values['no-legendary'] || !legendary(id));
    const ranked = parts
      .flatMap((p) => p.pairs)
      .filter((p) => okId(p.a) && okId(p.b))
      .map((p) => {
        const best = lateIdx.map((i) => Math.max(p.ab[i]!, p.ba[i]!));
        const power = geo(best.map((s, k) => s / Math.max(1, noneL[k]!)));
        return { ids: p.ab.reduce((a, x, i) => a + x - p.ba[i]!, 0) >= 0 ? [p.a, p.b] : [p.b, p.a], power };
      })
      .sort((a, b) => b.power - a.power);
    const shard = shardOf(values.shard);
    const width = Number(values.width);
    const seedPairs = ranked.slice(0, width * shard[1]).filter((_, i) => i % shard[1] === shard[0] - 1);
    // Pool rozšíření: žolíci z nejlepších 150 dvojic a 40 nejsilnějších samostatně.
    const singles = parts[0]!.singles;
    const topSingles = Object.entries(singles)
      .filter(([id]) => okId(id))
      .map(([id, s]) => [id, geo(lateIdx.map((i, k) => s[i]! / Math.max(1, noneL[k]!)))] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([id]) => id);
    const pool = [...new Set([...topSingles, ...ranked.slice(0, 150).flatMap((p) => p.ids)])]
      .filter(okId)
      .sort();
    process.stderr.write(`beam: ${seedPairs.length} dvojic, pool ${pool.length}\n`);
    write(
      values.out ?? 'syn-beam.json',
      runBeam(
        ctxs,
        mature,
        seedPairs.map((p) => p.ids),
        Number(values.size),
        width,
        pool,
      ),
    );
  } else if (mode === 'report') {
    const files = (values.pairs ?? '').split(',').filter(Boolean);
    type PairsData = { data: ReturnType<typeof runPairs>; errors: LabError[] };
    const parts = files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as PairsData);
    writeFileSync(
      values.out ?? 'syn-report.json',
      JSON.stringify(
        report(
          parts.map((p) => p.data),
          parts.flatMap((p) => p.errors),
        ),
        null,
        1,
      ),
    );
    process.stderr.write(`→ ${values.out ?? 'syn-report.json'}\n`);
  } else {
    process.stderr.write('Použití: viz hlavička souboru.\n');
    process.exitCode = 1;
  }
}

main();

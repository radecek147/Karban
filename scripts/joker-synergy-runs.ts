/**
 * npx tsx scripts/joker-synergy-runs.ts econ  [--jokers a,b,…] [--pairs] [--seeds 6] [--until 5] [--shard 1/3] [--out f]
 * npx tsx scripts/joker-synergy-runs.ts build --builds "a,b,c;d,e" [--stake 8] [--seeds 20] [--at 3] [--endless 40]
 *                                             [--bot max] [--shard 1/3] [--out f]
 *
 * Celé runy se zadanými žolíky (vývojářský nástroj k scripts/joker-synergy.ts, docs/DECISIONS.md 2026-10-08):
 *
 * - `econ` — žolík (nebo dvojice) se vloží hned na začátku runu s nálepkou Přibitý (bot ho neprodá) a run se hraje
 *   botem `max` do vstupu do Večerky v patře `--until`. Měří se vydělané Kč na vyhrané kolo proti stejnému seedu
 *   bez vložení (Δ Kč/kolo) a peníze při vstupu do Večerek.
 * - `build` — při vstupu do Večerky v patře `--at` se botovi vymění žolíci za zadanou sestavu (Přibití) a run se hraje
 *   dál; po výhře pokračuje nekonečný režim do pádu nebo patra `--endless`. Měří se výhry a dosažené patro proti
 *   stejnému seedu bez výměny.
 */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { registry as contentRegistry } from '../src/content/index';
import type { ContentRegistry } from '../src/engine/content-types';
import { addJokerInstance, newJokerInstance } from '../src/engine/effects/api';
import { Game } from '../src/engine/run/game';
import { createBot, fallbackAction, MAX_CONSECUTIVE_INVALID } from '../src/engine/sim/index';
import type { BotName } from '../src/engine/sim/index';
import type { JokerInstance } from '../src/engine/types';

const reg: ContentRegistry = contentRegistry();

/** Ekonomičtí žolíci a žolíci, kteří s nimi tvoří peněžní kombinace. */
export const ECON_JOKERS = [
  'gardener',
  'piggy_bank',
  'flea_trader',
  'goldsmith',
  'postman',
  'punter',
  'thirteenth_salary',
  'temp_worker',
  'pig_slaughter',
  'crown_goldsmith',
  'beggar',
  'building_savings',
  'notary_public',
  'war_loot',
  'defenestration',
  'voucher_privatization',
  'football_fan',
  'recount_committee',
  'court_painter',
  'jukebox',
];

function inject(game: Game, ids: readonly string[], replace: boolean): void {
  const core = game._core;
  if (replace) core.state.jokers = [];
  for (const id of ids) {
    const def = reg.jokers[id]!;
    const j: JokerInstance = newJokerInstance(core, id, null, def.noEternal ? [] : ['eternal']);
    addJokerInstance(core, j, { ignoreSlots: true, acquire: true });
  }
  core.invalidate();
}

interface RunOut {
  seed: string;
  won: boolean;
  ante: number;
  roundsWon: number;
  moneyEarned: number;
  shopMoney: number[];
  maxAnte: number;
  bestHand: number;
}

function play(
  seed: string,
  stake: number,
  botName: BotName,
  opts: { ids?: readonly string[]; at?: number; replace?: boolean; until?: number; endless?: number },
): RunOut {
  const game = Game.newRun({ seed, deckId: 'pub', stake, challengeId: null }, reg);
  const bot = createBot(botName);
  if (opts.ids && opts.at === 0) inject(game, opts.ids, false);
  const shopMoney: number[] = [];
  let won = false;
  let streak = 0;
  let stop = false;
  for (let a = 0; a < 30000 && !stop; a++) {
    const phase = game.state.phase;
    if (phase === 'game_over') break;
    if (phase === 'victory') {
      won = true;
      if (!opts.endless) break;
    }
    const res = game.dispatch(streak >= MAX_CONSECUTIVE_INVALID ? fallbackAction(game) : bot.decide(game));
    if (!res.ok) {
      streak++;
      continue;
    }
    streak = 0;
    for (const e of res.events) {
      if (e.type === 'victory') won = true;
      if (e.type !== 'shopEntered') continue;
      const ante = game.state.ante;
      shopMoney.push(game.state.money);
      if (opts.ids && opts.at && ante === opts.at && opts.at > 0)
        inject(game, opts.ids, opts.replace ?? false);
      if (opts.until && ante >= opts.until) stop = true;
      if (opts.endless && ante > opts.endless) stop = true;
    }
  }
  const s = game.state;
  return {
    seed,
    won,
    ante: s.gameOver?.ante ?? s.ante,
    roundsWon: s.stats.roundsWon,
    moneyEarned: s.stats.moneyEarned,
    shopMoney,
    maxAnte: s.ante,
    bestHand: s.stats.bestHandScore,
  };
}

function shardOf(spec: string | undefined): [number, number] {
  if (!spec) return [1, 1];
  const [a, b] = spec.split('/').map(Number);
  return [a!, b!];
}

function main(): void {
  const mode = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      jokers: { type: 'string' },
      pairs: { type: 'boolean', default: false },
      seeds: { type: 'string', default: '6' },
      until: { type: 'string', default: '5' },
      builds: { type: 'string' },
      stake: { type: 'string', default: '8' },
      at: { type: 'string', default: '3' },
      endless: { type: 'string', default: '40' },
      bot: { type: 'string', default: 'max' },
      shard: { type: 'string' },
      out: { type: 'string' },
    },
  });
  const seeds = Number(values.seeds);
  const shard = shardOf(values.shard);
  const bot = values.bot as BotName;
  if (mode === 'econ') {
    const ids = values.jokers ? values.jokers.split(',') : ECON_JOKERS;
    const until = Number(values.until);
    const lineups: string[][] = ids.map((id) => [id]);
    if (values.pairs)
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) lineups.push([ids[i]!, ids[j]!]);
    const base: RunOut[] = [];
    for (let i = 1; i <= seeds; i++) base.push(play(`SYN-ECON-${i}`, 1, bot, { until }));
    const out = lineups
      .filter((_, i) => i % shard[1] === shard[0] - 1)
      .map((l) => {
        const runs: RunOut[] = [];
        for (let i = 1; i <= seeds; i++) runs.push(play(`SYN-ECON-${i}`, 1, bot, { ids: l, at: 0, until }));
        const perRound = (r: RunOut): number => r.moneyEarned / Math.max(1, r.roundsWon);
        const delta = runs.map((r, i) => perRound(r) - perRound(base[i]!));
        process.stderr.write(
          `econ ${l.join('+')}: Δ ${(delta.reduce((a, b) => a + b, 0) / seeds).toFixed(2)} Kč/kolo\n`,
        );
        return { lineup: l, runs, deltaPerRound: delta.reduce((a, b) => a + b, 0) / seeds };
      });
    writeFileSync(values.out ?? 'syn-econ.json', JSON.stringify({ base, out }));
  } else if (mode === 'build') {
    const builds = (values.builds ?? '')
      .split(';')
      .filter(Boolean)
      .map((b) => b.split(','));
    const stake = Number(values.stake);
    const at = Number(values.at);
    const endless = Number(values.endless);
    const base: RunOut[] = [];
    for (let i = 1; i <= seeds; i++) base.push(play(`SYN-BUILD-${i}`, stake, bot, { endless }));
    const out = builds
      .filter((_, i) => i % shard[1] === shard[0] - 1)
      .map((b) => {
        const runs: RunOut[] = [];
        for (let i = 1; i <= seeds; i++)
          runs.push(play(`SYN-BUILD-${i}`, stake, bot, { ids: b, at, replace: true, endless }));
        const wins = runs.filter((r) => r.won).length;
        const avgAnte = runs.reduce((a, r) => a + r.maxAnte, 0) / seeds;
        process.stderr.write(`build ${b.join('+')}: výhry ${wins}/${seeds}, patro ⌀ ${avgAnte.toFixed(1)}\n`);
        return { build: b, runs, wins, avgAnte };
      });
    writeFileSync(values.out ?? 'syn-build.json', JSON.stringify({ base, out, stake, at }));
  } else {
    process.stderr.write('Použití: viz hlavička souboru.\n');
    process.exitCode = 1;
  }
}

main();

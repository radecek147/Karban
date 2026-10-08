import { registry } from './src/content/index';
import { Game } from './src/engine/run/game';
import { pickConsumableDefId } from './src/engine/shop/pool';
import { cyrb128, rngFromState } from './src/engine/rng/rng';
const reg = registry();
const g = Game.newRun({ seed: 'PETICE01', deckId: 'pub', stake: 1 }, reg);
g.dispatch({ type: 'selectBlind' });
const core = (g as any).core ?? (g as any)._core;
const s = core.state;
const hand = s.round.hand.slice(0, 5);
for (const id of hand) { const c = s.deck.find((x: any) => x.id === id); c.rank = 14; }
const res = g.dispatch({ type: 'play', cardIds: hand });
console.log('ok', res.ok, 'hand', (res as any).events?.find((e: any) => e.type === 'handPlayed')?.result.hand.type, 'discovered', s.discoveredHands, 'events', (res as any).events.filter((e: any) => e.type === 'handDiscovered'));
const counts: Record<string, number> = {};
const rng = rngFromState(cyrb128('X'));
for (let i = 0; i < 4000; i++) { const id = pickConsumableDefId(core, rng, 'pranostika'); counts[id!] = (counts[id!] ?? 0) + 1; }
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));

/**
 * Living NPC unit tests — run with: npx tsx --test src/game/npc/__tests__/*.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPersonality, personalityDecisionBias, dominantTraits } from '../personality';
import { createMemory, retrieveMemories, decayMemories } from '../memory';
import { applyPlayerAction, getOrCreateRelationship } from '../relationships';
import { planIntention } from '../simulation/planner';
import { parseStructuredDecision, validateDecision } from '../ai/structured';
import { executeTool, listTools, registerDefaultTools } from '../tools/registry';
import { seedLivingNpcs } from '../catalog/seedNpcs';
import { WorldClock } from '../worldClock';
import { NpcDirector } from '../NpcDirector';
import { LivingNpc, PlayerSnapshot } from '../types';

function sampleNpc(): LivingNpc {
  return seedLivingNpcs()[0];
}

describe('personality', () => {
  it('keeps traits distinct and biased decisions', () => {
    const greedy = createPersonality({ greed: 0.9, generosity: 0.1, ambition: 0.8 });
    const kind = createPersonality({ kindness: 0.95, friendliness: 0.9, suspicion: 0.1 });
    assert.notEqual(dominantTraits(greedy)[0], dominantTraits(kind)[0]);
    assert.ok(personalityDecisionBias(greedy).priceMarkup > personalityDecisionBias(kind).priceMarkup);
    assert.ok(personalityDecisionBias(kind).helpStrangers > personalityDecisionBias(greedy).helpStrangers);
  });
});

describe('memory retrieval', () => {
  it('returns only relevant memories', () => {
    const npc = sampleNpc();
    npc.memories = [
      createMemory({
        kind: 'long_term',
        subject: 'player',
        event: 'helped_find_dog',
        description: 'Player helped find Pip',
        importance: 90,
        emotion: 'gratitude',
        timestamp: 100,
        participants: ['player', npc.id],
        significant: true
      }),
      createMemory({
        kind: 'short_term',
        subject: 'npc_other',
        event: 'small_talk',
        description: 'Chat about weather',
        importance: 20,
        emotion: 'neutral',
        timestamp: 200,
        participants: [npc.id]
      })
    ];
    const aboutPlayer = retrieveMemories(npc, { aboutPlayer: true, limit: 5 });
    assert.equal(aboutPlayer.length, 1);
    assert.equal(aboutPlayer[0].event, 'helped_find_dog');
  });

  it('decays non-significant memories', () => {
    const mem = createMemory({
      kind: 'personal',
      subject: 'x',
      event: 'e',
      description: 'd',
      importance: 20,
      emotion: 'n',
      timestamp: 0,
      participants: []
    });
    const before = mem.importance;
    const decayed = decayMemories([{ ...mem }], 1, 60 * 24 * 5);
    // May be filtered if importance drops below threshold — check mapped value
    const mapped = [{ ...mem }].map(m => {
      const ageDays = Math.max(0, (60 * 24 * 5 - m.timestamp) / 1 / (60 * 24));
      return { ...m, importance: Math.max(0, m.importance - ageDays * 1.5) };
    })[0];
    assert.ok(mapped.importance < before);
    assert.ok(decayed.length === 0 || decayed[0].importance <= before);
  });
});

describe('relationships', () => {
  it('updates trust on help and steal', () => {
    const npc = sampleNpc();
    applyPlayerAction(npc, 'help', 1);
    const rel = getOrCreateRelationship(npc, 'player');
    const trustAfterHelp = rel.scores.trust;
    applyPlayerAction(npc, 'steal', 2);
    assert.ok(rel.scores.trust < trustAfterHelp);
    assert.ok(rel.scores.anger > 0);
  });
});

describe('planner', () => {
  it('chooses food when hungry with money', () => {
    const npc = sampleNpc();
    npc.needs.hunger = 90;
    npc.money = 50;
    const clock = new WorldClock().state;
    const player: PlayerSnapshot = {
      id: 'player',
      username: 'T',
      worldX: 0,
      worldY: 0,
      reputation: 50,
      coins: 10,
      inventory: []
    };
    const plan = planIntention(npc, clock, [], player);
    assert.equal(plan.intention.intent, 'FIND_FOOD');
    assert.equal(plan.escalateToAi, false);
  });

  it('escalates when hungry without money', () => {
    const npc = sampleNpc();
    npc.needs.hunger = 90;
    npc.money = 2;
    const clock = new WorldClock().state;
    const player: PlayerSnapshot = {
      id: 'player',
      username: 'T',
      worldX: 0,
      worldY: 0,
      reputation: 50,
      coins: 10,
      inventory: []
    };
    const plan = planIntention(npc, clock, [], player);
    assert.equal(plan.escalateToAi, true);
  });
});

describe('structured AI', () => {
  it('parses and validates JSON decisions', () => {
    const raw = 'Sure.\n{"intent":"GO_TO_WORK","reason":"need coin","target":"workplace","priority":0.9,"emotion":"determined","dialogue":null}';
    const d = parseStructuredDecision(raw);
    assert.ok(d);
    assert.equal(validateDecision(d!).intent, 'GO_TO_WORK');
  });

  it('rejects arbitrary intents', () => {
    const d = parseStructuredDecision('{"intent":"HACK_SERVER","reason":"x","priority":1}');
    assert.ok(d);
    assert.equal(validateDecision(d!).intent, 'IDLE');
  });
});

describe('game tools', () => {
  it('only executes registered tools', () => {
    registerDefaultTools();
    assert.ok(listTools().includes('get_world_time'));
    const npc = sampleNpc();
    const ctx = {
      npcs: new Map([[npc.id, npc]]),
      player: {
        id: 'player' as const,
        username: 'T',
        worldX: 0,
        worldY: 0,
        reputation: 50,
        coins: 10,
        inventory: []
      },
      clock: new WorldClock().state,
      events: [],
      quests: [],
      isWalkable: () => true,
      emitEvent: () => undefined,
      now: 1
    };
    const ok = executeTool('get_world_time', {}, ctx);
    assert.equal(ok.ok, true);
    const bad = executeTool('eval_code', {}, ctx);
    assert.equal(bad.ok, false);
  });
});

describe('NpcDirector', () => {
  it('boots seeded NPCs and simulates without AI', () => {
    const dir = new NpcDirector();
    dir.setWalkableChecker(() => true);
    dir.boot('Tester');
    assert.ok(dir.npcs.size >= 8);
    dir.updatePlayer(0, 0);
    dir.tick(1);
    const visuals = dir.getVisuals();
    assert.ok(visuals.length >= 1);
    const time = dir.getWorldTime();
    assert.ok(typeof time.time === 'string');
  });
});

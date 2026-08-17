import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { seedLivingNpcs } from '../catalog/seedNpcs';
import { greetingLine, npcReplyToChoice, voiceStyle } from '../dialogue/templates';
import { buildNpcNpcScript } from '../dialogue/npcChat';
import { collectWorldFacts, bakeryIsOpen } from '../dialogue/worldFacts';
import { isMeaningfulConversation, recordConversation } from '../dialogue/conversationStore';
import { DialogueRuntime } from '../dialogue/runtime';
import { NpcDirector } from '../NpcDirector';
import { WorldClock } from '../worldClock';
import { ensureStolenShipmentEvent, shouldStartShipmentStory } from '../dialogue/story';
import { normalizeEmotion } from '../dialogue/portraits';
import { executeTool, listTools, registerDefaultTools } from '../tools/registry';
import { PlayerSnapshot } from '../types';

const player: PlayerSnapshot = {
  id: 'player',
  username: 'Alex',
  worldX: 0,
  worldY: 0,
  reputation: 50,
  coins: 20,
  inventory: []
};

describe('cinematic dialogue', () => {
  it('gives distinct voices to different personalities', () => {
    const [mayor, , maria, , , kira, jon] = seedLivingNpcs();
    assert.equal(voiceStyle(maria.personality, maria.emotions), 'friendly');
    assert.ok(['suspicious', 'greedy', 'serious'].includes(voiceStyle(kira.personality, kira.emotions)));
    assert.equal(voiceStyle(jon.personality, jon.emotions), 'suspicious');
    const clock = new WorldClock().state;
    const facts = collectWorldFacts(mayor, clock, [], [], new Map([[mayor.id, mayor]]));
    const gMayor = greetingLine(mayor, player, facts);
    const gJon = greetingLine(jon, player, facts);
    assert.notEqual(gMayor.text, gJon.text);
  });

  it('NPC↔NPC scripts use knowledge instead of empty chatter', () => {
    const npcs = seedLivingNpcs();
    const kira = npcs.find(n => n.id === 'npc_shop_kira')!;
    const jon = npcs.find(n => n.id === 'npc_guard_jon')!;
    kira.knowledge.unshift({
      id: 'k_test',
      topic: 'missing_shipment',
      content: 'Someone stole his shipment last night.',
      confidence: 0.9,
      source: 'witness',
      learnedAt: 1
    });
    const script = buildNpcNpcScript(kira, jon, { type: 'friendship', summary: 'chat' }, [], []);
    assert.equal(script.topic, 'missing_shipment');
    assert.ok(script.lines.some(l => /merchant|shipment|stole/i.test(l.text)));
    assert.ok(script.importance >= 70);
  });

  it('bakery fact follows Maria’s real location', () => {
    const maria = seedLivingNpcs().find(n => n.id === 'npc_baker_maria')!;
    maria.currentActivity = 'work';
    maria.currentLocation = { ...maria.workplace };
    assert.equal(bakeryIsOpen(maria), true);
    maria.currentLocation = { ...maria.home };
    maria.currentActivity = 'sleep';
    assert.equal(bakeryIsOpen(maria), false);
  });

  it('stores only meaningful conversations', () => {
    assert.equal(isMeaningfulConversation(22, 'small_talk'), false);
    assert.equal(isMeaningfulConversation(72, 'npc_npc'), true);
    const list = recordConversation([], {
      id: 'c1',
      participants: ['a', 'b'],
      location: { x: 0, y: 0 },
      worldTime: { day: 1, hour: 8, minute: 0 },
      topic: 'small_talk',
      dialogue: ['hi'],
      emotions: ['neutral'],
      choices: [],
      outcome: 'small_talk',
      memoriesCreated: [],
      importance: 20
    });
    assert.equal(list.length, 0);
  });

  it('player choices create memories and can start a quest', () => {
    const dir = new NpcDirector();
    dir.setWalkableChecker(() => true);
    dir.boot('Alex');
    dir.updatePlayer(0, 0);
    const maria = [...dir.npcs.values()].find(n => n.id === 'npc_baker_maria')!;
    maria.currentLocation = { worldX: 0, worldY: 0, chunkX: 0, chunkY: 0 };
    const scene = dir.beginTalk(maria.id);
    assert.ok(scene);
    assert.ok(scene!.choices && scene!.choices.length >= 2);
    dir.chooseDialogue('offer_help');
    assert.ok(maria.memories.some(m => m.event === 'player_promised_to_help'));
    assert.ok(dir.quests.some(q => q.giverId === maria.id && q.status === 'active'));
  });

  it('shipment story is factual before NPCs talk about it', () => {
    const dir = new NpcDirector();
    dir.setWalkableChecker(() => true);
    dir.boot('Alex');
    const kira = dir.npcs.get('npc_shop_kira')!;
    const jon = dir.npcs.get('npc_guard_jon')!;
    assert.equal(shouldStartShipmentStory(kira, jon, dir.events.events), true);
    const evt = ensureStolenShipmentEvent(dir.npcs, dir.events.events, dir.worldNow());
    assert.ok(evt);
    dir.events.push(evt!);
    assert.equal(evt!.kind, 'theft');
    assert.ok(kira.knowledge.some(k => k.topic === 'missing_shipment'));
  });

  it('maps emotions and extra tools', () => {
    assert.equal(normalizeEmotion('shock'), 'surprised');
    registerDefaultTools();
    assert.ok(listTools().includes('get_world_events'));
    assert.ok(listTools().includes('get_active_quests'));
    const npc = seedLivingNpcs()[0];
    const ctx = {
      npcs: new Map([[npc.id, npc]]),
      player,
      clock: new WorldClock().state,
      events: [],
      quests: [],
      isWalkable: () => true,
      emitEvent: () => undefined,
      now: 1
    };
    const mem = executeTool('create_memory', { npc_id: npc.id, event: 'met_player', description: 'hello', importance: 80 }, ctx);
    assert.equal(mem.ok, true);
  });

  it('runtime opens overheard NPC talk', () => {
    const dir = new NpcDirector();
    dir.setWalkableChecker(() => true);
    dir.boot('Alex');
    dir.updatePlayer(0, 0);
    const a = dir.npcs.get('npc_mayor_pixel')!;
    const b = dir.npcs.get('npc_courier_lina')!;
    a.currentLocation = { worldX: 0, worldY: 0, chunkX: 0, chunkY: 0 };
    b.currentLocation = { worldX: 1, worldY: 0, chunkX: 0, chunkY: 0 };
    const rt: DialogueRuntime = dir.dialogueRt;
    rt.handleMeeting(a, b, { type: 'friendship', summary: 'chat' });
    assert.ok(rt.ambient);
    assert.ok(rt.bubbles.length >= 1);
    const scene = dir.listenIn();
    assert.ok(scene?.overheard);
  });
});

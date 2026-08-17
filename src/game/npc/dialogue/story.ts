/**
 * Story beats that can emerge from NPC talk — always anchored to real world state.
 */

import { DynamicQuest, LivingNpc, WorldEvent } from '../types';
import { createWorldEvent } from '../worldEvents';
import { addKnowledge } from '../knowledge';
import { DISTRICT_ORIGINS } from '../../iso/WorldGen';

let storySeq = 0;

export function ensureStolenShipmentEvent(
  npcs: Map<string, LivingNpc>,
  events: WorldEvent[],
  at: number
): WorldEvent | null {
  if (events.some(e => e.id === 'evt_missing_shipment' || e.payload?.story === 'missing_shipment')) {
    return events.find(e => e.payload?.story === 'missing_shipment') ?? null;
  }
  const kira = npcs.get('npc_shop_kira');
  if (!kira) return null;
  const shop = DISTRICT_ORIGINS.shopping_outpost;
  const evt = createWorldEvent({
    id: 'evt_missing_shipment',
    kind: 'theft',
    title: 'Missing Shipment',
    description: 'Someone stole a merchant shipment last night near the shopping outpost.',
    importance: 78,
    location: { x: shop.x, y: shop.y, radius: 50 },
    startedAt: at,
    participants: [kira.id, 'npc_guard_jon'],
    payload: { story: 'missing_shipment', factual: true }
  });
  addKnowledge(
    kira,
    'missing_shipment',
    'Someone stole my shipment last night. Crates never reached the outpost.',
    'witness',
    at,
    0.95
  );
  const jon = npcs.get('npc_guard_jon');
  if (jon) {
    addKnowledge(jon, 'missing_shipment', 'A merchant reported a stolen shipment last night.', 'rumor', at, 0.7);
  }
  return evt;
}

export function createShipmentQuest(giver: LivingNpc, at: number): DynamicQuest {
  storySeq += 1;
  return {
    id: `q_shipment_${giver.id}_${storySeq}`,
    giverId: giver.id,
    title: 'Find the Missing Shipment',
    description: `${giver.name} wants the stolen crates traced before the trail goes cold.`,
    reason: 'Verified theft world event',
    objective: { type: 'investigate', target: 'evt_missing_shipment' },
    rewardCoins: 40,
    relationshipReward: { friendship: 8, trust: 10, respect: 6 },
    status: 'available',
    createdAt: at,
    anchors: { locations: ['shopping_outpost'], npcs: [giver.id, 'npc_guard_jon'] }
  };
}

export function shouldStartShipmentStory(a: LivingNpc, b: LivingNpc, events: WorldEvent[]): boolean {
  const pair = [a.id, b.id];
  const merchantInvolved = pair.includes('npc_shop_kira');
  if (!merchantInvolved) return false;
  if (events.some(e => e.payload?.story === 'missing_shipment')) return false;
  return true;
}

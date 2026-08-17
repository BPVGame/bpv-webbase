import { LivingNpc, InventoryItem, DynamicQuest, RelationshipScores } from './types';
import { personalityDecisionBias } from './personality';
import { applyRelationshipDelta } from './relationships';

export function makeItem(id: string, name: string, qty: number, value: number, tags?: string[]): InventoryItem {
  return { id, name, qty, value, tags };
}

/**
 * Deterministic transaction — ElloFive may intend, engine executes.
 * Returns false if invalid (insufficient funds / stock).
 */
export function transferCoins(from: LivingNpc | { money: number }, to: LivingNpc | { money: number }, amount: number): boolean {
  if (amount <= 0 || from.money < amount) return false;
  from.money -= amount;
  to.money += amount;
  return true;
}

export function buyItem(
  buyer: LivingNpc,
  seller: LivingNpc,
  itemId: string,
  qty = 1
): { ok: boolean; reason: string; price?: number } {
  const item = seller.inventory.find(i => i.id === itemId);
  if (!item || item.qty < qty) return { ok: false, reason: 'item_unavailable' };
  const bias = personalityDecisionBias(seller.personality);
  const unit = Math.max(1, Math.round(item.value * bias.priceMarkup));
  const price = unit * qty;
  if (buyer.money < price) return { ok: false, reason: 'insufficient_funds', price };
  if (!transferCoins(buyer, seller, price)) return { ok: false, reason: 'payment_failed', price };
  item.qty -= qty;
  if (item.qty <= 0) seller.inventory = seller.inventory.filter(i => i.id !== itemId);
  const existing = buyer.inventory.find(i => i.id === itemId);
  if (existing) existing.qty += qty;
  else buyer.inventory.push({ ...item, qty });
  return { ok: true, reason: 'ok', price };
}

export function earnWage(npc: LivingNpc, base = 12): number {
  const bias = personalityDecisionBias(npc.personality);
  const pay = Math.round(base * (0.7 + bias.workDrive));
  npc.money += pay;
  npc.needs.work = Math.max(0, npc.needs.work - 25);
  npc.needs.money = Math.max(0, 100 - Math.min(100, npc.money / 5));
  return pay;
}

export function spendOnFood(npc: LivingNpc, cost = 8): boolean {
  if (npc.money < cost) return false;
  npc.money -= cost;
  npc.needs.hunger = Math.max(0, npc.needs.hunger - 40);
  return true;
}

let questSeq = 0;

export function createNeedQuest(npc: LivingNpc, at: number): DynamicQuest | null {
  // Quests must anchor to real state
  if (npc.needs.hunger > 75 && npc.money < 15) {
    questSeq += 1;
    return {
      id: `q_${npc.id}_${questSeq}`,
      giverId: npc.id,
      title: 'Hungry and Short on Coin',
      description: `${npc.name} needs help buying a meal at the market.`,
      reason: 'High hunger and low money',
      objective: { type: 'deliver_coins', target: npc.id, qty: 20 },
      rewardCoins: 5,
      relationshipReward: { friendship: 10, trust: 5 },
      status: 'available',
      createdAt: at,
      anchors: { locations: ['market'], npcs: [npc.id] }
    };
  }
  const lost = npc.inventory.find(i => i.tags?.includes('lost'));
  if (lost) {
    questSeq += 1;
    return {
      id: `q_${npc.id}_${questSeq}`,
      giverId: npc.id,
      title: `Find ${lost.name}`,
      description: `${npc.name} lost their ${lost.name} nearby.`,
      reason: 'Inventory item marked lost',
      objective: { type: 'find_item', target: lost.id, qty: 1 },
      rewardCoins: 20,
      relationshipReward: { friendship: 10, respect: 5 },
      status: 'available',
      createdAt: at,
      anchors: { items: [lost.id], locations: ['home', 'plaza'], npcs: [npc.id] }
    };
  }
  if (npc.needs.safety > 70 && npc.occupation !== 'guard') {
    questSeq += 1;
    return {
      id: `q_${npc.id}_${questSeq}`,
      giverId: npc.id,
      title: 'Escort Me Home',
      description: `${npc.name} feels unsafe and wants an escort to their home.`,
      reason: 'Low sense of safety',
      objective: { type: 'escort', target: npc.id },
      rewardCoins: 15,
      relationshipReward: { friendship: 8, trust: 8 },
      status: 'available',
      createdAt: at,
      anchors: { locations: ['home'], npcs: [npc.id] }
    };
  }
  return null;
}

export function completeQuest(
  quest: DynamicQuest,
  giver: LivingNpc,
  playerRelTarget: 'player',
  at: number
): void {
  quest.status = 'completed';
  applyRelationshipDelta(giver, playerRelTarget, quest.relationshipReward as Partial<RelationshipScores>, `Quest completed: ${quest.title}`, at, 'player');
}

import { LivingNpc } from '../types';
import { applyRelationshipDelta } from '../relationships';
import { spreadRumor } from '../knowledge';
import { buyItem } from '../economy';
import { personalityDecisionBias } from '../personality';

/**
 * Cheap NPC↔NPC simulation — escalate only meaningful beats to ElloFive elsewhere.
 */
export function simulateNpcMeeting(
  a: LivingNpc,
  b: LivingNpc,
  at: number
): { type: string; summary: string; escalate: boolean } {
  const dx = a.currentLocation.worldX - b.currentLocation.worldX;
  const dy = a.currentLocation.worldY - b.currentLocation.worldY;
  if (Math.hypot(dx, dy) > 3) return { type: 'none', summary: '', escalate: false };

  const relA = a.relationships.find(r => r.targetId === b.id);
  const anger = relA?.scores.anger ?? 0;
  const friendship = relA?.scores.friendship ?? 20;
  const biasA = personalityDecisionBias(a.personality);
  const biasB = personalityDecisionBias(b.personality);

  // Merchant ↔ customer
  if (
    (a.occupation === 'merchant' || a.occupation === 'baker') &&
    b.needs.hunger > 50 &&
    a.inventory.some(i => i.tags?.includes('food'))
  ) {
    const food = a.inventory.find(i => i.tags?.includes('food'))!;
    const result = buyItem(b, a, food.id, 1);
    return {
      type: 'transaction',
      summary: result.ok
        ? `${b.name} bought ${food.name} from ${a.name}`
        : `${b.name} failed to buy from ${a.name}: ${result.reason}`,
      escalate: false
    };
  }

  if (anger > 50 || (a.personality.arrogance > 0.7 && b.personality.arrogance > 0.7)) {
    applyRelationshipDelta(a, b.id, { anger: 3, friendship: -2 }, `Argument with ${b.name}`, at);
    applyRelationshipDelta(b, a.id, { anger: 3, friendship: -2 }, `Argument with ${a.name}`, at);
    return { type: 'argument', summary: `${a.name} argued with ${b.name}`, escalate: anger > 70 };
  }

  if (friendship > 55 || (biasA.socialDrive > 0.5 && biasB.socialDrive > 0.5)) {
    applyRelationshipDelta(a, b.id, { friendship: 2 }, `Friendly chat with ${b.name}`, at, 'friend');
    applyRelationshipDelta(b, a.id, { friendship: 2 }, `Friendly chat with ${a.name}`, at, 'friend');
    // Rumor pass
    if (a.knowledge[0]) spreadRumor(a, b, a.knowledge[0], at);
    a.needs.social = Math.max(0, a.needs.social - 15);
    b.needs.social = Math.max(0, b.needs.social - 15);
    return { type: 'friendship', summary: `${a.name} chatted with ${b.name}`, escalate: false };
  }

  if (a.occupation === 'guard' && b.emotions.anger > 40 && a.personality.suspicion > 0.5) {
    return {
      type: 'investigate',
      summary: `${a.name} eyes ${b.name} suspiciously`,
      escalate: true
    };
  }

  return { type: 'pass', summary: `${a.name} nods at ${b.name}`, escalate: false };
}

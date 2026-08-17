/**
 * Ground dialogue in the live world. NPCs may only state these facts as true.
 */

import { LivingNpc, WorldEvent, WorldTimeState, DynamicQuest } from '../types';

export interface WorldFact {
  id: string;
  statement: string;
  topic: string;
}

export function bakeryIsOpen(maria: LivingNpc | undefined): boolean {
  if (!maria) return false;
  const atShop =
    Math.hypot(maria.currentLocation.worldX - maria.workplace.worldX, maria.currentLocation.worldY - maria.workplace.worldY) < 4;
  return atShop && (maria.currentActivity === 'work' || maria.currentActivity === 'offer_quest' || maria.currentActivity === 'talking');
}

export function collectWorldFacts(
  npc: LivingNpc,
  clock: WorldTimeState,
  events: WorldEvent[],
  quests: DynamicQuest[],
  npcs: Map<string, LivingNpc>
): WorldFact[] {
  const facts: WorldFact[] = [
    {
      id: 'time',
      topic: 'time',
      statement: `It is day ${clock.day}, ${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}, ${clock.season}, weather ${clock.weather}.`
    },
    {
      id: 'self',
      topic: 'self',
      statement: `${npc.name} is currently ${npc.currentActivity} at (${npc.currentLocation.worldX}, ${npc.currentLocation.worldY}).`
    }
  ];

  const maria = npcs.get('npc_baker_maria');
  if (maria) {
    facts.push({
      id: 'bakery',
      topic: 'bakery',
      statement: bakeryIsOpen(maria)
        ? 'Maria’s bakery is open — she is at the shop.'
        : 'Maria’s bakery is closed right now — she is not at the shop.'
    });
  }

  for (const e of events.filter(ev => ev.importance >= 40).slice(0, 6)) {
    facts.push({
      id: `evt_${e.id}`,
      topic: e.kind,
      statement: `${e.title}: ${e.description}`
    });
  }

  for (const k of npc.knowledge.filter(x => x.confidence >= 0.35).slice(0, 6)) {
    facts.push({ id: k.id, topic: k.topic, statement: k.content });
  }

  for (const q of quests.filter(q => q.giverId === npc.id && q.status !== 'failed').slice(0, 3)) {
    facts.push({
      id: q.id,
      topic: 'quest',
      statement: `Quest "${q.title}" is ${q.status}: ${q.description}`
    });
  }

  return facts;
}

export function formatFactsForPrompt(facts: WorldFact[]): string {
  if (!facts.length) return '(no verified world facts)';
  return facts.map(f => `- ${f.statement}`).join('\n');
}

import { LivingNpc, NpcKnowledgeFact } from './types';

let knowSeq = 0;

export function addKnowledge(
  npc: LivingNpc,
  topic: string,
  content: string,
  source: NpcKnowledgeFact['source'],
  at: number,
  confidence = 0.8
): NpcKnowledgeFact {
  knowSeq += 1;
  const fact: NpcKnowledgeFact = {
    id: `k_${knowSeq}`,
    topic,
    content,
    confidence,
    source,
    learnedAt: at
  };
  npc.knowledge.unshift(fact);
  if (npc.knowledge.length > 60) npc.knowledge.length = 60;
  return fact;
}

export function knowsAbout(npc: LivingNpc, topic: string): NpcKnowledgeFact[] {
  const t = topic.toLowerCase();
  return npc.knowledge.filter(k => k.topic.toLowerCase().includes(t) || k.content.toLowerCase().includes(t));
}

/**
 * Rumor spread with mutation — creates a dynamic information network.
 * Receiver only learns a local/modified version.
 */
export function spreadRumor(from: LivingNpc, to: LivingNpc, fact: NpcKnowledgeFact, at: number): NpcKnowledgeFact | null {
  if (from.id === to.id) return null;
  // Distance / social gate
  const dx = from.currentLocation.worldX - to.currentLocation.worldX;
  const dy = from.currentLocation.worldY - to.currentLocation.worldY;
  if (Math.hypot(dx, dy) > 14) return null;

  const mutate = Math.random() > 0.65;
  const content = mutate
    ? `${fact.content} (or so ${from.name} heard…)`
    : `${from.name} said: ${fact.content}`;
  const confidence = Math.max(0.2, fact.confidence * (mutate ? 0.7 : 0.9));
  return addKnowledge(to, fact.topic, content, 'rumor', at, confidence);
}

export function occupationKnowledge(occupation: LivingNpc['occupation']): Array<{ topic: string; content: string }> {
  switch (occupation) {
    case 'merchant':
      return [
        { topic: 'prices', content: 'Cobble market prices rise on festival days.' },
        { topic: 'trade', content: 'Travelers from Pixel Harbor bring dock goods.' }
      ];
    case 'farmer':
      return [
        { topic: 'crops', content: 'Riverbanks flood after heavy rain — plant on higher dirt.' },
        { topic: 'weather', content: 'Morning fog means a clear afternoon in spring.' }
      ];
    case 'guard':
      return [
        { topic: 'safety', content: 'Suspicious folk linger near the east road after dusk.' },
        { topic: 'crime', content: 'Report thefts at the plaza hub.' }
      ];
    case 'card_master':
      return [
        { topic: 'fish_cards', content: 'Emoji Destin is an Epic Fish Card prized by collectors.' },
        { topic: 'tournaments', content: 'Tournament hubs host matches on market evenings.' }
      ];
    case 'mayor':
      return [
        { topic: 'city', content: 'City Center plaza is the heart of Havenbrook.' },
        { topic: 'politics', content: 'District warp stones link distant settlements.' }
      ];
    default:
      return [{ topic: 'local', content: 'The roads connect villages across the infinite earth.' }];
  }
}

export function formatKnowledgeForPrompt(npc: LivingNpc, limit = 6): string {
  const facts = npc.knowledge.slice(0, limit);
  if (!facts.length) return '(limited local knowledge)';
  return facts.map(f => `- [${f.source}|c=${f.confidence.toFixed(2)}] ${f.topic}: ${f.content}`).join('\n');
}

/** Strip global secrets the NPC should not know. */
export function filterKnowledgeForDialogue(npc: LivingNpc): NpcKnowledgeFact[] {
  return npc.knowledge.filter(k => k.confidence >= 0.35 && !npc.secrets.includes(k.id));
}

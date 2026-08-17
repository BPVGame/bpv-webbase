import {
  ActorId,
  LivingNpc,
  NpcRelationship,
  RelationshipScores,
  PlayerSnapshot
} from './types';
import { clamp100 } from './personality';
import { rememberInteraction } from './memory';

export function defaultScores(): RelationshipScores {
  return { trust: 40, friendship: 20, respect: 30, fear: 0, anger: 0 };
}

export function getOrCreateRelationship(
  npc: LivingNpc,
  targetId: ActorId,
  role: NpcRelationship['role'] = 'other'
): NpcRelationship {
  let rel = npc.relationships.find(r => r.targetId === targetId);
  if (!rel) {
    rel = { targetId, role, scores: defaultScores(), history: [] };
    if (targetId === 'player') {
      rel.role = 'player';
      // Suspicion slows trust growth with strangers
      rel.scores.trust = Math.round(35 - npc.personality.suspicion * 20 + npc.personality.friendliness * 15);
      rel.scores.friendship = Math.round(10 + npc.personality.friendliness * 20);
    }
    npc.relationships.push(rel);
  }
  return rel;
}

export function applyRelationshipDelta(
  npc: LivingNpc,
  targetId: ActorId,
  delta: Partial<RelationshipScores>,
  reason: string,
  at: number,
  role?: NpcRelationship['role']
): NpcRelationship {
  const rel = getOrCreateRelationship(npc, targetId, role);
  for (const key of Object.keys(delta) as Array<keyof RelationshipScores>) {
    const v = delta[key];
    if (typeof v === 'number') rel.scores[key] = clamp100(rel.scores[key] + v);
  }
  rel.history.unshift({ reason, delta, at });
  if (rel.history.length > 40) rel.history.length = 40;

  rememberInteraction(npc, {
    event: 'relationship_change',
    description: `${reason} → ${JSON.stringify(delta)}`,
    importance: 45 + Math.min(30, Math.abs(delta.trust ?? 0) + Math.abs(delta.friendship ?? 0)),
    emotion: (delta.anger ?? 0) > 0 ? 'anger' : (delta.friendship ?? 0) > 0 ? 'warmth' : 'neutral',
    subject: targetId,
    participants: [npc.id, targetId],
    kind: 'relationship',
    timestamp: at
  });

  return rel;
}

/** Map player actions to relationship effects (deterministic). */
export function applyPlayerAction(
  npc: LivingNpc,
  action:
    | 'help'
    | 'lie'
    | 'steal'
    | 'save'
    | 'gift'
    | 'insult'
    | 'apologize'
    | 'return_stolen'
    | 'talk_friendly',
  at: number,
  detail?: string
): void {
  const p = npc.personality;
  switch (action) {
    case 'help':
      applyRelationshipDelta(
        npc,
        'player',
        {
          friendship: 8 + Math.round(p.kindness * 4),
          trust: 5,
          respect: 3
        },
        detail ?? 'Player helped NPC',
        at,
        'player'
      );
      break;
    case 'lie':
      applyRelationshipDelta(
        npc,
        'player',
        { trust: -12 - Math.round(p.suspicion * 8), anger: 4 },
        detail ?? 'Player lied',
        at,
        'player'
      );
      break;
    case 'steal':
      applyRelationshipDelta(
        npc,
        'player',
        { trust: -30, anger: 25, fear: 5, friendship: -15 },
        detail ?? 'Player stole from NPC',
        at,
        'player'
      );
      break;
    case 'save':
      applyRelationshipDelta(
        npc,
        'player',
        { respect: 20, friendship: 15, trust: 10 },
        detail ?? 'Player saved NPC',
        at,
        'player'
      );
      break;
    case 'gift':
      applyRelationshipDelta(
        npc,
        'player',
        { friendship: 6 + Math.round(p.generosity * 3), trust: 2 },
        detail ?? 'Player gave a gift',
        at,
        'player'
      );
      break;
    case 'insult':
      applyRelationshipDelta(
        npc,
        'player',
        { anger: 15, friendship: -10, respect: -8 },
        detail ?? 'Player insulted NPC',
        at,
        'player'
      );
      break;
    case 'apologize':
      applyRelationshipDelta(
        npc,
        'player',
        { anger: -10, trust: 3 },
        detail ?? 'Player apologized',
        at,
        'player'
      );
      break;
    case 'return_stolen':
      applyRelationshipDelta(
        npc,
        'player',
        { trust: 15, anger: -12, friendship: 5 },
        detail ?? 'Player returned stolen item',
        at,
        'player'
      );
      break;
    case 'talk_friendly':
      applyRelationshipDelta(
        npc,
        'player',
        {
          friendship: 2 + Math.round(p.friendliness * 2),
          trust: Math.round((1 - p.suspicion) * 2)
        },
        detail ?? 'Friendly conversation',
        at,
        'player'
      );
      break;
  }
}

export function relationshipPromptBlock(npc: LivingNpc, player: PlayerSnapshot): string {
  const rel = getOrCreateRelationship(npc, 'player', 'player');
  const recent = rel.history.slice(0, 3).map(h => h.reason).join('; ') || 'none';
  return `Relationship with ${player.username}: trust=${rel.scores.trust} friendship=${rel.scores.friendship} respect=${rel.scores.respect} fear=${rel.scores.fear} anger=${rel.scores.anger}. Recent: ${recent}`;
}

import { LivingNpc, PlayerSnapshot, WorldTimeState, WorldEvent, StructuredAiDecision } from '../types';
import { dominantTraits } from '../personality';
import { retrieveMemories, formatMemoriesForPrompt } from '../memory';
import { relationshipPromptBlock } from '../relationships';
import { formatEventsForPrompt } from '../worldEvents';
import { formatKnowledgeForPrompt, filterKnowledgeForDialogue } from '../knowledge';

export function buildDecisionPrompt(
  npc: LivingNpc,
  clock: WorldTimeState,
  events: WorldEvent[],
  player: PlayerSnapshot,
  situation: string
): { system: string; user: string } {
  const traits = dominantTraits(npc.personality).join(', ');
  const mems = retrieveMemories(npc, { limit: 6, minImportance: 20 });
  const system = `You are the decision cortex for NPC "${npc.name}" in BPV Game.
Stay in character. You do NOT control physics — return ONLY JSON:
{"intent":"GO_TO_WORK|FIND_FOOD|WORK_FIRST|GO_HOME|SOCIALIZE|TALK|IDLE|...","reason":"...","target":"bakery_01|home|market|null","priority":0.0-1.0,"emotion":"...","dialogue":null}
Never invent locations that are not home, workplace, market, plaza, or given targets.
Personality traits: ${traits}. Occupation: ${npc.occupation}.`;

  const user = `Situation: ${situation}
Time: day ${clock.day} ${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')} season=${clock.season} weather=${clock.weather}
Location: (${npc.currentLocation.worldX},${npc.currentLocation.worldY}) activity=${npc.currentActivity} mood=${npc.currentMood}
Needs: ${JSON.stringify(npc.needs)}
Money: ${npc.money}
Goals: ${npc.goals.filter(g => g.status === 'active').map(g => g.description).join('; ') || 'none'}
${relationshipPromptBlock(npc, player)}
Memories:
${formatMemoriesForPrompt(mems)}
Events:
${formatEventsForPrompt(events)}
Knowledge:
${formatKnowledgeForPrompt(npc, 5)}`;

  return { system, user };
}

export function buildDialoguePrompt(
  npc: LivingNpc,
  clock: WorldTimeState,
  events: WorldEvent[],
  player: PlayerSnapshot,
  history: Array<{ role: string; content: string }>,
  playerMessage: string
): { system: string; user: string } {
  const traits = dominantTraits(npc.personality).join(', ');
  const mems = retrieveMemories(npc, { aboutPlayer: true, limit: 8, minImportance: 15 });
  const knowledge = filterKnowledgeForDialogue(npc);
  npc.knowledge = npc.knowledge; // keep
  const system = `You are ${npc.name}, a ${npc.age}-year-old ${npc.occupation} in BPV IsoEarth.
Traits: ${traits}. Background: ${npc.background}
Stay in character. Do NOT reveal secrets: ${npc.secrets.join('; ') || 'none'}.
Do NOT claim knowledge you lack. Only use provided knowledge/memories.
Return ONLY JSON:
{"intent":"TALK","emotion":"...","dialogue":"...","relationship_change":{"friendship":0,"trust":0},"reason":"...","priority":0.5,"target":null}`;

  const hist = history
    .slice(-6)
    .map(h => `${h.role}: ${h.content}`)
    .join('\n');

  const user = `World time: day ${clock.day} ${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')} ${clock.weather}
Activity: ${npc.currentActivity} mood=${npc.currentMood} at (${npc.currentLocation.worldX},${npc.currentLocation.worldY})
${relationshipPromptBlock(npc, player)}
Relevant memories:
${formatMemoriesForPrompt(mems)}
Known facts:
${knowledge.slice(0, 6).map(k => `- ${k.topic}: ${k.content}`).join('\n') || '(none)'}
Events:
${formatEventsForPrompt(events)}
Player (${player.username}) says: ${playerMessage}
Recent chat:
${hist || '(start)'}`;

  return { system, user };
}

export function fallbackDialogue(npc: LivingNpc, player: PlayerSnapshot): StructuredAiDecision {
  const friendly = npc.personality.friendliness > 0.55;
  const line = friendly
    ? `Good day, ${player.username}. I'm ${npc.name}, the local ${npc.occupation}.`
    : `... ${npc.name}. Need something?`;
  return {
    intent: 'TALK',
    reason: 'fallback',
    target: null,
    priority: 0.4,
    emotion: npc.currentMood,
    dialogue: line,
    relationship_change: { friendship: friendly ? 1 : 0 }
  };
}

export function fallbackDecision(npc: LivingNpc, situation: string): StructuredAiDecision {
  if (situation.includes('money') || situation.includes('Hungry')) {
    return {
      intent: 'WORK_FIRST',
      reason: 'Fallback: earn then eat',
      target: 'workplace',
      priority: 0.8,
      emotion: 'determined',
      dialogue: null
    };
  }
  return {
    intent: npc.currentIntention?.intent ?? 'IDLE',
    reason: 'fallback deterministic',
    target: npc.currentIntention?.target ?? null,
    priority: 0.3,
    emotion: npc.currentMood,
    dialogue: null
  };
}

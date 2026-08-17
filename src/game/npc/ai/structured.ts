import { StructuredAiDecision, RelationshipScores } from '../types';

const INTENT_ALLOW = new Set([
  'GO_TO_WORK',
  'GO_HOME',
  'GO_TO_MARKET',
  'FIND_FOOD',
  'REST',
  'SLEEP',
  'SOCIALIZE',
  'SEEK_SHELTER',
  'SEEK_SAFETY',
  'INVESTIGATE',
  'NOTICE_PLAYER',
  'TALK',
  'GIVE_QUEST',
  'WORK_FIRST',
  'IDLE',
  'NEED_FOOD_NO_MONEY',
  'BUY_ITEM',
  'SELL_ITEM',
  'FOLLOW_PLAYER',
  'FLEE'
]);

export function parseStructuredDecision(raw: string): StructuredAiDecision | null {
  const json = extractJson(raw);
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const intent = String(o.intent ?? '').toUpperCase();
  if (!INTENT_ALLOW.has(intent) && !intent) return null;
  const priority = typeof o.priority === 'number' ? Math.max(0, Math.min(1, o.priority)) : 0.5;
  const rel = o.relationship_change;
  let relationship_change: Partial<RelationshipScores> | null = null;
  if (rel && typeof rel === 'object') {
    relationship_change = {};
    for (const k of ['trust', 'friendship', 'respect', 'fear', 'anger'] as const) {
      const v = (rel as Record<string, unknown>)[k];
      if (typeof v === 'number') relationship_change[k] = Math.max(-50, Math.min(50, v));
    }
  }
  return {
    intent: INTENT_ALLOW.has(intent) ? intent : 'IDLE',
    reason: String(o.reason ?? 'ai'),
    target: o.target == null ? null : String(o.target),
    priority,
    emotion: o.emotion == null ? null : String(o.emotion),
    dialogue: o.dialogue == null ? null : String(o.dialogue).slice(0, 500),
    relationship_change,
    tool_calls: Array.isArray(o.tool_calls)
      ? (o.tool_calls as Array<{ tool: string; args: Record<string, unknown> }>).slice(0, 5)
      : undefined
  };
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function validateDecision(d: StructuredAiDecision): StructuredAiDecision {
  return {
    ...d,
    intent: INTENT_ALLOW.has(d.intent) ? d.intent : 'IDLE',
    priority: Math.max(0, Math.min(1, d.priority)),
    dialogue: d.dialogue ? d.dialogue.slice(0, 500) : d.dialogue
  };
}

import { NpcMemory, MemoryKind, ActorId, LivingNpc } from './types';

let memSeq = 0;

export function createMemory(partial: Omit<NpcMemory, 'id'> & { id?: string }): NpcMemory {
  memSeq += 1;
  return {
    id: partial.id ?? `mem_${Date.now()}_${memSeq}`,
    kind: partial.kind,
    subject: partial.subject,
    event: partial.event,
    description: partial.description,
    importance: Math.max(0, Math.min(100, partial.importance)),
    emotion: partial.emotion,
    timestamp: partial.timestamp,
    location: partial.location,
    participants: partial.participants,
    significant: partial.significant
  };
}

/** Decay non-significant memories over world time (minutes). */
export function decayMemories(memories: NpcMemory[], worldMinute: number, nowTs: number): NpcMemory[] {
  return memories
    .map(m => {
      if (m.significant) return m;
      const ageDays = Math.max(0, (nowTs - m.timestamp) / (worldMinute || 1) / (60 * 24));
      const decay = ageDays * 1.5;
      return { ...m, importance: Math.max(0, m.importance - decay) };
    })
    .filter(m => m.significant || m.importance >= 8 || m.kind === 'short_term');
}

export interface MemoryQuery {
  subject?: ActorId | string;
  event?: string;
  kind?: MemoryKind;
  participantsInclude?: ActorId;
  minImportance?: number;
  limit?: number;
  aboutPlayer?: boolean;
}

/**
 * Retrieve only relevant memories for AI context — never dump the full DB.
 */
export function retrieveMemories(npc: LivingNpc, query: MemoryQuery): NpcMemory[] {
  const minImp = query.minImportance ?? 15;
  const limit = query.limit ?? 8;
  let list = npc.memories.filter(m => m.importance >= minImp || m.kind === 'short_term');

  if (query.kind) list = list.filter(m => m.kind === query.kind);
  if (query.subject) list = list.filter(m => m.subject === query.subject);
  if (query.event) list = list.filter(m => m.event === query.event);
  if (query.participantsInclude) {
    list = list.filter(m => m.participants.includes(query.participantsInclude!));
  }
  if (query.aboutPlayer) {
    list = list.filter(
      m => m.subject === 'player' || m.participants.includes('player') || m.kind === 'relationship'
    );
  }

  // Prefer recent short-term + high importance long-term
  list.sort((a, b) => {
    const score = (m: NpcMemory) =>
      m.importance * 2 + (m.kind === 'short_term' ? 20 : 0) + (m.significant ? 30 : 0) + m.timestamp * 0.00001;
    return score(b) - score(a);
  });

  return list.slice(0, limit);
}

export function rememberInteraction(
  npc: LivingNpc,
  opts: {
    event: string;
    description: string;
    importance: number;
    emotion: string;
    subject?: ActorId | string;
    participants?: ActorId[];
    kind?: MemoryKind;
    significant?: boolean;
    location?: { x: number; y: number };
    timestamp: number;
  }
): NpcMemory {
  const mem = createMemory({
    kind: opts.kind ?? (opts.importance >= 70 ? 'long_term' : 'short_term'),
    subject: opts.subject ?? 'player',
    event: opts.event,
    description: opts.description,
    importance: opts.importance,
    emotion: opts.emotion,
    timestamp: opts.timestamp,
    location: opts.location,
    participants: opts.participants ?? ['player', npc.id],
    significant: opts.significant ?? opts.importance >= 80
  });
  npc.memories.unshift(mem);
  // Cap memory store
  if (npc.memories.length > 120) {
    const keep = npc.memories.filter(m => m.significant);
    const rest = npc.memories.filter(m => !m.significant).slice(0, 80);
    npc.memories = [...keep, ...rest].slice(0, 120);
  }
  return mem;
}

export function formatMemoriesForPrompt(memories: NpcMemory[]): string {
  if (!memories.length) return '(no relevant memories)';
  return memories
    .map(
      m =>
        `- [${m.kind}|imp=${Math.round(m.importance)}] ${m.event}: ${m.description} (emotion=${m.emotion})`
    )
    .join('\n');
}

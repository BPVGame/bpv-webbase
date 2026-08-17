import { LivingNpc, WorldTimeState, WorldEvent, DynamicQuest, PlayerSnapshot } from '../types';

const KEY = 'bpv_living_npc_v1';

export interface NpcPersistBlob {
  version: 1;
  savedAt: number;
  clock: WorldTimeState;
  npcs: LivingNpc[];
  events: WorldEvent[];
  quests: DynamicQuest[];
  player?: Partial<PlayerSnapshot>;
}

export function saveNpcState(blob: NpcPersistBlob): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch {
    // ignore quota
  }
}

export function loadNpcState(): NpcPersistBlob | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NpcPersistBlob;
    if (parsed?.version !== 1 || !Array.isArray(parsed.npcs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearNpcState(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Strip render-only / ephemeral fields if needed before network sync. */
export function serializeNpcForServer(npc: LivingNpc): LivingNpc {
  return {
    ...npc,
    path: npc.path.slice(0, 32),
    memories: npc.memories.slice(0, 80),
    knowledge: npc.knowledge.slice(0, 40)
  };
}

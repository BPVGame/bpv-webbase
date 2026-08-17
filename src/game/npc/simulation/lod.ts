import { LivingNpc, SimulationLod, PlayerSnapshot } from '../types';

export interface AiBudgetConfig {
  maxConcurrentAi: number;
  nearRange: number;
  midRange: number;
  farRange: number;
  fullCooldownMs: number;
  reducedCooldownMs: number;
  abstractCooldownMs: number;
}

export const DEFAULT_AI_BUDGET: AiBudgetConfig = {
  maxConcurrentAi: 2,
  nearRange: 18,
  midRange: 48,
  farRange: 120,
  fullCooldownMs: 8_000,
  reducedCooldownMs: 30_000,
  abstractCooldownMs: 120_000
};

export function distanceToPlayer(npc: LivingNpc, player: PlayerSnapshot): number {
  return Math.hypot(npc.currentLocation.worldX - player.worldX, npc.currentLocation.worldY - player.worldY);
}

export function computeLod(npc: LivingNpc, player: PlayerSnapshot, cfg = DEFAULT_AI_BUDGET): SimulationLod {
  const d = distanceToPlayer(npc, player);
  if (d <= cfg.nearRange) return 'full';
  if (d <= cfg.midRange) return 'reduced';
  if (d <= cfg.farRange) return 'abstract';
  return 'dormant';
}

export class AiBudget {
  inFlight = 0;
  queue: Array<{ npcId: string; priority: number; enqueue: () => Promise<void> }> = [];
  cfg: AiBudgetConfig;

  constructor(cfg: AiBudgetConfig = DEFAULT_AI_BUDGET) {
    this.cfg = cfg;
  }

  canCall(npc: LivingNpc, now: number): boolean {
    if (this.inFlight >= this.cfg.maxConcurrentAi) return false;
    const cd =
      npc.simLod === 'full'
        ? this.cfg.fullCooldownMs
        : npc.simLod === 'reduced'
          ? this.cfg.reducedCooldownMs
          : this.cfg.abstractCooldownMs;
    return now - npc.lastAiCallAt >= cd;
  }

  async schedule(npcId: string, priority: number, work: () => Promise<void>) {
    this.queue.push({ npcId, priority, enqueue: work });
    this.queue.sort((a, b) => b.priority - a.priority);
    await this.pump();
  }

  private async pump() {
    while (this.inFlight < this.cfg.maxConcurrentAi && this.queue.length) {
      const job = this.queue.shift()!;
      this.inFlight += 1;
      try {
        await job.enqueue();
      } finally {
        this.inFlight -= 1;
      }
    }
  }
}

export function aiPriority(npc: LivingNpc, player: PlayerSnapshot, talkingToPlayer: boolean): number {
  let p = 0;
  const d = distanceToPlayer(npc, player);
  if (talkingToPlayer) p += 100;
  if (d < 8) p += 40;
  else if (d < 20) p += 20;
  p += npc.needs.hunger * 0.05 + npc.emotions.anger * 0.08 + (npc.currentIntention?.priority ?? 0) * 10;
  return p;
}

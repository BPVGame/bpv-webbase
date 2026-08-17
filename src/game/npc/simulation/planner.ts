import { LivingNpc, NpcIntention, WorldTimeState, WorldEvent, PlayerSnapshot } from '../types';
import { currentScheduleBlock, mostUrgentNeed } from '../worldClock';
import { personalityDecisionBias } from '../personality';
import { eventReactionHint } from '../worldEvents';

/**
 * Layered decisions:
 * L1 simulation / L2 rules / L3 planner — escalate to ElloFive only when unusual.
 */
export function planIntention(
  npc: LivingNpc,
  clock: WorldTimeState,
  events: WorldEvent[],
  player: PlayerSnapshot,
  opts?: { forceAi?: boolean }
): { intention: NpcIntention; escalateToAi: boolean; reason: string } {
  const now = clock.minuteOfDay + clock.day * 24 * 60;
  const bias = personalityDecisionBias(npc.personality);
  const block = currentScheduleBlock(npc, clock.minuteOfDay);
  const urgent = mostUrgentNeed(npc.needs);

  // Weather / danger overrides
  if (clock.weather === 'storm' && npc.personality.fearfulness > 0.55) {
    return mk('SEEK_SHELTER', 'Storm and fearful disposition', 'home', 0.9, 'rules', false, now);
  }

  // Event reactions (rules first)
  for (const ev of events) {
    const hint = eventReactionHint(npc, ev);
    if (hint && ev.kind === 'market_day' && (npc.occupation === 'merchant' || npc.occupation === 'baker')) {
      return mk('GO_TO_MARKET', hint, 'market', 0.85, 'rules', false, now);
    }
    if (hint && ev.kind === 'crime' && npc.occupation === 'guard') {
      return mk('INVESTIGATE', hint, ev.id, 0.88, 'rules', false, now);
    }
  }

  // Critical needs
  if (urgent === 'hunger' && npc.needs.hunger > 80) {
    if (npc.money < 8) {
      // Unusual: hungry but broke → AI may choose work-first
      return mk('NEED_FOOD_NO_MONEY', 'Hungry without enough coin', 'workplace', 0.92, 'planner', true, now);
    }
    return mk('FIND_FOOD', 'Hungry', 'market', 0.8, 'rules', false, now);
  }
  if (urgent === 'energy' && npc.needs.energy < 20) {
    return mk('REST', 'Exhausted', 'home', 0.86, 'rules', false, now);
  }
  if (urgent === 'safety' && npc.needs.safety > 75) {
    return mk('SEEK_SAFETY', 'Feels unsafe', 'home', 0.84, 'rules', false, now);
  }
  if (urgent === 'social' && bias.socialDrive > 0.55 && npc.needs.social > 70) {
    return mk('SOCIALIZE', 'Lonely', 'plaza', 0.7, 'rules', false, now);
  }
  if (urgent === 'money' && bias.workDrive > 0.45) {
    return mk('GO_TO_WORK', 'Needs money', 'workplace', 0.78, 'rules', false, now);
  }

  // Schedule (flexible blocks may deviate)
  if (block) {
    const unusual =
      opts?.forceAi ||
      (block.flexible && npc.emotions.anger > 60) ||
      (block.activity === 'work' && clock.weather === 'festival' as never) ||
      npc.goals.some(g => g.status === 'active' && g.priority > 0.8);

    if (block.activity === 'sleep') {
      return mk('SLEEP', 'Scheduled sleep', 'home', 0.7, 'simulation', false, now);
    }
    if (block.activity === 'work' || block.activity === 'travel_to_work') {
      return mk('GO_TO_WORK', `Schedule: ${block.activity}`, 'workplace', 0.65 + bias.workDrive * 0.2, 'simulation', unusual, now);
    }
    if (block.activity === 'breakfast' || block.activity === 'lunch') {
      return mk('FIND_FOOD', `Schedule: ${block.activity}`, block.locationKey, 0.6, 'simulation', false, now);
    }
    if (block.activity === 'socialize' || block.activity === 'visit_market') {
      return mk(
        block.activity === 'visit_market' ? 'GO_TO_MARKET' : 'SOCIALIZE',
        `Schedule: ${block.activity}`,
        block.locationKey,
        0.55 + bias.socialDrive * 0.2,
        'simulation',
        false,
        now
      );
    }
    if (block.activity === 'return_home' || block.activity === 'wake_up') {
      return mk('GO_HOME', `Schedule: ${block.activity}`, 'home', 0.6, 'simulation', false, now);
    }
  }

  // Near player: friendly NPCs may greet (planner, maybe AI for dialogue later)
  const dist = Math.hypot(npc.currentLocation.worldX - player.worldX, npc.currentLocation.worldY - player.worldY);
  if (dist < 6 && bias.helpStrangers > 0.55 && npc.personality.friendliness > 0.6) {
    return mk('NOTICE_PLAYER', 'Player nearby', 'player', 0.5, 'planner', false, now);
  }

  return mk('IDLE', 'No urgent drive', undefined, 0.2, 'simulation', false, now);
}

function mk(
  intent: string,
  reason: string,
  target: string | undefined,
  priority: number,
  source: NpcIntention['source'],
  escalateToAi: boolean,
  issuedAt: number
): { intention: NpcIntention; escalateToAi: boolean; reason: string } {
  return {
    intention: { intent, reason, target, priority, source, issuedAt },
    escalateToAi,
    reason
  };
}

/** Convert intention into a coarse path target key for the engine. */
export function resolveLocationTarget(npc: LivingNpc, key?: string): { x: number; y: number } {
  if (!key || key === 'home') return { x: npc.home.worldX, y: npc.home.worldY };
  if (key === 'workplace') return { x: npc.workplace.worldX, y: npc.workplace.worldY };
  if (key === 'market' || key === 'plaza') {
    // Plaza near home capital
    return { x: npc.home.worldX + 2, y: npc.home.worldY };
  }
  if (key === 'player') return { x: npc.currentLocation.worldX, y: npc.currentLocation.worldY };
  return { x: npc.currentLocation.worldX, y: npc.currentLocation.worldY };
}

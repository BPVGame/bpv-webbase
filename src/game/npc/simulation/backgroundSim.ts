import { LivingNpc, WorldTimeState } from '../types';
import { currentScheduleBlock, updateNeeds, posFromWorld } from '../worldClock';
import { resolveLocationTarget } from './planner';
import { earnWage, spendOnFood } from '../economy';

/**
 * Far-away / abstract simulation — advances time, schedule, economy without rendering.
 */
export function abstractSimulate(npc: LivingNpc, clock: WorldTimeState, minutes: number): void {
  updateNeeds(npc, minutes, npc.currentActivity);
  const block = currentScheduleBlock(npc, clock.minuteOfDay);
  if (block) {
    npc.currentActivity = block.activity;
    const target = resolveLocationTarget(npc, block.locationKey);
    // Snap toward target over abstract time
    const steps = Math.min(20, Math.ceil(minutes / 5));
    for (let i = 0; i < steps; i++) {
      const dx = Math.sign(target.x - npc.currentLocation.worldX);
      const dy = Math.sign(target.y - npc.currentLocation.worldY);
      npc.currentLocation = posFromWorld(npc.currentLocation.worldX + dx, npc.currentLocation.worldY + dy);
    }
    if (block.activity === 'work') earnWage(npc, 4);
    if (block.activity === 'lunch' || block.activity === 'breakfast') spendOnFood(npc, 5);
  }
}

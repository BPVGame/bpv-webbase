/**
 * Living AI NPC system — public exports.
 */

export * from './types';
export * from './personality';
export * from './memory';
export * from './relationships';
export * from './worldClock';
export * from './worldEvents';
export * from './economy';
export * from './knowledge';
export { NpcDirector, npcDirector } from './NpcDirector';
export type { NpcVisual, DialogueState } from './NpcDirector';
export { seedLivingNpcs } from './catalog/seedNpcs';
export { executeTool, listTools } from './tools/registry';
export { parseStructuredDecision, validateDecision } from './ai/structured';
export { planIntention } from './simulation/planner';
export { computeLod, AiBudget } from './simulation/lod';

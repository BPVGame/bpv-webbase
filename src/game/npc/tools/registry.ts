/**
 * Safe Game Tool API — ElloFive may only call registered, validated tools.
 */

import { LivingNpc, PlayerSnapshot, WorldTimeState, WorldEvent, DynamicQuest } from '../types';
import { rememberInteraction } from '../memory';
import { applyRelationshipDelta } from '../relationships';

export type ToolName =
  | 'get_world_time'
  | 'get_weather'
  | 'get_npc_location'
  | 'get_nearby_npcs'
  | 'get_npc_information'
  | 'get_npc_memory'
  | 'get_relationship'
  | 'get_player_information'
  | 'get_player_inventory'
  | 'get_player_reputation'
  | 'get_nearby_objects'
  | 'find_location'
  | 'get_location'
  | 'get_npc_state'
  | 'get_player_state'
  | 'get_nearby_characters'
  | 'get_active_quests'
  | 'get_world_events'
  | 'start_dialogue'
  | 'find_path'
  | 'move_npc'
  | 'follow_path'
  | 'talk_to_npc'
  | 'start_quest'
  | 'give_quest'
  | 'buy_item'
  | 'sell_item'
  | 'give_item'
  | 'take_item'
  | 'change_npc_activity'
  | 'change_npc_location'
  | 'update_relationship'
  | 'create_memory'
  | 'schedule_activity'
  | 'trigger_world_event';

export interface ToolContext {
  npcs: Map<string, LivingNpc>;
  player: PlayerSnapshot;
  clock: WorldTimeState;
  events: WorldEvent[];
  quests: DynamicQuest[];
  isWalkable: (x: number, y: number) => boolean;
  emitEvent: (e: WorldEvent) => void;
  now: number;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => ToolResult;

const registry = new Map<ToolName, ToolHandler>();

function requireString(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.length) throw new Error(`invalid_${key}`);
  return v.slice(0, 200);
}

function requireNumber(args: Record<string, unknown>, key: string): number {
  const v = args[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`invalid_${key}`);
  return v;
}

function getNpc(ctx: ToolContext, id: string): LivingNpc {
  const n = ctx.npcs.get(id);
  if (!n) throw new Error('npc_not_found');
  return n;
}

export function registerDefaultTools() {
  if (registry.size) return;

  registry.set('get_world_time', (_a, ctx) => ({
    ok: true,
    data: {
      day: ctx.clock.day,
      date: ctx.clock.dateLabel,
      time: `${String(ctx.clock.hour).padStart(2, '0')}:${String(ctx.clock.minute).padStart(2, '0')}`,
      season: ctx.clock.season,
      weather: ctx.clock.weather
    }
  }));

  registry.set('get_weather', (_a, ctx) => ({ ok: true, data: { weather: ctx.clock.weather } }));

  registry.set('get_npc_location', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    return { ok: true, data: npc.currentLocation };
  });

  registry.set('get_nearby_npcs', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const radius = typeof args.radius === 'number' ? Math.min(40, args.radius) : 12;
    const nearby = [...ctx.npcs.values()]
      .filter(o => o.id !== npc.id)
      .filter(
        o =>
          Math.hypot(o.currentLocation.worldX - npc.currentLocation.worldX, o.currentLocation.worldY - npc.currentLocation.worldY) <=
          radius
      )
      .map(o => ({ id: o.id, name: o.name, x: o.currentLocation.worldX, y: o.currentLocation.worldY, activity: o.currentActivity }));
    return { ok: true, data: nearby };
  });

  registry.set('get_npc_information', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    return {
      ok: true,
      data: {
        id: npc.id,
        name: npc.name,
        occupation: npc.occupation,
        mood: npc.currentMood,
        activity: npc.currentActivity,
        money: npc.money,
        location: npc.currentLocation
      }
    };
  });

  registry.set('get_npc_memory', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const limit = typeof args.limit === 'number' ? Math.min(10, args.limit) : 5;
    return {
      ok: true,
      data: npc.memories.slice(0, limit).map(m => ({
        event: m.event,
        description: m.description,
        importance: m.importance,
        emotion: m.emotion
      }))
    };
  });

  registry.set('get_relationship', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const target = requireString(args, 'target_id');
    const rel = npc.relationships.find(r => r.targetId === target);
    return { ok: true, data: rel?.scores ?? null };
  });

  registry.set('get_player_information', (_a, ctx) => ({
    ok: true,
    data: {
      id: ctx.player.id,
      username: ctx.player.username,
      x: ctx.player.worldX,
      y: ctx.player.worldY,
      reputation: ctx.player.reputation
    }
  }));

  registry.set('get_player_inventory', (_a, ctx) => ({
    ok: true,
    data: ctx.player.inventory.map(i => ({ id: i.id, name: i.name, qty: i.qty }))
  }));

  registry.set('get_player_reputation', (_a, ctx) => ({
    ok: true,
    data: { reputation: ctx.player.reputation }
  }));

  registry.set('get_nearby_objects', (args, ctx) => {
    const x = requireNumber(args, 'x');
    const y = requireNumber(args, 'y');
    return {
      ok: true,
      data: {
        note: 'Tile props resolved by engine',
        center: { x, y },
        walkable: ctx.isWalkable(Math.round(x), Math.round(y))
      }
    };
  });

  registry.set('find_location', (args, ctx) => {
    const key = requireString(args, 'key');
    const npcId = typeof args.npc_id === 'string' ? args.npc_id : [...ctx.npcs.keys()][0];
    const npc = getNpc(ctx, npcId);
    const map: Record<string, { x: number; y: number }> = {
      home: { x: npc.home.worldX, y: npc.home.worldY },
      workplace: { x: npc.workplace.worldX, y: npc.workplace.worldY },
      market: { x: npc.home.worldX + 2, y: npc.home.worldY },
      plaza: { x: npc.home.worldX, y: npc.home.worldY }
    };
    const loc = map[key];
    if (!loc) return { ok: false, error: 'unknown_location' };
    return { ok: true, data: loc };
  });

  registry.set('find_path', (args, ctx) => {
    const fromX = Math.round(requireNumber(args, 'from_x'));
    const fromY = Math.round(requireNumber(args, 'from_y'));
    const toX = Math.round(requireNumber(args, 'to_x'));
    const toY = Math.round(requireNumber(args, 'to_y'));
    // Greedy walkable path (short) — engine can refine
    const path: Array<{ x: number; y: number }> = [];
    let x = fromX;
    let y = fromY;
    for (let i = 0; i < 64; i++) {
      if (x === toX && y === toY) break;
      const nx = x + Math.sign(toX - x);
      const ny = y + Math.sign(toY - y);
      if (ctx.isWalkable(nx, ny)) {
        x = nx;
        y = ny;
      } else if (ctx.isWalkable(nx, y)) x = nx;
      else if (ctx.isWalkable(x, ny)) y = ny;
      else break;
      path.push({ x, y });
    }
    return { ok: true, data: { path } };
  });

  registry.set('move_npc', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const x = Math.round(requireNumber(args, 'x'));
    const y = Math.round(requireNumber(args, 'y'));
    if (!ctx.isWalkable(x, y)) return { ok: false, error: 'blocked' };
    npc.path = [{ x, y }];
    return { ok: true, data: { queued: true } };
  });

  registry.set('follow_path', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const path = args.path;
    if (!Array.isArray(path)) return { ok: false, error: 'invalid_path' };
    npc.path = path
      .slice(0, 64)
      .map((p: any) => ({ x: Math.round(Number(p.x)), y: Math.round(Number(p.y)) }))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && ctx.isWalkable(p.x, p.y));
    return { ok: true, data: { steps: npc.path.length } };
  });

  registry.set('change_npc_activity', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    npc.currentActivity = requireString(args, 'activity').slice(0, 64);
    return { ok: true };
  });

  registry.set('change_npc_location', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const x = Math.round(requireNumber(args, 'x'));
    const y = Math.round(requireNumber(args, 'y'));
    if (!ctx.isWalkable(x, y)) return { ok: false, error: 'blocked' };
    npc.currentLocation = {
      worldX: x,
      worldY: y,
      chunkX: Math.floor(x / 16),
      chunkY: Math.floor(y / 16)
    };
    return { ok: true };
  });

  registry.set('talk_to_npc', () => ({ ok: true, data: { note: 'dialogue handled by director' } }));
  registry.set('start_dialogue', () => ({ ok: true, data: { note: 'dialogue handled by director' } }));
  registry.set('start_quest', () => ({ ok: true, data: { note: 'quest start via director' } }));
  registry.set('give_quest', () => ({ ok: true, data: { note: 'quest give via director' } }));
  registry.set('buy_item', () => ({ ok: false, error: 'use_economy_module' }));
  registry.set('sell_item', () => ({ ok: false, error: 'use_economy_module' }));
  registry.set('give_item', () => ({ ok: true }));
  registry.set('take_item', () => ({ ok: true }));
  registry.set('update_relationship', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const target = requireString(args, 'target_id');
    const clamp = (n: number) => Math.max(-15, Math.min(15, n));
    const delta: Record<string, number> = {};
    for (const k of ['trust', 'friendship', 'respect', 'fear', 'anger'] as const) {
      if (typeof args[k] === 'number') delta[k] = clamp(args[k] as number);
    }
    applyRelationshipDelta(npc, target, delta, String(args.reason ?? 'tool').slice(0, 80), ctx.now);
    return { ok: true, data: npc.relationships.find(r => r.targetId === target)?.scores };
  });
  registry.set('create_memory', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    const importance = Math.max(10, Math.min(90, typeof args.importance === 'number' ? args.importance : 45));
    const mem = rememberInteraction(npc, {
      event: requireString(args, 'event').slice(0, 64),
      description: String(args.description ?? '').slice(0, 240),
      importance,
      emotion: String(args.emotion ?? 'neutral').slice(0, 24),
      timestamp: ctx.now,
      significant: importance >= 70
    });
    return { ok: true, data: { id: mem.id } };
  });
  registry.set('get_location', (args, ctx) => registry.get('get_npc_location')!(args, ctx));
  registry.set('get_npc_state', (args, ctx) => registry.get('get_npc_information')!(args, ctx));
  registry.set('get_player_state', (args, ctx) => registry.get('get_player_information')!(args, ctx));
  registry.set('get_nearby_characters', (args, ctx) => {
    const nearby = executeTool('get_nearby_npcs', args, ctx);
    return {
      ok: true,
      data: {
        npcs: nearby.data,
        player: { id: ctx.player.id, username: ctx.player.username, x: ctx.player.worldX, y: ctx.player.worldY }
      }
    };
  });
  registry.set('get_active_quests', (_a, ctx) => ({
    ok: true,
    data: ctx.quests.filter(q => q.status === 'active' || q.status === 'available').map(q => ({
      id: q.id,
      title: q.title,
      status: q.status,
      giverId: q.giverId
    }))
  }));
  registry.set('get_world_events', (_a, ctx) => ({
    ok: true,
    data: ctx.events.slice(0, 12).map(e => ({ id: e.id, kind: e.kind, title: e.title, description: e.description }))
  }));
  registry.set('schedule_activity', (args, ctx) => {
    const npc = getNpc(ctx, requireString(args, 'npc_id'));
    npc.currentActivity = requireString(args, 'activity').slice(0, 64);
    return { ok: true };
  });
  registry.set('trigger_world_event', (args, ctx) => {
    const title = requireString(args, 'title');
    ctx.emitEvent({
      id: `tool_evt_${Date.now()}`,
      kind: 'rumor',
      title,
      description: String(args.description ?? title).slice(0, 300),
      importance: 40,
      startedAt: ctx.now
    });
    return { ok: true };
  });
}

export function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  registerDefaultTools();
  if (!registry.has(name as ToolName)) {
    return { ok: false, error: 'tool_not_registered' };
  }
  try {
    return registry.get(name as ToolName)!(args ?? {}, ctx);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'tool_error' };
  }
}

export function listTools(): ToolName[] {
  registerDefaultTools();
  return [...registry.keys()];
}

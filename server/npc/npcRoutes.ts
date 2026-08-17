/**
 * NPC API routes — AI proxy + optional persistence.
 * Client never talks to ElloFive directly.
 */

import { Router } from 'express';
import { ellofiveChat } from './ellofiveProxy.js';
import { pool } from '../db.js';

export const npcRouter = Router();

// In-memory world snapshots keyed by user (fallback if DB unavailable)
const memoryStore = new Map<string, unknown>();

npcRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ellofiveConfigured: Boolean(process.env.ELLOFIVE_URL || process.env.NEURIY_CHATBASE_URL),
    service: 'bpv-npc-ai'
  });
});

npcRouter.post('/ai', async (req, res) => {
  const { kind, system, user } = req.body ?? {};
  if (kind !== 'decide' && kind !== 'dialogue') {
    return res.status(400).json({ error: 'kind must be decide|dialogue' });
  }
  if (typeof system !== 'string' || typeof user !== 'string') {
    return res.status(400).json({ error: 'system and user strings required' });
  }
  // Hard size caps — never forward unbounded prompts
  if (system.length > 8000 || user.length > 8000) {
    return res.status(413).json({ error: 'prompt too large' });
  }

  const result = await ellofiveChat({ kind, system, user });
  res.json({
    output: result.output,
    model: result.model,
    latencyMs: result.latencyMs,
    tokens: result.tokens,
    degraded: result.degraded,
    error: result.error
  });
});

npcRouter.post('/state', async (req, res) => {
  const { userKey, state } = req.body ?? {};
  if (typeof userKey !== 'string' || !userKey || typeof state !== 'object') {
    return res.status(400).json({ error: 'userKey and state required' });
  }
  const key = userKey.slice(0, 64);
  memoryStore.set(key, state);

  try {
    await pool.query(
      `INSERT INTO npc_world_state (user_key, state_json, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_key) DO UPDATE SET state_json = $2, updated_at = NOW()`,
      [key, JSON.stringify(state)]
    );
  } catch {
    // DB optional — memory store still holds state
  }

  res.json({ ok: true });
});

npcRouter.get('/state/:userKey', async (req, res) => {
  const key = String(req.params.userKey || '').slice(0, 64);
  try {
    const r = await pool.query(`SELECT state_json FROM npc_world_state WHERE user_key = $1`, [key]);
    if (r.rows[0]) return res.json({ state: r.rows[0].state_json });
  } catch {
    /* fall through */
  }
  if (memoryStore.has(key)) return res.json({ state: memoryStore.get(key) });
  res.status(404).json({ error: 'not_found' });
});

type PlayerChatMsg = { from: string; to: string; text: string; emotion: string; at: number };
const playerRooms = new Map<string, PlayerChatMsg[]>();
const playerChatRate = new Map<string, number[]>();

function chatRoomKey(a: string, b: string) {
  return [a, b].map(s => s.slice(0, 32)).sort().join('|');
}

npcRouter.post('/player-chat', (req, res) => {
  const from = String(req.body?.from || '').slice(0, 32);
  const to = String(req.body?.to || '').slice(0, 32);
  const text = String(req.body?.text || '').trim().slice(0, 240);
  const emotion = String(req.body?.emotion || 'neutral').slice(0, 24);
  if (!from || !to || !text) return res.status(400).json({ error: 'from, to, text required' });
  if (from === to) return res.status(400).json({ error: 'cannot_chat_self' });

  const now = Date.now();
  const hits = (playerChatRate.get(from) ?? []).filter(t => now - t < 10_000);
  if (hits.length >= 8) return res.status(429).json({ error: 'slow_down' });
  hits.push(now);
  playerChatRate.set(from, hits);

  const msg: PlayerChatMsg = { from, to, text, emotion, at: now };
  const key = chatRoomKey(from, to);
  const list = playerRooms.get(key) ?? [];
  list.push(msg);
  if (list.length > 40) list.splice(0, list.length - 40);
  playerRooms.set(key, list);
  res.json({ ok: true, echo: msg });
});

npcRouter.get('/player-chat', (req, res) => {
  const a = String(req.query.a || '').slice(0, 32);
  const b = String(req.query.b || '').slice(0, 32);
  if (!a || !b) return res.status(400).json({ error: 'a and b required' });
  const list = playerRooms.get(chatRoomKey(a, b)) ?? [];
  res.json({ ok: true, messages: list });
});

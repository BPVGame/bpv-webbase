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

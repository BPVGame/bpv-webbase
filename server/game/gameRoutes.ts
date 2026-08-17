/**
 * Dedicated game-server HTTP API — sessions, snapshot, validated actions, admin.
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { loadDedicatedConfig } from './config.js';
import { WorldAuthority } from './authority.js';
import { ServerDirectory } from './directory.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bpvgame_jwt_secret_2026';
const config = loadDedicatedConfig();
export const worldAuthority = new WorldAuthority(config);
worldAuthority.start();
const directory = new ServerDirectory(config, () => worldAuthority.sessions.size);

export const gameRouter = Router();

function optionalAuth(req: any, _res: any, next: any) {
  const header = req.headers.authorization;
  if (!header) return next();
  try {
    const decoded: any = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.userId = decoded.userId;
  } catch {
    /* guest join still allowed */
  }
  next();
}

gameRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bpv-game-server',
    name: config.server_name,
    players: worldAuthority.sessions.size,
    maxPlayers: config.max_players,
    npcAi: config.npc_ai_enabled,
    world: config.world_size
  });
});

gameRouter.get('/directory', (_req, res) => {
  res.json({ ok: true, servers: directory.list() });
});

gameRouter.post('/directory', (req, res) => {
  const { name, address, port, protocol, passwordProtected, pvp, pve, npcAi, maxPlayers, description, kind } =
    req.body ?? {};
  if (typeof name !== 'string' || typeof address !== 'string' || typeof port !== 'number') {
    return res.status(400).json({ error: 'name, address, port required' });
  }
  if (port < 1 || port > 65535) return res.status(400).json({ error: 'invalid_port' });
  const listing = directory.register({
    name,
    address,
    port,
    protocol,
    passwordProtected,
    pvp,
    pve,
    npcAi,
    maxPlayers,
    description,
    kind
  });
  res.json({ ok: true, server: listing });
});

gameRouter.post('/session/join', optionalAuth, (req: any, res) => {
  const { username, password, avatar } = req.body ?? {};
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'username required' });
  }
  const result = worldAuthority.join({
    username: username.trim().slice(0, 32),
    tokenUserId: req.userId ? String(req.userId) : undefined,
    password: typeof password === 'string' ? password : undefined,
    avatar
  });
  if (!result.ok) return res.status(403).json({ ok: false, error: result.error });
  const s = result.session;
  res.json({
    ok: true,
    sessionId: s.id,
    pingMs: 1,
    server: directory.selfListing(),
    character: {
      id: s.id,
      username: s.username,
      level: s.level,
      xp: s.xp,
      coins: s.coins,
      col: s.col,
      row: s.row,
      district: s.district,
      role: s.role,
      reputation: s.reputation,
      avatar_skin: s.skin,
      avatar_hair: s.hair,
      avatar_shirt: s.shirt,
      avatar_pants: s.pants
    }
  });
});

gameRouter.post('/session/leave', (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  worldAuthority.leave(sessionId);
  res.json({ ok: true });
});

gameRouter.get('/snapshot', (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  if (!sessionId || !worldAuthority.sessions.has(sessionId)) {
    return res.status(401).json({ error: 'invalid_session' });
  }
  res.json({ ok: true, snapshot: worldAuthority.snapshot() });
});

gameRouter.post('/action', (req, res) => {
  const { sessionId, type, payload } = req.body ?? {};
  if (typeof sessionId !== 'string' || typeof type !== 'string') {
    return res.status(400).json({ error: 'sessionId and type required' });
  }
  const result = worldAuthority.applyAction(sessionId, type, payload && typeof payload === 'object' ? payload : {});
  if (!result.ok) return res.status(403).json(result);
  res.json(result);
});

gameRouter.get('/admin', (req, res) => {
  const sessionId = String(req.query.sessionId || '');
  const actor = worldAuthority.sessions.get(sessionId);
  if (!actor) return res.status(401).json({ error: 'invalid_session' });
  const result = worldAuthority.adminList(actor);
  if (!result.ok) return res.status(403).json(result);
  res.json(result);
});

gameRouter.get('/config', (_req, res) => {
  res.json({
    ok: true,
    server_name: config.server_name,
    server_description: config.server_description,
    max_players: config.max_players,
    region: config.region,
    pvp_enabled: config.pvp_enabled,
    pve_enabled: config.pve_enabled,
    npc_ai_enabled: config.npc_ai_enabled,
    ello5_enabled: config.ello5_enabled,
    chat_enabled: config.chat_enabled,
    world_size: config.world_size,
    world_seed: config.world_seed
  });
});

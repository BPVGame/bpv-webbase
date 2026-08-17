/**
 * Online Multiplayer Gate — official / community / custom / direct.
 * Does not start until the player chooses online. Offline never calls this.
 */

import { bpvApi } from '../api/BpvApiClient';
import { GameServerInfo, OnlineCharacter, SavedServer, parseDirectAddress } from '../game/gate/types';
import type { JoinResponse, WorldSnapshot } from './protocol';

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export function savedToInfo(s: SavedServer, extra?: Partial<GameServerInfo>): GameServerInfo {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    port: s.port,
    protocol: s.protocol,
    kind: s.kind,
    players: 0,
    maxPlayers: 50,
    pingMs: null,
    status: 'unknown',
    passwordProtected: Boolean(s.password),
    pvp: false,
    pve: true,
    npcAi: true,
    ...extra
  };
}

export function officialFallback(): GameServerInfo[] {
  return [
    {
      id: 'official-local',
      name: 'BPV Official',
      description: 'Local / bpvgame.com presence shard',
      owner: 'BPV',
      address: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
      port: 3001,
      protocol: 'http',
      kind: 'official',
      region: 'local',
      version: '1.0.0',
      players: 0,
      maxPlayers: 500,
      pingMs: null,
      status: 'unknown',
      passwordProtected: false,
      pvp: false,
      pve: true,
      npcAi: true,
      worldVersion: 'infinite-v1'
    }
  ];
}

export class OnlineGate {
  lastSnapshot: WorldSnapshot | null = null;
  sessionId: string | null = null;
  target: GameServerInfo | null = null;
  private miss = 0;

  async discover(): Promise<GameServerInfo[]> {
    const res = await bpvApi.listGameServers();
    if (res.ok && res.servers.length) return res.servers;
    const fallback = officialFallback();
    const pinged = await this.pingServer(fallback[0]);
    return [pinged];
  }

  async pingServer(server: GameServerInfo): Promise<GameServerInfo> {
    const t0 = Date.now();
    const health = await bpvApi.gameHealth(server);
    const pingMs = Date.now() - t0;
    return {
      ...server,
      pingMs: health.ok ? pingMs : null,
      status: health.ok ? 'online' : 'offline',
      players: health.ok ? health.players ?? server.players : server.players,
      maxPlayers: health.ok ? health.maxPlayers ?? server.maxPlayers : server.maxPlayers
    };
  }

  async connect(
    server: GameServerInfo,
    opts: {
      username: string;
      token?: string | null;
      password?: string;
      avatar: { skin: string; hair: string; shirt: string; pants: string };
      onStep: (index: number) => void;
    }
  ): Promise<{ ok: true; character: OnlineCharacter; pingMs: number } | { ok: false; reason: string }> {
    this.target = server;
    try {
      opts.onStep(0);
      await delay(220);
      const pinged = await this.pingServer(server);
      if (pinged.status !== 'online') {
        this.target = null;
        return { ok: false, reason: 'Connection timeout' };
      }
      opts.onStep(1);
      await delay(180);
      opts.onStep(2);
      const joined = await bpvApi.joinGameServer(
        {
          username: opts.username,
          token: opts.token ?? undefined,
          password: opts.password,
          avatar: opts.avatar
        },
        pinged
      );
      if (!joined.ok || !joined.character) {
        this.target = null;
        return { ok: false, reason: joined.error || 'Authentication failed' };
      }
      this.sessionId = joined.sessionId;
      opts.onStep(3);
      await delay(160);
      opts.onStep(4);
      const snap = await bpvApi.gameSnapshot(joined.sessionId, pinged);
      if (!snap) {
        this.sessionId = null;
        this.target = null;
        return { ok: false, reason: 'World sync failed' };
      }
      this.lastSnapshot = snap;
      this.miss = 0;
      const c = joined.character;
      const character: OnlineCharacter = {
        id: c.id,
        username: c.username,
        level: c.level,
        xp: c.xp,
        coins: c.coins,
        avatar_skin: c.avatar_skin,
        avatar_hair: c.avatar_hair,
        avatar_shirt: c.avatar_shirt,
        avatar_pants: c.avatar_pants,
        col: c.col,
        row: c.row,
        district: c.district,
        role: c.role,
        reputation: c.reputation
      };
      return { ok: true, character, pingMs: pinged.pingMs ?? Date.now() % 80 };
    } catch (err) {
      this.target = null;
      this.sessionId = null;
      return { ok: false, reason: err instanceof Error ? err.message : 'Connection timeout' };
    }
  }

  async snapshot(): Promise<WorldSnapshot | null> {
    if (!this.sessionId) return null;
    const snap = await bpvApi.gameSnapshot(this.sessionId, this.target ?? undefined);
    if (snap) {
      this.lastSnapshot = snap;
      this.miss = 0;
      return snap;
    }
    this.miss += 1;
    return null;
  }

  lostConnection(): boolean {
    return this.miss >= 3;
  }

  async action(type: string, payload: Record<string, unknown> = {}) {
    if (!this.sessionId) return { ok: false, error: 'no_session' };
    return bpvApi.gameAction(this.sessionId, type, payload, this.target ?? undefined);
  }

  async admin() {
    if (!this.sessionId) return { ok: false, error: 'no_session' };
    return bpvApi.gameAdmin(this.sessionId, this.target ?? undefined);
  }

  async leave() {
    if (this.sessionId) await bpvApi.leaveGameServer(this.sessionId, this.target ?? undefined);
    this.sessionId = null;
    this.lastSnapshot = null;
    this.target = null;
    this.miss = 0;
  }

  parseDirect(raw: string): { address: string; port: number } | null {
    return parseDirectAddress(raw);
  }
}

export const onlineGate = new OnlineGate();

/**
 * Authoritative dedicated-server world.
 * Clients may propose actions; this module validates and applies them.
 */

import { DedicatedServerConfig } from './config.js';

export type PlayerRole = 'player' | 'moderator' | 'admin' | 'owner';

export interface Session {
  id: string;
  userId: string;
  username: string;
  role: PlayerRole;
  level: number;
  xp: number;
  coins: number;
  col: number;
  row: number;
  district: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  reputation: number;
  banned: boolean;
  lastActionAt: number;
  joinedAt: number;
}

export interface NpcAuthState {
  id: string;
  name: string;
  col: number;
  row: number;
  activity: string;
  mood: string;
  talkingTo: string | null;
}

export interface QuestAuth {
  id: string;
  title: string;
  status: 'available' | 'active' | 'completed';
}

const ROLE_RANK: Record<PlayerRole, number> = {
  player: 0,
  moderator: 1,
  admin: 2,
  owner: 3
};

export function canRole(role: PlayerRole, need: PlayerRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[need];
}

export class WorldAuthority {
  sessions = new Map<string, Session>();
  bans = new Set<string>();
  logs: string[] = [];
  npcs: NpcAuthState[] = [];
  quests = new Map<string, QuestAuth[]>();
  friends = new Map<string, string[]>();
  parties = new Map<string, string[]>();
  guilds = new Map<string, string[]>();
  tickHandle: ReturnType<typeof setInterval> | null = null;

  constructor(public config: DedicatedServerConfig) {
    this.seedNpcs();
  }

  start() {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => this.tickNpcs(), 800);
  }

  stop() {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  private seedNpcs() {
    this.npcs = [
      { id: 'npc_mayor_pixel', name: 'Mayor Pixel', col: 0, row: 0, activity: 'idle', mood: 'calm', talkingTo: null },
      { id: 'npc_courier_lina', name: 'Lina Drift', col: 2, row: 2, activity: 'travel', mood: 'happy', talkingTo: null },
      { id: 'npc_artisan_poe', name: 'Poe Wink', col: 1, row: 3, activity: 'work', mood: 'shy', talkingTo: null },
      { id: 'npc_guard_jon', name: 'Guard Jon', col: 4, row: 1, activity: 'patrol', mood: 'serious', talkingTo: null }
    ];
  }

  private tickNpcs() {
    if (!this.config.npc_ai_enabled) return;
    for (const n of this.npcs) {
      if (n.talkingTo) continue;
      if (Math.random() < 0.25) {
        n.col += Math.random() < 0.5 ? -1 : 1;
        n.row += Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;
        n.activity = 'travel';
      }
    }
    // Occasional NPC↔NPC talk so nearby clients share one world
    if (Math.random() < 0.08) {
      const a = this.npcs[0];
      const b = this.npcs[1];
      if (a && b && !a.talkingTo && !b.talkingTo) {
        a.talkingTo = b.id;
        b.talkingTo = a.id;
        a.activity = 'talking';
        b.activity = 'talking';
        setTimeout(() => {
          a.talkingTo = null;
          b.talkingTo = null;
        }, 8000);
      }
    }
  }

  join(opts: {
    username: string;
    tokenUserId?: string;
    password?: string;
    avatar?: { skin: string; hair: string; shirt: string; pants: string };
  }): { ok: true; session: Session } | { ok: false; error: string } {
    if (opts.password && this.config.join_password && opts.password !== this.config.join_password) {
      return { ok: false, error: 'Invalid server password' };
    }
    const userKey = (opts.username || 'guest').slice(0, 32);
    if (this.bans.has(userKey.toLowerCase())) return { ok: false, error: 'Banned from this server' };
    const live = [...this.sessions.values()].filter(s => !s.banned);
    if (live.length >= this.config.max_players) return { ok: false, error: 'Server full' };

    let role: PlayerRole = 'player';
    const configuredOwner = (this.config.owner_username || '').trim().toLowerCase();
    if (configuredOwner && userKey.toLowerCase() === configuredOwner) {
      role = 'owner';
    } else if (!configuredOwner && live.length === 0) {
      role = 'owner';
    }

    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session: Session = {
      id,
      userId: String(opts.tokenUserId || userKey),
      username: userKey,
      role,
      level: 1,
      xp: 0,
      coins: 250,
      col: 0,
      row: 0,
      district: 'city_center',
      skin: opts.avatar?.skin || '#f3d5b5',
      hair: opts.avatar?.hair || '#3d2914',
      shirt: opts.avatar?.shirt || '#3a5a8c',
      pants: opts.avatar?.pants || '#2c3e50',
      reputation: 50,
      banned: false,
      lastActionAt: Date.now(),
      joinedAt: Date.now()
    };
    this.sessions.set(id, session);
    this.quests.set(id, [
      { id: 'q_welcome', title: 'Meet the plaza', status: 'available' },
      { id: 'walk_500m', title: 'City Explorer', status: 'available' },
      { id: 'talk_npc', title: 'Meet the Local NPCs', status: 'available' },
      { id: 'join_tournament', title: 'Challenger', status: 'available' }
    ]);
    this.log(`${session.username} joined as ${role}`);
    return { ok: true, session };
  }

  leave(sessionId: string) {
    const s = this.sessions.get(sessionId);
    if (s) this.log(`${s.username} left`);
    this.sessions.delete(sessionId);
  }

  applyAction(
    sessionId: string,
    type: string,
    payload: Record<string, unknown>
  ): { ok: boolean; error?: string; session?: Session; data?: unknown } {
    const s = this.sessions.get(sessionId);
    if (!s || s.banned) return { ok: false, error: 'invalid_session' };
    const now = Date.now();
    if (now - s.lastActionAt < 40 && type === 'move') return { ok: false, error: 'rate_limited' };
    s.lastActionAt = now;

    switch (type) {
      case 'move': {
        const col = Number(payload.col);
        const row = Number(payload.row);
        if (!Number.isFinite(col) || !Number.isFinite(row)) return { ok: false, error: 'bad_position' };
        const dist = Math.abs(col - s.col) + Math.abs(row - s.row);
        if (dist > 3) return { ok: false, error: 'teleport_rejected' };
        s.col = Math.round(col);
        s.row = Math.round(row);
        if (typeof payload.district === 'string') s.district = payload.district.slice(0, 32);
        return { ok: true, session: s };
      }
      case 'spend_coins': {
        const amount = Math.floor(Number(payload.amount));
        if (!Number.isFinite(amount) || amount <= 0 || amount > 50_000) return { ok: false, error: 'bad_amount' };
        if (s.coins < amount) return { ok: false, error: 'insufficient_coins' };
        s.coins -= amount;
        return { ok: true, session: s };
      }
      case 'grant_xp':
      case 'set_inventory':
        return { ok: false, error: 'client_not_authoritative' };
      case 'complete_quest': {
        const qid = String(payload.questId || '');
        const list = this.quests.get(sessionId) ?? [];
        const q = list.find(x => x.id === qid);
        if (!q || q.status === 'completed') return { ok: false, error: 'quest_invalid' };
        q.status = 'completed';
        s.xp += 50;
        s.coins += 40;
        if (s.xp >= s.level * 200) {
          s.level += 1;
        }
        return { ok: true, session: s, data: { quest: q } };
      }
      case 'emote':
        return { ok: true, session: s, data: { emote: String(payload.emote || 'wave').slice(0, 24) } };
      case 'friend_request': {
        const target = String(payload.username || '').slice(0, 32);
        const mine = this.friends.get(s.username) ?? [];
        if (target && !mine.includes(target)) mine.push(target);
        this.friends.set(s.username, mine);
        return { ok: true, data: { friends: mine } };
      }
      case 'party_invite': {
        const target = String(payload.username || '').slice(0, 32);
        const party = this.parties.get(s.username) ?? [s.username];
        if (target && !party.includes(target)) party.push(target);
        this.parties.set(s.username, party);
        return { ok: true, data: { party } };
      }
      case 'guild_invite': {
        const name = String(payload.guild || 'Havenbrook').slice(0, 32);
        const g = this.guilds.get(name) ?? [];
        if (!g.includes(s.username)) g.push(s.username);
        this.guilds.set(name, g);
        return { ok: true, data: { guild: name, members: g } };
      }
      case 'trade_offer':
        return { ok: true, data: { note: 'trade handshake recorded; items move only after both accept on server' } };
      case 'admin_kick':
      case 'admin_ban':
      case 'admin_teleport':
        return this.adminAction(s, type, payload);
      default:
        return { ok: false, error: 'unknown_action' };
    }
  }

  private adminAction(actor: Session, type: string, payload: Record<string, unknown>) {
    const need: PlayerRole = type === 'admin_ban' ? 'admin' : 'moderator';
    if (!canRole(actor.role, need)) return { ok: false, error: 'forbidden' };
    const targetName = String(payload.username || '').slice(0, 32);
    const target = [...this.sessions.values()].find(s => s.username === targetName);
    if (!target) return { ok: false, error: 'player_not_found' };
    if (canRole(target.role, actor.role) && target.id !== actor.id) return { ok: false, error: 'cannot_target_equal_or_higher' };
    if (type === 'admin_kick') {
      this.sessions.delete(target.id);
      this.log(`${actor.username} kicked ${target.username}`);
      return { ok: true, data: { kicked: target.username } };
    }
    if (type === 'admin_ban') {
      target.banned = true;
      this.bans.add(target.username.toLowerCase());
      this.sessions.delete(target.id);
      this.log(`${actor.username} banned ${target.username}`);
      return { ok: true, data: { banned: target.username } };
    }
    const col = Math.round(Number(payload.col));
    const row = Math.round(Number(payload.row));
    if (!Number.isFinite(col) || !Number.isFinite(row)) return { ok: false, error: 'bad_position' };
    target.col = col;
    target.row = row;
    this.log(`${actor.username} teleported ${target.username}`);
    return { ok: true, data: { teleported: target.username, col, row } };
  }

  snapshot() {
    return {
      serverTime: Date.now(),
      players: [...this.sessions.values()]
        .filter(s => !s.banned)
        .map(s => ({
          id: s.id,
          username: s.username,
          col: s.col,
          row: s.row,
          district: s.district,
          skin: s.skin,
          shirt: s.shirt
        })),
      npcs: this.npcs.map(n => ({ ...n })),
      events: this.npcs.some(n => n.talkingTo)
        ? [{ id: 'npc_talk', title: 'Townsfolk are speaking in the plaza' }]
        : []
    };
  }

  adminList(actor: Session) {
    if (!canRole(actor.role, 'moderator')) return { ok: false as const, error: 'forbidden' };
    return {
      ok: true as const,
      players: [...this.sessions.values()].map(s => ({
        id: s.id,
        username: s.username,
        role: s.role,
        col: s.col,
        row: s.row,
        level: s.level,
        coins: s.coins
      })),
      bans: [...this.bans],
      logs: this.logs.slice(0, 40),
      config: {
        name: this.config.server_name,
        max_players: this.config.max_players,
        pvp: this.config.pvp_enabled,
        npc_ai: this.config.npc_ai_enabled
      }
    };
  }

  private log(msg: string) {
    this.logs.unshift(`${new Date().toISOString().slice(11, 19)} ${msg}`);
    if (this.logs.length > 80) this.logs.length = 80;
  }
}

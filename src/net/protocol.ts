/**
 * Client ↔ dedicated game server protocol.
 * Discovery is separate from world authority.
 */

import type { GameServerInfo, PlayerRole } from '../game/gate/types';

export interface JoinRequest {
  username: string;
  token?: string;
  password?: string;
  avatar?: {
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
  };
}

export interface JoinResponse {
  ok: boolean;
  sessionId: string;
  character: {
    id: string;
    username: string;
    level: number;
    xp: number;
    coins: number;
    col: number;
    row: number;
    district: string;
    role: PlayerRole;
    reputation: number;
    avatar_skin: string;
    avatar_hair: string;
    avatar_shirt: string;
    avatar_pants: string;
  };
  server: GameServerInfo;
  pingMs: number;
  error?: string;
}

export type GameActionType =
  | 'move'
  | 'spend_coins'
  | 'grant_xp'
  | 'complete_quest'
  | 'set_inventory'
  | 'admin_kick'
  | 'admin_ban'
  | 'admin_teleport'
  | 'emote'
  | 'party_invite'
  | 'friend_request'
  | 'guild_invite'
  | 'trade_offer';

export interface GameAction {
  type: GameActionType;
  sessionId: string;
  payload: Record<string, unknown>;
}

export interface NpcSnapshot {
  id: string;
  name: string;
  col: number;
  row: number;
  activity: string;
  mood: string;
  talkingTo?: string | null;
}

export interface WorldSnapshot {
  serverTime: number;
  players: Array<{
    id: string;
    username: string;
    col: number;
    row: number;
    district: string;
    skin: string;
    shirt: string;
  }>;
  npcs: NpcSnapshot[];
  events: Array<{ id: string; title: string }>;
}

export interface DirectoryResponse {
  ok: boolean;
  servers: GameServerInfo[];
}

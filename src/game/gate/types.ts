/**
 * Game Gate — how a player enters BPV (offline local save vs online server).
 * Online progression never mixes with local client saves.
 */

export type GatePhase =
  | 'boot'
  | 'main_menu'
  | 'gate'
  | 'offline_load'
  | 'auth'
  | 'multiplayer_menu'
  | 'server_select'
  | 'add_server'
  | 'direct_connect'
  | 'create_server'
  | 'connect'
  | 'load_player'
  | 'load_world'
  | 'sync'
  | 'playing'
  | 'connection_lost'
  | 'exited';

export type PlayMode = 'offline' | 'online';

export type ServerKind = 'official' | 'community' | 'private' | 'lan' | 'direct' | 'self_hosted';

export type ServerStatus = 'online' | 'offline' | 'full' | 'unknown';

export type NetworkProtocol = 'https' | 'http' | 'ws';

export type PlayerRole = 'player' | 'moderator' | 'admin' | 'owner';

export interface GameServerInfo {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  address: string;
  port: number;
  protocol: NetworkProtocol;
  kind: ServerKind;
  region?: string;
  version?: string;
  players: number;
  maxPlayers: number;
  pingMs: number | null;
  status: ServerStatus;
  passwordProtected: boolean;
  pvp: boolean;
  pve: boolean;
  npcAi: boolean;
  worldVersion?: string;
}

export interface SavedServer {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol: NetworkProtocol;
  password?: string;
  kind: ServerKind;
}

export interface ConnectFailure {
  serverName: string;
  reason: string;
}

export interface ConnectProgress {
  step: 'connecting' | 'authenticating' | 'loading_character' | 'loading_world' | 'synchronizing';
  label: string;
}

export interface OfflineProfile {
  username: string;
  level: number;
  xp: number;
  coins: number;
  avatar_skin: string;
  avatar_hair: string;
  avatar_shirt: string;
  avatar_pants: string;
  realm: string;
  savedAt: number;
}

export interface OnlineCharacter {
  id: string;
  username: string;
  level: number;
  xp: number;
  coins: number;
  avatar_skin: string;
  avatar_hair: string;
  avatar_shirt: string;
  avatar_pants: string;
  col: number;
  row: number;
  district: string;
  role: PlayerRole;
  reputation: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mute: boolean;
  pixelScale: 'native' | 'crisp';
  showHints: boolean;
  autoReconnect: boolean;
  protocol: NetworkProtocol;
  region: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 0.7,
  mute: false,
  pixelScale: 'crisp',
  showHints: true,
  autoReconnect: true,
  protocol: 'http',
  region: 'local'
};

export function parseDirectAddress(raw: string): { address: string; port: number } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 180) return null;
  if (/[\s<>'"]/.test(trimmed)) return null;
  const m = trimmed.match(/^(?:https?:\/\/)?([a-zA-Z0-9.-]+)(?::(\d{2,5}))?$/);
  if (!m) return null;
  const port = m[2] ? Number(m[2]) : 7777;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { address: m[1], port };
}

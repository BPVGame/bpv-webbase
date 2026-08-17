/**
 * Server directory — discovery only. World state stays on the game shard.
 */

import { DedicatedServerConfig } from './config.js';

export interface ListedServer {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  address: string;
  port: number;
  protocol: 'http' | 'https' | 'ws';
  kind: 'official' | 'community' | 'private' | 'lan' | 'direct' | 'self_hosted';
  region?: string;
  version?: string;
  players: number;
  maxPlayers: number;
  pingMs: number | null;
  status: 'online' | 'offline' | 'full' | 'unknown';
  passwordProtected: boolean;
  pvp: boolean;
  pve: boolean;
  npcAi: boolean;
  worldVersion?: string;
}

export class ServerDirectory {
  private extra = new Map<string, ListedServer>();

  constructor(private self: DedicatedServerConfig, private playerCount: () => number) {}

  selfListing(): ListedServer {
    const players = this.playerCount();
    return {
      id: 'self',
      name: this.self.server_name,
      description: this.self.server_description,
      owner: this.self.owner_username,
      address: this.self.server_address,
      port: this.self.server_port,
      protocol: 'http',
      kind: 'official',
      region: this.self.region,
      version: '1.0.0',
      players,
      maxPlayers: this.self.max_players,
      pingMs: 0,
      status: players >= this.self.max_players ? 'full' : 'online',
      passwordProtected: Boolean(this.self.join_password),
      pvp: this.self.pvp_enabled,
      pve: this.self.pve_enabled,
      npcAi: this.self.npc_ai_enabled,
      worldVersion: this.self.world_size
    };
  }

  list(): ListedServer[] {
    return [this.selfListing(), ...this.extra.values()];
  }

  register(partial: Partial<ListedServer> & { name: string; address: string; port: number }): ListedServer {
    const id = `reg_${partial.address}_${partial.port}`;
    const listing: ListedServer = {
      id,
      name: partial.name.slice(0, 48),
      description: (partial.description || '').slice(0, 160),
      owner: partial.owner,
      address: partial.address.slice(0, 120),
      port: partial.port,
      protocol: partial.protocol || 'http',
      kind: partial.kind || 'community',
      region: partial.region || 'custom',
      version: '1.0.0',
      players: 0,
      maxPlayers: partial.maxPlayers || 50,
      pingMs: null,
      status: 'online',
      passwordProtected: Boolean(partial.passwordProtected),
      pvp: Boolean(partial.pvp),
      pve: partial.pve !== false,
      npcAi: partial.npcAi !== false,
      worldVersion: 'infinite-v1'
    };
    this.extra.set(id, listing);
    return listing;
  }
}

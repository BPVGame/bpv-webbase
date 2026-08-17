import fs from 'node:fs';
import path from 'node:path';

export interface DedicatedServerConfig {
  server_name: string;
  server_description: string;
  server_address: string;
  server_port: number;
  max_players: number;
  region: string;
  pvp_enabled: boolean;
  pve_enabled: boolean;
  friendly_fire: boolean;
  world_seed: string;
  world_size: string;
  npc_ai_enabled: boolean;
  ello5_enabled: boolean;
  chat_enabled: boolean;
  voice_enabled: boolean;
  save_interval: number;
  owner_username: string;
  join_password: string;
}

const DEFAULTS: DedicatedServerConfig = {
  server_name: 'BPV Local Shard',
  server_description: 'Self-hosted BPV infinite world.',
  server_address: '127.0.0.1',
  server_port: 3001,
  max_players: 50,
  region: 'local',
  pvp_enabled: false,
  pve_enabled: true,
  friendly_fire: false,
  world_seed: 'havenbrook',
  world_size: 'infinite',
  npc_ai_enabled: true,
  ello5_enabled: true,
  chat_enabled: true,
  voice_enabled: false,
  save_interval: 30,
  owner_username: 'Trainer_Ash',
  join_password: ''
};

export function loadDedicatedConfig(): DedicatedServerConfig {
  const file = path.resolve(process.cwd(), 'server.config.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DedicatedServerConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

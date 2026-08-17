/**
 * Sandbox government — isolated civic overlay on the infinite IsoEarth.
 * A Governor (player) or AI VM can found a state, claim land, and plant flags.
 * Does not replace WorldGen; overlays sit on top of streamed chunks.
 */

export type SandboxRole = 'visitor' | 'governor' | 'ai';

export type LandTileId = 'grass' | 'plaza' | 'cobble' | 'dirt' | 'park' | 'house' | 'lamp' | 'bridge';

export interface WorldFlag {
  id: string;
  name: string;
  col: number;
  row: number;
  colorA: string;
  colorB: string;
  plantedBy: SandboxRole;
  plantedAt: number;
}

export interface LandClaim {
  id: string;
  col: number;
  row: number;
  tileId: LandTileId;
  claimedBy: SandboxRole;
}

export interface Decree {
  id: string;
  title: string;
  text: string;
  at: number;
  author: SandboxRole;
}

export interface GovernmentState {
  founded: boolean;
  name: string;
  motto: string;
  colorA: string;
  colorB: string;
  capitalCol: number;
  capitalRow: number;
  founder: string;
  foundedAt: number;
}

export interface SandboxSnapshot {
  government: GovernmentState;
  claims: LandClaim[];
  flags: WorldFlag[];
  decrees: Decree[];
  aiEnabled: boolean;
  tick: number;
}

export const DEFAULT_GOVERNMENT: GovernmentState = {
  founded: false,
  name: '',
  motto: '',
  colorA: '#3a5a8c',
  colorB: '#e8d4a8',
  capitalCol: 0,
  capitalRow: 0,
  founder: '',
  foundedAt: 0
};

export const LAND_BRUSHES: LandTileId[] = ['plaza', 'cobble', 'grass', 'park', 'dirt', 'house', 'lamp', 'bridge'];

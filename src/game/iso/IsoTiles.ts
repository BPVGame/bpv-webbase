/**
 * BPV IsoEarth tile catalog — inspired by isometric world-builders
 * (e.g. isomiddleearth.com) but themed for Battle Pixel V districts.
 *
 * Tiles are drawn procedurally (16-bit palette) so the web client and
 * SpriteKit/iOS client can share the same tile IDs without PNG packs.
 */

export type DistrictRealm =
  | 'city_center'
  | 'residential'
  | 'central_park'
  | 'pixel_harbor'
  | 'shopping_outpost'
  | 'tournament_arena'
  | 'mixed';

export interface IsoTileDef {
  id: string;
  group: string;
  label: string;
  /** Palette key used by the procedural diamond renderer */
  palette: string;
  walkable: boolean;
  /** Optional emoji used by Emoji Design Cards / map legend */
  emoji?: string;
}

export const ISO_TILE_GROUPS: Array<{ name: string; tiles: IsoTileDef[] }> = [
  {
    name: 'Terrain',
    tiles: [
      { id: 'grass', group: 'Terrain', label: 'Grass', palette: 'grass', walkable: true, emoji: '🌿' },
      { id: 'tall_grass', group: 'Terrain', label: 'Tall Grass', palette: 'tall_grass', walkable: true, emoji: '🌾' },
      { id: 'dirt', group: 'Terrain', label: 'Dirt Path', palette: 'dirt', walkable: true, emoji: '🟫' },
      { id: 'cobble', group: 'Terrain', label: 'Cobblestone', palette: 'cobble', walkable: true, emoji: '🪨' },
      { id: 'sand', group: 'Terrain', label: 'Harbor Sand', palette: 'sand', walkable: true, emoji: '🏖️' },
      { id: 'plaza', group: 'Terrain', label: 'City Plaza', palette: 'plaza', walkable: true, emoji: '⬜' }
    ]
  },
  {
    name: 'Water & Bridges',
    tiles: [
      { id: 'water', group: 'Water & Bridges', label: 'Deep Water', palette: 'water', walkable: false, emoji: '🌊' },
      { id: 'shallow', group: 'Water & Bridges', label: 'Shallow Stream', palette: 'shallow', walkable: false, emoji: '💧' },
      { id: 'bridge', group: 'Water & Bridges', label: 'Wooden Bridge', palette: 'bridge', walkable: true, emoji: '🌉' },
      { id: 'dock', group: 'Water & Bridges', label: 'Pixel Dock', palette: 'dock', walkable: true, emoji: '🛳️' }
    ]
  },
  {
    name: 'Trees & Vegetation',
    tiles: [
      { id: 'tree', group: 'Trees & Vegetation', label: 'Oak Tree', palette: 'tree', walkable: false, emoji: '🌳' },
      { id: 'pine', group: 'Trees & Vegetation', label: 'Pine', palette: 'pine', walkable: false, emoji: '🌲' },
      { id: 'bush', group: 'Trees & Vegetation', label: 'Flowering Bush', palette: 'bush', walkable: false, emoji: '🌺' },
      { id: 'park', group: 'Trees & Vegetation', label: 'Park Lawn', palette: 'park', walkable: true, emoji: '🪴' }
    ]
  },
  {
    name: 'Buildings',
    tiles: [
      { id: 'house', group: 'Buildings', label: 'Dwelling', palette: 'house', walkable: false, emoji: '🏠' },
      { id: 'shop', group: 'Buildings', label: 'Card Shop', palette: 'shop', walkable: false, emoji: '🏪' },
      { id: 'hub', group: 'Buildings', label: 'Tournament Hub', palette: 'hub', walkable: false, emoji: '🏟️' },
      { id: 'lab', group: 'Buildings', label: 'Fish Lab', palette: 'lab', walkable: false, emoji: '🔬' },
      { id: 'tower', group: 'Buildings', label: 'Dex Tower', palette: 'tower', walkable: false, emoji: '🗼' }
    ]
  },
  {
    name: 'Decorations',
    tiles: [
      { id: 'lamp', group: 'Decorations', label: 'Street Lamp', palette: 'lamp', walkable: true, emoji: '🏮' },
      { id: 'sign', group: 'Decorations', label: 'Signpost', palette: 'sign', walkable: true, emoji: '🪧' },
      { id: 'chest', group: 'Decorations', label: 'Card Chest', palette: 'chest', walkable: true, emoji: '📦' },
      { id: 'spawn', group: 'Decorations', label: 'Player Spawn', palette: 'spawn', walkable: true, emoji: '⭐' }
    ]
  }
];

export const ISO_TILE_BY_ID: Record<string, IsoTileDef> = Object.fromEntries(
  ISO_TILE_GROUPS.flatMap(g => g.tiles.map(t => [t.id, t]))
);

/** Hex palette for procedural isometric diamonds (16-bit RPG look). */
export const ISO_PALETTE: Record<string, { top: string; left: string; right: string; accent?: string }> = {
  grass: { top: '#4ade80', left: '#16a34a', right: '#15803d', accent: '#86efac' },
  tall_grass: { top: '#22c55e', left: '#15803d', right: '#166534', accent: '#bbf7d0' },
  dirt: { top: '#a16207', left: '#854d0e', right: '#713f12' },
  cobble: { top: '#94a3b8', left: '#64748b', right: '#475569', accent: '#cbd5e1' },
  sand: { top: '#fde68a', left: '#f59e0b', right: '#d97706' },
  plaza: { top: '#e2e8f0', left: '#94a3b8', right: '#64748b' },
  water: { top: '#38bdf8', left: '#0284c7', right: '#0369a1', accent: '#7dd3fc' },
  shallow: { top: '#67e8f9', left: '#06b6d4', right: '#0891b2' },
  bridge: { top: '#d97706', left: '#b45309', right: '#92400e' },
  dock: { top: '#78716c', left: '#57534e', right: '#44403c' },
  tree: { top: '#166534', left: '#14532d', right: '#052e16', accent: '#22c55e' },
  pine: { top: '#115e59', left: '#134e4a', right: '#042f2e', accent: '#14b8a6' },
  bush: { top: '#ec4899', left: '#be185d', right: '#9d174d', accent: '#f9a8d4' },
  park: { top: '#86efac', left: '#4ade80', right: '#22c55e' },
  house: { top: '#fbbf24', left: '#b45309', right: '#78350f', accent: '#fef3c7' },
  shop: { top: '#fb923c', left: '#ea580c', right: '#c2410c', accent: '#fdba74' },
  hub: { top: '#818cf8', left: '#4f46e5', right: '#3730a3', accent: '#c7d2fe' },
  lab: { top: '#2dd4bf', left: '#0f766e', right: '#115e59' },
  tower: { top: '#f472b6', left: '#db2777', right: '#9d174d' },
  lamp: { top: '#fef08a', left: '#ca8a04', right: '#a16207' },
  sign: { top: '#fdba74', left: '#c2410c', right: '#9a3412' },
  chest: { top: '#facc15', left: '#a16207', right: '#854d0e', accent: '#fde047' },
  spawn: { top: '#fbbf24', left: '#2563eb', right: '#1d4ed8', accent: '#fef08a' }
};

export const DISTRICT_REALMS: Array<{ id: DistrictRealm; label: string; emoji: string }> = [
  { id: 'city_center', label: 'City Center', emoji: '🏙️' },
  { id: 'residential', label: 'Residential', emoji: '🏡' },
  { id: 'central_park', label: 'Central Park', emoji: '🌳' },
  { id: 'pixel_harbor', label: 'Pixel Harbor', emoji: '⚓' },
  { id: 'shopping_outpost', label: 'Shopping Outpost', emoji: '🛒' },
  { id: 'tournament_arena', label: 'Tournament Arena', emoji: '🏆' },
  { id: 'mixed', label: 'Mixed Earth', emoji: '🌍' }
];

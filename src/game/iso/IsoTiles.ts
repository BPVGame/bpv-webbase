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

/** Cozy 16-bit palette — soft sage greens, cream paths, warm brick (Stardew-like). */
export const ISO_PALETTE: Record<string, { top: string; left: string; right: string; accent?: string }> = {
  grass: { top: '#8fbf6a', left: '#6a9a4e', right: '#5a8742', accent: '#b8d98a' },
  tall_grass: { top: '#7aaf58', left: '#5f8f40', right: '#4e7a36', accent: '#c5e0a0' },
  dirt: { top: '#e8d4a8', left: '#c9b07a', right: '#b09860', accent: '#f2e6c4' },
  cobble: { top: '#d4c4a8', left: '#b8a888', right: '#9e8e70', accent: '#ebe0cc' },
  sand: { top: '#f0e0b8', left: '#dcc890', right: '#c8b078', accent: '#faf0d8' },
  plaza: { top: '#e6dcc8', left: '#cfc4ae', right: '#b8ac94', accent: '#f5efe4' },
  water: { top: '#7ec8d8', left: '#4fa0b8', right: '#3a889c', accent: '#b0e0ec' },
  shallow: { top: '#a0d8e0', left: '#70b8c8', right: '#58a0b0', accent: '#d0eef4' },
  bridge: { top: '#c4a06a', left: '#a07848', right: '#886038', accent: '#e0c898' },
  dock: { top: '#a89070', left: '#8a7458', right: '#6e5a44' },
  tree: { top: '#6aaa58', left: '#4e8a3e', right: '#3c7030', accent: '#98c878' },
  pine: { top: '#5a9a68', left: '#447850', right: '#346040', accent: '#88c098' },
  bush: { top: '#e8a0b8', left: '#c87898', right: '#a85878', accent: '#f8d0e0' },
  park: { top: '#a8d080', left: '#88b860', right: '#70a048', accent: '#d0e8a8' },
  house: { top: '#c45a48', left: '#8a5040', right: '#6e3e30', accent: '#e8c090' },
  shop: { top: '#d87848', left: '#a05838', right: '#844830', accent: '#f0c8a0' },
  hub: { top: '#b87058', left: '#8a5040', right: '#6e3c30', accent: '#e8d0b0' },
  lab: { top: '#70a898', left: '#508878', right: '#3c6c60', accent: '#b8d8d0' },
  tower: { top: '#9880a0', left: '#706080', right: '#584868', accent: '#d0c0d8' },
  lamp: { top: '#f0d878', left: '#c8a848', right: '#a88838', accent: '#fff0b0' },
  sign: { top: '#c4a070', left: '#987850', right: '#7a5e3c' },
  chest: { top: '#e0b050', left: '#b08830', right: '#8a6820', accent: '#f8e090' },
  spawn: { top: '#a8c878', left: '#88a858', right: '#6e8e40', accent: '#d8f0a8' }
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

/**
 * Shared IsoEarth map format (BPV).
 * Compatible in spirit with isometric JSON maps (grid of tile refs)
 * and convertible to/from Tiled Map Editor (.tmj) via TiledMapLoader.
 */

import { DistrictRealm, ISO_TILE_BY_ID } from './IsoTiles';

export interface BpvIsoMap {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  location: DistrictRealm;
  gridSize: number;
  tiles: string[][]; // tile ids
  spawn: { col: number; row: number };
  tags?: string[];
}

export function loadIsoMapFromJson(raw: unknown): BpvIsoMap {
  const data = raw as Partial<BpvIsoMap> & { map?: unknown };
  if (!data || typeof data !== 'object') throw new Error('Invalid IsoEarth map JSON');

  // Support isomiddleearth-style [row][col] = [groupRow, tileCol] or [groupRow, tileCol, realm]
  if (Array.isArray(data.map) && !data.tiles) {
    return convertIsoMiddleEarthStyle(data as any);
  }

  if (!data.tiles || !data.gridSize || !data.id || !data.name) {
    throw new Error('IsoEarth map missing required fields');
  }

  return {
    schemaVersion: 1,
    id: data.id,
    name: data.name,
    description: data.description,
    location: (data.location as DistrictRealm) || 'mixed',
    gridSize: data.gridSize,
    tiles: data.tiles,
    spawn: data.spawn || { col: Math.floor(data.gridSize / 2), row: Math.floor(data.gridSize / 2) },
    tags: data.tags
  };
}

function convertIsoMiddleEarthStyle(data: {
  id: string;
  name: string;
  location?: string;
  gridSize: number;
  map: Array<Array<[number, number] | [number, number, string]>>;
}): BpvIsoMap {
  const size = data.gridSize;
  const tiles: string[][] = [];
  const fallback = ['grass', 'tall_grass', 'dirt', 'cobble', 'water', 'bridge', 'tree', 'house', 'shop', 'hub'];
  for (let r = 0; r < size; r++) {
    const row: string[] = [];
    for (let c = 0; c < size; c++) {
      const cell = data.map[r]?.[c];
      if (!cell) {
        row.push('grass');
        continue;
      }
      const idx = (cell[0] * 12 + cell[1]) % fallback.length;
      row.push(fallback[idx]);
    }
    tiles.push(row);
  }
  return {
    schemaVersion: 1,
    id: data.id,
    name: data.name,
    location: 'mixed',
    gridSize: size,
    tiles,
    spawn: { col: Math.floor(size / 2), row: Math.floor(size / 2) },
    tags: ['imported', 'isomiddleearth-format']
  };
}

/** Procedural starter earth for each district realm. */
export function generateStarterEarth(location: DistrictRealm = 'city_center', gridSize = 14): BpvIsoMap {
  const tiles: string[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: string[] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push(pickTile(location, c, r, gridSize));
    }
    tiles.push(row);
  }

  // Ensure spawn is walkable
  const spawn = { col: Math.floor(gridSize / 2), row: Math.floor(gridSize / 2) };
  tiles[spawn.row][spawn.col] = 'spawn';
  // Clear walk ring
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ]) {
    const rr = spawn.row + dr;
    const cc = spawn.col + dc;
    if (rr >= 0 && cc >= 0 && rr < gridSize && cc < gridSize) {
      if (!ISO_TILE_BY_ID[tiles[rr][cc]]?.walkable) tiles[rr][cc] = 'plaza';
    }
  }

  const names: Record<DistrictRealm, string> = {
    city_center: 'City Center Earth',
    residential: 'Residential Earth',
    central_park: 'Central Park Earth',
    pixel_harbor: 'Pixel Harbor Earth',
    shopping_outpost: 'Shopping Outpost Earth',
    tournament_arena: 'Tournament Arena Earth',
    mixed: 'Mixed Earth'
  };

  return {
    schemaVersion: 1,
    id: `bpv-${location}`,
    name: names[location],
    description: `Procedural IsoEarth district for ${location}. Explore, meet players, earn Fish Cards.`,
    location,
    gridSize,
    tiles,
    spawn,
    tags: ['bpv', 'isoearth', location]
  };
}

function pickTile(location: DistrictRealm, c: number, r: number, size: number): string {
  const edge = c === 0 || r === 0 || c === size - 1 || r === size - 1;
  const river = Math.abs(c - Math.floor(size * 0.3 + Math.sin(r * 0.4) * 1.5)) < 1;
  const roadH = r === Math.floor(size / 2) || r === Math.floor(size / 2) - 1;
  const roadV = c === Math.floor(size / 2) || c === Math.floor(size / 2) - 1;

  if (location === 'pixel_harbor') {
    if (r > size * 0.65) return c % 5 === 2 ? 'dock' : 'water';
    if (roadH || roadV) return 'cobble';
    if (c % 7 === 3 && r % 5 === 2) return 'shop';
    if ((c + r) % 11 === 0) return 'chest';
    return Math.random() > 0.85 ? 'sand' : 'plaza';
  }

  if (location === 'central_park') {
    if (river) return r % 6 === 0 ? 'bridge' : 'water';
    if ((c * 3 + r * 5) % 7 === 0) return 'tree';
    if ((c + r) % 9 === 0) return 'pine';
    if ((c * r) % 13 === 1) return 'bush';
    return Math.random() > 0.3 ? 'park' : 'tall_grass';
  }

  if (location === 'tournament_arena') {
    if (edge) return 'hub';
    if (roadH || roadV) return 'cobble';
    if (c > 4 && c < size - 5 && r > 4 && r < size - 5) return 'plaza';
    return 'dirt';
  }

  if (location === 'shopping_outpost') {
    if (roadH || roadV) return 'cobble';
    if (c % 4 === 2 && r % 4 === 2) return 'shop';
    if ((c + r) % 8 === 0) return 'lamp';
    return 'plaza';
  }

  if (location === 'residential') {
    if (roadH || roadV) return 'dirt';
    if (c % 5 === 2 && r % 4 === 1) return 'house';
    if ((c + r) % 7 === 0) return 'tree';
    return 'grass';
  }

  // city_center / mixed default
  if (river) return roadH || roadV ? 'bridge' : 'water';
  if (roadH || roadV) return 'cobble';
  if (c === 3 && r === 3) return 'hub';
  if (c === size - 4 && r === 3) return 'shop';
  if (c === 3 && r === size - 4) return 'lab';
  if (c === size - 4 && r === size - 4) return 'tower';
  if ((c + r) % 10 === 0) return 'lamp';
  if ((c * 2 + r) % 13 === 0) return 'tree';
  if (edge) return 'tall_grass';
  return 'grass';
}

export const STARTER_EARTHS: DistrictRealm[] = [
  'city_center',
  'pixel_harbor',
  'central_park',
  'tournament_arena',
  'residential',
  'shopping_outpost'
];

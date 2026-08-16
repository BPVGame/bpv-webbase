/**
 * Deterministic infinite terrain from world tile coordinates.
 * Features (rivers, roads, forests) are continuous across chunk borders.
 */

import { DistrictRealm, ISO_TILE_BY_ID } from './IsoTiles';

export const CHUNK_SIZE = 16;

/** Stable [0,1) hash from integer coords. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0,1]. */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);
  const ix0 = n00 * (1 - sx) + n10 * sx;
  const ix1 = n01 * (1 - sx) + n11 * sx;
  return ix0 * (1 - sy) + ix1 * sy;
}

export function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 19) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** District warp anchors — far apart regions of the same infinite plane. */
export const DISTRICT_ORIGINS: Record<DistrictRealm, { x: number; y: number }> = {
  city_center: { x: 0, y: 0 },
  residential: { x: 220, y: -40 },
  central_park: { x: -30, y: 260 },
  pixel_harbor: { x: 480, y: 20 },
  shopping_outpost: { x: -260, y: 80 },
  tournament_arena: { x: 80, y: -320 },
  mixed: { x: 1000, y: 1000 }
};

/**
 * Continuous river field: distance-like value near 0 means water.
 * Uses smooth world-space curves so water never stops at chunk edges.
 */
function riverField(wx: number, wy: number): number {
  const a = Math.sin(wx * 0.035 + 1.7) * 14 + Math.sin(wx * 0.011) * 8;
  const d1 = Math.abs(wy - a);
  const b = Math.cos(wy * 0.028 - 0.4) * 12 + Math.cos(wy * 0.009) * 6;
  const d2 = Math.abs(wx - (b + 40));
  return Math.min(d1, d2);
}

/** Primary road lattice — continuous lines every ROAD_PERIOD tiles. */
const ROAD_PERIOD = 14;

function nearRoad(wx: number, wy: number): boolean {
  // Slow sine meander keeps roads continuous across chunks (no per-cell jitter seams)
  const meanderY = Math.round(Math.sin(wx * 0.045) * 1.25);
  const meanderX = Math.round(Math.cos(wy * 0.045) * 1.25);
  const mid = Math.floor(ROAD_PERIOD / 2);
  const onH = (((wy - meanderY) % ROAD_PERIOD) + ROAD_PERIOD) % ROAD_PERIOD === mid;
  const onV = (((wx - meanderX) % ROAD_PERIOD) + ROAD_PERIOD) % ROAD_PERIOD === mid;
  return onH || onV;
}

function nearPlaza(wx: number, wy: number): boolean {
  const cx = Math.floor(wx / ROAD_PERIOD) * ROAD_PERIOD + ROAD_PERIOD / 2;
  const cy = Math.floor(wy / ROAD_PERIOD) * ROAD_PERIOD + ROAD_PERIOD / 2;
  return Math.abs(wx - cx) <= 1 && Math.abs(wy - cy) <= 1;
}

/**
 * Generate one tile id for absolute world coordinates.
 * Pure function — same (wx, wy, realm) always yields the same tile.
 */
export function generateWorldTile(wx: number, wy: number, realm: DistrictRealm = 'city_center'): string {
  const river = riverField(wx, wy);

  // Harbor biome: more water toward +X
  if (realm === 'pixel_harbor' || (wx > 420 && wx < 620)) {
    if (wy > 8 + Math.sin(wx * 0.08) * 3) {
      if (nearRoad(wx, wy)) return 'dock';
      return hash2(wx, wy, 3) > 0.92 ? 'dock' : 'water';
    }
  }

  if (river < 1.15) return 'water';
  if (river < 1.85) return 'shallow';
  if (river < 2.6 && nearRoad(wx, wy)) return 'bridge';

  if (nearRoad(wx, wy)) {
    return nearPlaza(wx, wy) ? 'plaza' : 'cobble';
  }

  // Bridges already handled; dirt paths branching from roads
  const branch =
    hash2(Math.floor(wx / 3), Math.floor(wy / 3), 55) > 0.82 &&
    (Math.abs(wx % 3) === 0 || Math.abs(wy % 3) === 0) &&
    river > 4;
  if (branch && fbm(wx * 0.08, wy * 0.08, 12) > 0.55) return 'dirt';

  const forest = fbm(wx * 0.07, wy * 0.07, 4);
  const meadow = fbm(wx * 0.05, wy * 0.05, 8);

  // Points of interest along roads — never straddle by using cell center rules
  const besideRoad =
    nearRoad(wx + 1, wy) || nearRoad(wx - 1, wy) || nearRoad(wx, wy + 1) || nearRoad(wx, wy - 1);
  if (besideRoad && river > 3.5) {
    const roll = hash2(wx, wy, 200);
    if (roll > 0.985) return realm === 'shopping_outpost' ? 'shop' : 'house';
    if (roll > 0.978) return realm === 'tournament_arena' ? 'hub' : 'shop';
    if (roll > 0.972) return 'lamp';
    if (roll > 0.968) return 'sign';
    if (roll > 0.964) return 'chest';
    if (roll > 0.96 && realm === 'city_center') return 'lab';
  }

  // Dense forest patches spanning chunks
  if (forest > 0.72 && meadow > 0.4) {
    const t = hash2(wx, wy, 33);
    if (t > 0.55) return forest > 0.82 ? 'pine' : 'tree';
    if (t > 0.4) return 'bush';
    return 'tall_grass';
  }

  if (realm === 'central_park' || meadow > 0.62) {
    if (hash2(wx, wy, 44) > 0.9) return 'bush';
    return hash2(wx, wy, 45) > 0.5 ? 'park' : 'tall_grass';
  }

  if (meadow < 0.32) return 'tall_grass';
  if (hash2(wx, wy, 61) > 0.97) return 'lamp';
  return 'grass';
}

export function isTileWalkable(tileId: string): boolean {
  return ISO_TILE_BY_ID[tileId]?.walkable ?? false;
}

export function worldToChunk(wx: number, wy: number): { cx: number; cy: number; lx: number; ly: number } {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cy = Math.floor(wy / CHUNK_SIZE);
  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return { cx, cy, lx, ly };
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

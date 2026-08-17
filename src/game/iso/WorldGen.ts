/**
 * Designed procedural IsoEarth — deterministic from world (x, y).
 * Large forests, winding rivers, connected roads, villages & POIs,
 * biome regions. All features continuous across chunk borders.
 *
 * Infinite chunk streaming stays unchanged — this file only decides
 * what each world tile is. Same (wx, wy) always yields the same tile
 * for a given realm (realm only applies subtle local climate nudges).
 */

import { DistrictRealm, ISO_TILE_BY_ID } from './IsoTiles';

export const CHUNK_SIZE = 16;

/** Stable [0,1) hash from integer coords. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

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

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
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

export type BiomeKind = 'plains' | 'forest' | 'meadow' | 'wetland' | 'coast' | 'hills' | 'farmland';

const VILLAGE_CELL = 64;
const HIGHWAY_PERIOD = 112;

/* ───────── Biomes (large contiguous regions) ───────── */

export function sampleBiome(wx: number, wy: number, realm: DistrictRealm): BiomeKind {
  // Tiny climate nudge near district hubs — continuous, never flips the whole map.
  let bx = wx;
  let by = wy;
  if (realm === 'central_park') {
    bx += 6;
    by -= 10;
  } else if (realm === 'tournament_arena') {
    by += 8;
  } else if (realm === 'shopping_outpost') {
    bx -= 8;
  }

  const moist = fbm(bx * 0.0065, by * 0.0065, 101, 5);
  const temp = fbm(bx * 0.0055 + 40, by * 0.0055 - 20, 202, 4);
  const relief = fbm(bx * 0.01, by * 0.01, 303, 3);

  // Harbor coastline is position-based so it stays local & seamless
  const harbor = DISTRICT_ORIGINS.pixel_harbor;
  const harborDist = Math.hypot(wx - harbor.x, wy - harbor.y);
  if (harborDist < 90) {
    const shore = fbm(wx * 0.02, wy * 0.02, 510, 3);
    const coastY = harbor.y + 6 + Math.sin((wx - harbor.x) * 0.045) * 5 + shore * 8;
    if (wy > coastY - 14) return 'coast';
  }

  if (moist > 0.76 && temp > 0.45) return 'coast';
  if (moist > 0.7) return 'wetland';
  if (relief > 0.64 && moist < 0.48) return 'hills';
  // Forest belts — large but not the entire map
  if (moist > 0.44 && moist < 0.66 && temp < 0.58) return 'forest';
  if (moist < 0.34 && temp > 0.5) return 'farmland';
  if (temp > 0.55 && moist > 0.34 && moist < 0.55) return 'meadow';
  return 'plains';
}

/* ───────── Rivers (domain-warped winding channels) ───────── */

/** Approximate distance to nearest river centerline (world units). */
export function riverDistance(wx: number, wy: number): number {
  // Domain warp → natural meanders that stay coherent across chunks
  const warpX = wx + (fbm(wx * 0.01, wy * 0.01, 11, 4) - 0.5) * 56;
  const warpY = wy + (fbm(wx * 0.01, wy * 0.01, 22, 4) - 0.5) * 56;

  // Primary east–west river
  const mainY =
    Math.sin(warpX * 0.014) * 20 +
    Math.sin(warpX * 0.0048 + 1.3) * 34 +
    Math.cos(warpX * 0.002) * 12;
  const dMain = Math.abs(warpY - mainY);

  // Secondary north–south tributary
  const tribX =
    Math.cos(warpY * 0.013) * 16 +
    Math.sin(warpY * 0.0045 - 0.7) * 30 +
    48;
  const dTrib = Math.abs(warpX - tribX);

  // Thin diagonal feeder (kept narrow so it doesn't flood biomes)
  const diag = (warpX + warpY) * 0.7071;
  const diagCenter =
    Math.sin((warpX - warpY) * 0.011) * 14 + Math.cos((warpX - warpY) * 0.0032) * 18;
  const dDiag = Math.abs(diag - diagCenter) + 0.35;

  // Slight width variation without creating lake plates
  const widthBoost = fbm(wx * 0.022, wy * 0.022, 33, 2) * 0.85;
  return Math.min(dMain, dTrib, dDiag) - widthBoost;
}

function riverWidth(wx: number, wy: number): number {
  return 0.95 + fbm(wx * 0.016, wy * 0.016, 44, 2) * 1.15;
}

/* ───────── Villages (seeded on coarse grid, connected by roads) ───────── */

export interface VillageInfo {
  x: number;
  y: number;
  radius: number;
  kind: 'hamlet' | 'village' | 'town' | 'harbor' | 'arena';
  seed: number;
}

function villageInCell(cellX: number, cellY: number): VillageInfo | null {
  // Skip some cells so villages aren't on a rigid lattice
  if (hash2(cellX, cellY, 900) < 0.45) return null;

  const jx = Math.floor(hash2(cellX, cellY, 901) * (VILLAGE_CELL - 20)) + 10;
  const jy = Math.floor(hash2(cellX, cellY, 902) * (VILLAGE_CELL - 20)) + 10;
  const x = cellX * VILLAGE_CELL + jx;
  const y = cellY * VILLAGE_CELL + jy;

  const roll = hash2(cellX, cellY, 903);
  let kind: VillageInfo['kind'] = 'hamlet';
  let radius = 4;
  if (roll > 0.82) {
    kind = 'town';
    radius = 8;
  } else if (roll > 0.5) {
    kind = 'village';
    radius = 6;
  }

  return { x, y, radius, kind, seed: cellX * 131 + cellY * 17 };
}

/** Public for NPC spawn / POI anchoring — same seeds as tile generation. */
export function getNearbyVillages(wx: number, wy: number): VillageInfo[] {
  return nearbyVillages(wx, wy);
}

function nearbyVillages(wx: number, wy: number): VillageInfo[] {
  const cx = Math.floor(wx / VILLAGE_CELL);
  const cy = Math.floor(wy / VILLAGE_CELL);
  const out: VillageInfo[] = [];
  const seen = new Set<string>();

  const push = (v: VillageInfo) => {
    const key = `${v.x},${v.y}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const v = villageInCell(cx + dx, cy + dy);
      if (v) push(v);
    }
  }

  // Guaranteed capitals at district origins (seamless — same coords everywhere)
  const capitals: Array<{ origin: { x: number; y: number }; kind: VillageInfo['kind']; radius: number }> = [
    { origin: DISTRICT_ORIGINS.city_center, kind: 'town', radius: 10 },
    { origin: DISTRICT_ORIGINS.residential, kind: 'village', radius: 7 },
    { origin: DISTRICT_ORIGINS.central_park, kind: 'hamlet', radius: 5 },
    { origin: DISTRICT_ORIGINS.pixel_harbor, kind: 'harbor', radius: 10 },
    { origin: DISTRICT_ORIGINS.shopping_outpost, kind: 'town', radius: 8 },
    { origin: DISTRICT_ORIGINS.tournament_arena, kind: 'arena', radius: 9 }
  ];
  for (const c of capitals) {
    if (Math.hypot(wx - c.origin.x, wy - c.origin.y) < VILLAGE_CELL * 2.2) {
      push({
        x: c.origin.x,
        y: c.origin.y,
        radius: c.radius,
        kind: c.kind,
        seed: c.origin.x * 13 + c.origin.y * 29
      });
    }
  }

  return out;
}

/** How deep inside a settlement this tile is (0 = outside). */
function settlementInfluence(wx: number, wy: number, villages: VillageInfo[]): number {
  let best = 0;
  for (const v of villages) {
    const d = Math.hypot(wx - v.x, wy - v.y);
    const pad = v.radius + 2.5;
    if (d < pad) best = Math.max(best, 1 - d / pad);
  }
  return best;
}

function distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-6) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

/** Distance from a village to the nearest highway corridor centerline. */
function nearestHighwayPoint(vx: number, vy: number): { x: number; y: number } {
  const mid = Math.floor(HIGHWAY_PERIOD / 2);
  // Candidate horizontal highway rows & vertical columns near the village
  const row0 = Math.floor(vy / HIGHWAY_PERIOD) * HIGHWAY_PERIOD + mid;
  const col0 = Math.floor(vx / HIGHWAY_PERIOD) * HIGHWAY_PERIOD + mid;
  const candidates = [
    { x: vx, y: row0 },
    { x: vx, y: row0 + HIGHWAY_PERIOD },
    { x: vx, y: row0 - HIGHWAY_PERIOD },
    { x: col0, y: vy },
    { x: col0 + HIGHWAY_PERIOD, y: vy },
    { x: col0 - HIGHWAY_PERIOD, y: vy }
  ];
  let best = candidates[0];
  let bestD = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - vx, c.y - vy);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Distance to nearest major road corridor (highways + village links). */
export function roadDistance(wx: number, wy: number): number {
  let best = 1e9;

  // Meandering highway lattice (world-scale, continuous)
  const hMeander = Math.round(Math.sin(wx * 0.018) * 2.5 + Math.sin(wx * 0.006) * 3.5);
  const vMeander = Math.round(Math.cos(wy * 0.018) * 2.5 + Math.cos(wy * 0.006) * 3.5);
  const mid = Math.floor(HIGHWAY_PERIOD / 2);
  const onH = (((wy - hMeander) % HIGHWAY_PERIOD) + HIGHWAY_PERIOD) % HIGHWAY_PERIOD;
  const onV = (((wx - vMeander) % HIGHWAY_PERIOD) + HIGHWAY_PERIOD) % HIGHWAY_PERIOD;
  // Distance to meandering lattice lines centered at `mid`
  best = Math.min(Math.abs(onH - mid), Math.abs(onV - mid));

  // Roads linking neighboring villages (seamless: only depends on village seeds)
  const villages = nearbyVillages(wx, wy);
  for (let i = 0; i < villages.length; i++) {
    const a = villages[i];
    for (let j = i + 1; j < villages.length; j++) {
      const b = villages[j];
      const distVillages = Math.hypot(a.x - b.x, a.y - b.y);
      if (distVillages > VILLAGE_CELL * 1.55) continue;
      // Only link a pair when their shared hash says so — avoids spaghetti
      const linkRoll = hash2(a.x + b.x, a.y + b.y, 950);
      if (linkRoll < 0.35 && distVillages > VILLAGE_CELL * 0.85) continue;
      best = Math.min(best, distPointToSegment(wx, wy, a.x, a.y, b.x, b.y));
    }

    // Single spur from village to nearest highway (not 4 cardinal stubs)
    const hw = nearestHighwayPoint(a.x, a.y);
    best = Math.min(best, distPointToSegment(wx, wy, a.x, a.y, hw.x, hw.y));
  }

  return best;
}

function dirtPathDistance(wx: number, wy: number): number {
  // Soft rural tracks — continuous noise ridges
  const n = fbm(wx * 0.035, wy * 0.035, 77, 3);
  return Math.abs(n - 0.5) * 20;
}

/* ───────── Forests (large coherent canopies) ───────── */

/** Forest canopy density in [0,1] — large blobs spanning many chunks. */
export function forestDensity(wx: number, wy: number): number {
  const macro = fbm(wx * 0.011, wy * 0.011, 401, 5);
  const meso = fbm(wx * 0.032, wy * 0.032, 402, 3);
  const micro = fbm(wx * 0.08, wy * 0.08, 403, 2);
  // Soft clearings — sparse enough that woods stay contiguous
  const clearing = meso > 0.78 ? (meso - 0.78) * 1.6 : 0;
  const edge = micro * 0.08;
  return Math.max(0, Math.min(1, macro * 1.2 - clearing - edge));
}

/* ───────── Wilderness POIs ───────── */

function wildernessPoi(wx: number, wy: number): string | null {
  // Sparse seeded landmarks on a coarse grid, continuous across chunks
  const cell = 48;
  const cx = Math.floor(wx / cell);
  const cy = Math.floor(wy / cell);
  if (hash2(cx, cy, 800) < 0.82) return null;

  const ox = cx * cell + 8 + Math.floor(hash2(cx, cy, 801) * (cell - 16));
  const oy = cy * cell + 8 + Math.floor(hash2(cx, cy, 802) * (cell - 16));
  const d = Math.hypot(wx - ox, wy - oy);
  if (d > 3.2) return null;

  const roll = hash2(cx, cy, 803);
  if (d <= 0.6) {
    if (roll > 0.75) return 'tower';
    if (roll > 0.5) return 'lab';
    if (roll > 0.3) return 'hub';
    return 'chest';
  }
  if (d <= 1.6) return 'plaza';
  if (d <= 2.4 && hash2(wx, wy, 804) > 0.55) return 'cobble';
  if (hash2(wx, wy, 805) > 0.7) return 'lamp';
  return 'park';
}

/* ───────── Main tile generator ───────── */

/**
 * Generate one tile id for absolute world coordinates.
 * Pure function — same (wx, wy, realm) always yields the same tile.
 */
export function generateWorldTile(wx: number, wy: number, realm: DistrictRealm = 'city_center'): string {
  const biome = sampleBiome(wx, wy, realm);
  const rDist = riverDistance(wx, wy);
  const rW = riverWidth(wx, wy);
  const rd = roadDistance(wx, wy);
  const villages = nearbyVillages(wx, wy);
  const settle = settlementInfluence(wx, wy, villages);

  // —— Coast / harbor water body (settlements stay dry) ——
  if (biome === 'coast' && settle < 0.35) {
    const harbor = DISTRICT_ORIGINS.pixel_harbor;
    const shore = fbm(wx * 0.025, wy * 0.025, 510, 3);
    const coastLine =
      harbor.y + 6 + Math.sin((wx - harbor.x) * 0.045) * 5 + shore * 8;
    // Generic moist coasts use a softer shoreline
    const genericCoast = Math.sin(wx * 0.035) * 5 + shore * 9;
    const line = Math.hypot(wx - harbor.x, wy - harbor.y) < 100 ? coastLine : genericCoast;
    if (wy > line + 2) {
      if (rd < 0.75) return 'dock';
      return hash2(wx, wy, 3) > 0.94 ? 'dock' : 'water';
    }
    if (wy > line - 1) return rd < 0.8 ? 'cobble' : 'sand';
  }

  // —— Rivers & banks (carve around village cores; bridges on roads) ——
  if (settle < 0.55) {
    if (rDist < rW * 0.5) return 'water';
    if (rDist < rW * 0.85) return 'shallow';
    if (rDist < rW * 1.25 && rd < 1.1) return 'bridge';
  } else if (rDist < rW * 0.65 && rd < 1.05) {
    return 'bridge';
  }

  // —— Roads ——
  if (rd < 0.65) {
    for (const v of villages) {
      if (Math.hypot(wx - v.x, wy - v.y) <= 1.6) return 'plaza';
    }
    return 'cobble';
  }
  if (rd < 1.25) return 'dirt';

  // Soft dirt trails in farmland / plains
  if ((biome === 'farmland' || biome === 'plains') && dirtPathDistance(wx, wy) < 0.5 && rDist > 4 && settle < 0.2) {
    return 'dirt';
  }

  // —— Villages & POIs ——
  for (const v of villages) {
    const d = Math.hypot(wx - v.x, wy - v.y);
    if (d > v.radius + 2) continue;

    if (d <= 1.4) return 'plaza';

    if (d <= v.radius) {
      // Building plots: annular belt, keep roads clear, clustered footprints
      if (rd >= 0.9 && d >= 2.2 && d <= v.radius - 0.5) {
        const lotX = Math.floor((wx - v.x + 32) / 3);
        const lotY = Math.floor((wy - v.y + 32) / 3);
        const plot = hash2(lotX, lotY, v.seed + 7);
        const ox = ((wx - v.x + 32) % 3 + 3) % 3;
        const oy = ((wy - v.y + 32) % 3 + 3) % 3;
        const onFootprint = ox <= 1 && oy <= 1 && plot > 0.4;
        if (onFootprint) {
          if (v.kind === 'arena' && d <= 4.5) return 'hub';
          if (v.kind === 'harbor' && plot > 0.68) return 'shop';
          if (v.kind === 'town' && plot > 0.88) return 'shop';
          if (v.kind === 'town' && plot > 0.94) return 'lab';
          if (plot > 0.97) return 'tower';
          return 'house';
        }
      }

      if (rd < 1.7 && hash2(wx, wy, 230) > 0.86) return 'lamp';
      if (d > v.radius - 1.2 && hash2(wx, wy, 231) > 0.9) return 'sign';
      if (hash2(wx, wy, 232) > 0.968) return 'chest';
      if (hash2(wx, wy, 233) > 0.93) return 'bush';
      return v.kind === 'arena' ? 'plaza' : 'park';
    }
  }

  // Wilderness landmarks (shrines, towers, clearings)
  if (settle < 0.1 && rDist > 4 && rd > 2) {
    const poi = wildernessPoi(wx, wy);
    if (poi) return poi;
  }

  // Roadside props just outside villages
  if (rd < 2.1 && rDist > 3) {
    if (hash2(wx, wy, 240) > 0.98) return 'lamp';
    if (hash2(wx, wy, 241) > 0.987) return 'sign';
    if (hash2(wx, wy, 242) > 0.992) return 'chest';
  }

  // —— Biome ground cover & vegetation ——
  const canopy = forestDensity(wx, wy);
  const veg = fbm(wx * 0.055, wy * 0.055, 601, 3);
  const vegDense = fbm(wx * 0.09, wy * 0.09, 602, 2);

  // Forest biome or high canopy: large contiguous woods
  const forestBoost = biome === 'forest' ? 0.18 : biome === 'hills' ? 0.08 : 0;
  const canopyEff = Math.min(1, canopy + forestBoost);
  const inForest =
    (biome === 'forest' && canopyEff > 0.28) ||
    (canopyEff > 0.48 && biome !== 'farmland' && biome !== 'coast' && biome !== 'wetland');

  if (inForest && rDist > 3.4 && rd > 1.9) {
    // Glades / meadows inside the woods
    if (canopyEff < 0.38 || (veg > 0.82 && canopyEff < 0.58)) {
      return vegDense > 0.7 ? 'bush' : 'tall_grass';
    }
    // Dense core — nearly solid canopy
    if (canopyEff > 0.62) {
      const t = hash2(wx, wy, 610);
      if (t > 0.18) return biome === 'hills' || canopyEff > 0.78 ? 'pine' : 'tree';
      if (t > 0.1) return 'bush';
      return 'tall_grass';
    }
    // Forest edge — still mostly trees so woods read as one mass
    const t = hash2(wx, wy, 611);
    if (t > 0.38) return 'tree';
    if (t > 0.22) return 'bush';
    return 'tall_grass';
  }

  if (biome === 'wetland' && rDist > 2) {
    // Pools only near true low-noise pockets — not a second ocean
    if (veg > 0.72 && vegDense > 0.55) return 'shallow';
    if (hash2(wx, wy, 620) > 0.72) return 'bush';
    return 'park';
  }

  if (biome === 'meadow') {
    if (hash2(wx, wy, 630) > 0.9) return 'bush';
    if (veg > 0.55) return 'tall_grass';
    if (vegDense > 0.75) return 'tall_grass';
    return 'park';
  }

  if (biome === 'farmland') {
    const row = Math.sin(wx * 0.85 + fbm(wx * 0.04, wy * 0.04, 640, 2) * 2.2);
    if (row > 0.32) return 'dirt';
    return hash2(wx, wy, 641) > 0.82 ? 'tall_grass' : 'grass';
  }

  if (biome === 'hills') {
    if (canopyEff > 0.5 && rd > 2) {
      return hash2(wx, wy, 650) > 0.32 ? 'pine' : 'tree';
    }
    return veg > 0.5 ? 'tall_grass' : 'grass';
  }

  // Plains default — varied grass density (sparse scrub, not random trees)
  if (veg > 0.78) return 'tall_grass';
  if (veg > 0.9 && vegDense > 0.6) return 'bush';
  if (canopy > 0.7 && rd > 2.5 && hash2(wx, wy, 662) > 0.55) return 'tree';
  if (hash2(wx, wy, 661) > 0.988) return 'lamp';
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

/**
 * Tiled Map Editor (.tmj / JSON) loader for BPV IsoEarth & top-down maps.
 * Shared contract between web (Canvas) and iOS (SpriteKit) clients.
 *
 * Expected Tiled setup:
 * - Orthogonal or isometric orientation
 * - One tile layer named "ground" (tile GIDs mapped via tileset properties `bpvId`)
 * - Optional object layer "spawns" with object type "player_spawn"
 */

export interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  orientation?: 'orthogonal' | 'isometric' | 'staggered' | 'hexagonal';
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

export interface TiledLayer {
  type: 'tilelayer' | 'objectgroup' | 'imagelayer' | 'group';
  name: string;
  data?: number[];
  width?: number;
  height?: number;
  objects?: TiledObject[];
  visible?: boolean;
}

export interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: Array<{ name: string; value: string | number | boolean }>;
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  tilecount?: number;
  tiles?: Array<{
    id: number;
    properties?: Array<{ name: string; value: string | number | boolean }>;
  }>;
}

export interface LoadedTiledGround {
  width: number;
  height: number;
  tileSize: number;
  orientation: string;
  /** BPV tile id grid [row][col] */
  tiles: string[][];
  spawn: { col: number; row: number };
  raw: TiledMapJson;
}

const DEFAULT_GID_MAP: Record<number, string> = {
  1: 'grass',
  2: 'tall_grass',
  3: 'dirt',
  4: 'cobble',
  5: 'sand',
  6: 'plaza',
  7: 'water',
  8: 'shallow',
  9: 'bridge',
  10: 'dock',
  11: 'tree',
  12: 'pine',
  13: 'bush',
  14: 'park',
  15: 'house',
  16: 'shop',
  17: 'hub',
  18: 'lab',
  19: 'tower',
  20: 'lamp',
  21: 'sign',
  22: 'chest',
  23: 'spawn'
};

export function parseTiledMap(json: TiledMapJson): LoadedTiledGround {
  const gidToBpv = buildGidMap(json.tilesets);
  const ground =
    json.layers.find(l => l.type === 'tilelayer' && l.name === 'ground') ||
    json.layers.find(l => l.type === 'tilelayer');

  if (!ground || !ground.data || !ground.width || !ground.height) {
    throw new Error('Tiled map missing tile layer data');
  }

  const tiles: string[][] = [];
  for (let r = 0; r < ground.height; r++) {
    const row: string[] = [];
    for (let c = 0; c < ground.width; c++) {
      const gid = ground.data[r * ground.width + c] & 0x1fffffff; // clear flip flags
      row.push(gidToBpv[gid] || DEFAULT_GID_MAP[gid] || 'grass');
    }
    tiles.push(row);
  }

  let spawn = {
    col: Math.floor(ground.width / 2),
    row: Math.floor(ground.height / 2)
  };

  const spawnsLayer = json.layers.find(l => l.type === 'objectgroup' && l.name === 'spawns');
  if (spawnsLayer?.objects?.length) {
    const obj =
      spawnsLayer.objects.find(o => o.type === 'player_spawn' || o.name === 'player_spawn') ||
      spawnsLayer.objects[0];
    spawn = {
      col: Math.floor(obj.x / json.tilewidth),
      row: Math.floor(obj.y / json.tileheight)
    };
  }

  // Prefer explicit spawn tile
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) {
      if (tiles[r][c] === 'spawn') spawn = { col: c, row: r };
    }
  }

  return {
    width: ground.width,
    height: ground.height,
    tileSize: json.tilewidth,
    orientation: json.orientation || 'orthogonal',
    tiles,
    spawn,
    raw: json
  };
}

function buildGidMap(tilesets: TiledTileset[]): Record<number, string> {
  const map: Record<number, string> = { ...DEFAULT_GID_MAP };
  for (const ts of tilesets || []) {
    for (const tile of ts.tiles || []) {
      const prop = tile.properties?.find(p => p.name === 'bpvId');
      if (prop && typeof prop.value === 'string') {
        map[ts.firstgid + tile.id] = prop.value;
      }
    }
  }
  return map;
}

/** Export a simple Tiled-compatible JSON from a string[][] BPV grid. */
export function exportTiledFromGrid(
  tiles: string[][],
  opts: { name: string; tilewidth?: number; tileheight?: number; isometric?: boolean } = {
    name: 'bpv-earth'
  }
): TiledMapJson {
  const height = tiles.length;
  const width = tiles[0]?.length || 0;
  const reverse: Record<string, number> = {};
  Object.entries(DEFAULT_GID_MAP).forEach(([gid, id]) => {
    reverse[id] = Number(gid);
  });

  const data: number[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      data.push(reverse[tiles[r][c]] || 1);
    }
  }

  return {
    width,
    height,
    tilewidth: opts.tilewidth ?? 64,
    tileheight: opts.tileheight ?? (opts.isometric ? 32 : 32),
    orientation: opts.isometric ? 'isometric' : 'orthogonal',
    tilesets: [
      {
        firstgid: 1,
        name: 'bpv-iso-tiles',
        tilecount: 23,
        tiles: Object.entries(DEFAULT_GID_MAP).map(([gid, bpvId]) => ({
          id: Number(gid) - 1,
          properties: [{ name: 'bpvId', value: bpvId }]
        }))
      }
    ],
    layers: [
      {
        type: 'tilelayer',
        name: 'ground',
        width,
        height,
        data,
        visible: true
      },
      {
        type: 'objectgroup',
        name: 'spawns',
        objects: [
          {
            id: 1,
            name: 'player_spawn',
            type: 'player_spawn',
            x: Math.floor(width / 2) * (opts.tilewidth ?? 64),
            y: Math.floor(height / 2) * (opts.tileheight ?? 32)
          }
        ]
      }
    ]
  };
}

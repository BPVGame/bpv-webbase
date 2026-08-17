/**
 * Chunk streamer for the infinite IsoEarth.
 * Loads / unloads CHUNK_SIZE×CHUNK_SIZE tiles around the player.
 */

import {
  CHUNK_SIZE,
  chunkKey,
  generateWorldTile,
  isTileWalkable,
  worldToChunk
} from './WorldGen';
import { DistrictRealm } from './IsoTiles';

export interface WorldChunk {
  cx: number;
  cy: number;
  /** tiles[ly][lx] */
  tiles: string[][];
}

export class ChunkWorld {
  public readonly chunks = new Map<string, WorldChunk>();
  public realm: DistrictRealm = 'city_center';
  /** Chunks kept loaded around the player. */
  public loadRadius = 2;
  /** Unload when farther than this (chunks). */
  public unloadRadius = 3;
  /** Civic / sandbox tiles sit on top of procedural WorldGen without mutating it. */
  private overlays = new Map<string, string>();

  constructor(realm: DistrictRealm = 'city_center') {
    this.realm = realm;
  }

  public clear() {
    this.chunks.clear();
  }

  public setOverlay(wx: number, wy: number, tileId: string | null) {
    const key = `${wx | 0},${wy | 0}`;
    if (!tileId) this.overlays.delete(key);
    else this.overlays.set(key, tileId);
  }

  public clearOverlays() {
    this.overlays.clear();
  }

  public setRealm(realm: DistrictRealm) {
    this.realm = realm;
    this.clear();
  }

  public getOrCreateChunk(cx: number, cy: number): WorldChunk {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (chunk) return chunk;

    const tiles: string[][] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      const row: string[] = [];
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        row.push(generateWorldTile(wx, wy, this.realm));
      }
      tiles.push(row);
    }
    chunk = { cx, cy, tiles };
    this.chunks.set(key, chunk);
    return chunk;
  }

  public getTile(wx: number, wy: number): string {
    const overlay = this.overlays.get(`${wx | 0},${wy | 0}`);
    if (overlay) return overlay;
    const { cx, cy, lx, ly } = worldToChunk(wx, wy);
    const chunk = this.getOrCreateChunk(cx, cy);
    return chunk.tiles[ly][lx];
  }

  public isWalkable(wx: number, wy: number): boolean {
    return isTileWalkable(this.getTile(wx, wy));
  }

  /** Ensure chunks around world position are resident; drop far chunks. */
  public syncAround(wx: number, wy: number) {
    const { cx, cy } = worldToChunk(wx, wy);
    for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        this.getOrCreateChunk(cx + dx, cy + dy);
      }
    }

    for (const [key, chunk] of this.chunks) {
      const dist = Math.max(Math.abs(chunk.cx - cx), Math.abs(chunk.cy - cy));
      if (dist > this.unloadRadius) this.chunks.delete(key);
    }
  }

  /** Iterate every loaded tile (world coords). */
  public forEachTile(cb: (wx: number, wy: number, tileId: string) => void) {
    for (const chunk of this.chunks.values()) {
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const wx = chunk.cx * CHUNK_SIZE + lx;
          const wy = chunk.cy * CHUNK_SIZE + ly;
          cb(wx, wy, this.overlays.get(`${wx},${wy}`) ?? chunk.tiles[ly][lx]);
        }
      }
    }
  }
}

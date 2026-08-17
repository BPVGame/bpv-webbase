/**
 * IsoEarth — full-screen cozy 16-bit isometric RPG on an infinite chunk world.
 * Visual style unchanged; map is seamless WorldX/Y → Chunk → Tile streaming.
 */

import { ISO_PALETTE, ISO_TILE_BY_ID, DistrictRealm } from './IsoTiles';
import { ChunkWorld } from './ChunkWorld';
import { DISTRICT_ORIGINS } from './WorldGen';
import { npcDirector, NpcVisual } from '../npc/NpcDirector';

export interface IsoPlayerAvatar {
  username: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export interface RemotePlayer {
  id: string;
  username: string;
  col: number;
  row: number;
  skin: string;
  hair?: string;
  shirt: string;
}

export type InteractPrompt = { npcId: string; name: string } | null;

export class IsoEarth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public world: ChunkWorld;

  /** Classic 2:1 isometric diamond. */
  public tileW = 72;
  public tileH = 36;

  /** Absolute world tile coordinates (infinite). */
  public playerCol = 0;
  public playerRow = 0;
  public playerFacing: 'ne' | 'nw' | 'se' | 'sw' = 'se';
  public isMoving = false;
  public walkFrame = 0;

  public avatar: IsoPlayerAvatar = {
    username: 'Trainer',
    skin: '#f3d5b5',
    hair: '#3d2914',
    shirt: '#3a5a8c',
    pants: '#2c3e50'
  };

  public remotePlayers: RemotePlayer[] = [];
  public livingNpcs: NpcVisual[] = [];
  public interactPrompt: InteractPrompt = null;
  public onInteractNpc: ((npcId: string) => void) | null = null;
  public onNpcPromptChange: ((prompt: InteractPrompt) => void) | null = null;
  public keys: Record<string, boolean> = {};
  public joystickDir: { x: number; y: number } = { x: 0, y: 0 };
  public camX = 0;
  public camY = 0;
  public realm: DistrictRealm = 'city_center';

  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTime = 0;
  private moveCooldown = 0;
  private waterPhase = 0;
  private smokePhase = 0;
  private interactLatch = false;
  private npcBooted = false;

  constructor(canvas: HTMLCanvasElement, realm: DistrictRealm = 'city_center') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.world = new ChunkWorld(realm);
    this.realm = realm;
    this.warpToDistrict(realm, true);
    this.setupInputs();
    npcDirector.setWalkableChecker((x, y) => this.world.isWalkable(x, y));
  }

  /** Travel to a district region of the infinite plane (keeps seamless world). */
  public warpToDistrict(realm: DistrictRealm, snapCamera = true) {
    this.realm = realm;
    this.world.setRealm(realm);
    const origin = DISTRICT_ORIGINS[realm] || DISTRICT_ORIGINS.city_center;
    this.playerCol = origin.x;
    this.playerRow = origin.y;
    this.findNearestWalkable();
    this.world.syncAround(this.playerCol, this.playerRow);
    this.syncCamera(snapCamera);
  }

  /** @deprecated finite maps removed — use warpToDistrict */
  public loadMap(_map?: unknown) {
    this.warpToDistrict(this.realm);
  }

  public loadMapJson(_json?: unknown) {
    this.warpToDistrict(this.realm);
  }

  public setAvatar(avatar: IsoPlayerAvatar) {
    this.avatar = avatar;
  }

  public setRemotePlayers(players: RemotePlayer[]) {
    this.remotePlayers = players;
  }

  public setLivingNpcs(npcs: NpcVisual[]) {
    this.livingNpcs = npcs;
  }

  public recenterOrigin() {
    this.syncCamera(true);
  }

  private findNearestWalkable() {
    if (this.world.isWalkable(this.playerCol, this.playerRow)) return;
    for (let r = 1; r < 24; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = this.playerCol + dx;
          const y = this.playerRow + dy;
          if (this.world.isWalkable(x, y)) {
            this.playerCol = x;
            this.playerRow = y;
            return;
          }
        }
      }
    }
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.npcBooted) npcDirector.persist();
  }

  private loop = (ts: number) => {
    if (!this.isRunning) return;
    const delta = Math.min((ts - this.lastTime) / 1000, 0.1);
    this.lastTime = ts;
    this.update(delta);
    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.waterPhase += delta;
    this.smokePhase += delta;
    this.moveCooldown = Math.max(0, this.moveCooldown - delta);

    if (!this.npcBooted) {
      npcDirector.boot(this.avatar.username);
      this.npcBooted = true;
    }

    npcDirector.updatePlayer(this.playerCol, this.playerRow);
    npcDirector.tick(delta);
    this.livingNpcs = npcDirector.getVisuals();

    const near = npcDirector.nearbyInteractable(2.2);
    const prompt: InteractPrompt = near ? { npcId: near.id, name: near.name } : null;
    const prev = this.interactPrompt?.npcId ?? null;
    this.interactPrompt = prompt;
    if ((prompt?.npcId ?? null) !== prev) this.onNpcPromptChange?.(prompt);

    const wantInteract = !!(this.keys['KeyE'] || this.keys['Space']);
    if (wantInteract && !this.interactLatch && near) {
      this.interactLatch = true;
      this.onInteractNpc?.(near.id);
    }
    if (!wantInteract) this.interactLatch = false;

    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.joystickDir.x !== 0 || this.joystickDir.y !== 0) {
      dx = this.joystickDir.x;
      dy = this.joystickDir.y;
    }

    if ((dx !== 0 || dy !== 0) && this.moveCooldown <= 0) {
      let ncol = this.playerCol;
      let nrow = this.playerRow;
      if (dx > 0 && dy === 0) {
        ncol += 1;
        this.playerFacing = 'se';
      } else if (dx < 0 && dy === 0) {
        ncol -= 1;
        this.playerFacing = 'nw';
      } else if (dy > 0 && dx === 0) {
        nrow += 1;
        this.playerFacing = 'sw';
      } else if (dy < 0 && dx === 0) {
        nrow -= 1;
        this.playerFacing = 'ne';
      } else if (dx > 0 && dy > 0) {
        ncol += 1;
        nrow += 1;
        this.playerFacing = 'se';
      } else if (dx < 0 && dy < 0) {
        ncol -= 1;
        nrow -= 1;
        this.playerFacing = 'nw';
      } else if (dx > 0 && dy < 0) {
        ncol += 1;
        nrow -= 1;
        this.playerFacing = 'ne';
      } else if (dx < 0 && dy > 0) {
        ncol -= 1;
        nrow += 1;
        this.playerFacing = 'sw';
      }

      if (this.world.isWalkable(ncol, nrow)) {
        this.playerCol = ncol;
        this.playerRow = nrow;
        this.isMoving = true;
        this.walkFrame += 1;
        this.moveCooldown = 0.12;
        this.world.syncAround(this.playerCol, this.playerRow);
      }
    } else if (dx === 0 && dy === 0) {
      this.isMoving = false;
    }

    this.syncCamera(false);
  }

  private tileWorld(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (this.tileW / 2),
      y: (col + row) * (this.tileH / 2)
    };
  }

  public gridToScreen(col: number, row: number): { x: number; y: number } {
    const w = this.tileWorld(col, row);
    return {
      x: w.x - this.camX + this.canvas.width / 2,
      y: w.y - this.camY + this.canvas.height * 0.42
    };
  }

  private syncCamera(snap: boolean) {
    const target = this.tileWorld(this.playerCol, this.playerRow);
    if (snap) {
      this.camX = target.x;
      this.camY = target.y;
    } else {
      this.camX += (target.x - this.camX) * 0.18;
      this.camY += (target.y - this.camY) * 0.18;
    }
  }

  private render() {
    const { width, height } = this.canvas;

    // Soft daytime sky
    const sky = this.ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#9ec8e0');
    sky.addColorStop(0.28, '#c5e0b8');
    sky.addColorStop(0.55, '#9ec878');
    sky.addColorStop(1, '#7aaa58');
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, width, height);

    const sun = this.ctx.createRadialGradient(width * 0.78, height * 0.12, 10, width * 0.78, height * 0.12, 160);
    sun.addColorStop(0, 'rgba(255, 236, 170, 0.55)');
    sun.addColorStop(1, 'rgba(255, 236, 170, 0)');
    this.ctx.fillStyle = sun;
    this.ctx.fillRect(0, 0, width, height);

    // Stream chunks sized to the viewport so no map edge appears on screen
    const viewCols = Math.ceil(width / (this.tileW / 2)) + 14;
    const viewRows = Math.ceil(height / (this.tileH / 2)) + 16;
    const chunkNeed = Math.ceil(Math.max(viewCols, viewRows) / 16) + 1;
    this.world.loadRadius = chunkNeed;
    this.world.unloadRadius = chunkNeed + 1;
    this.world.syncAround(this.playerCol, this.playerRow);

    const drawOrder: Array<{ col: number; row: number; tileId: string }> = [];

    for (let row = this.playerRow - viewRows; row <= this.playerRow + viewRows; row++) {
      for (let col = this.playerCol - viewCols; col <= this.playerCol + viewCols; col++) {
        const tileId = this.world.getTile(col, row);
        const { x, y } = this.gridToScreen(col, row);
        if (x < -120 || x > width + 120 || y < -140 || y > height + 120) continue;
        drawOrder.push({ col, row, tileId });
      }
    }
    drawOrder.sort((a, b) => a.col + a.row - (b.col + b.row));

    for (const { col, row, tileId } of drawOrder) {
      const { x, y } = this.gridToScreen(col, row);
      this.drawIsoTile(tileId, x, y, col, row);

      if (['tree', 'pine', 'house', 'shop', 'hub', 'lab', 'tower', 'bush', 'lamp', 'sign', 'chest'].includes(tileId)) {
        this.drawProp(tileId, x, y);
      }

      if ((tileId === 'grass' || tileId === 'park' || tileId === 'tall_grass') && ((col * 7 + row * 13) % 11 + 11) % 11 === 0) {
        this.ctx.fillStyle = (col + row) % 2 === 0 ? '#f8f0f4' : '#f0a8c0';
        this.ctx.fillRect(x - 2, y - 4, 3, 3);
        this.ctx.fillRect(x + 6, y + 2, 2, 2);
      }
    }

    for (const rp of this.remotePlayers) {
      const { x, y } = this.gridToScreen(rp.col, rp.row);
      this.drawIsoAvatar(x, y, rp.skin, rp.hair || '#3d2914', rp.shirt, '#2c3e50', rp.username, false);
    }

    // Living NPCs (chunk-aware LOD visuals from NpcDirector)
    const actors = [...this.livingNpcs].sort((a, b) => a.col + a.row - (b.col + b.row));
    for (const npc of actors) {
      const { x, y } = this.gridToScreen(npc.col, npc.row);
      if (x < -80 || x > width + 80 || y < -100 || y > height + 100) continue;
      this.drawIsoAvatar(x, y, npc.skin, npc.hair, npc.shirt, npc.pants, npc.name, npc.activity.includes('travel') || npc.activity === 'flee');
    }

    const p = this.gridToScreen(this.playerCol, this.playerRow);
    this.drawIsoAvatar(
      p.x,
      p.y,
      this.avatar.skin,
      this.avatar.hair,
      this.avatar.shirt,
      this.avatar.pants,
      this.avatar.username,
      this.isMoving
    );
  }

  private drawIsoTile(tileId: string, cx: number, cy: number, col: number, row: number) {
    const def = ISO_TILE_BY_ID[tileId] ?? ISO_TILE_BY_ID.grass;
    let palette = ISO_PALETTE[def.palette] ?? ISO_PALETTE.grass;

    if (tileId === 'water' || tileId === 'shallow') {
      const pulse = 0.5 + Math.sin(this.waterPhase * 2.5 + col * 0.6 + row * 0.4) * 0.5;
      palette = { ...palette, top: this.mixHex(palette.top, '#ffffff', pulse * 0.12) };
    }

    const hw = this.tileW / 2;
    const hh = this.tileH / 2;
    const depth = 12;

    this.ctx.fillStyle = palette.right;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx + hw, cy + depth);
    this.ctx.lineTo(cx, cy + hh + depth);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = palette.left;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.lineTo(cx - hw, cy + depth);
    this.ctx.lineTo(cx, cy + hh + depth);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = palette.top;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(60, 80, 40, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.closePath();
    this.ctx.stroke();

    if (palette.accent && (tileId === 'grass' || tileId === 'park' || tileId === 'tall_grass')) {
      this.ctx.fillStyle = palette.accent;
      this.ctx.fillRect(cx - 8, cy - 2, 2, 2);
      this.ctx.fillRect(cx + 4, cy + 4, 2, 2);
      this.ctx.fillRect(cx - 2, cy + 8, 2, 2);
    }

    if (tileId === 'cobble' || tileId === 'plaza') {
      this.ctx.fillStyle = 'rgba(120, 100, 70, 0.2)';
      this.ctx.fillRect(cx - 10, cy - 2, 6, 3);
      this.ctx.fillRect(cx + 2, cy + 4, 7, 3);
      this.ctx.fillRect(cx - 4, cy + 10, 5, 2);
    }
  }

  private drawProp(tileId: string, cx: number, cy: number) {
    if (tileId === 'tree' || tileId === 'pine') {
      this.ctx.fillStyle = '#6b4423';
      this.ctx.fillRect(cx - 4, cy - 18, 8, 22);
      this.ctx.fillStyle = '#8b5a2b';
      this.ctx.fillRect(cx - 3, cy - 16, 3, 18);
      const canopy = tileId === 'pine' ? '#5a9a68' : '#6aaa58';
      const canopyDark = tileId === 'pine' ? '#447850' : '#4e8a3e';
      this.ctx.fillStyle = canopyDark;
      this.ellipse(cx + 2, cy - 28, 22, 16);
      this.ctx.fillStyle = canopy;
      this.ellipse(cx - 2, cy - 34, 20, 15);
      this.ctx.fillStyle = '#98c878';
      this.ellipse(cx - 6, cy - 38, 10, 8);
    } else if (tileId === 'bush') {
      this.ctx.fillStyle = '#c87898';
      this.ellipse(cx, cy - 8, 14, 10);
      this.ctx.fillStyle = '#f8d0e0';
      this.ctx.fillRect(cx - 4, cy - 12, 3, 3);
      this.ctx.fillRect(cx + 4, cy - 6, 3, 3);
    } else if (tileId === 'lamp') {
      this.ctx.fillStyle = '#5a4838';
      this.ctx.fillRect(cx - 2, cy - 28, 4, 30);
      this.ctx.fillStyle = '#f0d878';
      this.ellipse(cx, cy - 32, 8, 7);
      this.ctx.fillStyle = 'rgba(255, 220, 120, 0.25)';
      this.ellipse(cx, cy - 32, 18, 14);
    } else if (tileId === 'sign') {
      this.ctx.fillStyle = '#6b4423';
      this.ctx.fillRect(cx - 2, cy - 20, 4, 22);
      this.ctx.fillStyle = '#c4a070';
      this.ctx.fillRect(cx - 14, cy - 34, 28, 14);
      this.ctx.fillStyle = '#5a4838';
      this.ctx.fillRect(cx - 10, cy - 30, 8, 2);
      this.ctx.fillRect(cx + 2, cy - 26, 8, 2);
    } else if (tileId === 'chest') {
      this.ctx.fillStyle = '#b08830';
      this.ctx.fillRect(cx - 12, cy - 10, 24, 14);
      this.ctx.fillStyle = '#e0b050';
      this.ctx.fillRect(cx - 12, cy - 16, 24, 8);
      this.ctx.fillStyle = '#f8e090';
      this.ctx.fillRect(cx - 2, cy - 12, 4, 4);
    } else {
      const h = tileId === 'tower' ? 52 : tileId === 'hub' ? 40 : 32;
      const wallL = '#c9a882';
      const wallR = '#a88860';
      const roof = tileId === 'lab' ? '#70a898' : tileId === 'tower' ? '#9880a0' : '#c45a48';
      const roofDark = tileId === 'lab' ? '#508878' : tileId === 'tower' ? '#706080' : '#8a4038';

      this.ctx.fillStyle = wallL;
      this.ctx.fillRect(cx - 18, cy - h, 18, h);
      this.ctx.fillStyle = wallR;
      this.ctx.fillRect(cx, cy - h, 18, h);

      this.ctx.fillStyle = roof;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - h - 16);
      this.ctx.lineTo(cx + 20, cy - h);
      this.ctx.lineTo(cx, cy - h + 12);
      this.ctx.lineTo(cx - 20, cy - h);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = roofDark;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - h - 16);
      this.ctx.lineTo(cx + 20, cy - h);
      this.ctx.lineTo(cx + 14, cy - h + 2);
      this.ctx.lineTo(cx, cy - h - 10);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#7ec8d8';
      this.ctx.fillRect(cx - 12, cy - h + 10, 6, 6);
      this.ctx.fillRect(cx + 6, cy - h + 10, 6, 6);
      this.ctx.fillStyle = '#5a4838';
      this.ctx.fillRect(cx - 4, cy - 14, 8, 14);

      if (tileId === 'house' || tileId === 'shop') {
        this.ctx.fillStyle = '#8a5040';
        this.ctx.fillRect(cx + 10, cy - h - 22, 6, 14);
        const sy = cy - h - 28 - Math.sin(this.smokePhase * 2) * 3;
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.45)';
        this.ellipse(cx + 13, sy, 5 + Math.sin(this.smokePhase) * 2, 4);
      }
    }
  }

  private ellipse(cx: number, cy: number, rx: number, ry: number) {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawIsoAvatar(
    cx: number,
    cy: number,
    skin: string,
    hair: string,
    shirt: string,
    pants: string,
    name: string,
    moving: boolean
  ) {
    const bob = moving ? Math.sin(this.walkFrame * 1.2) * 2 : 0;
    const y = cy - 10 + bob;

    this.ctx.fillStyle = 'rgba(40, 50, 30, 0.28)';
    this.ellipse(cx, cy + 8, 14, 6);

    this.ctx.fillStyle = pants;
    this.ctx.fillRect(cx - 7, y + 14, 5, 9);
    this.ctx.fillRect(cx + 2, y + 14, 5, 9);

    this.ctx.fillStyle = shirt;
    this.ctx.fillRect(cx - 9, y + 2, 18, 14);
    this.ctx.fillStyle = this.mixHex(shirt, '#000000', 0.15);
    this.ctx.fillRect(cx - 10, y + 4, 4, 12);
    this.ctx.fillRect(cx + 6, y + 4, 4, 12);

    this.ctx.fillStyle = skin;
    this.ctx.fillRect(cx - 7, y - 10, 14, 13);

    this.ctx.fillStyle = hair;
    this.ctx.fillRect(cx - 11, y - 12, 22, 5);
    this.ctx.fillRect(cx - 6, y - 20, 12, 10);
    this.ctx.fillStyle = '#4a90c8';
    this.ctx.fillRect(cx - 6, y - 12, 12, 2);

    this.ctx.fillStyle = '#2c1810';
    this.ctx.fillRect(cx - 4, y - 5, 2, 2);
    this.ctx.fillRect(cx + 2, y - 5, 2, 2);

    this.ctx.fillStyle = 'rgba(60, 44, 28, 0.72)';
    this.roundRect(cx - 30, y - 34, 60, 12, 4);
    this.ctx.fillStyle = '#f5efe4';
    this.ctx.font = 'bold 9px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name.slice(0, 12), cx, y - 25);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private mixHex(a: string, b: string, t: number): string {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ar = (pa >> 16) & 255,
      ag = (pa >> 8) & 255,
      ab = pa & 255;
    const br = (pb >> 16) & 255,
      bg = (pb >> 8) & 255,
      bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
  }
}

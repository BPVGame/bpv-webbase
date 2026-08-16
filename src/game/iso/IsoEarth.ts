/**
 * IsoEarth — isometric 16-bit world engine for BPV Game.
 * Projection & map JSON shape inspired by isometric builders (isomiddleearth),
 * adapted for real-world district exploration + multiplayer RPG loops.
 */

import { ISO_PALETTE, ISO_TILE_BY_ID, DistrictRealm } from './IsoTiles';
import { BpvIsoMap, loadIsoMapFromJson, generateStarterEarth } from './IsoMapData';

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
  shirt: string;
}

export class IsoEarth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public map: BpvIsoMap;

  /** Isometric diamond half-width / half-height (classic 2:1 iso). */
  public tileW = 64;
  public tileH = 32;

  public playerCol = 6;
  public playerRow = 6;
  public playerFacing: 'ne' | 'nw' | 'se' | 'sw' = 'se';
  public isMoving = false;
  public walkFrame = 0;

  public avatar: IsoPlayerAvatar = {
    username: 'Trainer',
    skin: '#fbcfe8',
    hair: '#1e293b',
    shirt: '#2563eb',
    pants: '#1e293b'
  };

  public remotePlayers: RemotePlayer[] = [];
  public keys: Record<string, boolean> = {};
  public joystickDir: { x: number; y: number } = { x: 0, y: 0 };
  public originX = 0;
  public originY = 0;
  public realm: DistrictRealm = 'city_center';

  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTime = 0;
  private moveCooldown = 0;
  private waterPhase = 0;

  constructor(canvas: HTMLCanvasElement, map?: BpvIsoMap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.map = map ?? generateStarterEarth('city_center');
    this.realm = this.map.location;
    this.playerCol = this.map.spawn.col;
    this.playerRow = this.map.spawn.row;
    this.setupInputs();
    this.recenterOrigin();
  }

  public loadMap(map: BpvIsoMap) {
    this.map = map;
    this.realm = map.location;
    this.playerCol = map.spawn.col;
    this.playerRow = map.spawn.row;
    this.recenterOrigin();
  }

  public loadMapJson(json: unknown) {
    this.loadMap(loadIsoMapFromJson(json));
  }

  public setAvatar(avatar: IsoPlayerAvatar) {
    this.avatar = avatar;
  }

  public setRemotePlayers(players: RemotePlayer[]) {
    this.remotePlayers = players;
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
  }

  public recenterOrigin() {
    this.originX = this.canvas.width / 2;
    this.originY = this.canvas.height * 0.28;
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
    this.moveCooldown = Math.max(0, this.moveCooldown - delta);

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
      // Screen-space WASD → isometric grid step
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

      if (this.canWalk(ncol, nrow)) {
        this.playerCol = ncol;
        this.playerRow = nrow;
        this.isMoving = true;
        this.walkFrame += 1;
        this.moveCooldown = 0.14;
      }
    } else if (dx === 0 && dy === 0) {
      this.isMoving = false;
    }
  }

  private canWalk(col: number, row: number): boolean {
    if (row < 0 || col < 0 || row >= this.map.gridSize || col >= this.map.gridSize) return false;
    const cell = this.map.tiles[row][col];
    const def = ISO_TILE_BY_ID[cell];
    return def ? def.walkable : false;
  }

  /** Convert grid → screen (classic isometric). */
  public gridToScreen(col: number, row: number): { x: number; y: number } {
    const x = this.originX + (col - row) * (this.tileW / 2);
    const y = this.originY + (col + row) * (this.tileH / 2);
    return { x, y };
  }

  private render() {
    const { width, height } = this.canvas;
    this.recenterOrigin();

    // Atmospheric gradient sky → ground (not flat)
    const grad = this.ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0c1222');
    grad.addColorStop(0.35, '#132038');
    grad.addColorStop(1, '#0a1628');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);

    // Soft vignette haze
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
    this.ctx.beginPath();
    this.ctx.ellipse(width / 2, height * 0.55, width * 0.55, height * 0.35, 0, 0, Math.PI * 2);
    this.ctx.fill();

    const size = this.map.gridSize;

    // Painter's algorithm: back → front (row+col ascending)
    const drawOrder: Array<{ col: number; row: number }> = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        drawOrder.push({ col, row });
      }
    }
    drawOrder.sort((a, b) => a.col + a.row - (b.col + b.row));

    for (const { col, row } of drawOrder) {
      const tileId = this.map.tiles[row][col];
      const { x, y } = this.gridToScreen(col, row);
      this.drawIsoTile(tileId, x, y);

      // Decor height (trees / buildings)
      if (['tree', 'pine', 'house', 'shop', 'hub', 'lab', 'tower', 'bush'].includes(tileId)) {
        this.drawProp(tileId, x, y);
      }
    }

    // Remote multiplayer avatars
    for (const rp of this.remotePlayers) {
      const { x, y } = this.gridToScreen(rp.col, rp.row);
      this.drawIsoAvatar(x, y, rp.skin, '#1e293b', rp.shirt, '#1e293b', rp.username, false);
    }

    // Local player
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

    // HUD strip
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    this.ctx.fillRect(12, height - 36, 280, 24);
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.font = 'bold 11px Orbitron, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `EARTH · ${this.map.name} · (${this.playerCol},${this.playerRow})`,
      20,
      height - 20
    );
  }

  private drawIsoTile(tileId: string, cx: number, cy: number) {
    const def = ISO_TILE_BY_ID[tileId] ?? ISO_TILE_BY_ID.grass;
    let palette = ISO_PALETTE[def.palette] ?? ISO_PALETTE.grass;

    // Animated water shimmer
    if (tileId === 'water' || tileId === 'shallow') {
      const pulse = 0.5 + Math.sin(this.waterPhase * 3 + cx * 0.02 + cy * 0.02) * 0.5;
      palette = {
        ...palette,
        top: this.mixHex(palette.top, '#ffffff', pulse * 0.15)
      };
    }

    const hw = this.tileW / 2;
    const hh = this.tileH / 2;
    const depth = 10;

    // Right face
    this.ctx.fillStyle = palette.right;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx + hw, cy + depth);
    this.ctx.lineTo(cx, cy + hh + depth);
    this.ctx.closePath();
    this.ctx.fill();

    // Left face
    this.ctx.fillStyle = palette.left;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.lineTo(cx - hw, cy + depth);
    this.ctx.lineTo(cx, cy + hh + depth);
    this.ctx.closePath();
    this.ctx.fill();

    // Top diamond
    this.ctx.fillStyle = palette.top;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.closePath();
    this.ctx.fill();

    // Accent pixel speckles (16-bit texture)
    if (palette.accent) {
      this.ctx.fillStyle = palette.accent;
      this.ctx.fillRect(cx - 4, cy - 2, 3, 3);
      this.ctx.fillRect(cx + 6, cy + 2, 2, 2);
    }

    // Grid edge
    this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  private drawProp(tileId: string, cx: number, cy: number) {
    const palette = ISO_PALETTE[ISO_TILE_BY_ID[tileId]?.palette ?? 'tree'];
    if (tileId === 'tree' || tileId === 'pine' || tileId === 'bush') {
      this.ctx.fillStyle = '#78350f';
      this.ctx.fillRect(cx - 3, cy - 28, 6, 22);
      this.ctx.fillStyle = palette.top;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - 52);
      this.ctx.lineTo(cx + 16, cy - 22);
      this.ctx.lineTo(cx - 16, cy - 22);
      this.ctx.closePath();
      this.ctx.fill();
      if (tileId === 'bush') {
        this.ctx.fillStyle = palette.accent ?? '#f9a8d4';
        this.ctx.fillRect(cx - 2, cy - 36, 4, 4);
      }
    } else {
      // Building block
      const h = tileId === 'tower' ? 48 : tileId === 'hub' ? 36 : 28;
      this.ctx.fillStyle = palette.left;
      this.ctx.fillRect(cx - 14, cy - h, 14, h);
      this.ctx.fillStyle = palette.right;
      this.ctx.fillRect(cx, cy - h, 14, h);
      this.ctx.fillStyle = palette.top;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - h - 10);
      this.ctx.lineTo(cx + 14, cy - h);
      this.ctx.lineTo(cx, cy - h + 10);
      this.ctx.lineTo(cx - 14, cy - h);
      this.ctx.closePath();
      this.ctx.fill();
      // Window pixels
      this.ctx.fillStyle = '#fef08a';
      this.ctx.fillRect(cx - 10, cy - h + 8, 4, 4);
      this.ctx.fillRect(cx + 4, cy - h + 8, 4, 4);
    }
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
    const bob = moving ? Math.sin(this.walkFrame) * 2 : 0;
    const y = cy - 8 + bob;

    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy + 6, 12, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Legs
    this.ctx.fillStyle = pants;
    this.ctx.fillRect(cx - 7, y + 10, 5, 8);
    this.ctx.fillRect(cx + 2, y + 10, 5, 8);

    // Body
    this.ctx.fillStyle = shirt;
    this.ctx.fillRect(cx - 8, y - 2, 16, 14);

    // Head
    this.ctx.fillStyle = skin;
    this.ctx.fillRect(cx - 7, y - 14, 14, 12);

    // Hair
    this.ctx.fillStyle = hair;
    this.ctx.fillRect(cx - 8, y - 16, 16, 5);

    // Eyes
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(cx - 4, y - 10, 2, 2);
    this.ctx.fillRect(cx + 2, y - 10, 2, 2);

    // Nameplate
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.fillRect(cx - 28, y - 30, 56, 12);
    this.ctx.fillStyle = '#facc15';
    this.ctx.font = 'bold 8px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name.slice(0, 12), cx, y - 21);
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

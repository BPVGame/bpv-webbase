/**
 * IsoEarth — full-screen cozy 16-bit isometric RPG world.
 * Soft sage/cream palette, camera-follow, detailed props (houses, trees, lamps).
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

  /** Classic 2:1 isometric diamond — slightly larger for full-screen cozy feel. */
  public tileW = 72;
  public tileH = 36;

  public playerCol = 6;
  public playerRow = 6;
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

  constructor(canvas: HTMLCanvasElement, map?: BpvIsoMap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.map = map ?? generateStarterEarth('city_center', 18);
    this.realm = this.map.location;
    this.playerCol = this.map.spawn.col;
    this.playerRow = this.map.spawn.row;
    this.setupInputs();
    this.syncCamera(true);
  }

  public loadMap(map: BpvIsoMap) {
    this.map = map;
    this.realm = map.location;
    this.playerCol = map.spawn.col;
    this.playerRow = map.spawn.row;
    this.syncCamera(true);
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

  public recenterOrigin() {
    this.syncCamera(true);
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

      if (this.canWalk(ncol, nrow)) {
        this.playerCol = ncol;
        this.playerRow = nrow;
        this.isMoving = true;
        this.walkFrame += 1;
        this.moveCooldown = 0.12;
      }
    } else if (dx === 0 && dy === 0) {
      this.isMoving = false;
    }

    this.syncCamera(false);
  }

  private canWalk(col: number, row: number): boolean {
    if (row < 0 || col < 0 || row >= this.map.gridSize || col >= this.map.gridSize) return false;
    const def = ISO_TILE_BY_ID[this.map.tiles[row][col]];
    return def ? def.walkable : false;
  }

  /** World-space tile center → screen before camera. */
  private tileWorld(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (this.tileW / 2),
      y: (col + row) * (this.tileH / 2)
    };
  }

  public gridToScreen(col: number, row: number): { x: number; y: number } {
    const w = this.tileWorld(col, row);
    return { x: w.x - this.camX + this.canvas.width / 2, y: w.y - this.camY + this.canvas.height * 0.42 };
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

    // Soft daytime sky — cozy meadow atmosphere
    const sky = this.ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#9ec8e0');
    sky.addColorStop(0.28, '#c5e0b8');
    sky.addColorStop(0.55, '#9ec878');
    sky.addColorStop(1, '#7aaa58');
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, width, height);

    // Soft sun glow
    const sun = this.ctx.createRadialGradient(width * 0.78, height * 0.12, 10, width * 0.78, height * 0.12, 160);
    sun.addColorStop(0, 'rgba(255, 236, 170, 0.55)');
    sun.addColorStop(1, 'rgba(255, 236, 170, 0)');
    this.ctx.fillStyle = sun;
    this.ctx.fillRect(0, 0, width, height);

    // Infinite meadow underlay so the map never reads as a floating island
    this.drawMeadowUnderlay(width, height);

    const size = this.map.gridSize;
    const drawOrder: Array<{ col: number; row: number }> = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) drawOrder.push({ col, row });
    }
    drawOrder.sort((a, b) => a.col + a.row - (b.col + b.row));

    for (const { col, row } of drawOrder) {
      const tileId = this.map.tiles[row][col];
      const { x, y } = this.gridToScreen(col, row);
      if (x < -100 || x > width + 100 || y < -120 || y > height + 100) continue;

      this.drawIsoTile(tileId, x, y, col, row);

      if (['tree', 'pine', 'house', 'shop', 'hub', 'lab', 'tower', 'bush', 'lamp', 'sign', 'chest'].includes(tileId)) {
        this.drawProp(tileId, x, y);
      }

      // Flower speckles on grass
      if ((tileId === 'grass' || tileId === 'park' || tileId === 'tall_grass') && (col * 7 + row * 13) % 11 === 0) {
        this.ctx.fillStyle = (col + row) % 2 === 0 ? '#f8f0f4' : '#f0a8c0';
        this.ctx.fillRect(x - 2, y - 4, 3, 3);
        this.ctx.fillRect(x + 6, y + 2, 2, 2);
      }
    }

    for (const rp of this.remotePlayers) {
      const { x, y } = this.gridToScreen(rp.col, rp.row);
      this.drawIsoAvatar(x, y, rp.skin, '#3d2914', rp.shirt, '#2c3e50', rp.username, false);
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

  private drawMeadowUnderlay(width: number, height: number) {
    // Paint a dense field of soft grass diamonds around the camera so edges feel continuous
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;
    const cols = Math.ceil(width / hw) + 6;
    const rows = Math.ceil(height / hh) + 8;
    const originCol = Math.floor(this.playerCol);
    const originRow = Math.floor(this.playerRow);

    for (let r = -rows; r < rows; r++) {
      for (let c = -cols; c < cols; c++) {
        const col = originCol + c;
        const row = originRow + r;
        // Skip interior map cells — real tiles draw there
        if (col >= 0 && row >= 0 && col < this.map.gridSize && row < this.map.gridSize) continue;

        const { x, y } = this.gridToScreen(col, row);
        if (x < -80 || x > width + 80 || y < -60 || y > height + 60) continue;

        const shade = ((col * 3 + row * 5) & 1) === 0 ? '#8fbf6a' : '#7aaa58';
        this.ctx.fillStyle = shade;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - hh);
        this.ctx.lineTo(x + hw, y);
        this.ctx.lineTo(x, y + hh);
        this.ctx.lineTo(x - hw, y);
        this.ctx.closePath();
        this.ctx.fill();

        if (((col * 7 + row * 11) % 17) === 0) {
          this.ctx.fillStyle = '#b8d98a';
          this.ctx.fillRect(x - 2, y - 2, 3, 3);
        }
      }
    }
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

    // Soft edge
    this.ctx.strokeStyle = 'rgba(60, 80, 40, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - hh);
    this.ctx.lineTo(cx + hw, cy);
    this.ctx.lineTo(cx, cy + hh);
    this.ctx.lineTo(cx - hw, cy);
    this.ctx.closePath();
    this.ctx.stroke();

    // Grass dither
    if (palette.accent && (tileId === 'grass' || tileId === 'park' || tileId === 'tall_grass')) {
      this.ctx.fillStyle = palette.accent;
      this.ctx.fillRect(cx - 8, cy - 2, 2, 2);
      this.ctx.fillRect(cx + 4, cy + 4, 2, 2);
      this.ctx.fillRect(cx - 2, cy + 8, 2, 2);
    }

    // Cobble stones
    if (tileId === 'cobble' || tileId === 'plaza') {
      this.ctx.fillStyle = 'rgba(120, 100, 70, 0.2)';
      this.ctx.fillRect(cx - 10, cy - 2, 6, 3);
      this.ctx.fillRect(cx + 2, cy + 4, 7, 3);
      this.ctx.fillRect(cx - 4, cy + 10, 5, 2);
    }
  }

  private drawProp(tileId: string, cx: number, cy: number) {
    if (tileId === 'tree' || tileId === 'pine') {
      // Trunk
      this.ctx.fillStyle = '#6b4423';
      this.ctx.fillRect(cx - 4, cy - 18, 8, 22);
      this.ctx.fillStyle = '#8b5a2b';
      this.ctx.fillRect(cx - 3, cy - 16, 3, 18);
      // Cloud canopy
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
      // Cozy house / shop / hub with red roof
      const h = tileId === 'tower' ? 52 : tileId === 'hub' ? 40 : 32;
      const wallL = '#c9a882';
      const wallR = '#a88860';
      const roof = tileId === 'lab' ? '#70a898' : tileId === 'tower' ? '#9880a0' : '#c45a48';
      const roofDark = tileId === 'lab' ? '#508878' : tileId === 'tower' ? '#706080' : '#8a4038';

      this.ctx.fillStyle = wallL;
      this.ctx.fillRect(cx - 18, cy - h, 18, h);
      this.ctx.fillStyle = wallR;
      this.ctx.fillRect(cx, cy - h, 18, h);

      // Roof diamond
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

      // Windows
      this.ctx.fillStyle = '#7ec8d8';
      this.ctx.fillRect(cx - 12, cy - h + 10, 6, 6);
      this.ctx.fillRect(cx + 6, cy - h + 10, 6, 6);
      this.ctx.fillStyle = '#5a4838';
      this.ctx.fillRect(cx - 4, cy - 14, 8, 14);

      // Chimney smoke
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

    // Soft shadow
    this.ctx.fillStyle = 'rgba(40, 50, 30, 0.28)';
    this.ellipse(cx, cy + 8, 14, 6);

    // Legs
    this.ctx.fillStyle = pants;
    this.ctx.fillRect(cx - 7, y + 14, 5, 9);
    this.ctx.fillRect(cx + 2, y + 14, 5, 9);

    // Cloak / body
    this.ctx.fillStyle = shirt;
    this.ctx.fillRect(cx - 9, y + 2, 18, 14);
    this.ctx.fillStyle = this.mixHex(shirt, '#000000', 0.15);
    this.ctx.fillRect(cx - 10, y + 4, 4, 12);
    this.ctx.fillRect(cx + 6, y + 4, 4, 12);

    // Head
    this.ctx.fillStyle = skin;
    this.ctx.fillRect(cx - 7, y - 10, 14, 13);

    // Wide-brim hat (cozy witch/adventurer look)
    this.ctx.fillStyle = hair;
    this.ctx.fillRect(cx - 11, y - 12, 22, 5);
    this.ctx.fillRect(cx - 6, y - 20, 12, 10);
    this.ctx.fillStyle = '#4a90c8';
    this.ctx.fillRect(cx - 6, y - 12, 12, 2);

    // Eyes
    this.ctx.fillStyle = '#2c1810';
    this.ctx.fillRect(cx - 4, y - 5, 2, 2);
    this.ctx.fillRect(cx + 2, y - 5, 2, 2);

    // Soft nameplate
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

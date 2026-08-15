import { retroAudio } from './AudioSynth';
import { TileMap, TileNPC, QuestMarker } from './TileMap';

export interface PlayerAvatarData {
  username: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export class PixelEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public tileMap: TileMap;

  public playerX: number = 30 * 32; // initial pixel coordinates (Grid 30, 30)
  public playerY: number = 30 * 32;
  public playerSpeed: number = 3.5;
  public facing: 'down' | 'up' | 'left' | 'right' = 'down';
  public isMoving: boolean = false;
  public walkAnimFrame: number = 0;

  public avatar: PlayerAvatarData = {
    username: 'Trainer',
    skin: '#fbcfe8',
    hair: '#1e293b',
    shirt: '#2563eb',
    pants: '#1e293b'
  };

  public keys: Record<string, boolean> = {};
  public joystickDir: { x: number; y: number } = { x: 0, y: 0 };

  public nearbyNPC: TileNPC | null = null;
  public nearbyQuest: QuestMarker | null = null;
  public activeDialogue: string | null = null;

  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false; // Crisp 16-bit pixel rendering
    this.tileMap = new TileMap();

    this.setupInputs();
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') {
        this.interact();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  public setAvatar(avatar: PlayerAvatarData) {
    this.avatar = avatar;
  }

  public interact() {
    if (this.nearbyNPC) {
      retroAudio.playClick();
      this.activeDialogue = `${this.nearbyNPC.name}: "${this.nearbyNPC.dialogue}"`;
    } else {
      this.activeDialogue = null;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private gameLoop = (timestamp: number) => {
    if (!this.isRunning) return;

    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(delta);
    this.render();

    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(delta: number) {
    let moveX = 0;
    let moveY = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    // Virtual Joystick Touch input
    if (this.joystickDir.x !== 0 || this.joystickDir.y !== 0) {
      moveX = this.joystickDir.x;
      moveY = this.joystickDir.y;
    }

    if (moveX !== 0 || moveY !== 0) {
      this.isMoving = true;
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;

      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.facing = moveX > 0 ? 'right' : 'left';
      } else {
        this.facing = moveY > 0 ? 'down' : 'up';
      }

      const nextX = this.playerX + moveX * this.playerSpeed * 60 * delta;
      const nextY = this.playerY + moveY * this.playerSpeed * 60 * delta;

      // Tile collision check
      if (!this.tileMap.isColliding(nextX + 10, nextY + 14)) {
        this.playerX = nextX;
      }
      if (!this.tileMap.isColliding(this.playerX + 10, nextY + 14)) {
        this.playerY = nextY;
      }

      // Step sound cadence
      if (Math.random() < 0.15) {
        retroAudio.playFootstep();
      }

      this.walkAnimFrame += delta * 8;
    } else {
      this.isMoving = false;
      this.walkAnimFrame = 0;
    }

    // NPC Proximity Check
    this.nearbyNPC = null;
    for (const npc of this.tileMap.npcs) {
      const npcPx = npc.x * this.tileMap.tileSize;
      const npcPy = npc.y * this.tileMap.tileSize;
      if (Math.hypot(this.playerX - npcPx, this.playerY - npcPy) < 40) {
        this.nearbyNPC = npc;
        break;
      }
    }

    // Quest Proximity Check
    this.nearbyQuest = null;
    for (const qm of this.tileMap.questMarkers) {
      const qPx = qm.x * this.tileMap.tileSize;
      const qPy = qm.y * this.tileMap.tileSize;
      if (Math.hypot(this.playerX - qPx, this.playerY - qPy) < 40) {
        this.nearbyQuest = qm;
        break;
      }
    }
  }

  private render() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Camera Center on Player
    const camX = Math.floor(this.playerX - width / 2);
    const camY = Math.floor(this.playerY - height / 2);

    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(0, 0, width, height);

    const ts = this.tileMap.tileSize;
    const startCol = Math.max(0, Math.floor(camX / ts));
    const endCol = Math.min(this.tileMap.width, Math.ceil((camX + width) / ts));
    const startRow = Math.max(0, Math.floor(camY / ts));
    const endRow = Math.min(this.tileMap.height, Math.ceil((camY + height) / ts));

    // 1. Render Tilemap Layer
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = this.tileMap.grid[r][c];
        const screenX = c * ts - camX;
        const screenY = r * ts - camY;

        this.drawTile(tile, screenX, screenY, ts);
      }
    }

    // 2. Render Quest Markers
    this.tileMap.questMarkers.forEach(qm => {
      const qx = qm.x * ts - camX;
      const qy = qm.y * ts - camY;
      if (qx > -32 && qx < width && qy > -32 && qy < height) {
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(qx + 16, qy + 16, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 12px Orbitron, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('!', qx + 16, qy + 16);
      }
    });

    // 3. Render NPCs
    this.tileMap.npcs.forEach(npc => {
      const nx = npc.x * ts - camX;
      const ny = npc.y * ts - camY;
      if (nx > -32 && nx < width && ny > -32 && ny < height) {
        this.drawSprite(nx, ny, npc.skinColor, '#000000', npc.shirtColor, '#1e293b', 'down', false, 0);

        // Nameplate
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        this.ctx.fillRect(nx - 10, ny - 16, 52, 14);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = 'bold 9px Orbitron, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(npc.name, nx + 16, ny - 6);
      }
    });

    // 4. Render Player Sprite
    const px = Math.floor(this.playerX - camX);
    const py = Math.floor(this.playerY - camY);
    this.drawSprite(
      px,
      py,
      this.avatar.skin,
      this.avatar.hair,
      this.avatar.shirt,
      this.avatar.pants,
      this.facing,
      this.isMoving,
      Math.floor(this.walkAnimFrame) % 2
    );

    // Player Username Tag
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.fillRect(px - 14, py - 18, 60, 16);
    this.ctx.fillStyle = '#facc15';
    this.ctx.font = 'bold 10px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.avatar.username, px + 16, py - 6);
  }

  private drawTile(type: string, x: number, y: number, size: number) {
    if (type === 'road') {
      this.ctx.fillStyle = '#334155';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeStyle = '#475569';
      this.ctx.strokeRect(x, y, size, size);
    } else if (type === 'sidewalk') {
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillRect(x, y, size, size);
    } else if (type === 'water') {
      const wave = Math.sin(Date.now() * 0.004 + x) * 2;
      this.ctx.fillStyle = '#2563eb';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.fillStyle = '#60a5fa';
      this.ctx.fillRect(x + 4, y + 8 + wave, size - 8, 3);
    } else if (type === 'tree') {
      this.ctx.fillStyle = '#166534';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.fillStyle = '#15803d';
      this.ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    } else if (type === 'house' || type === 'shop' || type === 'bunker') {
      this.ctx.fillStyle = type === 'shop' ? '#d97706' : type === 'bunker' ? '#1e3a8a' : '#78350f';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.strokeRect(x, y, size, size);
    } else if (type === 'bridge') {
      this.ctx.fillStyle = '#b45309';
      this.ctx.fillRect(x, y, size, size);
    } else {
      // Grass
      this.ctx.fillStyle = '#22c55e';
      this.ctx.fillRect(x, y, size, size);
      this.ctx.fillStyle = '#16a34a';
      this.ctx.fillRect(x + 6, y + 10, 4, 4);
    }
  }

  private drawSprite(
    x: number,
    y: number,
    skin: string,
    hair: string,
    shirt: string,
    pants: string,
    facing: string,
    isMoving: boolean,
    stepFrame: number
  ) {
    const legOffset = isMoving ? (stepFrame === 0 ? 3 : -3) : 0;

    // Legs
    this.ctx.fillStyle = pants;
    this.ctx.fillRect(x + 8, y + 20 + legOffset, 6, 10);
    this.ctx.fillRect(x + 18, y + 20 - legOffset, 6, 10);

    // Torso / Shirt
    this.ctx.fillStyle = shirt;
    this.ctx.fillRect(x + 6, y + 10, 20, 12);

    // Head / Skin
    this.ctx.fillStyle = skin;
    this.ctx.fillRect(x + 8, y + 2, 16, 12);

    // Hair
    this.ctx.fillStyle = hair;
    this.ctx.fillRect(x + 7, y, 18, 5);

    // Eyes
    if (facing === 'down') {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x + 10, y + 6, 3, 3);
      this.ctx.fillRect(x + 19, y + 6, 3, 3);
    }
  }
}

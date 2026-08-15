export type TileType =
  | 'grass'
  | 'road'
  | 'sidewalk'
  | 'water'
  | 'tree'
  | 'house'
  | 'shop'
  | 'bunker'
  | 'bridge'
  | 'fence';

export interface TileNPC {
  id: string;
  name: string;
  x: number; // grid x
  y: number; // grid y
  dialogue: string;
  skinColor: string;
  shirtColor: string;
}

export interface QuestMarker {
  id: string;
  title: string;
  x: number;
  y: number;
  type: 'card_drop' | 'npc_quest' | 'tournament_hub';
}

export class TileMap {
  public width: number = 60;
  public height: number = 60;
  public tileSize: number = 32;
  public grid: TileType[][] = [];
  public collisionGrid: boolean[][] = [];
  public npcs: TileNPC[] = [];
  public questMarkers: QuestMarker[] = [];

  constructor() {
    this.generateMap();
  }

  private generateMap() {
    // Initialize 60x60 grid
    for (let y = 0; y < this.height; y++) {
      const row: TileType[] = [];
      const colRow: boolean[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push('grass');
        colRow.push(false);
      }
      this.grid.push(row);
      this.collisionGrid.push(colRow);
    }

    // 1. Paved Roads (Horizontal & Vertical Crossroads)
    for (let x = 0; x < this.width; x++) {
      this.grid[30][x] = 'road';
      this.grid[31][x] = 'road';
      this.grid[15][x] = 'road';
      this.grid[45][x] = 'road';
    }
    for (let y = 0; y < this.height; y++) {
      this.grid[y][30] = 'road';
      this.grid[y][31] = 'road';
      this.grid[y][15] = 'road';
      this.grid[y][45] = 'road';
    }

    // 2. Sidewalks along roads
    for (let x = 0; x < this.width; x++) {
      if (this.grid[29][x] === 'grass') this.grid[29][x] = 'sidewalk';
      if (this.grid[32][x] === 'grass') this.grid[32][x] = 'sidewalk';
    }

    // 3. Central River Trench
    for (let y = 0; y < this.height; y++) {
      const rx = Math.floor(8 + Math.sin(y * 0.15) * 3);
      for (let w = 0; w < 4; w++) {
        if (rx + w < this.width) {
          if (y === 15 || y === 30 || y === 45) {
            this.grid[y][rx + w] = 'bridge';
            this.collisionGrid[y][rx + w] = false;
          } else {
            this.grid[y][rx + w] = 'water';
            this.collisionGrid[y][rx + w] = true;
          }
        }
      }
    }

    // 4. Buildings (Houses, Shops, BPV Tournament Hub)
    this.placeBuilding(18, 18, 5, 4, 'shop', true);
    this.placeBuilding(35, 18, 6, 5, 'bunker', true); // Tournament Hub
    this.placeBuilding(18, 35, 5, 4, 'house', true);
    this.placeBuilding(35, 35, 5, 4, 'house', true);

    // 5. Parks & Trees
    for (let y = 3; y < 12; y++) {
      for (let x = 35; x < 55; x++) {
        if (Math.random() < 0.45 && this.grid[y][x] === 'grass') {
          this.grid[y][x] = 'tree';
          this.collisionGrid[y][x] = true;
        }
      }
    }

    // Outer Map Boundary Collisions
    for (let i = 0; i < this.width; i++) {
      this.collisionGrid[0][i] = true;
      this.collisionGrid[this.height - 1][i] = true;
      this.collisionGrid[i][0] = true;
      this.collisionGrid[i][this.width - 1] = true;
    }

    // 6. Interactive City NPCs
    this.npcs = [
      {
        id: 'npc-1',
        name: 'Mayor Pixel',
        x: 31,
        y: 28,
        dialogue: 'Welcome to BPV City! Explore the real-world or virtual districts to collect rare Fish Cards!',
        skinColor: '#fbcfe8',
        shirtColor: '#f59e0b'
      },
      {
        id: 'npc-2',
        name: 'Card Master Finn',
        x: 20,
        y: 23,
        dialogue: 'Winning tournaments earns you Legendary Fish Cards with massive Attack stats!',
        skinColor: '#fed7aa',
        shirtColor: '#10b981'
      },
      {
        id: 'npc-3',
        name: 'Scout Marina',
        x: 37,
        y: 24,
        dialogue: 'Walk 500 meters in Outdoor Mode to complete daily quests and gain bonus XP!',
        skinColor: '#fbcfe8',
        shirtColor: '#ec4899'
      }
    ];

    // 7. Quest Markers
    this.questMarkers = [
      { id: 'qm-1', title: 'Tournament HQ', x: 38, y: 20, type: 'tournament_hub' },
      { id: 'qm-2', title: 'Rare Guppy Spawn', x: 42, y: 8, type: 'card_drop' },
      { id: 'qm-3', title: 'City Center NPC', x: 31, y: 27, type: 'npc_quest' }
    ];
  }

  private placeBuilding(startX: number, startY: number, w: number, h: number, type: TileType, isColliding: boolean) {
    for (let y = startY; y < startY + h; y++) {
      for (let x = startX; x < startX + w; x++) {
        if (y < this.height && x < this.width) {
          this.grid[y][x] = type;
          if (isColliding) {
            this.collisionGrid[y][x] = true;
          }
        }
      }
    }
  }

  public isColliding(pixelX: number, pixelY: number): boolean {
    const gx = Math.floor(pixelX / this.tileSize);
    const gy = Math.floor(pixelY / this.tileSize);
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return true;
    return this.collisionGrid[gy][gx];
  }
}

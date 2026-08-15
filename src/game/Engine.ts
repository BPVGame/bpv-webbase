import * as THREE from 'three';
import { BotManager } from './Bots';
import { ParticleManager } from './Particles';
import { Player } from './Player';
import { soundManager } from './Sound';
import { Vehicle } from './Vehicles';
import { World } from './World';

export interface GameState {
  playerHp: number;
  playerMaxHp: number;
  playerAmmo: number;
  playerMaxAmmo: number;
  weaponName: string;
  classType: string;
  isReloading: boolean;
  blueTickets: number;
  redTickets: number;
  capturePoints: Array<{ id: 'A' | 'B' | 'C'; owner: 'blue' | 'red' | 'neutral'; progress: number }>;
  killFeed: Array<{ id: string; killer: string; victim: string; time: string }>;
  showHitmarker: boolean;
  inVehicle: boolean;
  nearVehicle: Vehicle | null;
  isGameOver: boolean;
  winningTeam: 'blue' | 'red' | null;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public world: World;
  public player: Player;
  public botManager: BotManager;
  public particleManager: ParticleManager;
  public vehicles: Vehicle[] = [];

  public blueTickets: number = 500;
  public redTickets: number = 500;
  public killFeed: Array<{ id: string; killer: string; victim: string; time: string }> = [];

  public keys: Record<string, boolean> = {};
  public hitmarkerTimer: number = 0;
  public isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  private stateCallback: ((state: GameState) => void) | null = null;

  constructor(container: HTMLElement) {
    // 1. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0045);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

    // 2. WebGL Renderer with Shadows & ToneMapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    // 3. Dynamic Sun Lighting & Ambient Sky Light
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(80, 140, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    const d = 120;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    const ambientLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.65);
    this.scene.add(ambientLight);

    // 4. Managers Init
    this.particleManager = new ParticleManager(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.camera, this.scene, this.particleManager);
    this.botManager = new BotManager(this.scene, this.particleManager);

    // 5. Vehicles Spawn
    const tank1 = new Vehicle('tank-blue', 'tank', 'blue', new THREE.Vector3(-80, 0.1, -20), this.scene);
    const tank2 = new Vehicle('tank-red', 'tank', 'red', new THREE.Vector3(80, 0.1, 20), this.scene);
    const jeep1 = new Vehicle('jeep-blue', 'jeep', 'blue', new THREE.Vector3(-40, 0.1, -60), this.scene);
    const jeep2 = new Vehicle('jeep-red', 'jeep', 'red', new THREE.Vector3(40, 0.1, 60), this.scene);

    this.vehicles.push(tank1, tank2, jeep1, jeep2);

    // 6. Spawn AI Squad Bots
    this.spawnSquadBots();

    // 7. Event Listeners
    this.setupEventListeners();
  }

  private spawnSquadBots() {
    const classes: Array<'assault' | 'sniper' | 'rpg' | 'smg'> = ['assault', 'sniper', 'rpg', 'smg'];

    // 6 Friendly Blue Bots & 6 Enemy Red Bots
    for (let i = 0; i < 6; i++) {
      const classType = classes[i % classes.length];
      this.botManager.spawnBot(`blue-bot-${i}`, `Blue Squad ${i + 1}`, 'blue', classType, new THREE.Vector3(-70 + i * 4, 0.1, -40));
      this.botManager.spawnBot(`red-bot-${i}`, `Red Syndicate ${i + 1}`, 'red', classType, new THREE.Vector3(70 - i * 4, 0.1, 40));
    }
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (e.code === 'KeyR') {
      this.player.reload();
    } else if (e.code === 'KeyE') {
      // Vehicle interact
      if (this.player.inVehicle) {
        this.player.exitVehicle();
      } else {
        const nearVehicle = this.vehicles.find(
          v => v.group.position.distanceTo(this.player.position) < 5.0
        );
        if (nearVehicle) {
          this.player.enterVehicle(nearVehicle);
        }
      }
    } else if (e.code === 'ShiftLeft') {
      this.player.isSprinting = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
    if (e.code === 'ShiftLeft') {
      this.player.isSprinting = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement) {
      this.player.handleMouseLook(e.movementX, e.movementY);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      // Left Click fire
      if (document.pointerLockElement) {
        this.player.fireWeapon((hitPoint, isEnemy, damage) => {
          this.particleManager.spawnImpact(hitPoint, new THREE.Vector3(0, 1, 0), isEnemy);
        });
      }
    } else if (e.button === 2) {
      // Right Click Aim Down Sights (ADS)
      this.player.isAiming = !this.player.isAiming;
    }
  };

  public setStateCallback(cb: (state: GameState) => void) {
    this.stateCallback = cb;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private animate = (currentTime: number) => {
    if (!this.isRunning) return;

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // 1. Update Player
    this.player.update(delta, this.keys, this.world.collisionBoxes, (hitPoint, isEnemy, damage) => {
      this.particleManager.spawnImpact(hitPoint, new THREE.Vector3(0, 1, 0), isEnemy);
    });

    // Automatic weapon firing continuous check
    if (this.keys['Mouse0'] || (this.player.inVehicle && this.keys['KeyF'])) {
      this.player.fireWeapon((hitPoint, isEnemy, damage) => {
        this.particleManager.spawnImpact(hitPoint, new THREE.Vector3(0, 1, 0), isEnemy);
      });
    }

    // 2. Update Vehicles
    this.vehicles.forEach(v => {
      const vehicleInputs = {
        forward: this.player.inVehicle === v && this.keys['KeyW'],
        backward: this.player.inVehicle === v && this.keys['KeyS'],
        left: this.player.inVehicle === v && this.keys['KeyA'],
        right: this.player.inVehicle === v && this.keys['KeyD']
      };
      v.update(delta, vehicleInputs, this.particleManager);
    });

    // 3. Update Projectiles
    this.player.weaponSystem.updateProjectiles(delta, (p, hitPoint) => {
      this.particleManager.spawnImpact(hitPoint, new THREE.Vector3(0, 1, 0));
    });

    // Projectile hit detection against bots & player
    this.player.weaponSystem.projectiles.forEach((p, idx) => {
      if (p.ownerId !== 'player' && p.mesh.position.distanceTo(this.player.position) < 1.5) {
        this.player.takeDamage(p.damage, () => {
          this.addKillFeed('Enemy Bot', 'Player');
        });
        this.particleManager.spawnExplosion(p.mesh.position, 1.2);
        this.player.weaponSystem.removeProjectile(idx);
      } else {
        // Hit check against AI Bots
        this.botManager.bots.forEach(bot => {
          if (bot.isAlive && bot.mesh.position.distanceTo(p.mesh.position) < 1.8) {
            if ((p.ownerId === 'player' && bot.team !== this.player.team) || p.ownerId !== bot.id) {
              this.botManager.takeBotDamage(bot, p.damage, 'Player', (killer, victim) => {
                this.addKillFeed(killer, victim);
              });
              if (p.ownerId === 'player') {
                this.hitmarkerTimer = 0.25;
                soundManager.playHitmarker();
              }
              this.particleManager.spawnExplosion(p.mesh.position, 1.0);
              this.player.weaponSystem.removeProjectile(idx);
            }
          }
        });
      }
    });

    // 4. Objective Capture & Tickets drain
    const blueUnitsNear: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };
    const redUnitsNear: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };

    this.world.capturePoints.forEach(cp => {
      if (cp.position.distanceTo(this.player.position) < cp.radius) {
        if (this.player.team === 'blue') blueUnitsNear[cp.id]++;
        else redUnitsNear[cp.id]++;
      }
      this.botManager.bots.forEach(bot => {
        if (bot.isAlive && cp.position.distanceTo(bot.mesh.position) < cp.radius) {
          if (bot.team === 'blue') blueUnitsNear[cp.id]++;
          else redUnitsNear[cp.id]++;
        }
      });
    });

    this.world.updateCapturePoints(delta, blueUnitsNear, redUnitsNear);

    // Ticket drain based on captured flags
    const blueFlags = this.world.capturePoints.filter(cp => cp.owner === 'blue').length;
    const redFlags = this.world.capturePoints.filter(cp => cp.owner === 'red').length;

    if (redFlags > blueFlags) this.blueTickets -= (redFlags - blueFlags) * 0.4 * delta;
    if (blueFlags > redFlags) this.redTickets -= (blueFlags - redFlags) * 0.4 * delta;

    // 5. Update Particle System
    this.particleManager.update(delta);

    // Hitmarker timer fade
    if (this.hitmarkerTimer > 0) this.hitmarkerTimer -= delta;

    // 6. Bot AI Updates
    const objPositions = {
      A: this.world.capturePoints[0].position,
      B: this.world.capturePoints[1].position,
      C: this.world.capturePoints[2].position
    };
    this.botManager.update(delta, this.player.position, this.player.team, objPositions, this.player.weaponSystem.projectiles, (killer, victim) => {
      this.addKillFeed(killer, victim);
    });

    // 7. Render 3D Frame
    this.renderer.render(this.scene, this.camera);

    // 8. Push UI GameState to React
    if (this.stateCallback) {
      const nearVehicle = this.vehicles.find(v => v.group.position.distanceTo(this.player.position) < 5.0) || null;
      this.stateCallback({
        playerHp: Math.round(this.player.health),
        playerMaxHp: this.player.maxHealth,
        playerAmmo: this.player.ammo,
        playerMaxAmmo: this.player.maxAmmo,
        weaponName: this.player.classType.toUpperCase(),
        classType: this.player.classType,
        isReloading: this.player.isReloading,
        blueTickets: Math.max(0, Math.round(this.blueTickets)),
        redTickets: Math.max(0, Math.round(this.redTickets)),
        capturePoints: this.world.capturePoints.map(cp => ({ id: cp.id, owner: cp.owner, progress: cp.progress })),
        killFeed: this.killFeed.slice(-5),
        showHitmarker: this.hitmarkerTimer > 0,
        inVehicle: !!this.player.inVehicle,
        nearVehicle,
        isGameOver: this.blueTickets <= 0 || this.redTickets <= 0,
        winningTeam: this.blueTickets <= 0 ? 'red' : this.redTickets <= 0 ? 'blue' : null
      });
    }

    this.animFrameId = requestAnimationFrame(this.animate);
  };

  private addKillFeed(killer: string, victim: string) {
    this.killFeed.push({
      id: Math.random().toString(),
      killer,
      victim,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  }

  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.dispose();
  }
}

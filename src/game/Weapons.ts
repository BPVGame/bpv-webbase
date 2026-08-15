import * as THREE from 'three';
import { ParticleManager } from './Particles';
import { soundManager } from './Sound';

export type WeaponType = 'assault' | 'sniper' | 'rpg' | 'smg';

export interface WeaponConfig {
  name: string;
  type: WeaponType;
  damage: number;
  fireRate: number; // seconds between shots
  maxAmmo: number;
  magazineSize: number;
  reloadTime: number; // seconds
  recoil: number;
  zoom: number; // FOV reduction factor
  isAutomatic: boolean;
  isRocket: boolean;
}

export const WEAPON_TYPES: Record<WeaponType, WeaponConfig> = {
  assault: {
    name: 'M4-Pixel Rifle',
    type: 'assault',
    damage: 34,
    fireRate: 0.12,
    maxAmmo: 180,
    magazineSize: 30,
    reloadTime: 2.2,
    recoil: 0.035,
    zoom: 1.2,
    isAutomatic: true,
    isRocket: false
  },
  sniper: {
    name: 'Voxel-50 Sniper',
    type: 'sniper',
    damage: 110,
    fireRate: 1.1,
    maxAmmo: 40,
    magazineSize: 5,
    reloadTime: 3.5,
    recoil: 0.12,
    zoom: 3.5,
    isAutomatic: false,
    isRocket: false
  },
  rpg: {
    name: 'RPG-7 Pixel',
    type: 'rpg',
    damage: 250,
    fireRate: 2.5,
    maxAmmo: 8,
    magazineSize: 1,
    reloadTime: 3.8,
    recoil: 0.18,
    zoom: 1.1,
    isAutomatic: false,
    isRocket: true
  },
  smg: {
    name: 'Vector-V SMG',
    type: 'smg',
    damage: 24,
    fireRate: 0.07,
    maxAmmo: 210,
    magazineSize: 35,
    reloadTime: 1.8,
    recoil: 0.022,
    zoom: 1.1,
    isAutomatic: true,
    isRocket: false
  }
};

export interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  ownerId: string;
  isRocket: boolean;
  life: number;
}

export class WeaponSystem {
  private scene: THREE.Scene;
  private particleManager: ParticleManager;
  public projectiles: Projectile[] = [];

  constructor(scene: THREE.Scene, particleManager: ParticleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
  }

  // Create voxel 3D weapon model attached to camera / player hand
  public createWeaponMesh(type: WeaponType): THREE.Group {
    const group = new THREE.Group();

    if (type === 'sniper') {
      // Long barrel sniper
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.4 });
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111317, metalness: 0.8 });
      const scopeMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.1 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.9), bodyMat);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), barrelMat);
      barrel.position.set(0, 0.04, -0.6);

      const scope = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), scopeMat);
      scope.position.set(0, 0.14, -0.1);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.12), bodyMat);
      mag.position.set(0, -0.15, 0.1);

      group.add(body, barrel, scope, mag);
    } else if (type === 'rpg') {
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x2d4a27, roughness: 0.6 });
      const rocketMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });

      const tube = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.1), tubeMat);
      const rocketHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 4), rocketMat);
      rocketHead.rotation.x = -Math.PI / 2;
      rocketHead.position.set(0, 0, -0.7);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.1), tubeMat);
      grip.position.set(0, -0.18, 0.1);

      group.add(tube, rocketHead, grip);
    } else if (type === 'smg') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
      const magMat = new THREE.MeshStandardMaterial({ color: 0x475569 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.5), mat);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.08), magMat);
      mag.position.set(0, -0.15, 0.05);
      mag.rotation.x = 0.2;

      group.add(body, mag);
    } else {
      // Assault Rifle
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
      const stockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.65), bodyMat);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.35), stockMat);
      stock.position.set(0, 0.02, 0.4);

      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), barrelMat);
      barrel.position.set(0, 0.03, -0.45);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.25, 0.1), bodyMat);
      mag.position.set(0, -0.15, -0.05);

      group.add(body, stock, barrel, mag);
    }

    return group;
  }

  // Fire projectile or rocket
  public fire(
    type: WeaponType,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    ownerId: string
  ): Projectile | null {
    const config = WEAPON_TYPES[type];
    soundManager.playGunshot(type);

    // Muzzle flash particle
    this.particleManager.spawnMuzzleFlash(origin, direction);

    if (config.isRocket) {
      // Spawn RPG rocket entity
      const geo = new THREE.ConeGeometry(0.15, 0.45, 4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0xff4500,
        emissiveIntensity: 0.8
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);
      mesh.lookAt(origin.clone().add(direction));
      mesh.rotateX(Math.PI / 2);

      this.scene.add(mesh);
      const projectile: Projectile = {
        mesh,
        velocity: direction.clone().multiplyScalar(42),
        damage: config.damage,
        ownerId,
        isRocket: true,
        life: 5.0
      };
      this.projectiles.push(projectile);
      return projectile;
    } else {
      // High-speed bullet tracer
      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.6);
      const mat = new THREE.MeshBasicMaterial({
        color: type === 'sniper' ? 0x60a5fa : 0xfacc15
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);
      mesh.lookAt(origin.clone().add(direction));

      this.scene.add(mesh);
      const projectile: Projectile = {
        mesh,
        velocity: direction.clone().multiplyScalar(140),
        damage: config.damage,
        ownerId,
        isRocket: false,
        life: 1.5
      };
      this.projectiles.push(projectile);
      return projectile;
    }
  }

  public updateProjectiles(delta: number, onImpact: (p: Projectile, hitPoint: THREE.Vector3) => void) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.removeProjectile(i);
        continue;
      }

      // Movement
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Rocket trail smoke
      if (p.isRocket) {
        this.particleManager.spawnImpact(p.mesh.position, p.velocity.clone().negate().normalize());
      }
    }
  }

  public removeProjectile(index: number) {
    const p = this.projectiles[index];
    if (p) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.projectiles.splice(index, 1);
    }
  }
}

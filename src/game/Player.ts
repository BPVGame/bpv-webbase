import * as THREE from 'three';
import { ParticleManager } from './Particles';
import { soundManager } from './Sound';
import { Vehicle } from './Vehicles';
import { WeaponSystem, WeaponType, WEAPON_TYPES } from './Weapons';

export class Player {
  public camera: THREE.PerspectiveCamera;
  public weaponGroup: THREE.Group;
  public currentWeaponMesh: THREE.Group | null = null;
  public weaponSystem: WeaponSystem;
  public particleManager: ParticleManager;

  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public pitch: number = 0;
  public yaw: number = 0;

  public team: 'blue' | 'red' = 'blue';
  public classType: WeaponType = 'assault';
  public health: number = 100;
  public maxHealth: number = 100;
  public ammo: number = 30;
  public maxAmmo: number = 180;
  public isReloading: boolean = false;
  public isAiming: boolean = false;
  public isSprinting: boolean = false;
  public isGrounded: boolean = true;
  public isAlive: boolean = true;
  public inVehicle: Vehicle | null = null;

  public shootTimer: number = 0;
  public recoilOffset: THREE.Vector3 = new THREE.Vector3();

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    particleManager: ParticleManager
  ) {
    this.camera = camera;
    this.particleManager = particleManager;
    this.weaponSystem = new WeaponSystem(scene, particleManager);
    this.position = new THREE.Vector3(0, 2, 80);

    // Attached weapon container to camera
    this.weaponGroup = new THREE.Group();
    this.camera.add(this.weaponGroup);
    scene.add(this.camera);

    this.setWeaponClass('assault');
  }

  public setWeaponClass(type: WeaponType) {
    this.classType = type;
    const config = WEAPON_TYPES[type];
    this.ammo = config.magazineSize;
    this.maxAmmo = config.maxAmmo;
    this.isReloading = false;

    // Replace 3D weapon mesh attached to camera
    if (this.currentWeaponMesh) {
      this.weaponGroup.remove(this.currentWeaponMesh);
    }
    this.currentWeaponMesh = this.weaponSystem.createWeaponMesh(type);
    this.currentWeaponMesh.position.set(0.28, -0.24, -0.5);
    this.currentWeaponMesh.rotation.y = -Math.PI / 16;
    this.weaponGroup.add(this.currentWeaponMesh);
  }

  public handleMouseLook(deltaX: number, deltaY: number) {
    if (!this.isAlive) return;

    const sensitivity = this.isAiming ? 0.0012 : 0.0022;
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));

    if (this.inVehicle && this.inVehicle.turretGroup) {
      // Aim vehicle turret
      this.inVehicle.turretGroup.rotation.y = this.yaw - this.inVehicle.group.rotation.y;
      if (this.inVehicle.barrelMesh) {
        this.inVehicle.barrelMesh.rotation.x = Math.PI / 2 + this.pitch * 0.5;
      }
    }
  }

  public update(
    delta: number,
    keys: Record<string, boolean>,
    obstacles: THREE.Box3[],
    onShootHit: (hitPoint: THREE.Vector3, isEnemy: boolean, damage: number) => void
  ) {
    if (!this.isAlive) return;

    if (this.shootTimer > 0) this.shootTimer -= delta;

    if (this.inVehicle) {
      // Player inside vehicle mode
      this.camera.position.copy(this.inVehicle.group.position).add(new THREE.Vector3(0, 3.5, 0));
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this.weaponGroup.visible = false;
      return;
    }

    this.weaponGroup.visible = true;

    // Movement speeds
    const config = WEAPON_TYPES[this.classType];
    const speed = this.isSprinting ? 12 : this.isAiming ? 4.5 : 7.5;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDir = new THREE.Vector3();
    if (keys['KeyW']) moveDir.add(forward);
    if (keys['KeyS']) moveDir.sub(forward);
    if (keys['KeyD']) moveDir.add(right);
    if (keys['KeyA']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    // Jump Gravity
    if (keys['Space'] && this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
    }

    this.velocity.y -= 22 * delta; // Gravity

    // Apply Position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Ground level collision
    if (this.position.y <= 1.8) {
      this.position.y = 1.8;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Camera position & orientation update
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    // Weapon sway & recoil recovery
    if (this.currentWeaponMesh) {
      const swayTime = Date.now() * 0.006;
      const isMoving = moveDir.lengthSq() > 0;
      const swayX = isMoving ? Math.sin(swayTime) * 0.02 : 0;
      const swayY = isMoving ? Math.cos(swayTime * 2) * 0.015 : 0;

      const targetX = this.isAiming ? 0 : 0.28 + swayX;
      const targetY = this.isAiming ? -0.12 : -0.24 + swayY;
      const targetZ = this.isAiming ? -0.32 : -0.5;

      this.currentWeaponMesh.position.x += (targetX - this.currentWeaponMesh.position.x) * 0.15;
      this.currentWeaponMesh.position.y += (targetY - this.currentWeaponMesh.position.y) * 0.15;
      this.currentWeaponMesh.position.z += (targetZ - this.currentWeaponMesh.position.z) * 0.15;
    }

    // ADS Camera FOV Zoom
    const targetFov = this.isAiming ? 75 / config.zoom : 75;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * 0.2;
      this.camera.updateProjectionMatrix();
    }
  }

  public fireWeapon(
    onHit: (hitPoint: THREE.Vector3, isEnemy: boolean, damage: number) => void
  ) {
    if (!this.isAlive || this.isReloading) return;

    if (this.inVehicle) {
      this.inVehicle.fireMainWeapon(this.camera.parent as THREE.Scene, this.particleManager, this.weaponSystem.projectiles);
      return;
    }

    const config = WEAPON_TYPES[this.classType];
    if (this.shootTimer > 0 || this.ammo <= 0) {
      if (this.ammo <= 0) this.reload();
      return;
    }

    this.ammo--;
    this.shootTimer = config.fireRate;

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const origin = this.camera.position.clone().add(camDir.clone().multiplyScalar(0.6));

    // Fire Projectile tracer
    this.weaponSystem.fire(this.classType, origin, camDir, 'player');

    // Recoil Kick
    this.pitch += config.recoil * (0.8 + Math.random() * 0.4);

    // Raycast hit detection
    const raycaster = new THREE.Raycaster(this.camera.position, camDir, 0.1, 200);
    const intersects = raycaster.intersectObjects((this.camera.parent as THREE.Scene).children, true);

    for (const hit of intersects) {
      // Ignore player weapon mesh attached to camera
      let curr: THREE.Object3D | null = hit.object;
      let isPlayerMesh = false;
      while (curr) {
        if (curr === this.camera) {
          isPlayerMesh = true;
          break;
        }
        curr = curr.parent;
      }
      if (isPlayerMesh) continue;
      if (hit.distance < 0.8) continue;

      onHit(hit.point, true, config.damage);
      break;
    }
  }

  public reload() {
    if (this.isReloading) return;
    const config = WEAPON_TYPES[this.classType];
    if (this.ammo >= config.magazineSize || this.maxAmmo <= 0) return;

    this.isReloading = true;
    setTimeout(() => {
      const needed = config.magazineSize - this.ammo;
      const added = Math.min(needed, this.maxAmmo);
      this.ammo += added;
      this.maxAmmo -= added;
      this.isReloading = false;
    }, config.reloadTime * 1000);
  }

  public takeDamage(amount: number, onDeath: () => void) {
    this.health = Math.max(0, this.health - amount);
    soundManager.playHitmarker();
    if (this.health <= 0) {
      this.isAlive = false;
      onDeath();
    }
  }

  public enterVehicle(vehicle: Vehicle) {
    this.inVehicle = vehicle;
    vehicle.driverId = 'player';
    soundManager.startEngine();
  }

  public exitVehicle() {
    if (this.inVehicle) {
      this.position.copy(this.inVehicle.group.position).add(new THREE.Vector3(3, 1, 0));
      this.inVehicle.driverId = null;
      this.inVehicle = null;
      soundManager.stopEngine();
    }
  }

  public respawn(spawnPos: THREE.Vector3) {
    this.position.copy(spawnPos);
    this.health = 100;
    this.isAlive = true;
    this.setWeaponClass(this.classType);
  }
}

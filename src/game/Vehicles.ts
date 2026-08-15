import * as THREE from 'three';
import { ParticleManager } from './Particles';
import { soundManager } from './Sound';
import { Projectile } from './Weapons';

export type VehicleType = 'tank' | 'jeep';

export class Vehicle {
  public group: THREE.Group;
  public turretGroup: THREE.Group | null = null;
  public barrelMesh: THREE.Mesh | null = null;
  public type: VehicleType;
  public id: string;
  public team: 'blue' | 'red' | 'neutral';
  public health: number;
  public maxHealth: number;
  public speed: number = 0;
  public maxSpeed: number;
  public acceleration: number;
  public turnSpeed: number;
  public driverId: string | null = null;
  public cannonCooldown: number = 0;

  constructor(
    id: string,
    type: VehicleType,
    team: 'blue' | 'red' | 'neutral',
    position: THREE.Vector3,
    scene: THREE.Scene
  ) {
    this.id = id;
    this.type = type;
    this.team = team;
    this.health = type === 'tank' ? 600 : 250;
    this.maxHealth = this.health;
    this.maxSpeed = type === 'tank' ? 12 : 22;
    this.acceleration = type === 'tank' ? 10 : 18;
    this.turnSpeed = type === 'tank' ? 1.4 : 2.2;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.buildMesh();
    scene.add(this.group);
  }

  private buildMesh() {
    const isTank = this.type === 'tank';
    const primaryColor = this.team === 'blue' ? 0x1e40af : this.team === 'red' ? 0x991b1b : 0x475569;
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });

    if (isTank) {
      // Tank Chassis Body
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 5.2), bodyMat);
      chassis.position.y = 0.8;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      this.group.add(chassis);

      // Treads (Left & Right)
      const treadLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 5.6), darkMat);
      treadLeft.position.set(-2.0, 0.6, 0);
      treadLeft.castShadow = true;

      const treadRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 5.6), darkMat);
      treadRight.position.set(2.0, 0.6, 0);
      treadRight.castShadow = true;

      this.group.add(treadLeft, treadRight);

      // Rotating Turret Base
      this.turretGroup = new THREE.Group();
      this.turretGroup.position.set(0, 1.7, -0.2);

      const turretMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 2.8), bodyMat);
      turretMesh.castShadow = true;
      this.turretGroup.add(turretMesh);

      // Cannon Barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.8, 8), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.1, -2.4);
      barrel.castShadow = true;
      this.barrelMesh = barrel;
      this.turretGroup.add(barrel);

      this.group.add(this.turretGroup);
    } else {
      // Armored Jeep Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 4.2), bodyMat);
      chassis.position.y = 0.9;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      this.group.add(chassis);

      // Cabin Top Frame
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.0), darkMat);
      cabin.position.set(0, 1.6, 0.2);
      this.group.add(cabin);

      // 4 Voxel Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 8);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

      const offsets = [
        [-1.4, 0.55, 1.4],
        [1.4, 0.55, 1.4],
        [-1.4, 0.55, -1.4],
        [1.4, 0.55, -1.4]
      ];

      offsets.forEach(([x, y, z]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, y, z);
        w.castShadow = true;
        this.group.add(w);
      });

      // Mounted MG Turret
      this.turretGroup = new THREE.Group();
      this.turretGroup.position.set(0, 2.2, -0.2);
      const mg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.2), metalMat);
      mg.position.set(0, 0, -0.4);
      this.turretGroup.add(mg);
      this.group.add(this.turretGroup);
    }
  }

  public update(
    delta: number,
    inputs: { forward: boolean; backward: boolean; left: boolean; right: boolean },
    particleManager: ParticleManager
  ) {
    if (this.cannonCooldown > 0) {
      this.cannonCooldown -= delta;
    }

    if (this.driverId) {
      // Steering & Driving
      if (inputs.forward) {
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
      } else if (inputs.backward) {
        this.speed = Math.max(-this.maxSpeed * 0.5, this.speed - this.acceleration * delta);
      } else {
        // Friction drag
        if (this.speed > 0) this.speed = Math.max(0, this.speed - this.acceleration * 1.5 * delta);
        if (this.speed < 0) this.speed = Math.min(0, this.speed + this.acceleration * 1.5 * delta);
      }

      if (inputs.left && Math.abs(this.speed) > 0.5) {
        this.group.rotation.y += this.turnSpeed * delta * (this.speed > 0 ? 1 : -1);
      }
      if (inputs.right && Math.abs(this.speed) > 0.5) {
        this.group.rotation.y -= this.turnSpeed * delta * (this.speed > 0 ? 1 : -1);
      }

      // Move vehicle forward in direction of heading
      const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      this.group.position.addScaledVector(forwardDir, this.speed * delta);

      soundManager.updateEngine(Math.abs(this.speed) / this.maxSpeed);
    }

    // Vehicle smoke if heavily damaged
    if (this.health < this.maxHealth * 0.4 && Math.random() < 0.3) {
      particleManager.spawnImpact(
        this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        new THREE.Vector3(0, 1, 0)
      );
    }
  }

  public fireMainWeapon(
    scene: THREE.Scene,
    particleManager: ParticleManager,
    projectiles: Projectile[]
  ): boolean {
    if (this.cannonCooldown > 0) return false;

    if (this.type === 'tank' && this.turretGroup && this.barrelMesh) {
      this.cannonCooldown = 1.8;
      soundManager.playGunshot('cannon');

      // Cannon tip position
      const barrelWorldPos = new THREE.Vector3();
      this.barrelMesh.getWorldPosition(barrelWorldPos);
      const turretDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.turretGroup.getWorldQuaternion(new THREE.Quaternion()));

      particleManager.spawnExplosion(barrelWorldPos, 1.5);

      // Cannon explosive shell
      const geo = new THREE.SphereGeometry(0.3, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 2 });
      const shell = new THREE.Mesh(geo, mat);
      shell.position.copy(barrelWorldPos);

      scene.add(shell);
      projectiles.push({
        mesh: shell,
        velocity: turretDir.clone().multiplyScalar(100),
        damage: 280,
        ownerId: this.id,
        isRocket: true,
        life: 3.0
      });
      return true;
    } else if (this.type === 'jeep' && this.turretGroup) {
      this.cannonCooldown = 0.1;
      soundManager.playGunshot('smg');

      const mgWorldPos = new THREE.Vector3();
      this.turretGroup.getWorldPosition(mgWorldPos);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.turretGroup.getWorldQuaternion(new THREE.Quaternion()));

      particleManager.spawnMuzzleFlash(mgWorldPos, dir);

      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.5);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const bullet = new THREE.Mesh(geo, mat);
      bullet.position.copy(mgWorldPos);
      bullet.lookAt(mgWorldPos.clone().add(dir));

      scene.add(bullet);
      projectiles.push({
        mesh: bullet,
        velocity: dir.clone().multiplyScalar(130),
        damage: 28,
        ownerId: this.id,
        isRocket: false,
        life: 1.5
      });
      return true;
    }
    return false;
  }

  public takeDamage(amount: number, particleManager: ParticleManager) {
    this.health = Math.max(0, this.health - amount);
    particleManager.spawnExplosion(this.group.position, 1.0);
    if (this.health <= 0) {
      particleManager.spawnExplosion(this.group.position, 4.0);
      soundManager.playExplosion();
    }
  }
}

import * as THREE from 'three';
import { ParticleManager } from './Particles';
import { Projectile, WeaponType, WEAPON_TYPES } from './Weapons';

export interface Bot {
  id: string;
  name: string;
  team: 'blue' | 'red';
  classType: WeaponType;
  mesh: THREE.Group;
  headMesh: THREE.Mesh;
  weaponMesh: THREE.Group;
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  targetPos: THREE.Vector3;
  velocity: THREE.Vector3;
  isAlive: boolean;
  respawnTimer: number;
  shootCooldown: number;
  currentObjective: 'A' | 'B' | 'C';
}

export class BotManager {
  private scene: THREE.Scene;
  private particleManager: ParticleManager;
  public bots: Bot[] = [];

  constructor(scene: THREE.Scene, particleManager: ParticleManager) {
    this.scene = scene;
    this.particleManager = particleManager;
  }

  // Create voxel soldier bot
  public spawnBot(
    id: string,
    name: string,
    team: 'blue' | 'red',
    classType: WeaponType,
    spawnPos: THREE.Vector3
  ): Bot {
    const group = new THREE.Group();
    group.position.copy(spawnPos);

    const teamColor = team === 'blue' ? 0x2563eb : 0xd97706;
    const skinColor = 0xfbcfe8;
    const armorMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // Torso Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.45), armorMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    // Head with Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.85, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), armorMat);
    helmet.position.y = 0.18;

    headGroup.add(head, helmet);
    group.add(headGroup);

    // Legs (Left & Right)
    const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.35), darkMat);
    legLeft.position.set(-0.22, 0.4, 0);
    legLeft.castShadow = true;

    const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.35), darkMat);
    legRight.position.set(0.22, 0.4, 0);
    legRight.castShadow = true;

    group.add(legLeft, legRight);

    // Arms & Weapon Hold
    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), armorMat);
    armLeft.position.set(-0.52, 1.1, 0);

    const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), armorMat);
    armRight.position.set(0.52, 1.1, -0.2);
    armRight.rotation.x = -Math.PI / 3;

    // Attached Voxel Rifle
    const weaponMesh = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.6), darkMat);
    gunBody.position.set(0, 0, -0.2);
    weaponMesh.add(gunBody);
    armRight.add(weaponMesh);

    group.add(armLeft, armRight);

    this.scene.add(group);

    const bot: Bot = {
      id,
      name,
      team,
      classType,
      mesh: group,
      headMesh: head,
      weaponMesh,
      health: 100,
      maxHealth: 100,
      position: spawnPos.clone(),
      targetPos: spawnPos.clone(),
      velocity: new THREE.Vector3(),
      isAlive: true,
      respawnTimer: 0,
      shootCooldown: 0,
      currentObjective: id.charCodeAt(0) % 2 === 0 ? 'B' : id.charCodeAt(0) % 3 === 0 ? 'A' : 'C'
    };

    this.bots.push(bot);
    return bot;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerTeam: 'blue' | 'red',
    objectivePositions: Record<'A' | 'B' | 'C', THREE.Vector3>,
    projectiles: Projectile[],
    onBotKill: (killerName: string, victimName: string, isPlayerVictim: boolean) => void
  ) {
    this.bots.forEach(bot => {
      if (!bot.isAlive) {
        bot.respawnTimer -= delta;
        if (bot.respawnTimer <= 0) {
          this.respawnBot(bot, objectivePositions[bot.currentObjective]);
        }
        return;
      }

      if (bot.shootCooldown > 0) bot.shootCooldown -= delta;

      // 1. Determine Target Destination
      const targetObjPos = objectivePositions[bot.currentObjective];
      bot.targetPos.copy(targetObjPos).add(new THREE.Vector3(
        (Math.sin(bot.id.charCodeAt(0)) * 12),
        0,
        (Math.cos(bot.id.charCodeAt(0)) * 12)
      ));

      // 2. Navigation & Movement towards Objective
      const dirToTarget = bot.targetPos.clone().sub(bot.mesh.position);
      dirToTarget.y = 0;
      const dist = dirToTarget.length();

      if (dist > 2.0) {
        dirToTarget.normalize();
        bot.mesh.position.addScaledVector(dirToTarget, 5.5 * delta);
        bot.mesh.lookAt(bot.mesh.position.clone().add(dirToTarget));

        // Walking leg oscillation animation
        const time = Date.now() * 0.008;
        const legL = bot.mesh.children[2] as THREE.Mesh;
        const legR = bot.mesh.children[3] as THREE.Mesh;
        if (legL && legR) {
          legL.rotation.x = Math.sin(time) * 0.6;
          legR.rotation.x = -Math.sin(time) * 0.6;
        }
      }

      // 3. Combat Engagement & Target Detection
      let enemyTargetPos: THREE.Vector3 | null = null;

      // Check distance to player if player is enemy
      if (playerTeam !== bot.team && bot.mesh.position.distanceTo(playerPos) < 45) {
        enemyTargetPos = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      } else {
        // Find nearest enemy bot
        const enemyBot = this.bots.find(b => b.team !== bot.team && b.isAlive && b.mesh.position.distanceTo(bot.mesh.position) < 40);
        if (enemyBot) {
          enemyTargetPos = enemyBot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        }
      }

      if (enemyTargetPos) {
        // Face enemy target
        const aimDir = enemyTargetPos.clone().sub(bot.mesh.position).normalize();
        bot.mesh.lookAt(bot.mesh.position.clone().add(aimDir));

        // Fire Weapon
        if (bot.shootCooldown <= 0) {
          const config = WEAPON_TYPES[bot.classType];
          bot.shootCooldown = config.fireRate + Math.random() * 0.2;

          const shootOrigin = bot.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));

          // Bullet tracer
          const geo = new THREE.BoxGeometry(0.08, 0.08, 0.5);
          const mat = new THREE.MeshBasicMaterial({ color: bot.team === 'blue' ? 0x60a5fa : 0xf87171 });
          const bullet = new THREE.Mesh(geo, mat);
          bullet.position.copy(shootOrigin);
          bullet.lookAt(shootOrigin.clone().add(aimDir));

          this.scene.add(bullet);
          projectiles.push({
            mesh: bullet,
            velocity: aimDir.multiplyScalar(120),
            damage: config.damage * 0.7, // Slightly reduced bot damage for fairness
            ownerId: bot.id,
            isRocket: false,
            life: 1.5
          });

          this.particleManager.spawnMuzzleFlash(shootOrigin, aimDir);
        }
      }
    });
  }

  public takeBotDamage(
    bot: Bot,
    amount: number,
    attackerName: string,
    onBotKill: (killerName: string, victimName: string, isPlayerVictim: boolean) => void
  ) {
    if (!bot.isAlive) return;

    bot.health -= amount;
    this.particleManager.spawnImpact(bot.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), new THREE.Vector3(0, 1, 0), true);

    if (bot.health <= 0) {
      bot.isAlive = false;
      bot.mesh.visible = false;
      bot.respawnTimer = 6.0;
      onBotKill(attackerName, bot.name, false);
    }
  }

  private respawnBot(bot: Bot, spawnPos: THREE.Vector3) {
    bot.health = bot.maxHealth;
    bot.isAlive = true;
    bot.mesh.visible = true;
    bot.mesh.position.copy(spawnPos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      0,
      (Math.random() - 0.5) * 10
    ));
  }
}

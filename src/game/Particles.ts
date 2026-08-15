import * as THREE from 'three';

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleSpeed: number;
  rotationSpeed: THREE.Vector3;
  color?: THREE.Color;
}

export class ParticleManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private boxGeo: THREE.BoxGeometry;
  private sparkGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.boxGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);

    // Spark geometry
    this.sparkGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 0, 0, 0, 0.8]);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  // Create explosion effect with voxel chunks, fireballs and smoke
  public spawnExplosion(pos: THREE.Vector3, radius: number = 3) {
    const chunkCount = Math.floor(radius * 12);
    
    // Core fireballs
    for (let i = 0; i < 8; i++) {
      const size = 0.6 + Math.random() * radius * 0.5;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(1, 0.4 + Math.random() * 0.4, 0.0),
        emissive: new THREE.Color(1, 0.3, 0),
        emissiveIntensity: 2.0,
        roughness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 1.5
      ));

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        scaleSpeed: 2.5,
        rotationSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random())
      });
    }

    // Debris & smoke chunks
    for (let i = 0; i < chunkCount; i++) {
      const isSmoke = Math.random() > 0.4;
      const color = isSmoke
        ? new THREE.Color(0.2, 0.2, 0.25)
        : new THREE.Color(0.8, 0.3 + Math.random() * 0.3, 0.1);

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.1
      });

      const scale = 0.2 + Math.random() * 0.4;
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.scale.set(scale, scale, scale);
      mesh.position.copy(pos);

      const speed = 4 + Math.random() * 12;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const velocity = dir.multiplyScalar(speed);

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.8 + Math.random() * 0.8,
        maxLife: 1.6,
        scaleSpeed: isSmoke ? 1.2 : -0.5,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        )
      });
    }
  }

  // Bullet impact sparks
  public spawnImpact(pos: THREE.Vector3, normal: THREE.Vector3, isHitEnemy: boolean = false) {
    const count = isHitEnemy ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const color = isHitEnemy ? new THREE.Color(0.9, 0.1, 0.1) : new THREE.Color(1, 0.8, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.scale.set(0.1, 0.1, 0.1);
      mesh.position.copy(pos);

      const spread = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * 0.8,
        normal.y + (Math.random() - 0.5) * 0.8,
        normal.z + (Math.random() - 0.5) * 0.8
      ).normalize().multiplyScalar(4 + Math.random() * 6);

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: spread,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        scaleSpeed: -0.8,
        rotationSpeed: new THREE.Vector3(Math.random() * 5, Math.random() * 5, 0)
      });
    }
  }

  // Muzzle flash particle
  public spawnMuzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.85, 0.3),
      transparent: true,
      opacity: 0.9
    });
    const size = 0.35;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size * 1.8), mat);
    mesh.position.copy(pos).add(dir.clone().multiplyScalar(0.4));
    mesh.lookAt(pos.clone().add(dir));

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity: dir.clone().multiplyScalar(2),
      life: 0.05,
      maxLife: 0.05,
      scaleSpeed: 2,
      rotationSpeed: new THREE.Vector3(0, 0, 0)
    });
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Apply gravity to heavy debris
      p.velocity.y -= 9.8 * delta * 0.4;
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Rotate
      p.mesh.rotation.x += p.rotationSpeed.x * delta;
      p.mesh.rotation.y += p.rotationSpeed.y * delta;
      p.mesh.rotation.z += p.rotationSpeed.z * delta;

      // Scale transition
      if (p.scaleSpeed !== 0) {
        const currentScale = p.mesh.scale.x;
        const newScale = Math.max(0.01, currentScale + p.scaleSpeed * delta);
        p.mesh.scale.set(newScale, newScale, newScale);
      }

      // Fade out material if transparent
      const mat = p.mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      if (mat.transparent) {
        mat.opacity = p.life / p.maxLife;
      }
    }
  }

  public clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach(m => m.dispose());
      } else {
        p.mesh.material.dispose();
      }
    });
    this.particles = [];
  }
}

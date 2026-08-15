import * as THREE from 'three';

export interface CapturePoint {
  id: 'A' | 'B' | 'C';
  name: string;
  position: THREE.Vector3;
  owner: 'blue' | 'red' | 'neutral';
  progress: number; // -100 (Red) to +100 (Blue)
  flagMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  radius: number;
}

export class World {
  public scene: THREE.Scene;
  public capturePoints: CapturePoint[] = [];
  public collisionBoxes: THREE.Box3[] = [];
  public terrainMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildMap();
  }

  private buildMap() {
    // 1. Terrain Ground plane with voxel grass/dirt heightfield
    const size = 300;
    const terrainGeo = new THREE.PlaneGeometry(size, size, 80, 80);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Procedural height rolling hills & river trench
      let y = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 2.5;
      y += Math.sin(x * 0.08 + z * 0.05) * 1.2;

      // River bed running through center
      const distFromRiver = Math.abs(x - z * 0.2);
      if (distFromRiver < 18) {
        y -= (18 - distFromRiver) * 0.22;
      }

      // Flat bases
      if (Math.hypot(x - 90, z - 90) < 30 || Math.hypot(x + 90, z + 90) < 30) {
        y = 0;
      }

      posAttr.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x3d6b35,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // River Water Mesh
    const waterGeo = new THREE.PlaneGeometry(size, size);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -1.2;
    this.scene.add(waterMesh);

    // 2. Capture Points Setup
    this.createCapturePoint('A', 'Alpha Bunker', new THREE.Vector3(-65, 0, -45));
    this.createCapturePoint('B', 'Bravo Central Depot', new THREE.Vector3(0, 0, 0));
    this.createCapturePoint('C', 'Charlie Radar Hill', new THREE.Vector3(65, 0, 45));

    // 3. Environment Props (Buildings, Watchtowers, Trees, Sandbags)
    this.buildBunker(new THREE.Vector3(-65, 0, -45));
    this.buildCentralDepot(new THREE.Vector3(0, 0, 0));
    this.buildRadarStation(new THREE.Vector3(65, 0, 45));

    // Spawn Scatter Cover & Trees
    this.spawnProps();
  }

  private createCapturePoint(id: 'A' | 'B' | 'C', name: string, pos: THREE.Vector3) {
    const flagGroup = new THREE.Group();
    flagGroup.position.copy(pos);

    // Flag Pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 10, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 5;
    pole.castShadow = true;
    flagGroup.add(pole);

    // Voxel Banner Flag
    const flagGeo = new THREE.BoxGeometry(2.4, 1.4, 0.1);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3 });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(1.2, 8.8, 0);
    flagMesh.castShadow = true;
    flagGroup.add(flagMesh);

    // Ground Capture Ring Indicator
    const ringGeo = new THREE.RingGeometry(11.5, 12.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(pos.x, 0.1, pos.z);

    this.scene.add(flagGroup);
    this.scene.add(ringMesh);

    this.capturePoints.push({
      id,
      name,
      position: pos.clone(),
      owner: 'neutral',
      progress: 0,
      flagMesh,
      ringMesh,
      radius: 12
    });
  }

  private buildBunker(pos: THREE.Vector3) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });

    // Main Bunker structure
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 10), mat);
    bunker.position.set(pos.x - 8, 2.25, pos.z - 6);
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    this.scene.add(bunker);

    this.collisionBoxes.push(new THREE.Box3().setFromObject(bunker));

    // Watchtower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 11, 4), mat);
    tower.position.set(pos.x + 8, 5.5, pos.z + 6);
    tower.castShadow = true;
    this.scene.add(tower);

    this.collisionBoxes.push(new THREE.Box3().setFromObject(tower));
  }

  private buildCentralDepot(pos: THREE.Vector3) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });

    const hangar = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 14), mat);
    hangar.position.set(pos.x + 10, 3.5, pos.z - 8);
    hangar.castShadow = true;
    this.scene.add(hangar);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(hangar));

    // Supply Crates
    for (let i = 0; i < 6; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
      crate.position.set(pos.x - 6 + i * 2.2, 1, pos.z + 5);
      crate.castShadow = true;
      this.scene.add(crate);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(crate));
    }
  }

  private buildRadarStation(pos: THREE.Vector3) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), mat);
    base.position.set(pos.x - 6, 3, pos.z - 6);
    base.castShadow = true;
    this.scene.add(base);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(base));

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 0.5, 1.2, 12), dishMat);
    dish.rotation.z = Math.PI / 4;
    dish.position.set(pos.x - 6, 7.5, pos.z - 6);
    this.scene.add(dish);
  }

  private spawnProps() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6, flatShading: true });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });

    const treeGeo = new THREE.ConeGeometry(2.5, 6, 5);
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2.5, 5);

    // Random Voxel Trees & Rocks
    for (let i = 0; i < 90; i++) {
      const rx = (Math.random() - 0.5) * 260;
      const rz = (Math.random() - 0.5) * 260;

      // Keep clear of direct capture flag centers
      if (Math.hypot(rx + 65, rz + 45) < 16 || Math.hypot(rx, rz) < 18 || Math.hypot(rx - 65, rz - 45) < 16) {
        continue;
      }

      if (i % 3 === 0) {
        // Rock
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.5), rockMat);
        rock.position.set(rx, 0.8, rz);
        rock.castShadow = true;
        this.scene.add(rock);
        this.collisionBoxes.push(new THREE.Box3().setFromObject(rock));
      } else {
        // Tree
        const group = new THREE.Group();
        group.position.set(rx, 0, rz);

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.25;
        trunk.castShadow = true;

        const leaves = new THREE.Mesh(treeGeo, leavesMat);
        leaves.position.y = 4.5;
        leaves.castShadow = true;

        group.add(trunk, leaves);
        this.scene.add(group);
      }
    }

    // Concrete Barricades near roads
    for (let i = 0; i < 12; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.8), sandbagMat);
      bag.position.set(-20 + i * 4, 0.6, -15 + (i % 2) * 6);
      bag.castShadow = true;
      this.scene.add(bag);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(bag));
    }
  }

  public updateCapturePoints(
    delta: number,
    blueUnitsNear: Record<'A' | 'B' | 'C', number>,
    redUnitsNear: Record<'A' | 'B' | 'C', number>
  ) {
    this.capturePoints.forEach(cp => {
      const blueCount = blueUnitsNear[cp.id] || 0;
      const redCount = redUnitsNear[cp.id] || 0;
      const diff = blueCount - redCount;

      if (diff !== 0) {
        cp.progress += diff * 15 * delta;
        cp.progress = Math.max(-100, Math.min(100, cp.progress));

        if (cp.progress >= 100) {
          cp.owner = 'blue';
        } else if (cp.progress <= -100) {
          cp.owner = 'red';
        } else if (Math.abs(cp.progress) < 10) {
          cp.owner = 'neutral';
        }
      }

      // Update flag colors & heights
      const color = cp.owner === 'blue' ? 0x3b82f6 : cp.owner === 'red' ? 0xef4444 : 0x64748b;
      (cp.flagMesh.material as THREE.MeshStandardMaterial).color.setHex(color);
      (cp.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(color);

      // Flag elevation based on progress magnitude
      const heightFrac = (Math.abs(cp.progress) / 100);
      cp.flagMesh.position.y = 3.5 + heightFrac * 5.3;
    });
  }
}

import * as THREE from 'three';
import { getLowPolyMaterial, PALETTE } from './palette';

interface Particle {
  mesh: THREE.Mesh;
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
}

export class LowPolyFootstepParticles {
  public group: THREE.Group;
  private pool: Particle[] = [];
  private poolSize = 64;

  constructor() {
    this.group = new THREE.Group();

    // Create varied low-poly geometries: faceted dodecahedron & tetrahedron
    const dustGeo = new THREE.DodecahedronGeometry(0.1, 0);
    const grassGeo = new THREE.TetrahedronGeometry(0.12, 0);

    // Color palette for dust and grass flecks
    const dustMat1 = getLowPolyMaterial(PALETTE.pathBeigeHex, { roughness: 0.95 });
    const dustMat2 = getLowPolyMaterial(PALETTE.roofTileCream, { roughness: 0.9 });
    const grassMat1 = getLowPolyMaterial(PALETTE.meadowGreenLight, { roughness: 0.85 });
    const grassMat2 = getLowPolyMaterial(PALETTE.meadowGreenBase, { roughness: 0.85 });

    const materials = [dustMat1, dustMat2, grassMat1, grassMat2];

    for (let i = 0; i < this.poolSize; i++) {
      const isGrass = i % 3 === 0;
      const geo = isGrass ? grassGeo : dustGeo;
      const mat = materials[i % materials.length];

      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.castShadow = true;
      this.group.add(mesh);

      this.pool.push({
        mesh,
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        baseScale: 0.1,
        rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotSpeed: (Math.random() - 0.5) * 8,
      });
    }
  }

  private spawnParticle(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    maxLife: number,
    baseScale: number
  ) {
    // Find an inactive particle, or the oldest one
    let p = this.pool.find((item) => !item.active);
    if (!p) {
      p = this.pool[0];
      let minLife = p.life;
      for (let i = 1; i < this.pool.length; i++) {
        if (this.pool[i].life < minLife) {
          minLife = this.pool[i].life;
          p = this.pool[i];
        }
      }
    }

    p.active = true;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.baseScale = baseScale;
    p.position.copy(origin);
    p.velocity.copy(velocity);
    p.rotAxis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    p.rotSpeed = (Math.random() - 0.5) * 10;

    p.mesh.position.copy(origin);
    p.mesh.scale.setScalar(0.01);
    p.mesh.visible = true;
  }

  /**
   * Subtle dust & grass flecks kicked back when the adventurer takes a step
   */
  public emitStep(
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    fwd: THREE.Vector3,
    isSprinting: boolean
  ) {
    const count = isSprinting ? 4 : 2;
    const speedMult = isSprinting ? 1.4 : 1.0;

    // Backward direction with slight spread
    const back = fwd.clone().negate().normalize();
    const right = new THREE.Vector3().crossVectors(normal, fwd).normalize();

    for (let i = 0; i < count; i++) {
      const spreadX = (Math.random() - 0.5) * 0.45;
      const spreadZ = (Math.random() - 0.5) * 0.25;

      const origin = pos
        .clone()
        .addScaledVector(right, spreadX)
        .addScaledVector(back, Math.random() * 0.15)
        .addScaledVector(normal, 0.04);

      // Velocity: kicking slightly back, upward, and spreading outwards
      const vel = back
        .clone()
        .multiplyScalar((0.6 + Math.random() * 0.8) * speedMult)
        .addScaledVector(right, (Math.random() - 0.5) * 0.8 * speedMult)
        .addScaledVector(normal, (0.4 + Math.random() * 0.5) * speedMult);

      const life = 0.35 + Math.random() * 0.25;
      const scale = (0.08 + Math.random() * 0.08) * (isSprinting ? 1.25 : 1.0);

      this.spawnParticle(origin, vel, life, scale);
    }
  }

  /**
   * Radial low-poly dust & grass ring when jumping off the planet surface
   */
  public emitJumpBurst(pos: THREE.Vector3, normal: THREE.Vector3) {
    const count = 8;
    // Build local tangent axes
    let tangentX = new THREE.Vector3(1, 0, 0).cross(normal);
    if (tangentX.lengthSq() < 0.01) tangentX = new THREE.Vector3(0, 0, 1).cross(normal);
    tangentX.normalize();
    const tangentZ = new THREE.Vector3().crossVectors(normal, tangentX).normalize();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dir = tangentX
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(tangentZ, Math.sin(angle))
        .normalize();

      const origin = pos.clone().addScaledVector(dir, 0.15).addScaledVector(normal, 0.05);

      const speed = 1.2 + Math.random() * 0.8;
      const vel = dir
        .clone()
        .multiplyScalar(speed)
        .addScaledVector(normal, 0.6 + Math.random() * 0.5);

      const life = 0.45 + Math.random() * 0.25;
      const scale = 0.12 + Math.random() * 0.08;

      this.spawnParticle(origin, vel, life, scale);
    }
  }

  /**
   * Ground impact dust burst when touching back down
   */
  public emitLandingBurst(pos: THREE.Vector3, normal: THREE.Vector3) {
    const count = 10;
    let tangentX = new THREE.Vector3(1, 0, 0).cross(normal);
    if (tangentX.lengthSq() < 0.01) tangentX = new THREE.Vector3(0, 0, 1).cross(normal);
    tangentX.normalize();
    const tangentZ = new THREE.Vector3().crossVectors(normal, tangentX).normalize();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dir = tangentX
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(tangentZ, Math.sin(angle))
        .normalize();

      const origin = pos.clone().addScaledVector(dir, 0.1).addScaledVector(normal, 0.05);

      const speed = 1.4 + Math.random() * 0.9;
      const vel = dir
        .clone()
        .multiplyScalar(speed)
        .addScaledVector(normal, 0.35 + Math.random() * 0.4);

      const life = 0.4 + Math.random() * 0.2;
      const scale = 0.1 + Math.random() * 0.07;

      this.spawnParticle(origin, vel, life, scale);
    }
  }

  public update(delta: number, planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    for (const p of this.pool) {
      if (!p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      // Physics: drag and slight gravity pull towards planet center
      const toCenter = planetCenter.clone().sub(p.position).normalize();
      p.velocity.addScaledVector(toCenter, delta * 1.8); // gentle planet gravity
      p.velocity.multiplyScalar(Math.max(0, 1 - delta * 2.8)); // air resistance

      p.position.addScaledVector(p.velocity, delta);
      p.mesh.position.copy(p.position);

      // Low-poly tumbling rotation
      p.mesh.rotateOnAxis(p.rotAxis, p.rotSpeed * delta);

      // Scale: pops quickly to full size then shrinks smoothly
      const progress = 1.0 - p.life / p.maxLife;
      let scale = p.baseScale;
      if (progress < 0.2) {
        scale = p.baseScale * (progress / 0.2);
      } else {
        const fade = (1.0 - progress) / 0.8;
        scale = p.baseScale * Math.max(0.01, fade);
      }
      p.mesh.scale.setScalar(scale);
    }
  }
}

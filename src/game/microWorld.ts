import * as THREE from 'three';
import { PALETTE, getLowPolyMaterial } from './palette';
import { POI, Collectible } from '../types/game';

export interface MicroWorldObjects {
  planetMesh: THREE.Mesh;
  trees: THREE.Group[];
  deers: LowPolyDeer[];
  windmillRotor: THREE.Group;
  clouds: THREE.Group[];
  smokeParticles: SmokeEmitter;
  fireParticles: CampfireFlame;
  collectibles: CollectibleMesh[];
  pointsOfInterest: POI[];
  getSurfaceAltitude: (dir: THREE.Vector3) => number;
}

export class SmokeEmitter {
  public group: THREE.Group;
  private puffs: { mesh: THREE.Mesh; life: number; speed: number; rotSpeed: number }[] = [];
  private spawnTimer: number = 0;
  private origin: THREE.Vector3;
  private upDir: THREE.Vector3;

  constructor(origin: THREE.Vector3, upDir: THREE.Vector3) {
    this.group = new THREE.Group();
    this.origin = origin.clone();
    this.upDir = upDir.clone().normalize();

    const smokeMat = getLowPolyMaterial(0xe8ecef, {
      transparent: true,
      opacity: 0.65,
      roughness: 0.9,
    });
    const smokeGeo = new THREE.DodecahedronGeometry(0.16, 0);

    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.puffs.push({
        mesh,
        life: 0,
        speed: 0.4 + Math.random() * 0.25,
        rotSpeed: (Math.random() - 0.5) * 2,
      });
    }
  }

  public update(delta: number) {
    this.spawnTimer += delta;
    if (this.spawnTimer > 0.45) {
      this.spawnTimer = 0;
      const deadPuff = this.puffs.find((p) => p.life <= 0);
      if (deadPuff) {
        deadPuff.life = 1.0;
        deadPuff.mesh.visible = true;
        deadPuff.mesh.position.copy(this.origin);
        deadPuff.mesh.scale.setScalar(0.7 + Math.random() * 0.3);
      }
    }

    for (const puff of this.puffs) {
      if (puff.life > 0) {
        puff.life -= delta * 0.45;
        puff.mesh.position.addScaledVector(this.upDir, delta * puff.speed);
        puff.mesh.rotation.y += delta * puff.rotSpeed;
        const progress = 1.0 - puff.life;
        const s = (0.7 + progress * 1.8) * Math.sin(puff.life * Math.PI);
        puff.mesh.scale.setScalar(Math.max(0.01, s));

        if (puff.life <= 0) {
          puff.mesh.visible = false;
        }
      }
    }
  }
}

export class CampfireFlame {
  public group: THREE.Group;
  private flameMeshes: THREE.Mesh[] = [];
  private emberMeshes: THREE.Mesh[] = [];
  public light: THREE.PointLight;

  constructor(position: THREE.Vector3, upDir: THREE.Vector3) {
    this.group = new THREE.Group();

    // Point light with warm dancing flicker
    this.light = new THREE.PointLight(0xff793f, 2.4, 7, 1.8);
    this.light.position.copy(position).addScaledVector(upDir, 0.4);
    this.light.castShadow = true;
    this.light.shadow.bias = -0.002;
    this.group.add(this.light);

    // Faceted low-poly flame shards
    const flameMat = getLowPolyMaterial(PALETTE.campfireFlameOrange, {
      emissive: 0xff5252,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    const emberMat = getLowPolyMaterial(PALETTE.campfireEmberYellow, {
      emissive: 0xffd32a,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), upDir);

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.ConeGeometry(0.14, 0.42, 5);
      const mesh = new THREE.Mesh(geo, i % 2 === 0 ? flameMat : emberMat);
      mesh.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15));
      mesh.quaternion.copy(alignQuat);
      this.flameMeshes.push(mesh);
      this.group.add(mesh);
    }

    // Floating embers
    const emberGeo = new THREE.DodecahedronGeometry(0.04, 0);
    for (let i = 0; i < 5; i++) {
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.copy(position).addScaledVector(upDir, 0.2 + Math.random() * 0.5);
      this.emberMeshes.push(ember);
      this.group.add(ember);
    }
  }

  public update(time: number) {
    // Light flickering
    this.light.intensity = 2.0 + Math.sin(time * 12) * 0.5 + Math.cos(time * 19) * 0.3;

    this.flameMeshes.forEach((flame, idx) => {
      const offset = idx * 1.5;
      const scaleY = 0.8 + Math.sin(time * 10 + offset) * 0.35 + Math.cos(time * 16 + offset) * 0.2;
      const scaleXZ = 0.9 + Math.cos(time * 8 + offset) * 0.2;
      flame.scale.set(scaleXZ, scaleY, scaleXZ);
    });

    this.emberMeshes.forEach((ember, idx) => {
      ember.position.y += Math.sin(time * 4 + idx) * 0.004;
      ember.scale.setScalar(0.7 + Math.sin(time * 6 + idx) * 0.3);
    });
  }
}

export class CollectibleMesh {
  public mesh: THREE.Group;
  public id: string;
  public position: THREE.Vector3;
  public collected: boolean = false;
  private basePos: THREE.Vector3;
  private normal: THREE.Vector3;

  constructor(id: string, pos: THREE.Vector3, normal: THREE.Vector3) {
    this.id = id;
    this.position = pos.clone();
    this.basePos = pos.clone();
    this.normal = normal.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.basePos);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.normal);
    this.mesh.quaternion.copy(alignQuat);

    // Low-poly faceted golden pinecone / acorn
    const goldMat = getLowPolyMaterial(PALETTE.goldenAcorn, {
      metalness: 0.35,
      roughness: 0.3,
      emissive: 0x9e6c1b,
      emissiveIntensity: 0.35,
    });

    const acornCapGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.12, 6);
    const acornCap = new THREE.Mesh(acornCapGeo, getLowPolyMaterial(PALETTE.woodDark));
    acornCap.position.y = 0.32;
    this.mesh.add(acornCap);

    const acornBodyGeo = new THREE.DodecahedronGeometry(0.24, 0);
    acornBodyGeo.scale(0.85, 1.25, 0.85);
    const acornBody = new THREE.Mesh(acornBodyGeo, goldMat);
    acornBody.position.y = 0.16;
    acornBody.castShadow = true;
    this.mesh.add(acornBody);

    // Tiny stem
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 4);
    const stem = new THREE.Mesh(stemGeo, getLowPolyMaterial(PALETTE.woodDark));
    stem.position.y = 0.42;
    this.mesh.add(stem);
  }

  public update(time: number) {
    if (this.collected) return;
    this.mesh.rotation.y += 0.025;
    const hover = Math.sin(time * 3 + this.position.x * 2) * 0.08;
    this.mesh.position.copy(this.basePos).addScaledVector(this.normal, 0.2 + hover);
  }
}

export class LowPolyDeer {
  public group: THREE.Group;
  public position: THREE.Vector3;
  public normal: THREE.Vector3;
  private headPivot: THREE.Group;
  private bodyMesh: THREE.Mesh;
  private leftFrontLeg: THREE.Mesh;
  private rightFrontLeg: THREE.Mesh;
  private leftBackLeg: THREE.Mesh;
  private rightBackLeg: THREE.Mesh;
  private animOffset: number;
  public isGrazing: boolean = true;
  public isHappy: boolean = false;
  private happyTimer: number = 0;

  constructor(pos: THREE.Vector3, normal: THREE.Vector3, rotationY: number = 0) {
    this.position = pos.clone();
    this.normal = normal.clone();
    this.animOffset = Math.random() * 10;

    this.group = new THREE.Group();
    this.group.position.copy(pos);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    this.group.quaternion.copy(alignQuat);
    this.group.rotateY(rotationY);

    const deerMat = getLowPolyMaterial(PALETTE.deerTan, { roughness: 0.8 });
    const bellyMat = getLowPolyMaterial(PALETTE.deerBellyCream, { roughness: 0.8 });
    const antlerMat = getLowPolyMaterial(PALETTE.deerAntler, { roughness: 0.6 });
    const noseMat = getLowPolyMaterial(PALETTE.deerNose);

    // Body (faceted low-poly)
    const bodyGeo = new THREE.BoxGeometry(0.48, 0.44, 0.82);
    this.bodyMesh = new THREE.Mesh(bodyGeo, deerMat);
    this.bodyMesh.position.y = 0.72;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Belly cream accent
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.65), bellyMat);
    belly.position.set(0, 0.54, 0);
    this.group.add(belly);

    // Tail
    const tailGeo = new THREE.BoxGeometry(0.12, 0.14, 0.16);
    const tail = new THREE.Mesh(tailGeo, bellyMat);
    tail.position.set(0, 0.86, -0.45);
    tail.rotation.x = -0.3;
    this.group.add(tail);

    // Head and neck pivot for grazing animation
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 0.76, 0.4);

    // Neck
    const neckGeo = new THREE.BoxGeometry(0.24, 0.48, 0.28);
    const neck = new THREE.Mesh(neckGeo, deerMat);
    neck.position.set(0, 0.24, 0.12);
    neck.rotation.x = 0.35;
    neck.castShadow = true;
    this.headPivot.add(neck);

    // Head
    const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.4);
    const head = new THREE.Mesh(headGeo, deerMat);
    head.position.set(0, 0.46, 0.3);
    head.castShadow = true;
    this.headPivot.add(head);

    // Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), noseMat);
    nose.position.set(0, 0.44, 0.54);
    this.headPivot.add(nose);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
    const leftEar = new THREE.Mesh(earGeo, deerMat);
    leftEar.position.set(-0.16, 0.62, 0.26);
    leftEar.rotation.z = -0.4;
    const rightEar = new THREE.Mesh(earGeo, deerMat);
    rightEar.position.set(0.16, 0.62, 0.26);
    rightEar.rotation.z = 0.4;
    this.headPivot.add(leftEar, rightEar);

    // Antlers (branching low-poly twigs)
    const antlerStemGeo = new THREE.BoxGeometry(0.06, 0.42, 0.06);
    const branchGeo = new THREE.BoxGeometry(0.05, 0.2, 0.05);

    const leftAntler = new THREE.Mesh(antlerStemGeo, antlerMat);
    leftAntler.position.set(-0.12, 0.74, 0.28);
    leftAntler.rotation.z = -0.3;
    leftAntler.rotation.x = -0.15;
    const leftBranch = new THREE.Mesh(branchGeo, antlerMat);
    leftBranch.position.set(-0.06, 0.12, 0.05);
    leftBranch.rotation.z = -0.6;
    leftAntler.add(leftBranch);
    this.headPivot.add(leftAntler);

    const rightAntler = new THREE.Mesh(antlerStemGeo, antlerMat);
    rightAntler.position.set(0.12, 0.74, 0.28);
    rightAntler.rotation.z = 0.3;
    rightAntler.rotation.x = -0.15;
    const rightBranch = new THREE.Mesh(branchGeo, antlerMat);
    rightBranch.position.set(0.06, 0.12, 0.05);
    rightBranch.rotation.z = 0.6;
    rightAntler.add(rightBranch);
    this.headPivot.add(rightAntler);

    this.group.add(this.headPivot);

    // 4 Slender Legs
    const legGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);
    const hoofGeo = new THREE.BoxGeometry(0.13, 0.1, 0.13);

    const createLeg = (x: number, z: number) => {
      const leg = new THREE.Mesh(legGeo, deerMat);
      leg.position.set(x, 0.3, z);
      leg.castShadow = true;
      const hoof = new THREE.Mesh(hoofGeo, noseMat);
      hoof.position.set(0, -0.26, 0);
      leg.add(hoof);
      return leg;
    };

    this.leftFrontLeg = createLeg(-0.16, 0.26);
    this.rightFrontLeg = createLeg(0.16, 0.26);
    this.leftBackLeg = createLeg(-0.16, -0.26);
    this.rightBackLeg = createLeg(0.16, -0.26);

    this.group.add(this.leftFrontLeg, this.rightFrontLeg, this.leftBackLeg, this.rightBackLeg);
    this.group.scale.set(0.9, 0.9, 0.9);
  }

  public pet() {
    this.isHappy = true;
    this.happyTimer = 2.5;
  }

  public update(time: number, delta: number) {
    if (this.isHappy) {
      this.happyTimer -= delta;
      if (this.happyTimer <= 0) {
        this.isHappy = false;
      }
      // Joyful bounce & head shake
      this.group.position.y = this.position.y + Math.abs(Math.sin(time * 12)) * 0.35;
      this.headPivot.rotation.x = -0.1 + Math.sin(time * 10) * 0.25;
      this.headPivot.rotation.y = Math.sin(time * 14) * 0.35;
      return;
    }

    // Gentle grazing cycle: nibble grass, raise head and look around
    const t = time * 0.8 + this.animOffset;
    const cycle = Math.sin(t);

    if (cycle > 0) {
      // Grazing head down
      this.headPivot.rotation.x = 0.55 + Math.sin(t * 4) * 0.08;
      this.headPivot.rotation.y = Math.sin(t * 1.5) * 0.1;
    } else {
      // Looking up gracefully
      this.headPivot.rotation.x = -0.1 + Math.sin(t * 2) * 0.1;
      this.headPivot.rotation.y = Math.sin(t * 1.8) * 0.3;
    }

    // Subtle breath bobbing
    this.bodyMesh.position.y = 0.72 + Math.sin(t * 2) * 0.015;
  }
}

/**
 * Builds the complete 3D micro-planet world
 */
export function buildMicroWorld(scene: THREE.Scene, planetRadius: number = 16): MicroWorldObjects {
  // 1. Terrain: Rolling bright green grassy hills curving into a spherical mini-world
  const terrainGeo = new THREE.IcosahedronGeometry(planetRadius, 6);
  const posAttr = terrainGeo.attributes.position;
  const vertex = new THREE.Vector3();

  // Noise elevation calculation function
  const getElevation = (x: number, y: number, z: number): number => {
    const len = Math.sqrt(x * x + y * y + z * z);
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Harmonious low-poly rolling hills
    const hill1 = Math.sin(nx * 4.2) * Math.cos(ny * 3.8) * 0.55;
    const hill2 = Math.cos(ny * 6.5 + nz * 5.2) * 0.35;
    const hill3 = Math.sin(nz * 7.1 + nx * 5.5) * 0.2;
    // Flatten spawn area at the north pole (+Y) for cozy walking start
    const northPoleDist = Math.acos(Math.min(1, Math.max(-1, ny)));
    const flatWeight = Math.min(1, northPoleDist * 1.4);

    return (hill1 + hill2 + hill3) * flatWeight;
  };

  // Displace terrain vertices
  const colors: number[] = [];
  const colorBase = new THREE.Color(PALETTE.meadowGreenBase);
  const colorLight = new THREE.Color(PALETTE.meadowGreenLight);
  const colorDeep = new THREE.Color(PALETTE.meadowGreenDeep);

  for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i);
    const elev = getElevation(vertex.x, vertex.y, vertex.z);
    const currentLen = vertex.length();
    vertex.setLength(currentLen + elev);
    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);

    // Subtle vertex color blending for organic hill highlights
    const blendColor = new THREE.Color();
    if (elev > 0.2) {
      blendColor.lerpColors(colorBase, colorLight, Math.min(1, (elev - 0.2) * 2));
    } else {
      blendColor.lerpColors(colorBase, colorDeep, Math.min(1, -elev * 2));
    }
    colors.push(blendColor.r, blendColor.g, blendColor.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const planetMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.88,
    metalness: 0.04,
  });

  const planetMesh = new THREE.Mesh(terrainGeo, planetMat);
  planetMesh.receiveShadow = true;
  planetMesh.castShadow = true;
  scene.add(planetMesh);

  // Surface altitude sampler helper
  const getSurfaceAltitude = (dir: THREE.Vector3): number => {
    const nd = dir.clone().normalize();
    const elev = getElevation(nd.x * planetRadius, nd.y * planetRadius, nd.z * planetRadius);
    return planetRadius + elev;
  };

  const placeOnSurface = (obj: THREE.Object3D, dir: THREE.Vector3, extraHeight: number = 0) => {
    const norm = dir.clone().normalize();
    const alt = getSurfaceAltitude(norm) + extraHeight;
    const pos = norm.clone().multiplyScalar(alt);
    obj.position.copy(pos);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
    obj.quaternion.copy(alignQuat);
    return { pos, norm };
  };

  // 2. Light beige hexagonal stepping-stone pathways
  const pathMat = getLowPolyMaterial(PALETTE.pathBeigeHex, { roughness: 0.95 });
  const hexGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.08, 6);

  // Helper to layout stepping stones along a great-circle arc
  const createStonePath = (startDir: THREE.Vector3, endDir: THREE.Vector3, count: number) => {
    const pathGroup = new THREE.Group();
    const v1 = startDir.clone().normalize();
    const v2 = endDir.clone().normalize();

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      // Slerp along great circle
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(v1, v2);
      const intermediate = v1.clone().applyQuaternion(
        new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(v1, v2), t)
      );

      // Add gentle natural path wobble
      const side = new THREE.Vector3().crossVectors(intermediate, new THREE.Vector3(0, 1, 0)).normalize();
      intermediate.addScaledVector(side, Math.sin(i * 1.4) * 0.12);

      const stone = new THREE.Mesh(hexGeo, pathMat);
      stone.rotation.y = (i * 0.8) % Math.PI;
      stone.castShadow = true;
      stone.receiveShadow = true;
      placeOnSurface(stone, intermediate, 0.02);
      pathGroup.add(stone);
    }
    scene.add(pathGroup);
  };

  // Direction landmarks on planet
  const spawnDir = new THREE.Vector3(0, 1, 0); // North pole
  const cabinDir = new THREE.Vector3(0.5, 0.8, 0.32).normalize(); // Cozy log cabin
  const campfireDir = new THREE.Vector3(-0.48, 0.82, -0.3).normalize(); // Orange tent & campfire
  const barnDir = new THREE.Vector3(-0.25, 0.65, 0.71).normalize(); // Rustic red barn & windmill
  const deerMeadowDir = new THREE.Vector3(0.68, 0.62, -0.38).normalize(); // Deer grazing meadow
  const scenicLookoutDir = new THREE.Vector3(-0.65, 0.65, 0.38).normalize(); // Lookout knoll

  // Create stepping stone trails
  createStonePath(spawnDir, cabinDir, 9);
  createStonePath(spawnDir, campfireDir, 9);
  createStonePath(spawnDir, barnDir, 12);
  createStonePath(cabinDir, deerMeadowDir, 8);
  createStonePath(campfireDir, scenicLookoutDir, 8);

  // 3. Cozy wooden log cabin with a checkered roof
  const cabinGroup = new THREE.Group();
  const woodLogMat = getLowPolyMaterial(PALETTE.woodWarm);
  const woodEndMat = getLowPolyMaterial(PALETTE.woodLogEnd);
  const redTileMat = getLowPolyMaterial(PALETTE.roofTileRed);
  const creamTileMat = getLowPolyMaterial(PALETTE.roofTileCream);
  const stoneMat = getLowPolyMaterial(PALETTE.riverRockGrey);
  const windowGlowMat = getLowPolyMaterial(PALETTE.warmLanternAmber, {
    emissive: 0xffaa33,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  // Log cabin foundation / stone base
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 2.6), stoneMat);
  foundation.position.y = 0.2;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  cabinGroup.add(foundation);

  // Stacked horizontal logs
  const logGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6);
  logGeo.rotateZ(Math.PI / 2);

  for (let layer = 0; layer < 7; layer++) {
    const yPos = 0.45 + layer * 0.26;
    // Front & Back logs
    const logFront = new THREE.Mesh(logGeo, woodLogMat);
    logFront.position.set(0, yPos, 1.25);
    logFront.castShadow = true;
    const logBack = new THREE.Mesh(logGeo, woodLogMat);
    logBack.position.set(0, yPos, -1.25);
    logBack.castShadow = true;

    cabinGroup.add(logFront, logBack);

    // Left & Right side logs
    const sideLogGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.8, 6);
    sideLogGeo.rotateX(Math.PI / 2);
    const logLeft = new THREE.Mesh(sideLogGeo, woodEndMat);
    logLeft.position.set(-1.55, yPos + 0.13, 0);
    logLeft.castShadow = true;
    const logRight = new THREE.Mesh(sideLogGeo, woodEndMat);
    logRight.position.set(1.55, yPos + 0.13, 0);
    logRight.castShadow = true;
    cabinGroup.add(logLeft, logRight);
  }

  // Wooden door
  const doorGeo = new THREE.BoxGeometry(0.7, 1.3, 0.12);
  const door = new THREE.Mesh(doorGeo, getLowPolyMaterial(PALETTE.woodDark));
  door.position.set(0, 0.95, 1.3);
  door.castShadow = true;
  cabinGroup.add(door);

  // Front porch lantern
  const lanternPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), getLowPolyMaterial(PALETTE.woodDark));
  lanternPost.position.set(0.65, 1.3, 1.4);
  const lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), windowGlowMat);
  lanternGlass.position.set(0.65, 1.45, 1.4);
  cabinGroup.add(lanternPost, lanternGlass);

  // Cozy glowing windows
  const winGeo = new THREE.BoxGeometry(0.6, 0.6, 0.1);
  const winFront = new THREE.Mesh(winGeo, windowGlowMat);
  winFront.position.set(-0.85, 1.25, 1.28);
  const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.6), windowGlowMat);
  winSide.position.set(1.58, 1.25, 0);
  cabinGroup.add(winFront, winSide);

  // Checkered roof: interlocking red and cream shingle pattern
  const roofGroup = new THREE.Group();
  roofGroup.position.y = 2.25;

  // Gable triangle ends
  const gableMat = getLowPolyMaterial(PALETTE.woodWarm);
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-1.6, 0);
  gableShape.lineTo(1.6, 0);
  gableShape.lineTo(0, 1.2);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 2.8, bevelEnabled: false });
  gableGeo.translate(0, 0, -1.4);
  const gableMesh = new THREE.Mesh(gableGeo, gableMat);
  roofGroup.add(gableMesh);

  // Detailed checkered shingle tiles
  const numRows = 5;
  const numCols = 7;
  const tileWidth = 0.48;
  const tileLength = 0.36;

  for (let side = -1; side <= 1; side += 2) {
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const isRed = (r + c) % 2 === 0;
        const tileMat = isRed ? redTileMat : creamTileMat;
        const tileGeo = new THREE.BoxGeometry(tileWidth, 0.06, tileLength);
        const tile = new THREE.Mesh(tileGeo, tileMat);

        const xPos = -1.4 + c * (tileWidth * 0.95);
        const distUp = r * 0.28;
        const yPos = distUp * 0.72;
        const zPos = side * (1.5 - distUp * 0.85);

        tile.position.set(xPos, yPos + 0.1, zPos);
        tile.rotation.x = side * -0.65;
        tile.castShadow = true;
        roofGroup.add(tile);
      }
    }
  }
  cabinGroup.add(roofGroup);

  // Stone Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.55, 2.2, 0.55);
  const chimney = new THREE.Mesh(chimneyGeo, stoneMat);
  chimney.position.set(-1.1, 2.2, -0.6);
  chimney.castShadow = true;
  cabinGroup.add(chimney);

  const { pos: cabinPos, norm: cabinNorm } = placeOnSurface(cabinGroup, cabinDir);
  scene.add(cabinGroup);

  // Animated low-poly smoke emitter from chimney top
  const chimneyTopPos = cabinPos.clone().addScaledVector(cabinNorm, 3.4).add(new THREE.Vector3(-0.9, 0, -0.4));
  const smokeParticles = new SmokeEmitter(chimneyTopPos, cabinNorm);
  scene.add(smokeParticles.group);

  // 4. Orange Tent & Cozy Campfire
  const campGroup = new THREE.Group();
  const tentMat = getLowPolyMaterial(PALETTE.tentOrange, { roughness: 0.7 });

  // A-frame low-poly tent
  const tentShape = new THREE.Shape();
  tentShape.moveTo(-1.1, 0);
  tentShape.lineTo(1.1, 0);
  tentShape.lineTo(0, 1.5);
  tentShape.closePath();
  const tentGeo = new THREE.ExtrudeGeometry(tentShape, { depth: 2.2, bevelEnabled: false });
  tentGeo.translate(0, 0, -1.1);
  const tentMesh = new THREE.Mesh(tentGeo, tentMat);
  tentMesh.castShadow = true;
  campGroup.add(tentMesh);

  // Tent interior ground mat
  const matGeo = new THREE.BoxGeometry(1.4, 0.05, 1.8);
  const groundMat = new THREE.Mesh(matGeo, getLowPolyMaterial(PALETTE.mossGreen));
  groundMat.position.set(0, 0.03, 0);
  campGroup.add(groundMat);

  // Front tent poles
  const poleMat = getLowPolyMaterial(PALETTE.woodLight);
  const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5), poleMat);
  poleL.position.set(-0.55, 0.75, 1.1);
  poleL.rotation.z = -0.55;
  const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5), poleMat);
  poleR.position.set(0.55, 0.75, 1.1);
  poleR.rotation.z = 0.55;
  campGroup.add(poleL, poleR);

  // Campfire setup
  const fireOffset = new THREE.Vector3(0, 0, 2.6);
  // Circle of river stones
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stoneGeo = new THREE.DodecahedronGeometry(0.14 + Math.random() * 0.06, 0);
    const rock = new THREE.Mesh(stoneGeo, stoneMat);
    rock.position.set(fireOffset.x + Math.cos(angle) * 0.55, 0.08, fireOffset.z + Math.sin(angle) * 0.55);
    rock.castShadow = true;
    campGroup.add(rock);
  }

  // Firewood logs crossed
  const fireLogGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.65, 5);
  fireLogGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const fLog = new THREE.Mesh(fireLogGeo, woodLogMat);
    fLog.position.set(fireOffset.x, 0.08, fireOffset.z);
    fLog.rotation.y = (i * Math.PI) / 3;
    fLog.castShadow = true;
    campGroup.add(fLog);
  }

  // Marshmallow roasting stick
  const stickGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4);
  stickGeo.rotateX(0.7);
  const stick = new THREE.Mesh(stickGeo, woodLogMat);
  stick.position.set(fireOffset.x + 0.6, 0.45, fireOffset.z + 0.4);
  const mallowGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6);
  const mallow = new THREE.Mesh(mallowGeo, getLowPolyMaterial(PALETTE.roofTileCream));
  mallow.position.set(0, 0.45, -0.4);
  stick.add(mallow);
  campGroup.add(stick);

  const { pos: campPos, norm: campNorm } = placeOnSurface(campGroup, campfireDir);
  scene.add(campGroup);

  // Campfire flickering light and flame particles
  const fireWorldPos = campPos.clone().add(new THREE.Vector3(0, 0, 1.8).applyQuaternion(campGroup.quaternion));
  const fireParticles = new CampfireFlame(fireWorldPos, campNorm);
  scene.add(fireParticles.group);

  // 5. Red Farm Barn with classic white-sailed Windmill and Metal Silo
  const farmGroup = new THREE.Group();
  const barnMat = getLowPolyMaterial(PALETTE.barnRusticRed, { roughness: 0.75 });
  const barnWhiteMat = getLowPolyMaterial(PALETTE.barnTrimWhite);
  const siloMat = getLowPolyMaterial(PALETTE.siloMetal, { metalness: 0.7, roughness: 0.35 });
  const siloRoofMat = getLowPolyMaterial(PALETTE.siloRoofMetal, { metalness: 0.5, roughness: 0.4 });

  // Main Barn structure (gambrel roof design)
  const barnBodyGeo = new THREE.BoxGeometry(3.6, 2.2, 4.2);
  const barnBody = new THREE.Mesh(barnBodyGeo, barnMat);
  barnBody.position.y = 1.1;
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;
  farmGroup.add(barnBody);

  // Barn Roof (steep lower pitch, shallower upper pitch)
  const roofMat = getLowPolyMaterial(PALETTE.woodDark);
  const roofBarnGeo = new THREE.ConeGeometry(2.9, 1.8, 4);
  roofBarnGeo.rotateY(Math.PI / 4);
  roofBarnGeo.scale(1.0, 1.0, 1.4);
  const barnRoof = new THREE.Mesh(roofBarnGeo, roofMat);
  barnRoof.position.y = 3.1;
  barnRoof.castShadow = true;
  farmGroup.add(barnRoof);

  // Barn double sliding doors with white X cross-bracing
  const doorPanelGeo = new THREE.BoxGeometry(1.1, 1.8, 0.1);
  const doorLeft = new THREE.Mesh(doorPanelGeo, barnWhiteMat);
  doorLeft.position.set(-0.6, 0.9, 2.12);
  const doorRight = new THREE.Mesh(doorPanelGeo, barnWhiteMat);
  doorRight.position.set(0.6, 0.9, 2.12);
  doorLeft.castShadow = true;
  doorRight.castShadow = true;
  farmGroup.add(doorLeft, doorRight);

  // Hay loft opening above doors
  const loftWindow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), getLowPolyMaterial(PALETTE.woodDark));
  loftWindow.position.set(0, 2.5, 2.12);
  farmGroup.add(loftWindow);

  // Shiny Metal Silo beside barn
  const siloGroup = new THREE.Group();
  siloGroup.position.set(2.8, 0, 0.5);

  const siloBodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 3.8, 12);
  const siloBody = new THREE.Mesh(siloBodyGeo, siloMat);
  siloBody.position.y = 1.9;
  siloBody.castShadow = true;
  siloGroup.add(siloBody);

  const siloDomeGeo = new THREE.ConeGeometry(0.95, 0.8, 12);
  const siloDome = new THREE.Mesh(siloDomeGeo, siloRoofMat);
  siloDome.position.y = 4.2;
  siloDome.castShadow = true;
  siloGroup.add(siloDome);

  // Silo maintenance ladder
  const ladderRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.6, 4);
  const ladderRailL = new THREE.Mesh(ladderRailGeo, siloRoofMat);
  ladderRailL.position.set(0.85, 1.8, -0.15);
  const ladderRailR = new THREE.Mesh(ladderRailGeo, siloRoofMat);
  ladderRailR.position.set(0.85, 1.8, 0.15);
  siloGroup.add(ladderRailL, ladderRailR);

  farmGroup.add(siloGroup);

  // Classic White-Sailed Windmill
  const windmillGroup = new THREE.Group();
  windmillGroup.position.set(-2.8, 0, 1.2);

  // Windmill stone base
  const millBaseGeo = new THREE.CylinderGeometry(1.1, 1.35, 1.2, 8);
  const millBase = new THREE.Mesh(millBaseGeo, stoneMat);
  millBase.position.y = 0.6;
  millBase.castShadow = true;
  windmillGroup.add(millBase);

  // Tapered wooden tower
  const millTowerGeo = new THREE.CylinderGeometry(0.8, 1.1, 3.2, 8);
  const millTower = new THREE.Mesh(millTowerGeo, getLowPolyMaterial(PALETTE.woodWarm));
  millTower.position.y = 2.8;
  millTower.castShadow = true;
  windmillGroup.add(millTower);

  // Windmill cap
  const millCapGeo = new THREE.ConeGeometry(0.9, 0.9, 8);
  const millCap = new THREE.Mesh(millCapGeo, roofMat);
  millCap.position.y = 4.8;
  millCap.castShadow = true;
  windmillGroup.add(millCap);

  // Windmill Spinning Rotor & 4 White Sails
  const windmillRotor = new THREE.Group();
  windmillRotor.position.set(0, 4.4, 0.9);

  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 6);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, getLowPolyMaterial(PALETTE.woodDark));
  windmillRotor.add(hub);

  const sailSparMat = getLowPolyMaterial(PALETTE.woodDark);
  const sailClothMat = getLowPolyMaterial(PALETTE.barnTrimWhite, { roughness: 0.9 });

  for (let i = 0; i < 4; i++) {
    const sailBlade = new THREE.Group();
    sailBlade.rotation.z = (i * Math.PI) / 2;

    // Wooden spar
    const sparGeo = new THREE.BoxGeometry(0.06, 2.2, 0.06);
    const spar = new THREE.Mesh(sparGeo, sailSparMat);
    spar.position.y = 1.1;
    spar.castShadow = true;
    sailBlade.add(spar);

    // White fabric sail
    const sailGeo = new THREE.BoxGeometry(0.48, 1.6, 0.02);
    const sail = new THREE.Mesh(sailGeo, sailClothMat);
    sail.position.set(0.24, 1.3, 0.02);
    sail.rotation.y = 0.12;
    sail.castShadow = true;
    sailBlade.add(sail);

    windmillRotor.add(sailBlade);
  }

  windmillGroup.add(windmillRotor);
  farmGroup.add(windmillGroup);

  placeOnSurface(farmGroup, barnDir);
  scene.add(farmGroup);

  // 6. Low-Poly Grazing Deer in scenic meadow
  const deers: LowPolyDeer[] = [];
  const deerPositions = [
    { dir: deerMeadowDir, rot: 0.4 },
    { dir: new THREE.Vector3(0.58, 0.72, -0.42).normalize(), rot: -1.2 },
    { dir: new THREE.Vector3(0.72, 0.58, -0.22).normalize(), rot: 2.1 },
  ];

  deerPositions.forEach((dp) => {
    const norm = dp.dir.clone().normalize();
    const alt = getSurfaceAltitude(norm);
    const pos = norm.clone().multiplyScalar(alt);
    const deer = new LowPolyDeer(pos, norm, dp.rot);
    scene.add(deer.group);
    deers.push(deer);
  });

  // 7. Angular Low-Poly Evergreen Pine Trees
  const trees: THREE.Group[] = [];
  const trunkMat = getLowPolyMaterial(PALETTE.woodDark);
  const pineMats = [
    getLowPolyMaterial(PALETTE.pineFoliageDark),
    getLowPolyMaterial(PALETTE.pineFoliageMid),
    getLowPolyMaterial(PALETTE.pineFoliageLight),
  ];

  const createPineTree = (scale = 1.0) => {
    const tree = new THREE.Group();

    // Hexagonal wooden trunk
    const tGeo = new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 1.2 * scale, 6);
    const trunk = new THREE.Mesh(tGeo, trunkMat);
    trunk.position.y = 0.6 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    // 3 tiered faceted cones
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const radius = (1.1 - t * 0.25) * scale;
      const height = (1.3 - t * 0.15) * scale;
      const coneGeo = new THREE.ConeGeometry(radius, height, 6 + (t % 2));
      const foliage = new THREE.Mesh(coneGeo, pineMats[t % pineMats.length]);
      foliage.position.y = (1.1 + t * 0.75) * scale;
      foliage.rotation.y = (t * 0.6) + Math.random() * 0.3;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      tree.add(foliage);
    }

    return tree;
  };

  // Seed trees organically across ridges, avoiding paths and landmarks
  const treeDirections: THREE.Vector3[] = [];
  for (let i = 0; i < 68; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);

    // Prefer upper and mid hemispheres for visual clarity from high-angle view
    const rDir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).normalize();

    // Check distance against POIs to keep clearings open
    const dSpawn = rDir.distanceTo(spawnDir);
    const dCabin = rDir.distanceTo(cabinDir);
    const dCamp = rDir.distanceTo(campfireDir);
    const dBarn = rDir.distanceTo(barnDir);

    if (dSpawn > 0.22 && dCabin > 0.24 && dCamp > 0.24 && dBarn > 0.32) {
      treeDirections.push(rDir);
    }
  }

  treeDirections.forEach((td) => {
    const scale = 0.75 + Math.random() * 0.65;
    const tree = createPineTree(scale);
    tree.rotateY(Math.random() * Math.PI * 2);
    placeOnSurface(tree, td);
    scene.add(tree);
    trees.push(tree);
  });

  // 8. Fluffy Low-Poly White Clouds floating near the horizon edges
  const clouds: THREE.Group[] = [];
  const cloudMat = getLowPolyMaterial(PALETTE.cloudWhite, {
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.95,
  });

  const createCloud = () => {
    const cloud = new THREE.Group();
    const puffCount = 5 + Math.floor(Math.random() * 3);

    for (let p = 0; p < puffCount; p++) {
      const radius = 0.6 + Math.random() * 0.6;
      const puffGeo = new THREE.DodecahedronGeometry(radius, 0);
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(
        (p - puffCount / 2) * 0.7 + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      puff.rotation.set(Math.random(), Math.random(), Math.random());
      cloud.add(puff);
    }
    return cloud;
  };

  for (let c = 0; c < 7; c++) {
    const cloud = createCloud();
    const angle = (c / 7) * Math.PI * 2;
    const elevation = 0.2 + (c % 3) * 0.15;
    const cloudDir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(angle) * Math.cos(elevation)
    ).normalize();

    // Place in high orbit above planet surface (radius + 4.5 units)
    cloud.position.copy(cloudDir.clone().multiplyScalar(planetRadius + 4.5 + (c % 2) * 1.5));
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), cloudDir);
    cloud.quaternion.copy(alignQuat);
    scene.add(cloud);
    clouds.push(cloud);
  }

  // 9. Wildflowers & Mushrooms dotted on hills
  const flowerYellowMat = getLowPolyMaterial(PALETTE.flowerYellow);
  const flowerWhiteMat = getLowPolyMaterial(PALETTE.barnTrimWhite);
  const shroomRedMat = getLowPolyMaterial(PALETTE.mushroomCapRed);
  const shroomStemMat = getLowPolyMaterial(PALETTE.roofTileCream);

  for (let f = 0; f < 45; f++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromNorth = 0.2 + Math.random() * 0.8;
    const fDir = new THREE.Vector3(
      Math.cos(angle) * Math.sin(distFromNorth),
      Math.cos(distFromNorth),
      Math.sin(angle) * Math.sin(distFromNorth)
    ).normalize();

    if (f % 3 === 0) {
      // Wild Mushroom
      const shroom = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 5), shroomStemMat);
      stem.position.y = 0.08;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.12, 6), shroomRedMat);
      cap.position.y = 0.18;
      shroom.add(stem, cap);
      placeOnSurface(shroom, fDir);
      scene.add(shroom);
    } else {
      // Daisy / Wildflower
      const flower = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 4), trunkMat);
      stem.position.y = 0.09;
      const petalGeo = new THREE.DodecahedronGeometry(0.07, 0);
      const petals = new THREE.Mesh(petalGeo, f % 2 === 0 ? flowerYellowMat : flowerWhiteMat);
      petals.position.y = 0.18;
      flower.add(stem, petals);
      placeOnSurface(flower, fDir);
      scene.add(flower);
    }
  }

  // 10. Collectible Golden Acorns
  const collectibles: CollectibleMesh[] = [];
  const acornLocations = [
    { id: 'acorn_grove', dir: new THREE.Vector3(0.18, 0.95, -0.22) },
    { id: 'acorn_cabin', dir: new THREE.Vector3(0.55, 0.78, 0.18) },
    { id: 'acorn_camp', dir: new THREE.Vector3(-0.52, 0.8, -0.15) },
    { id: 'acorn_barn', dir: new THREE.Vector3(-0.35, 0.7, 0.58) },
    { id: 'acorn_meadow', dir: new THREE.Vector3(0.65, 0.68, -0.25) },
    { id: 'acorn_ridge', dir: new THREE.Vector3(-0.68, 0.68, 0.15) },
    { id: 'acorn_valley', dir: new THREE.Vector3(0.05, 0.85, 0.52) },
  ];

  acornLocations.forEach((loc) => {
    const norm = loc.dir.clone().normalize();
    const alt = getSurfaceAltitude(norm);
    const pos = norm.clone().multiplyScalar(alt);
    const col = new CollectibleMesh(loc.id, pos, norm);
    scene.add(col.mesh);
    collectibles.push(col);
  });

  // Points of Interest definition
  const pointsOfInterest: POI[] = [
    {
      id: 'poi_cabin',
      name: 'Pine Ridge Log Cabin',
      description: 'A cozy timber shelter with a rustic checkered roof and warm glowing windows.',
      category: 'Shelter',
      interacted: false,
      position: [cabinPos.x, cabinPos.y, cabinPos.z],
    },
    {
      id: 'poi_campfire',
      name: 'Trailblazer Campfire',
      description: 'Crackling campfire beside an orange expedition tent with warm embers.',
      category: 'Campsite',
      interacted: false,
      position: [fireWorldPos.x, fireWorldPos.y, fireWorldPos.z],
    },
    {
      id: 'poi_farm',
      name: 'Sunward Barn & Windmill',
      description: 'Classic red timber barn flanked by a spinning white-sailed windmill and metal grain silo.',
      category: 'Farmstead',
      interacted: false,
      position: [barnDir.x * planetRadius, barnDir.y * planetRadius, barnDir.z * planetRadius],
    },
    {
      id: 'poi_deer',
      name: 'Forest Meadow Deer',
      description: 'Gentle low-poly deer grazing peacefully in the high flower fields.',
      category: 'Fauna',
      interacted: false,
      position: [deerMeadowDir.x * planetRadius, deerMeadowDir.y * planetRadius, deerMeadowDir.z * planetRadius],
    },
    {
      id: 'poi_lookout',
      name: 'Curved Horizon Lookout',
      description: 'A scenic knoll overlooking the tiny sphere world dipping into deep space.',
      category: 'Vista',
      interacted: false,
      position: [scenicLookoutDir.x * planetRadius, scenicLookoutDir.y * planetRadius, scenicLookoutDir.z * planetRadius],
    },
  ];

  return {
    planetMesh,
    trees,
    deers,
    windmillRotor,
    clouds,
    smokeParticles,
    fireParticles,
    collectibles,
    pointsOfInterest,
    getSurfaceAltitude,
  };
}

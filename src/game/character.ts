import * as THREE from 'three';
import { PALETTE, getLowPolyMaterial } from './palette';

export class AdventurerCharacter {
  public group: THREE.Group;
  public interactionRing: THREE.Mesh;
  public positionOnSphere: THREE.Vector3;
  public normal: THREE.Vector3;
  public forward: THREE.Vector3;

  private bodyGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private headGroup: THREE.Group;
  private ringMaterial: THREE.MeshBasicMaterial;

  public isMoving: boolean = false;
  public isJumping: boolean = false;
  public jumpProgress: number = 0;
  public walkTime: number = 0;
  public currentSpeed: number = 0;
  public interactionPromptActive: boolean = false;

  constructor(planetRadius: number) {
    this.group = new THREE.Group();
    this.positionOnSphere = new THREE.Vector3(0, planetRadius, 0);
    this.normal = new THREE.Vector3(0, 1, 0);
    this.forward = new THREE.Vector3(0, 0, 1);

    // Build the low-poly character model
    this.bodyGroup = new THREE.Group();

    // 1. Torso (Bright yellow jacket)
    const jacketMat = getLowPolyMaterial(PALETTE.jacketYellow, { roughness: 0.7 });
    const torsoGeo = new THREE.BoxGeometry(0.52, 0.62, 0.38);
    // Bevel/taper torso slightly
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 0.75;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bodyGroup.add(torso);

    // Collar / zipper accent
    const zipperGeo = new THREE.BoxGeometry(0.06, 0.55, 0.4);
    const zipperMat = getLowPolyMaterial(PALETTE.woodDark);
    const zipper = new THREE.Mesh(zipperGeo, zipperMat);
    zipper.position.set(0, 0.76, 0.01);
    this.bodyGroup.add(zipper);

    // 2. Backpack (Tan canvas with rolled sleeping bag)
    const backpackMat = getLowPolyMaterial(PALETTE.backpackTan);
    const packGeo = new THREE.BoxGeometry(0.38, 0.44, 0.22);
    const backpack = new THREE.Mesh(packGeo, backpackMat);
    backpack.position.set(0, 0.76, -0.28);
    backpack.castShadow = true;
    this.bodyGroup.add(backpack);

    // Rolled sleeping bag atop backpack
    const rollGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.42, 6);
    rollGeo.rotateZ(Math.PI / 2);
    const rollMat = getLowPolyMaterial(PALETTE.mossGreen);
    const roll = new THREE.Mesh(rollGeo, rollMat);
    roll.position.set(0, 1.02, -0.27);
    roll.castShadow = true;
    this.bodyGroup.add(roll);

    // 3. Head & Red Baseball Cap
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.18;

    // Head base (cute low-poly peach skin)
    const headMat = getLowPolyMaterial(PALETTE.skinTone, { roughness: 0.8 });
    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Cute stylized eyes (small dark beads)
    const eyeMat = getLowPolyMaterial(0x1e272e);
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat);
    leftEye.position.set(-0.11, 0.02, 0.22);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat);
    rightEye.position.set(0.11, 0.02, 0.22);
    this.headGroup.add(leftEye, rightEye);

    // Red Baseball Cap
    const capMat = getLowPolyMaterial(PALETTE.capAdventurerRed, { roughness: 0.6 });
    // Cap dome
    const capDomeGeo = new THREE.BoxGeometry(0.46, 0.22, 0.46);
    const capDome = new THREE.Mesh(capDomeGeo, capMat);
    capDome.position.set(0, 0.18, 0);
    capDome.castShadow = true;
    this.headGroup.add(capDome);

    // Cap visor (pointing forward)
    const visorGeo = new THREE.BoxGeometry(0.42, 0.04, 0.24);
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, 0.1, 0.3);
    visor.rotation.x = 0.08;
    visor.castShadow = true;
    this.headGroup.add(visor);

    // Cap button atop dome
    const capButton = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), getLowPolyMaterial(PALETTE.roofTileCream));
    capButton.position.set(0, 0.3, 0);
    this.headGroup.add(capButton);

    this.bodyGroup.add(this.headGroup);

    // 4. Arms (Yellow jacket sleeves with peach hands)
    const armGeo = new THREE.BoxGeometry(0.16, 0.48, 0.18);
    const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.16);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 0.95, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
    leftArmMesh.position.y = -0.22;
    leftArmMesh.castShadow = true;
    const leftHand = new THREE.Mesh(handGeo, headMat);
    leftHand.position.y = -0.48;
    this.leftArm.add(leftArmMesh, leftHand);
    this.bodyGroup.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 0.95, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rightArmMesh.position.y = -0.22;
    rightArmMesh.castShadow = true;
    const rightHand = new THREE.Mesh(handGeo, headMat);
    rightHand.position.y = -0.48;
    this.rightArm.add(rightArmMesh, rightHand);
    this.bodyGroup.add(this.rightArm);

    // 5. Legs (Blue jeans with brown hiking boots)
    const jeansMat = getLowPolyMaterial(PALETTE.jeansBlue, { roughness: 0.8 });
    const bootsMat = getLowPolyMaterial(PALETTE.bootsBrown);
    const legGeo = new THREE.BoxGeometry(0.2, 0.38, 0.22);
    const bootGeo = new THREE.BoxGeometry(0.22, 0.16, 0.3);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.48, 0);
    const leftPants = new THREE.Mesh(legGeo, jeansMat);
    leftPants.position.y = -0.16;
    leftPants.castShadow = true;
    const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
    leftBoot.position.set(0, -0.38, 0.04);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftPants, leftBoot);
    this.bodyGroup.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.48, 0);
    const rightPants = new THREE.Mesh(legGeo, jeansMat);
    rightPants.position.y = -0.16;
    rightPants.castShadow = true;
    const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
    rightBoot.position.set(0, -0.38, 0.04);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightPants, rightBoot);
    this.bodyGroup.add(this.rightLeg);

    this.group.add(this.bodyGroup);

    // 6. Subtle Circular Interaction Ring on the ground beneath them
    // Ring geometry oriented flat on ground
    const ringGeo = new THREE.RingGeometry(0.65, 0.78, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeaa7,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.interactionRing = new THREE.Mesh(ringGeo, this.ringMaterial);
    this.interactionRing.position.y = 0.03;
    this.group.add(this.interactionRing);

    // Tiny center dot for the interaction ring
    const dotGeo = new THREE.CircleGeometry(0.1, 16);
    dotGeo.rotateX(-Math.PI / 2);
    const dotMesh = new THREE.Mesh(dotGeo, this.ringMaterial);
    dotMesh.position.y = 0.03;
    this.group.add(dotMesh);

    // Initial scale
    this.group.scale.set(0.9, 0.9, 0.9);
  }

  public updateAnimation(delta: number, isMoving: boolean, isSprinting: boolean) {
    this.isMoving = isMoving;
    const speedMultiplier = isSprinting ? 1.6 : 1.0;

    // Pulse the subtle interaction ring
    const time = performance.now() * 0.003;
    const baseOpacity = this.interactionPromptActive ? 0.85 : 0.4;
    this.ringMaterial.opacity = baseOpacity + Math.sin(time * 3) * 0.15;
    const ringScale = this.interactionPromptActive ? 1.15 + Math.sin(time * 4) * 0.06 : 1.0;
    this.interactionRing.scale.set(ringScale, 1, ringScale);

    if (this.interactionPromptActive) {
      this.ringMaterial.color.setHex(0x55efc4); // Mint glow when ready to interact
    } else {
      this.ringMaterial.color.setHex(0xffeaa7); // Cozy warm amber
    }

    if (this.isJumping) {
      // Jump pose
      this.leftLeg.rotation.x = -0.5;
      this.rightLeg.rotation.x = 0.2;
      this.leftArm.rotation.x = -1.2;
      this.rightArm.rotation.x = -1.2;
      this.bodyGroup.position.y = Math.sin(this.jumpProgress * Math.PI) * 0.8;
      return;
    }

    if (isMoving) {
      this.walkTime += delta * 12 * speedMultiplier;
      const legAngle = Math.sin(this.walkTime) * 0.65;
      const armAngle = -Math.sin(this.walkTime) * 0.75;

      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      this.leftArm.rotation.x = armAngle;
      this.rightArm.rotation.x = -armAngle;

      // Subtle hip/torso bobbing
      this.bodyGroup.position.y = Math.abs(Math.cos(this.walkTime * 2)) * 0.08;
      this.headGroup.rotation.y = Math.sin(this.walkTime) * 0.08;
    } else {
      // Idle breathing & gentle look
      this.walkTime += delta * 2;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = Math.sin(this.walkTime) * 0.06;
      this.rightArm.rotation.x = -Math.sin(this.walkTime) * 0.06;
      this.bodyGroup.position.y = Math.sin(this.walkTime * 2) * 0.03;
      this.headGroup.rotation.y = Math.sin(this.walkTime * 0.8) * 0.12;
    }
  }

  public setRotationAngle(angle: number) {
    this.bodyGroup.rotation.y = angle;
  }
}

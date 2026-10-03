import * as THREE from 'three';
import { AdventurerCharacter } from './character';
import { buildMicroWorld, MicroWorldObjects, LowPolyDeer } from './microWorld';
import { PALETTE } from './palette';
import { LowPolyFootstepParticles } from './particles';
import { LowPolyWeatherSystem } from './weather';
import { GameStats, TimeOfDay, WeatherType, POI } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export class GameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private character!: AdventurerCharacter;
  private world!: MicroWorldObjects;
  private footParticles!: LowPolyFootstepParticles;
  private weatherSystem!: LowPolyWeatherSystem;

  // Lighting
  private dirSunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private rimLight!: THREE.DirectionalLight;

  // Starfield & Atmosphere
  private starField!: THREE.Points;

  // State
  private stats: GameStats = {
    pineconesCollected: 0,
    totalPinecones: 7,
    locationsVisited: 0,
    totalLocations: 5,
    timeOfDay: 'day',
    weather: 'clear',
    isAudioMuted: true,
    cameraMode: 'isometric',
    activeInteractionPrompt: null,
  };

  private activePOI: POI | null = null;
  private onStatsChange?: (stats: GameStats) => void;

  // Input state
  private keys: { [key: string]: boolean } = {};
  private moveVector = new THREE.Vector2(0, 0);
  private isSprinting = false;
  private clickTarget: THREE.Vector3 | null = null;
  private clickIndicator: THREE.Mesh | null = null;

  // Camera & Orbit state
  private cameraOffset = new THREE.Vector3(14, 18, 14);
  private targetZoom = 24;
  private currentZoom = 24;
  private orbitAngleY = 0.8;
  private orbitAngleX = 0.85;
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private isDraggingCamera = false;

  // Loop & timing
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private footstepTimer = 0;
  private planetRadius = 16;
  private playerAltitude = 16;
  private playerNormal = new THREE.Vector3(0, 1, 0);
  private playerPos = new THREE.Vector3(0, 16, 0);
  private playerHeading = 0;

  constructor(container: HTMLElement, onStatsChange?: (stats: GameStats) => void) {
    this.container = container;
    this.onStatsChange = onStatsChange;

    this.initScene();
    this.initLighting();
    this.initAtmosphere();
    this.initWorld();
    this.initCharacter();
    this.initClickIndicator();
    this.initEventListeners();
    this.applyTimeOfDay(this.stats.timeOfDay);

    this.animate();
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.skyDay);
    this.scene.fog = new THREE.FogExp2(PALETTE.skyDay, 0.012);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 200);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // For 4K snapshots
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);
  }

  private initLighting() {
    // Soft ambient fill light
    this.ambientLight = new THREE.AmbientLight(0xdff9fb, 0.8);
    this.scene.add(this.ambientLight);

    // Hemisphere light: sky pastel vs ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xfff3e0, 0x487eb0, 0.7);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Main key sun light casting soft diffuse shadows
    this.dirSunLight = new THREE.DirectionalLight(PALETTE.sunbeam, 2.2);
    this.dirSunLight.position.set(28, 42, 22);
    this.dirSunLight.castShadow = true;
    this.dirSunLight.shadow.mapSize.width = 2048;
    this.dirSunLight.shadow.mapSize.height = 2048;
    this.dirSunLight.shadow.camera.near = 5;
    this.dirSunLight.shadow.camera.far = 85;
    this.dirSunLight.shadow.camera.left = -26;
    this.dirSunLight.shadow.camera.right = 26;
    this.dirSunLight.shadow.camera.top = 26;
    this.dirSunLight.shadow.camera.bottom = -26;
    this.dirSunLight.shadow.bias = -0.0006;
    this.scene.add(this.dirSunLight);

    // Soft rim light to highlight spherical planet curvature against dark backdrop
    this.rimLight = new THREE.DirectionalLight(0x70a1ff, 0.9);
    this.rimLight.position.set(-25, -10, -25);
    this.scene.add(this.rimLight);
  }

  private initAtmosphere() {
    // Starfield particles in the dark sky
    const starCount = 650;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const colWhite = new THREE.Color(0xffffff);
    const colAmber = new THREE.Color(0xffeaa7);
    const colCyan = new THREE.Color(0x81ecec);

    for (let i = 0; i < starCount; i++) {
      const radius = 65 + Math.random() * 45;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const c = Math.random() > 0.6 ? (Math.random() > 0.5 ? colAmber : colCyan) : colWhite;
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);
  }

  private initWorld() {
    this.world = buildMicroWorld(this.scene, this.planetRadius);

    // Dynamic low-poly weather system (rain streaks & snow flakes)
    this.weatherSystem = new LowPolyWeatherSystem(this.planetRadius);
    this.scene.add(this.weatherSystem.group);
  }

  private initCharacter() {
    this.character = new AdventurerCharacter(this.planetRadius);
    this.scene.add(this.character.group);

    // Subtle low-poly dust & grass footstep particle system
    this.footParticles = new LowPolyFootstepParticles();
    this.scene.add(this.footParticles.group);

    // Initial positioning at north pole
    this.playerNormal.set(0, 1, 0);
    this.updatePlayerTransform();
  }

  private initClickIndicator() {
    const geo = new THREE.RingGeometry(0.3, 0.42, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x55efc4,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.clickIndicator = new THREE.Mesh(geo, mat);
    this.clickIndicator.visible = false;
    this.scene.add(this.clickIndicator);
  }

  private initEventListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // WebGL recovery
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.initScene();
      this.initLighting();
      this.initAtmosphere();
      this.initWorld();
      this.initCharacter();
      this.animate();
    });
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.jump();
    }
    if (e.key.toLowerCase() === 'e') {
      this.interact();
    }
    if (e.shiftKey) {
      this.isSprinting = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
    if (!e.shiftKey) {
      this.isSprinting = false;
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    this.isPointerDown = true;
    this.isDraggingCamera = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    // Right-click or middle-click directly drags camera
    if (e.button === 2 || e.button === 1) {
      this.isDraggingCamera = true;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;

    if (Math.hypot(dx, dy) > 4) {
      this.isDraggingCamera = true;
    }

    if (this.isDraggingCamera) {
      this.orbitAngleY -= dx * 0.006;
      this.orbitAngleX = Math.max(0.2, Math.min(1.4, this.orbitAngleX + dy * 0.005));
    }

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isDraggingCamera && e.button === 0) {
      // Left-click on planet to move character
      this.handlePlanetClick(e.clientX, e.clientY);
    }
    this.isPointerDown = false;
    this.isDraggingCamera = false;
  };

  private onWheel = (e: WheelEvent) => {
    this.targetZoom = Math.max(14, Math.min(38, this.targetZoom + e.deltaY * 0.02));
  };

  private handlePlanetClick(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObject(this.world.planetMesh, false);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      this.clickTarget = hitPoint.clone().normalize();

      if (this.clickIndicator) {
        this.clickIndicator.visible = true;
        const norm = this.clickTarget.clone();
        const alt = this.world.getSurfaceAltitude(norm);
        this.clickIndicator.position.copy(norm.multiplyScalar(alt + 0.04));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
        this.clickIndicator.quaternion.copy(q);
      }
    }
  }

  public jump() {
    if (!this.character.isJumping) {
      this.character.isJumping = true;
      this.character.jumpProgress = 0;
      soundEngine.playJump();
      if (this.footParticles) {
        this.footParticles.emitJumpBurst(this.playerPos, this.playerNormal);
      }
    }
  }

  public interact() {
    if (!this.activePOI) return;

    if (this.activePOI.id === 'poi_deer') {
      soundEngine.playDeerBleat();
      this.world.deers.forEach((deer) => deer.pet());
    } else if (this.activePOI.id === 'poi_campfire') {
      soundEngine.playCampfireSparks();
    } else {
      soundEngine.playChime(true);
    }

    if (!this.activePOI.interacted) {
      this.activePOI.interacted = true;
      this.stats.locationsVisited++;
      this.notifyStats();
    }
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.stats.timeOfDay = time;
    this.applyTimeOfDay(time);
    this.notifyStats();
  }

  public setWeather(weather: WeatherType) {
    this.stats.weather = weather;
    if (this.weatherSystem) {
      this.weatherSystem.setWeather(weather);
    }
    soundEngine.setWeather(weather);
    this.applyTimeOfDay(this.stats.timeOfDay);
    this.notifyStats();
  }

  public setCameraMode(mode: 'isometric' | 'follow' | 'cinematic' | 'orbit') {
    this.stats.cameraMode = mode;
    if (mode === 'isometric') {
      this.orbitAngleX = 0.85;
      this.orbitAngleY = 0.8;
      this.targetZoom = 24;
    } else if (mode === 'follow') {
      this.orbitAngleX = 0.6;
      this.targetZoom = 18;
    }
    this.notifyStats();
  }

  public toggleMute() {
    const newMuted = !this.stats.isAudioMuted;
    this.stats.isAudioMuted = newMuted;
    soundEngine.setMuted(newMuted);
    this.notifyStats();
  }

  public setVirtualMoveVector(x: number, y: number, isSprint = false) {
    this.moveVector.set(x, y);
    this.isSprinting = isSprint;
  }

  private applyTimeOfDay(time: TimeOfDay) {
    switch (time) {
      case 'day':
        this.scene.background = new THREE.Color(PALETTE.skyDay);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(PALETTE.skyDay);
        this.dirSunLight.color.set(PALETTE.sunbeam);
        this.dirSunLight.intensity = 2.2;
        this.dirSunLight.position.set(28, 42, 22);
        this.ambientLight.color.set(0xdff9fb);
        this.ambientLight.intensity = 0.8;
        this.hemiLight.color.set(0xfff3e0);
        this.hemiLight.groundColor.set(0x487eb0);
        this.rimLight.color.set(0x70a1ff);
        this.rimLight.intensity = 0.8;
        break;

      case 'sunset':
        this.scene.background = new THREE.Color(PALETTE.skySunset);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(PALETTE.skySunset);
        this.dirSunLight.color.set(0xff793f);
        this.dirSunLight.intensity = 2.4;
        this.dirSunLight.position.set(45, 12, 10);
        this.ambientLight.color.set(0xcd84f1);
        this.ambientLight.intensity = 0.6;
        this.hemiLight.color.set(0xffb8b8);
        this.hemiLight.groundColor.set(0x3d3d3d);
        this.rimLight.color.set(0xff9f1a);
        this.rimLight.intensity = 1.4;
        break;

      case 'night':
        this.scene.background = new THREE.Color(PALETTE.skyDeepNight);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(PALETTE.skyDeepNight);
        this.dirSunLight.color.set(0x70a1ff);
        this.dirSunLight.intensity = 0.65;
        this.dirSunLight.position.set(-20, 30, -20);
        this.ambientLight.color.set(0x1e272e);
        this.ambientLight.intensity = 0.45;
        this.hemiLight.color.set(0x575fcf);
        this.hemiLight.groundColor.set(0x0f141d);
        this.rimLight.color.set(0x4bcffa);
        this.rimLight.intensity = 1.1;
        break;

      case 'dawn':
        this.scene.background = new THREE.Color(PALETTE.skyDawn);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(PALETTE.skyDawn);
        this.dirSunLight.color.set(0xffd32a);
        this.dirSunLight.intensity = 1.9;
        this.dirSunLight.position.set(-35, 18, 20);
        this.ambientLight.color.set(0xeccc68);
        this.ambientLight.intensity = 0.7;
        this.hemiLight.color.set(0xffa502);
        this.hemiLight.groundColor.set(0x2f3542);
        this.rimLight.color.set(0xff6b81);
        this.rimLight.intensity = 1.0;
        break;
    }
    this.applyWeatherAtmosphere();
  }

  private applyWeatherAtmosphere() {
    if (this.stats.weather === 'rain') {
      this.dirSunLight.intensity *= 0.65;
      this.ambientLight.intensity *= 0.85;
      if (this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.018;
      }
    } else if (this.stats.weather === 'snow') {
      this.dirSunLight.intensity *= 0.85;
      this.ambientLight.color.lerp(new THREE.Color(0xdfe6e9), 0.35);
      if (this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.015;
      }
    } else {
      if (this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.012;
      }
    }
  }

  private updatePlayerPhysics(delta: number) {
    let inputX = 0;
    let inputZ = 0;

    // Keyboard controls
    if (this.keys['w'] || this.keys['arrowup']) inputZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) inputZ += 1;
    if (this.keys['a'] || this.keys['arrowleft']) inputX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) inputX += 1;

    // Merge virtual joystick
    if (this.moveVector.lengthSq() > 0.01) {
      inputX = this.moveVector.x;
      inputZ = this.moveVector.y;
    }

    let isMoving = false;
    const baseSpeed = this.isSprinting ? 5.2 : 3.2;

    // Click to move logic
    if (this.clickTarget && Math.abs(inputX) < 0.01 && Math.abs(inputZ) < 0.01) {
      const currentNorm = this.playerNormal.clone();
      const dist = currentNorm.distanceTo(this.clickTarget);

      if (dist > 0.05) {
        // Move along great-circle toward target
        const step = (baseSpeed * delta) / this.planetRadius;
        currentNorm.lerp(this.clickTarget, Math.min(1, step * 2)).normalize();
        this.playerNormal.copy(currentNorm);
        isMoving = true;

        // Face toward destination
        const tangent = this.clickTarget.clone().sub(currentNorm.clone().multiplyScalar(this.clickTarget.dot(currentNorm))).normalize();
        this.character.forward.copy(tangent);
      } else {
        this.clickTarget = null;
        if (this.clickIndicator) this.clickIndicator.visible = false;
      }
    } else if (Math.abs(inputX) > 0.01 || Math.abs(inputZ) > 0.01) {
      this.clickTarget = null;
      if (this.clickIndicator) this.clickIndicator.visible = false;
      isMoving = true;

      // Project camera orientation onto local tangent plane of the sphere at player's location
      const up = this.playerNormal.clone();

      // Camera forward & right vectors projected onto tangent plane
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const camRight = new THREE.Vector3().crossVectors(camDir, up).normalize();
      const camFwd = new THREE.Vector3().crossVectors(up, camRight).normalize();

      const moveDir = new THREE.Vector3()
        .addScaledVector(camRight, inputX)
        .addScaledVector(camFwd, -inputZ)
        .normalize();

      if (moveDir.lengthSq() > 0.01) {
        const angularDist = (baseSpeed * delta) / this.planetRadius;
        const rotAxis = new THREE.Vector3().crossVectors(up, moveDir).normalize();
        const quat = new THREE.Quaternion().setFromAxisAngle(rotAxis, angularDist);
        this.playerNormal.applyQuaternion(quat).normalize();

        this.character.forward.copy(moveDir);
      }
    }

    // Footstep audio & low-poly dust/grass particles
    if (isMoving && !this.character.isJumping) {
      this.footstepTimer += delta * (this.isSprinting ? 4.2 : 2.8);
      if (this.footstepTimer > 1.0) {
        this.footstepTimer = 0;
        soundEngine.playFootstep();
        if (this.footParticles) {
          this.footParticles.emitStep(
            this.playerPos,
            this.playerNormal,
            this.character.forward,
            this.isSprinting
          );
        }
      }
    }

    // Jump physics & landing burst
    if (this.character.isJumping) {
      this.character.jumpProgress += delta * 2.2;
      if (this.character.jumpProgress >= 1.0) {
        this.character.isJumping = false;
        this.character.jumpProgress = 0;
        if (this.footParticles) {
          this.footParticles.emitLandingBurst(this.playerPos, this.playerNormal);
        }
      }
    }

    this.updatePlayerTransform();
    this.character.updateAnimation(delta, isMoving, this.isSprinting);
  }

  private updatePlayerTransform() {
    this.playerAltitude = this.world.getSurfaceAltitude(this.playerNormal);
    this.playerPos.copy(this.playerNormal).multiplyScalar(this.playerAltitude);
    this.character.group.position.copy(this.playerPos);

    // Align character up-vector with planet normal
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.playerNormal);
    this.character.group.quaternion.copy(alignQuat);

    // Compute heading rotation in local tangent frame
    const localFwd = this.character.forward.clone().applyQuaternion(alignQuat.clone().invert());
    const angle = Math.atan2(localFwd.x, localFwd.z);
    this.character.setRotationAngle(angle);
  }

  private updateCamera(delta: number) {
    // Smooth zoom
    this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, delta * 6);

    if (this.stats.cameraMode === 'cinematic') {
      this.orbitAngleY += delta * 0.15;
    }

    // High-angle isometric third-person view relative to player on the sphere
    const normal = this.playerNormal.clone();

    // Create a local coordinate frame at the player
    let tangentX = new THREE.Vector3(1, 0, 0).cross(normal);
    if (tangentX.lengthSq() < 0.001) tangentX = new THREE.Vector3(0, 0, 1).cross(normal);
    tangentX.normalize();
    const tangentZ = new THREE.Vector3().crossVectors(normal, tangentX).normalize();

    // Rotate frame by orbit angles
    const rotX = Math.sin(this.orbitAngleX) * this.currentZoom;
    const height = Math.cos(this.orbitAngleX) * this.currentZoom;

    const camOffset = new THREE.Vector3()
      .addScaledVector(tangentX, Math.sin(this.orbitAngleY) * rotX)
      .addScaledVector(tangentZ, Math.cos(this.orbitAngleY) * rotX)
      .addScaledVector(normal, height);

    const desiredCamPos = this.playerPos.clone().add(camOffset);

    // Smooth camera tracking
    this.camera.position.lerp(desiredCamPos, delta * 8);

    // Look slightly above the player's head for high-angle showcase framing
    const lookTarget = this.playerPos.clone().addScaledVector(normal, 0.8);
    this.camera.lookAt(lookTarget);

    // Slowly spin starfield to add depth to cosmic atmosphere
    if (this.starField) {
      this.starField.rotation.y += delta * 0.005;
    }
  }

  private checkInteractions() {
    let closestPOI: POI | null = null;
    let minDist = 3.2;

    for (const poi of this.world.pointsOfInterest) {
      const poiPos = new THREE.Vector3(poi.position[0], poi.position[1], poi.position[2]);
      const dist = this.playerPos.distanceTo(poiPos);
      if (dist < minDist) {
        minDist = dist;
        closestPOI = poi;
      }
    }

    this.activePOI = closestPOI;
    this.character.interactionPromptActive = closestPOI !== null;

    if (closestPOI) {
      let promptText = `Press [E] to Inspect ${closestPOI.name}`;
      if (closestPOI.id === 'poi_deer') promptText = `Press [E] to Pet Forest Deer`;
      if (closestPOI.id === 'poi_campfire') promptText = `Press [E] to Roast Marshmallow & Warm Hands`;
      if (closestPOI.id === 'poi_cabin') promptText = `Press [E] to Enter Cozy Log Cabin`;
      if (closestPOI.id === 'poi_farm') promptText = `Press [E] to Ring Farm Bell & Spin Windmill`;
      this.stats.activeInteractionPrompt = promptText;
    } else {
      this.stats.activeInteractionPrompt = null;
    }

    // Check Collectible Acorns
    for (const col of this.world.collectibles) {
      if (!col.collected && this.playerPos.distanceTo(col.position) < 1.6) {
        col.collected = true;
        col.mesh.visible = false;
        this.stats.pineconesCollected++;
        soundEngine.playChime(true);
        this.notifyStats();
      }
    }

    this.notifyStats();
  }

  private notifyStats() {
    if (this.onStatsChange) {
      this.onStatsChange({ ...this.stats });
    }
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Update animations
    this.updatePlayerPhysics(delta);
    this.updateCamera(delta);
    this.checkInteractions();

    // Windmill sails rotation
    if (this.world.windmillRotor) {
      this.world.windmillRotor.rotation.z -= delta * 1.6;
    }

    // Smoke and campfire
    this.world.smokeParticles.update(delta);
    this.world.fireParticles.update(time);

    // Deers grazing animation
    this.world.deers.forEach((deer) => deer.update(time, delta));

    // Floating clouds orbit slowly around the curved micro-planet
    this.world.clouds.forEach((cloud, idx) => {
      cloud.rotation.y += delta * (0.02 + idx * 0.005);
    });

    // Collectibles bobbing
    this.world.collectibles.forEach((c) => c.update(time));

    // Explorer low-poly dust & grass footstep particles
    if (this.footParticles) {
      this.footParticles.update(delta);
    }

    // Dynamic weather particle effects (rain & snow)
    if (this.weatherSystem) {
      this.weatherSystem.update(delta, this.playerPos);
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Captures true 4K ultra-sharp screenshot (3840 x 2160)
   */
  public capture4KSnapshot(): string {
    const targetW = 3840;
    const targetH = 2160;

    // Create high-res offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = targetW;
    offCanvas.height = targetH;

    const currentPixelRatio = this.renderer.getPixelRatio();
    const currentSize = new THREE.Vector2();
    this.renderer.getSize(currentSize);

    // Temporarily resize renderer to 4K resolution
    this.renderer.setSize(targetW, targetH, false);
    this.camera.aspect = targetW / targetH;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);

    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore original size
    this.renderer.setSize(currentSize.x, currentSize.y, true);
    this.renderer.setPixelRatio(currentPixelRatio);
    this.camera.aspect = currentSize.x / currentSize.y;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    return dataUrl;
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public getPOIs(): POI[] {
    return this.world ? this.world.pointsOfInterest : [];
  }

  public destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    soundEngine.destroy();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

import * as THREE from 'three';
import { WeatherType } from '../types/game';
import { getLowPolyMaterial } from './palette';

interface WeatherDrop {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  basePos: THREE.Vector3;
  flutterPhase: number;
  flutterSpeed: number;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
}

export class LowPolyWeatherSystem {
  public group: THREE.Group;
  private currentWeather: WeatherType = 'clear';
  private rainGroup: THREE.Group;
  private snowGroup: THREE.Group;
  private rainDrops: WeatherDrop[] = [];
  private snowFlakes: WeatherDrop[] = [];
  private planetRadius: number;

  constructor(planetRadius = 16) {
    this.planetRadius = planetRadius;
    this.group = new THREE.Group();

    this.rainGroup = new THREE.Group();
    this.snowGroup = new THREE.Group();
    this.rainGroup.visible = false;
    this.snowGroup.visible = false;

    this.group.add(this.rainGroup);
    this.group.add(this.snowGroup);

    this.initRain();
    this.initSnow();
  }

  private initRain() {
    const rainCount = 160;
    // Low-poly faceted rain streak
    const rainGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 4);
    const rainMat = getLowPolyMaterial(0x81ecec, {
      transparent: true,
      opacity: 0.65,
      roughness: 0.3,
    });

    for (let i = 0; i < rainCount; i++) {
      const mesh = new THREE.Mesh(rainGeo, rainMat);
      const drop = this.createRandomParticle(mesh, 24, 32);
      // Fast downward fall with slight wind slant
      drop.velocity.set((Math.random() - 0.5) * 1.5, -(14 + Math.random() * 6), (Math.random() - 0.5) * 1.5);
      mesh.rotation.z = 0.12;
      mesh.rotation.x = (Math.random() - 0.5) * 0.1;
      this.rainGroup.add(mesh);
      this.rainDrops.push(drop);
    }
  }

  private initSnow() {
    const snowCount = 140;
    // Low-poly faceted snowflakes
    const flakeGeo = new THREE.DodecahedronGeometry(0.09, 0);
    const snowMat = getLowPolyMaterial(0xf8f9fa, {
      roughness: 0.85,
      metalness: 0.05,
    });

    for (let i = 0; i < snowCount; i++) {
      const mesh = new THREE.Mesh(flakeGeo, snowMat);
      const flake = this.createRandomParticle(mesh, 20, 32);
      // Gentle floating descent with tumbling
      flake.velocity.set(0, -(1.8 + Math.random() * 1.4), 0);
      this.snowGroup.add(mesh);
      this.snowFlakes.push(flake);
    }
  }

  private createRandomParticle(mesh: THREE.Mesh, minR: number, maxR: number): WeatherDrop {
    const radius = minR + Math.random() * (maxR - minR);
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(radius * Math.cos(phi)) + 6; // Focus over upper hemisphere
    const z = radius * Math.sin(phi) * Math.sin(theta);

    mesh.position.set(x, y, z);

    return {
      mesh,
      velocity: new THREE.Vector3(),
      basePos: new THREE.Vector3(x, y, z),
      flutterPhase: Math.random() * Math.PI * 2,
      flutterSpeed: 1.5 + Math.random() * 2.5,
      rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
      rotSpeed: (Math.random() - 0.5) * 3,
    };
  }

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;
    this.rainGroup.visible = weather === 'rain';
    this.snowGroup.visible = weather === 'snow';
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    if (this.currentWeather === 'clear') return;

    if (this.currentWeather === 'rain') {
      const groundMin = this.planetRadius - 1.0;
      for (const drop of this.rainDrops) {
        drop.mesh.position.addScaledVector(drop.velocity, delta);

        // Reset if it penetrated planet surface or fell too far
        const distFromCenter = drop.mesh.position.length();
        if (distFromCenter < groundMin || drop.mesh.position.y < -5) {
          // Re-spawn above the player area with scatter
          drop.mesh.position.set(
            playerPos.x + (Math.random() - 0.5) * 28,
            Math.max(18, playerPos.y + 12 + Math.random() * 12),
            playerPos.z + (Math.random() - 0.5) * 28
          );
        }
      }
    } else if (this.currentWeather === 'snow') {
      const groundMin = this.planetRadius - 0.5;
      for (const flake of this.snowFlakes) {
        flake.flutterPhase += delta * flake.flutterSpeed;
        const driftX = Math.sin(flake.flutterPhase) * 0.4;
        const driftZ = Math.cos(flake.flutterPhase * 0.7) * 0.4;

        flake.mesh.position.x += (flake.velocity.x + driftX) * delta;
        flake.mesh.position.y += flake.velocity.y * delta;
        flake.mesh.position.z += (flake.velocity.z + driftZ) * delta;

        // Tumble in 3D
        flake.mesh.rotateOnAxis(flake.rotAxis, flake.rotSpeed * delta);

        const distFromCenter = flake.mesh.position.length();
        if (distFromCenter < groundMin || flake.mesh.position.y < -4) {
          // Re-spawn gently drifting from sky above
          flake.mesh.position.set(
            playerPos.x + (Math.random() - 0.5) * 26,
            Math.max(16, playerPos.y + 10 + Math.random() * 10),
            playerPos.z + (Math.random() - 0.5) * 26
          );
        }
      }
    }
  }
}

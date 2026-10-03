import * as THREE from 'three';

/**
 * Coordinated pastel & earthy low-poly color palette
 * - Forest greens (bright rolling meadows, deep evergreen pines, moss)
 * - Earthy tans (hexagonal stone paths, bark, cabin logs, deer coat)
 * - Warm yellows (adventurer jacket, glowing cabin windows, sunflowers)
 * - Rustic reds (farm barn, adventurer cap, mushrooms, checkered roof tiles)
 * - Crisp accents (white sails, fluffy clouds, orange tent, shiny silo metal)
 */

export const PALETTE = {
  // Terrain Greens
  meadowGreenLight: 0x76c965,
  meadowGreenBase: 0x5dbb4d,
  meadowGreenDeep: 0x489f3b,
  pineFoliageDark: 0x245838,
  pineFoliageMid: 0x2e6f47,
  pineFoliageLight: 0x3d8c5c,
  mossGreen: 0x5a8a48,

  // Earthy Tans & Woods
  pathBeigeHex: 0xe6dac2,
  pathBorderTan: 0xcfc0a2,
  woodDark: 0x6e472a,
  woodWarm: 0x8a5a36,
  woodLight: 0xb58055,
  woodLogEnd: 0xcaa078,
  riverRockGrey: 0x909497,
  riverRockLight: 0xbdc3c7,

  // Warm Yellows & Ambers
  jacketYellow: 0xffcb2b,
  warmLanternAmber: 0xffaa33,
  flowerYellow: 0xfed330,
  goldenAcorn: 0xf6b93b,
  sunbeam: 0xfff4cc,

  // Rustic Reds & Terracottas
  barnRusticRed: 0xba322a,
  barnTrimWhite: 0xf1f2f6,
  capAdventurerRed: 0xd63031,
  roofTileRed: 0x9e2a2b,
  roofTileCream: 0xf5ebd9,
  mushroomCapRed: 0xc0392b,
  mushroomDotsWhite: 0xffffff,

  // Character & Accents
  jeansBlue: 0x3867d6,
  skinTone: 0xfad390,
  bootsBrown: 0x4b382a,
  backpackTan: 0x8c6d48,
  tentOrange: 0xeb4d4b,
  campfireFlameOrange: 0xff7619,
  campfireEmberYellow: 0xffe600,
  cloudWhite: 0xf8f9fa,
  siloMetal: 0xa4b0be,
  siloRoofMetal: 0x747d8c,
  deerTan: 0xc88b50,
  deerBellyCream: 0xfaecc9,
  deerAntler: 0xd9b382,
  deerNose: 0x2f3542,

  // Atmospheres
  skyDay: 0x141829,
  skyDeepNight: 0x090b14,
  skySunset: 0x20152b,
  skyDawn: 0x1a192e,
  fogDay: 0x141829,
  starGlow: 0xdfe6e9,
};

// Material cache for flat-shaded low-poly rendering
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function getLowPolyMaterial(
  color: number,
  options?: {
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
  }
): THREE.MeshStandardMaterial {
  const key = `${color}_${options?.roughness ?? 0.85}_${options?.metalness ?? 0.05}_${options?.emissive ?? 0}_${options?.emissiveIntensity ?? 0}_${options?.opacity ?? 1}`;
  if (materialCache.has(key)) {
    return materialCache.get(key)!;
  }

  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: options?.roughness ?? 0.85,
    metalness: options?.metalness ?? 0.05,
    emissive: options?.emissive ?? 0x000000,
    emissiveIntensity: options?.emissiveIntensity ?? 0,
    transparent: options?.transparent ?? false,
    opacity: options?.opacity ?? 1.0,
  });

  materialCache.set(key, mat);
  return mat;
}

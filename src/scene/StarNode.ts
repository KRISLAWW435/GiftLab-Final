import * as THREE from 'three';
import type { StarShapeId } from '../types/project';
import type { GlowColorConfig } from './paletteConfig';

export interface ShapeGeometryPack {
  body: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
}

export interface SharedStarGeometries {
  shapes: Record<StarShapeId, ShapeGeometryPack>;
  innerGem: THREE.OctahedronGeometry;
  flowerPetal: THREE.ExtrudeGeometry;
  flowerPetalEdges: THREE.EdgesGeometry;
  flowerCore: THREE.OctahedronGeometry;
  moonStarlet: THREE.OctahedronGeometry;
  cometTailCone: THREE.ConeGeometry;
  cometPlume: THREE.ExtrudeGeometry;
  cometPlumeEdges: THREE.EdgesGeometry;
  planetRing: THREE.TorusGeometry;
  planetInnerRing: THREE.TorusGeometry;
  planetMoonlet: THREE.OctahedronGeometry;
  sparkMote: THREE.OctahedronGeometry;
  hitProxy: THREE.SphereGeometry;
  pulseRing: THREE.RingGeometry;
  selectionRing: THREE.RingGeometry;
  sparklePoints: THREE.BufferGeometry;
}

const _tintA = new THREE.Color();
const _tintB = new THREE.Color();
const _neonCyan = new THREE.Color('#38bdf8');
const _neonMagenta = new THREE.Color('#e879f9');

function computeCrystalNeonStops(
  glow: GlowColorConfig,
  outA: THREE.Color,
  outB: THREE.Color,
): void {
  // Primary upper facet tone: bright star color kissed with icy cyan refraction
  outA.set(glow.hex).lerp(_neonCyan, glow.id === 'blue' || glow.id === 'turquoise' ? 0.55 : 0.36);
  // Counter lower/edge facet tone: star hue swept toward radiant magenta/violet
  outB.set(glow.haloHex).lerp(_neonMagenta, glow.id === 'pink' || glow.id === 'lilac' ? 0.55 : 0.42);
}

function buildStarShapeGeometry(): THREE.BufferGeometry {
  // True sculpted 3D double-pyramid faceted 5-pointed star (20 crisp triangular facets)
  const points = 10;
  const outerR = 0.47;
  const innerR = 0.21;
  const zPeak = 0.185;

  const ring: Array<[number, number, number]> = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    ring.push([Math.cos(angle) * r, Math.sin(angle) * r, 0]);
  }

  const front: [number, number, number] = [0, 0, zPeak];
  const back: [number, number, number] = [0, 0, -zPeak];
  const verts: number[] = [];

  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    // Front crystal ridge facet
    verts.push(front[0], front[1], front[2], a[0], a[1], a[2], b[0], b[1], b[2]);
    // Back crystal ridge facet
    verts.push(back[0], back[1], back[2], b[0], b[1], b[2], a[0], a[1], a[2]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function buildHeartShapeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const steps = 56;
  const scale = 0.0255;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3) * scale;
    const y =
      (13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)) *
      scale;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.055,
    bevelSegments: 4,
  });
  geo.center();
  return geo;
}

function buildFlowerShapeGeometry(): THREE.ExtrudeGeometry {
  // Sculpted flower base receptacle
  const shape = new THREE.Shape();
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = 0.16 + 0.04 * Math.cos(6 * t);
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
}

function buildFlowerPetalGeometry(): THREE.ExtrudeGeometry {
  // Sculpted 3D crystal petal extending upward from radial origin
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.06);
  shape.quadraticCurveTo(0.115, 0.22, 0.078, 0.39);
  shape.quadraticCurveTo(0, 0.48, 0, 0.48);
  shape.quadraticCurveTo(0, 0.48, -0.078, 0.39);
  shape.quadraticCurveTo(-0.115, 0.22, 0, 0.06);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.038,
    bevelSize: 0.02,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.0275);
  return geo;
}

function buildMoonShapeGeometry(): THREE.ExtrudeGeometry {
  // Exact intersection of outer circle C1(0,0, R=0.45) & inner bite C2(0.21, 0, R=0.35)
  const r1 = 0.45;
  const cx2 = 0.21;
  const r2 = 0.35;
  const ix = (r1 * r1 - r2 * r2 + cx2 * cx2) / (2 * cx2);
  const iy = Math.sqrt(Math.max(0.001, r1 * r1 - ix * ix));

  const aTop1 = Math.atan2(iy, ix);
  const aBot1 = Math.PI * 2 - aTop1;
  const aBot2 = Math.atan2(-iy, ix - cx2) + Math.PI * 2;
  const aTop2 = Math.atan2(iy, ix - cx2);

  const shape = new THREE.Shape();
  const outerSteps = 28;
  for (let i = 0; i <= outerSteps; i++) {
    const a = THREE.MathUtils.lerp(aTop1, aBot1, i / outerSteps);
    const x = Math.cos(a) * r1;
    const y = Math.sin(a) * r1;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  const innerSteps = 22;
  for (let i = 1; i <= innerSteps; i++) {
    const a = THREE.MathUtils.lerp(aBot2, aTop2, i / innerSteps);
    const x = cx2 + Math.cos(a) * r2;
    const y = Math.sin(a) * r2;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.078,
    bevelSize: 0.036,
    bevelSegments: 3,
  });
  geo.center();
  geo.rotateZ(0.24);
  return geo;
}

function buildCometPlumeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.2, 0.22);
  shape.quadraticCurveTo(0.05, 0.26, -0.36, -0.1);
  shape.quadraticCurveTo(-0.18, -0.07, -0.46, -0.4);
  shape.quadraticCurveTo(-0.08, -0.23, -0.05, -0.37);
  shape.quadraticCurveTo(0.26, -0.02, 0.2, 0.22);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.026,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.0225);
  return geo;
}

function buildSparkShapeGeometry(): THREE.BufferGeometry {
  // Faceted volumetric 4-pointed diamond crystal (16 crisp triangular facets)
  const rx = 0.48;
  const ry = 0.56;
  const w = 0.11;
  const zPeak = 0.19;

  const ring: Array<[number, number, number]> = [
    [0, ry, 0],
    [-w, w, 0],
    [-rx, 0, 0],
    [-w, -w, 0],
    [0, -ry, 0],
    [w, -w, 0],
    [rx, 0, 0],
    [w, w, 0],
  ];

  const front: [number, number, number] = [0, 0, zPeak];
  const back: [number, number, number] = [0, 0, -zPeak];
  const verts: number[] = [];

  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    verts.push(front[0], front[1], front[2], a[0], a[1], a[2], b[0], b[1], b[2]);
    verts.push(back[0], back[1], back[2], b[0], b[1], b[2], a[0], a[1], a[2]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export function createSharedStarGeometries(): SharedStarGeometries {
  const starGeo = buildStarShapeGeometry();
  const heartGeo = buildHeartShapeGeometry();
  const flowerGeo = buildFlowerShapeGeometry();
  const flowerPetal = buildFlowerPetalGeometry();
  const moonGeo = buildMoonShapeGeometry();
  const sparkGeo = buildSparkShapeGeometry();
  const cometHeadGeo = new THREE.IcosahedronGeometry(0.24, 0);
  const planetBodyGeo = new THREE.IcosahedronGeometry(0.275, 1);

  const cometPlume = buildCometPlumeGeometry();

  // Orbit cloud micro-particles around every 3D object
  const sparkleCount = 10;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i++) {
    const a = (i / sparkleCount) * Math.PI * 2;
    const r = 0.56 + (i % 2) * 0.14;
    sparklePositions[i * 3] = Math.cos(a) * r;
    sparklePositions[i * 3 + 1] = Math.sin(a) * r * 0.85;
    sparklePositions[i * 3 + 2] = ((i % 3) - 1) * 0.24;
  }
  const sparklePoints = new THREE.BufferGeometry();
  sparklePoints.setAttribute(
    'position',
    new THREE.BufferAttribute(sparklePositions, 3),
  );

  return {
    shapes: {
      star: { body: starGeo, edges: new THREE.EdgesGeometry(starGeo, 8) },
      heart: { body: heartGeo, edges: new THREE.EdgesGeometry(heartGeo, 18) },
      flower: { body: flowerGeo, edges: new THREE.EdgesGeometry(flowerGeo, 16) },
      moon: { body: moonGeo, edges: new THREE.EdgesGeometry(moonGeo, 16) },
      comet: { body: cometHeadGeo, edges: new THREE.EdgesGeometry(cometHeadGeo, 12) },
      planet: { body: planetBodyGeo, edges: new THREE.EdgesGeometry(planetBodyGeo, 16) },
      spark: { body: sparkGeo, edges: new THREE.EdgesGeometry(sparkGeo, 8) },
    },
    innerGem: new THREE.OctahedronGeometry(0.145, 0),
    flowerPetal,
    flowerPetalEdges: new THREE.EdgesGeometry(flowerPetal, 16),
    flowerCore: new THREE.OctahedronGeometry(0.165, 1),
    moonStarlet: new THREE.OctahedronGeometry(0.095, 0),
    cometTailCone: new THREE.ConeGeometry(0.15, 0.78, 8),
    cometPlume,
    cometPlumeEdges: new THREE.EdgesGeometry(cometPlume, 18),
    planetRing: new THREE.TorusGeometry(0.49, 0.044, 10, 44),
    planetInnerRing: new THREE.TorusGeometry(0.39, 0.018, 8, 40),
    planetMoonlet: new THREE.OctahedronGeometry(0.072, 0),
    sparkMote: new THREE.OctahedronGeometry(0.056, 0),
    hitProxy: new THREE.SphereGeometry(0.78, 12, 10),
    pulseRing: new THREE.RingGeometry(0.48, 0.59, 36),
    selectionRing: new THREE.RingGeometry(0.58, 0.65, 40),
    sparklePoints,
  };
}

export function disposeSharedStarGeometries(geos: SharedStarGeometries): void {
  Object.values(geos.shapes).forEach((pack) => {
    pack.body.dispose();
    pack.edges.dispose();
  });
  geos.innerGem.dispose();
  geos.flowerPetal.dispose();
  geos.flowerPetalEdges.dispose();
  geos.flowerCore.dispose();
  geos.moonStarlet.dispose();
  geos.cometTailCone.dispose();
  geos.cometPlume.dispose();
  geos.cometPlumeEdges.dispose();
  geos.planetRing.dispose();
  geos.planetInnerRing.dispose();
  geos.planetMoonlet.dispose();
  geos.sparkMote.dispose();
  geos.hitProxy.dispose();
  geos.pulseRing.dispose();
  geos.selectionRing.dispose();
  geos.sparklePoints.dispose();
}

export class StarNode {
  public readonly id: string;
  public readonly group = new THREE.Group();
  public readonly hitMesh: THREE.Mesh;
  public readonly homePosition = new THREE.Vector3();
  public readonly desiredPosition = new THREE.Vector3();

  private geos: SharedStarGeometries;
  private currentShape: StarShapeId;

  private crystalGroup = new THREE.Group();
  private bodyPivot = new THREE.Group();
  private sparkleCloud: THREE.Points;
  private haloSprite: THREE.Sprite;
  private flareSprite: THREE.Sprite;
  private pulseRingMesh: THREE.Mesh;
  private selectionRingMesh: THREE.Mesh;
  private linkRingMesh: THREE.Mesh;

  private bodyMat: THREE.MeshPhysicalMaterial;
  private edgeMat: THREE.LineBasicMaterial;
  private gemMat: THREE.MeshStandardMaterial;
  private accentMat: THREE.MeshStandardMaterial;
  private tailMat: THREE.MeshPhysicalMaterial;
  private sparkleMat: THREE.PointsMaterial;
  private haloMat: THREE.SpriteMaterial;
  private flareMat: THREE.SpriteMaterial;
  private pulseMat: THREE.MeshBasicMaterial;
  private selectionRingMat: THREE.MeshBasicMaterial;
  private linkRingMat: THREE.MeshBasicMaterial;
  private hitMat: THREE.MeshBasicMaterial;

  private crystalUniforms: {
    uNeonA: { value: THREE.Color };
    uNeonB: { value: THREE.Color };
  };

  private phaseOffset: number;
  private currentScale = 0.001;
  private targetReveal = 1;
  private pulseTimer = 0;
  private useDesiredPosition = false;
  private isHovered = false;
  private isSelected = false;
  private isDragging = false;
  private isVisited = false;
  private isFinaleActive = false;
  private isPendingLink = false;
  private isStoryHero = false;
  private isStoryBackground = false;
  private storyHeroScale = 1.76;

  constructor(
    id: string,
    index: number,
    shape: StarShapeId,
    geos: SharedStarGeometries,
    glow: GlowColorConfig,
    glowTex: THREE.Texture,
    flareTex: THREE.Texture,
    isSoftwareGl = false,
  ) {
    this.id = id;
    this.geos = geos;
    this.currentShape = shape;
    this.phaseOffset = index * 1.37;

    _tintA.set(glow.coreHex);
    _tintB.set(glow.hex);
    _tintA.lerp(_tintB, 0.56);

    const neonA = new THREE.Color();
    const neonB = new THREE.Color();
    computeCrystalNeonStops(glow, neonA, neonB);
    this.crystalUniforms = {
      uNeonA: { value: neonA },
      uNeonB: { value: neonB },
    };

    // Sculpted refractive crystal PBR material (crisp glossy facets, controlled emission, rich specular reflection)
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: _tintA.clone(),
      emissive: glow.hex,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: isSoftwareGl ? 0.9 : 0.96,
      metalness: 0.62,
      roughness: 0.07,
      transmission: isSoftwareGl ? 0 : 0.6,
      thickness: 1.05,
      attenuationDistance: 1.35,
      attenuationColor: new THREE.Color(glow.hex),
      ior: 1.88,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#ffffff'),
      iridescence: 0.72,
      iridescenceIOR: 1.52,
      envMapIntensity: 1.05,
    });

    this.bodyMat.customProgramCacheKey = () => 'gl-crystal-neon-v2';
    this.bodyMat.onBeforeCompile = (shader) => {
      shader.uniforms.uNeonA = this.crystalUniforms.uNeonA;
      shader.uniforms.uNeonB = this.crystalUniforms.uNeonB;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vCrystalLocalPos;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
vCrystalLocalPos = position;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform vec3 uNeonA;
uniform vec3 uNeonB;
varying vec3 vCrystalLocalPos;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
float gradMix = clamp((vCrystalLocalPos.x * 0.55 + vCrystalLocalPos.y * 0.85) * 1.15 + 0.5, 0.0, 1.0);
vec3 neonGrad = mix(uNeonB, uNeonA, gradMix);
diffuseColor.rgb = mix(diffuseColor.rgb, neonGrad, 0.72);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
float emMix = clamp((vCrystalLocalPos.x * 0.55 + vCrystalLocalPos.y * 0.85) * 1.15 + 0.5, 0.0, 1.0);
float rimCrest = pow(clamp(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 2.1);
vec3 crystalNeon = mix(uNeonB, uNeonA, emMix);
totalEmissiveRadiance = totalEmissiveRadiance * mix(vec3(1.0), crystalNeon, 0.82) * (0.42 + rimCrest * 1.35);`,
        );
    };

    // Crisp crystal edge highlights (subtle specular facet lines without blowout)
    _tintA.set(glow.coreHex).lerp(_tintB, 0.42);
    this.edgeMat = new THREE.LineBasicMaterial({
      color: _tintA.clone(),
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Radiant inner gem heart
    this.gemMat = new THREE.MeshStandardMaterial({
      color: glow.coreHex,
      emissive: glow.hex,
      emissiveIntensity: 0.36,
      metalness: 0.32,
      roughness: 0.12,
      envMapIntensity: 0.95,
    });

    // Metallic filigree accent for rings / companion starlets
    this.accentMat = new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: glow.haloHex,
      emissiveIntensity: 0.14,
      metalness: 0.9,
      roughness: 0.14,
      envMapIntensity: 1.0,
    });

    // Translucent volumetric comet plasma tail
    this.tailMat = new THREE.MeshPhysicalMaterial({
      color: glow.hex,
      emissive: glow.hex,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.52,
      metalness: 0.28,
      roughness: 0.14,
      clearcoat: 0.85,
      iridescence: 0.35,
      depthWrite: false,
    });

    this.crystalGroup.add(this.bodyPivot);
    this.rebuildShapeGeometry(shape);

    // Orbiting micro-particles around every 3D object
    this.sparkleMat = new THREE.PointsMaterial({
      map: glowTex,
      color: glow.coreHex,
      size: 0.11,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.sparkleCloud = new THREE.Points(geos.sparklePoints, this.sparkleMat);
    this.crystalGroup.add(this.sparkleCloud);

    this.group.add(this.crystalGroup);

    // Soft outer halo (restrained opacity so crystal silhouettes & facets stay razor-sharp)
    this.haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: glow.hex,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(this.haloMat);
    this.haloSprite.scale.set(1.38, 1.38, 1);
    this.group.add(this.haloSprite);

    // Subtle diffraction flare
    this.flareMat = new THREE.SpriteMaterial({
      map: flareTex,
      color: glow.coreHex,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flareSprite = new THREE.Sprite(this.flareMat);
    this.flareSprite.scale.set(1.05, 1.05, 1);
    this.group.add(this.flareSprite);

    // Expanding selection pulse ring
    this.pulseMat = new THREE.MeshBasicMaterial({
      color: glow.hex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pulseRingMesh = new THREE.Mesh(geos.pulseRing, this.pulseMat);
    this.pulseRingMesh.visible = false;
    this.group.add(this.pulseRingMesh);

    // Crisp active selection ring for selected star in editor
    this.selectionRingMat = new THREE.MeshBasicMaterial({
      color: glow.coreHex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.selectionRingMesh = new THREE.Mesh(geos.selectionRing, this.selectionRingMat);
    this.selectionRingMesh.visible = false;
    this.group.add(this.selectionRingMesh);

    // Steady link-source indicator ring
    this.linkRingMat = new THREE.MeshBasicMaterial({
      color: '#fde68a',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.linkRingMesh = new THREE.Mesh(geos.pulseRing, this.linkRingMat);
    this.linkRingMesh.visible = false;
    this.linkRingMesh.scale.setScalar(1.3);
    this.group.add(this.linkRingMesh);

    // Forgiving raycast hit sphere
    this.hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitMesh = new THREE.Mesh(geos.hitProxy, this.hitMat);
    this.hitMesh.userData.starId = id;
    this.group.add(this.hitMesh);
  }

  private rebuildShapeGeometry(shape: StarShapeId): void {
    this.bodyPivot.clear();

    if (shape === 'comet') {
      // Crystal nucleus positioned top-right + volumetric crossed plumes trailing bottom-left
      const headPack = this.geos.shapes.comet;
      const headMesh = new THREE.Mesh(headPack.body, this.bodyMat);
      headMesh.position.set(0.18, 0.16, 0);
      this.bodyPivot.add(headMesh);

      const headEdges = new THREE.LineSegments(headPack.edges, this.edgeMat);
      headEdges.position.copy(headMesh.position);
      this.bodyPivot.add(headEdges);

      const coreGem = new THREE.Mesh(this.geos.innerGem, this.gemMat);
      coreGem.position.copy(headMesh.position);
      coreGem.scale.setScalar(0.85);
      this.bodyPivot.add(coreGem);

      // Tapered 3D cone core tail pointing away from nucleus
      const tailAxis = new THREE.Vector3(-0.72, -0.69, 0).normalize();
      const coneTail = new THREE.Mesh(this.geos.cometTailCone, this.tailMat);
      coneTail.position.set(-0.1, -0.1, 0);
      coneTail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tailAxis);
      this.bodyPivot.add(coneTail);

      // Primary plume + crossed orthogonal 3D plume so tail reads sculpted across all 360 degrees
      const plume1 = new THREE.Mesh(this.geos.cometPlume, this.tailMat);
      this.bodyPivot.add(plume1);
      const plumeEdges1 = new THREE.LineSegments(this.geos.cometPlumeEdges, this.edgeMat);
      this.bodyPivot.add(plumeEdges1);

      const crossedGroup = new THREE.Group();
      crossedGroup.quaternion.setFromAxisAngle(tailAxis, Math.PI * 0.48);
      const plume2 = new THREE.Mesh(this.geos.cometPlume, this.tailMat);
      const plumeEdges2 = new THREE.LineSegments(this.geos.cometPlumeEdges, this.edgeMat);
      crossedGroup.add(plume2, plumeEdges2);
      this.bodyPivot.add(crossedGroup);
      return;
    }

    if (shape === 'planet') {
      const pack = this.geos.shapes.planet;
      const planetMesh = new THREE.Mesh(pack.body, this.bodyMat);
      this.bodyPivot.add(planetMesh);

      const planetEdges = new THREE.LineSegments(pack.edges, this.edgeMat);
      this.bodyPivot.add(planetEdges);

      const coreGem = new THREE.Mesh(this.geos.innerGem, this.gemMat);
      coreGem.scale.setScalar(0.95);
      this.bodyPivot.add(coreGem);

      // Primary crystal Saturn ring + inner metallic filigree ring + orbiting moonlet
      const ringGroup = new THREE.Group();
      ringGroup.rotation.set(Math.PI * 0.36, -Math.PI * 0.14, 0.12);

      const outerRing = new THREE.Mesh(this.geos.planetRing, this.bodyMat);
      outerRing.scale.set(1, 1, 0.28);
      ringGroup.add(outerRing);

      const innerRing = new THREE.Mesh(this.geos.planetInnerRing, this.accentMat);
      innerRing.scale.set(1, 1, 0.36);
      ringGroup.add(innerRing);

      this.bodyPivot.add(ringGroup);

      const moonlet = new THREE.Mesh(this.geos.planetMoonlet, this.gemMat);
      moonlet.position.set(-0.4, 0.25, 0.18);
      this.bodyPivot.add(moonlet);
      return;
    }

    if (shape === 'flower') {
      const pack = this.geos.shapes.flower;
      const calyxMesh = new THREE.Mesh(pack.body, this.bodyMat);
      this.bodyPivot.add(calyxMesh);

      const calyxEdges = new THREE.LineSegments(pack.edges, this.edgeMat);
      this.bodyPivot.add(calyxEdges);

      // 6 sculpted alternating-tilt 3D crystal petals so side & back angles hold botanical volume
      for (let i = 0; i < 6; i++) {
        const petalHolder = new THREE.Group();
        petalHolder.rotation.z = (i / 6) * Math.PI * 2;
        petalHolder.rotation.x = i % 2 === 0 ? 0.18 : -0.14;
        const petalMesh = new THREE.Mesh(this.geos.flowerPetal, this.bodyMat);
        const petalEdges = new THREE.LineSegments(
          this.geos.flowerPetalEdges,
          this.edgeMat,
        );
        petalHolder.add(petalMesh, petalEdges);
        this.bodyPivot.add(petalHolder);
      }

      const flowerCenter = new THREE.Mesh(this.geos.flowerCore, this.gemMat);
      this.bodyPivot.add(flowerCenter);
      return;
    }

    // Standard sculpted crystal shapes: star, heart, moon, spark
    const pack = this.geos.shapes[shape] ?? this.geos.shapes.star;
    const bodyMesh = new THREE.Mesh(pack.body, this.bodyMat);
    this.bodyPivot.add(bodyMesh);

    const edgeLines = new THREE.LineSegments(pack.edges, this.edgeMat);
    this.bodyPivot.add(edgeLines);

    if (shape === 'moon') {
      const starlet = new THREE.Mesh(this.geos.moonStarlet, this.accentMat);
      starlet.position.set(0.24, 0.06, 0.04);
      this.bodyPivot.add(starlet);
    } else if (shape === 'spark') {
      const coreGem = new THREE.Mesh(this.geos.innerGem, this.gemMat);
      coreGem.scale.setScalar(0.76);
      this.bodyPivot.add(coreGem);

      const moteTopRight = new THREE.Mesh(this.geos.sparkMote, this.accentMat);
      moteTopRight.position.set(0.29, 0.29, 0.08);
      this.bodyPivot.add(moteTopRight);

      const moteBottomLeft = new THREE.Mesh(this.geos.sparkMote, this.accentMat);
      moteBottomLeft.position.set(-0.29, -0.29, -0.08);
      moteBottomLeft.scale.setScalar(0.78);
      this.bodyPivot.add(moteBottomLeft);
    } else {
      const innerGem = new THREE.Mesh(this.geos.innerGem, this.gemMat);
      innerGem.position.set(0, shape === 'heart' ? 0.04 : 0, 0);
      this.bodyPivot.add(innerGem);
    }
  }

  public setShape(shape: StarShapeId): void {
    if (shape === this.currentShape) return;
    this.currentShape = shape;
    this.bodyPivot.rotation.set(0, 0, 0);
    this.rebuildShapeGeometry(shape);
    this.triggerPulse();
  }

  public setGlowColor(glow: GlowColorConfig): void {
    _tintA.set(glow.coreHex);
    _tintB.set(glow.hex);
    _tintA.lerp(_tintB, 0.56);

    this.bodyMat.color.copy(_tintA);
    this.bodyMat.emissive.set(glow.hex);
    this.bodyMat.attenuationColor.set(glow.hex);
    computeCrystalNeonStops(
      glow,
      this.crystalUniforms.uNeonA.value,
      this.crystalUniforms.uNeonB.value,
    );
    _tintA.set(glow.coreHex).lerp(_tintB, 0.42);
    this.edgeMat.color.copy(_tintA);
    this.gemMat.color.set(glow.coreHex);
    this.gemMat.emissive.set(glow.hex);
    this.accentMat.emissive.set(glow.haloHex);
    this.tailMat.color.set(glow.hex);
    this.tailMat.emissive.set(glow.hex);
    this.sparkleMat.color.set(glow.coreHex);
    this.haloMat.color.set(glow.hex);
    this.flareMat.color.set(glow.coreHex);
    this.pulseMat.color.set(glow.hex);
    this.selectionRingMat.color.set(glow.coreHex);
  }

  public setInteractionState(opts: {
    hovered?: boolean;
    selected?: boolean;
    dragging?: boolean;
    visited?: boolean;
    finale?: boolean;
    pendingLink?: boolean;
    storyHero?: boolean;
    storyBackground?: boolean;
    storyHeroScale?: number;
  }): void {
    const newlySelected =
      opts.selected === true && !this.isSelected && !opts.storyHero && !opts.finale;
    if (opts.hovered !== undefined) this.isHovered = opts.hovered;
    if (opts.selected !== undefined) this.isSelected = opts.selected;
    if (opts.dragging !== undefined) this.isDragging = opts.dragging;
    if (opts.visited !== undefined) this.isVisited = opts.visited;
    if (opts.finale !== undefined) this.isFinaleActive = opts.finale;
    if (opts.pendingLink !== undefined) this.isPendingLink = opts.pendingLink;
    if (opts.storyHero !== undefined) this.isStoryHero = opts.storyHero;
    if (opts.storyBackground !== undefined) this.isStoryBackground = opts.storyBackground;
    if (opts.storyHeroScale !== undefined) this.storyHeroScale = opts.storyHeroScale;
    if (newlySelected) this.triggerPulse();
  }

  public setTargetPosition(x: number, y: number, z: number, snap = false): void {
    this.desiredPosition.set(x, y, z);
    this.useDesiredPosition = true;
    if (snap) {
      this.group.position.set(x, y, z);
    }
  }

  public clearTargetPosition(): void {
    this.useDesiredPosition = false;
  }

  public setReveal(visibleFactor: number): void {
    this.targetReveal = Math.max(0, Math.min(1, visibleFactor));
    this.group.visible = this.targetReveal > 0.002 || this.currentScale > 0.01;
  }

  public snapReveal(visibleFactor: number): void {
    const val = Math.max(0, Math.min(1, visibleFactor));
    this.targetReveal = val;
    this.currentScale = Math.max(0.001, val);
    this.group.scale.setScalar(this.currentScale);
    this.group.visible = val > 0.002;
  }

  public snapRevealZero(): void {
    this.targetReveal = 0;
    this.currentScale = 0.001;
    this.group.scale.setScalar(0.001);
    this.group.visible = false;
  }

  public triggerPulse(): void {
    this.pulseTimer = 1.0;
    this.pulseRingMesh.visible = true;
    this.pulseRingMesh.scale.setScalar(0.8);
  }

  public update(
    elapsed: number,
    dt: number,
    cameraQuat: THREE.Quaternion,
    reducedMotion: boolean,
    animationMode: 'rotation' | 'breathe' | 'dust' | 'none' = 'rotation',
  ): void {
    if (this.useDesiredPosition) {
      if (reducedMotion) {
        this.group.position.copy(this.desiredPosition);
      } else {
        const posDamp = 1 - Math.exp(-5.4 * dt);
        this.group.position.lerp(this.desiredPosition, posDamp);
      }
    }

    const staticMode = reducedMotion || animationMode === 'none';
    const isBreathe = !staticMode && animationMode === 'breathe';

    const shimmer = staticMode
      ? 1
      : isBreathe
        ? 0.78 + 0.28 * Math.sin(elapsed * 2.2 + this.phaseOffset)
        : 0.9 + 0.1 * Math.sin(elapsed * 2.1 + this.phaseOffset);

    const roleScale = this.isStoryHero
      ? this.storyHeroScale
      : this.isStoryBackground
        ? 0.78
        : this.isDragging
          ? 1.26
          : this.isPendingLink
            ? 1.28
            : this.isSelected
              ? 1.22
              : this.isHovered
                ? 1.14
                : this.isFinaleActive
                  ? 1.16
                  : 1.0;

    const breathFactor =
      isBreathe && !this.isDragging && !this.isStoryBackground
        ? 1 + 0.085 * Math.sin(elapsed * 2.2 + this.phaseOffset)
        : 1;

    const baseTargetScale = roleScale * this.targetReveal * breathFactor;

    const dampFactor = reducedMotion ? 1 : 1 - Math.exp(-7.5 * dt);
    this.currentScale = THREE.MathUtils.lerp(this.currentScale, baseTargetScale, dampFactor);
    this.group.scale.setScalar(Math.max(0.001, this.currentScale));
    this.group.visible = this.targetReveal > 0.002 || this.currentScale > 0.015;

    // Smooth 360° idle spin & shimmer across ALL 7 shapes; stabilizes smoothly under user drag, reduced motion, or 'none' mode
    if (staticMode) {
      this.crystalGroup.position.y = 0;
      this.bodyPivot.rotation.set(0, 0, 0);
    } else if (this.isDragging) {
      const stabilize = 1 - Math.exp(-10 * dt);
      this.crystalGroup.position.y = THREE.MathUtils.lerp(this.crystalGroup.position.y, 0, stabilize);
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, 0, stabilize);
      this.bodyPivot.rotation.z = THREE.MathUtils.lerp(this.bodyPivot.rotation.z, 0, stabilize);
    } else {
      this.crystalGroup.position.y = Math.sin(elapsed * 1.35 + this.phaseOffset) * 0.055;
      const baseSpin = this.isStoryHero
        ? 0.45
        : this.isHovered
          ? 0.14
          : this.isFinaleActive
            ? 0.28
            : this.currentShape === 'spark'
              ? 0.46
              : 0.3;

      this.bodyPivot.rotation.y += dt * baseSpin;
      this.bodyPivot.rotation.x = Math.cos(elapsed * 0.55 + this.phaseOffset) * 0.14;
      this.bodyPivot.rotation.z =
        this.currentShape === 'spark'
          ? Math.sin(elapsed * 0.8 + this.phaseOffset) * 0.12
          : Math.sin(elapsed * 0.45 + this.phaseOffset) * 0.04;

      this.sparkleCloud.rotation.z = elapsed * 0.26 + this.phaseOffset;
      this.sparkleCloud.rotation.y = elapsed * 0.2;
      this.flareMat.rotation = elapsed * 0.22 + this.phaseOffset;
    }

    // Balanced pearlescent crystal & halo luminosity (preserves 3D facets without glow blowout)
    const boost = this.isStoryHero
      ? 1.35
      : this.isStoryBackground
        ? 0.65
        : this.isDragging || this.isPendingLink
          ? 1.38
          : this.isSelected
            ? 1.28
            : this.isFinaleActive
              ? 1.22
              : this.isHovered
                ? 1.18
                : this.isVisited
                  ? 1.06
                  : 1.0;

    this.bodyMat.emissiveIntensity = 0.12 * boost * shimmer;
    this.bodyMat.iridescence = staticMode ? 0.56 : 0.64 + 0.18 * Math.sin(elapsed * 1.6 + this.phaseOffset);
    this.gemMat.emissiveIntensity = 0.4 * boost * shimmer;
    this.edgeMat.opacity = Math.min(0.56, 0.32 * boost * shimmer);
    this.haloMat.opacity = Math.min(0.38, (isBreathe ? 0.22 : 0.17) * boost * shimmer);
    this.flareMat.opacity = Math.min(0.28, (isBreathe ? 0.16 : 0.12) * boost * shimmer);

    const haloSize =
      (this.isStoryHero
        ? 1.72
        : this.isStoryBackground
          ? 0.96
          : this.isSelected || this.isPendingLink || this.isDragging
            ? 1.56
            : this.isFinaleActive
              ? 1.52
              : this.isHovered
                ? 1.46
                : 1.32) * shimmer;
    this.haloSprite.scale.set(haloSize, haloSize, 1);

    // Steady active-selection ring in editor mode
    if (this.isSelected && !this.isStoryHero && !this.isFinaleActive && !this.isPendingLink) {
      this.selectionRingMesh.visible = true;
      this.selectionRingMesh.quaternion.copy(cameraQuat);
      const breathe = staticMode ? 1.05 : 1.04 + 0.06 * Math.sin(elapsed * 3.1);
      this.selectionRingMesh.scale.setScalar(breathe);
      this.selectionRingMat.opacity = staticMode ? 0.72 : 0.62 + 0.18 * Math.sin(elapsed * 3.1);
    } else {
      this.selectionRingMesh.visible = false;
    }

    // Link source highlight ring
    if (this.isPendingLink) {
      this.linkRingMesh.visible = true;
      this.linkRingMesh.quaternion.copy(cameraQuat);
      const pulse = reducedMotion ? 1.3 : 1.25 + 0.12 * Math.sin(elapsed * 5);
      this.linkRingMesh.scale.setScalar(pulse);
    } else {
      this.linkRingMesh.visible = false;
    }

    // Expanding pulse ring on selection
    if (this.pulseTimer > 0) {
      this.pulseTimer = Math.max(0, this.pulseTimer - dt * 1.35);
      const progress = 1 - this.pulseTimer;
      this.pulseRingMesh.quaternion.copy(cameraQuat);
      this.pulseRingMesh.scale.setScalar(0.8 + progress * 2.1);
      this.pulseMat.opacity = Math.sin(this.pulseTimer * Math.PI) * 0.72;
      if (this.pulseTimer === 0) {
        this.pulseRingMesh.visible = false;
      }
    }
  }

  public dispose(): void {
    this.bodyMat.dispose();
    this.edgeMat.dispose();
    this.gemMat.dispose();
    this.accentMat.dispose();
    this.tailMat.dispose();
    this.sparkleMat.dispose();
    this.haloMat.dispose();
    this.flareMat.dispose();
    this.pulseMat.dispose();
    this.selectionRingMat.dispose();
    this.linkRingMat.dispose();
    this.hitMat.dispose();
  }
}

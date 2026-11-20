import * as THREE from 'three';
import type {
  EnvelopeMotifId,
  EnvelopeSettings,
  EnvelopeShapeId,
} from '../types/project';
import {
  resolveEnvelopeGlowFactors,
  resolveEnvelopeMotif,
  resolveEnvelopePaletteColors,
  resolveEnvelopeShape,
  resolveSealPaletteColors,
  type CosmicPaletteConfig,
  type GlowColorConfig,
  type ResolvedEnvelopeGlowFactors,
} from './paletteConfig';

interface EnvelopeGeometrySet {
  baseGeo: THREE.ExtrudeGeometry;
  pocketGeo: THREE.ExtrudeGeometry;
  flapGeo: THREE.ExtrudeGeometry;
  bodyOutlineGeo: THREE.BufferGeometry;
  pocketOutlineGeo: THREE.BufferGeometry;
  flapOutlineGeo: THREE.BufferGeometry;
  sealRestingY: number;
}

function buildRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

function buildEnvelopeGeometrySet(shapeId: EnvelopeShapeId): EnvelopeGeometrySet {
  const w = 1.55;
  const h = 1.02;

  let bodyShape: THREE.Shape;
  let pocketShape: THREE.Shape;
  let flapShape: THREE.Shape;
  let sealRestingY = -0.14;

  if (shapeId === 'rounded') {
    // Soft pill-rounded silhouette with graceful curved arch flap
    bodyShape = buildRoundedRectShape(w, h, 0.24);

    pocketShape = new THREE.Shape();
    pocketShape.moveTo(-1.44, -0.96);
    pocketShape.lineTo(1.44, -0.96);
    pocketShape.lineTo(1.44, 0.22);
    pocketShape.quadraticCurveTo(0.7, -0.08, 0, -0.18);
    pocketShape.quadraticCurveTo(-0.7, -0.08, -1.44, 0.22);
    pocketShape.closePath();

    flapShape = new THREE.Shape();
    flapShape.moveTo(-1.46, 0);
    flapShape.lineTo(1.46, 0);
    flapShape.bezierCurveTo(1.22, -0.78, 0.52, -1.18, 0, -1.18);
    flapShape.bezierCurveTo(-0.52, -1.18, -1.22, -0.78, -1.46, 0);
    flapShape.closePath();

    sealRestingY = -0.12;
  } else {
    // 'classic'
    bodyShape = buildRoundedRectShape(w, h, 0.08);

    pocketShape = new THREE.Shape();
    pocketShape.moveTo(-1.52, -0.98);
    pocketShape.lineTo(1.52, -0.98);
    pocketShape.lineTo(1.52, 0.32);
    pocketShape.lineTo(0, -0.22);
    pocketShape.lineTo(-1.52, 0.32);
    pocketShape.closePath();

    flapShape = new THREE.Shape();
    flapShape.moveTo(-1.52, 0);
    flapShape.lineTo(1.52, 0);
    flapShape.lineTo(0.14, -1.12);
    flapShape.quadraticCurveTo(0, -1.24, -0.14, -1.12);
    flapShape.closePath();

    sealRestingY = -0.14;
  }

  const baseGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  baseGeo.center();

  const pocketGeo = new THREE.ExtrudeGeometry(pocketShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
  });

  const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });

  const bodyOutlineGeo = new THREE.BufferGeometry().setFromPoints(
    bodyShape.getSpacedPoints(56).map((p) => new THREE.Vector3(p.x, p.y, 0)),
  );
  const pocketOutlineGeo = new THREE.BufferGeometry().setFromPoints(
    pocketShape.getSpacedPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0)),
  );
  const flapOutlineGeo = new THREE.BufferGeometry().setFromPoints(
    flapShape.getSpacedPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0)),
  );

  return {
    baseGeo,
    pocketGeo,
    flapGeo,
    bodyOutlineGeo,
    pocketOutlineGeo,
    flapOutlineGeo,
    sealRestingY,
  };
}

function drawEnvelopeMotifTexture(
  motif: EnvelopeMotifId,
  inkHex: string,
  isLightBody: boolean,
): THREE.CanvasTexture | null {
  if (motif === 'none' || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 512);
  ctx.scale(2, 2);

  // Clean circular stamp-seal badge on the pocket corner
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 102, 0, Math.PI * 2);
  ctx.fillStyle = isLightBody ? 'rgba(255, 255, 255, 0.34)' : 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = inkHex;
  ctx.globalAlpha = 0.68;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = inkHex;
  ctx.fillStyle = inkHex;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (motif === 'heart') {
    ctx.beginPath();
    ctx.moveTo(128, 184);
    ctx.bezierCurveTo(64, 144, 58, 86, 94, 72);
    ctx.bezierCurveTo(114, 64, 126, 80, 128, 92);
    ctx.bezierCurveTo(130, 80, 142, 64, 162, 72);
    ctx.bezierCurveTo(198, 86, 192, 144, 128, 184);
    ctx.closePath();
    ctx.globalAlpha = 0.88;
    ctx.fill();

    // Small accent sparkle inside heart
    ctx.fillStyle = isLightBody ? '#FFFFFF' : '#1E143B';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(106, 104, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === 'stars') {
    const pts: Array<[number, number, number]> = [
      [82, 152, 11],
      [128, 94, 18],
      [174, 136, 13],
    ];
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 4;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.95;
    for (const [cx, cy, r] of pts) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.42;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (motif === 'moon') {
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(148, 66);
    ctx.bezierCurveTo(78, 70, 72, 174, 158, 184);
    ctx.bezierCurveTo(114, 168, 108, 94, 148, 66);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isLightBody
      ? 'rgba(255, 255, 255, 0.45)'
      : 'rgba(15, 10, 30, 0.35)';
    ctx.stroke();

    // Two companion 4-point sparkles tucked cleanly in the crescent arc
    const drawMiniStar = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.38;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = inkHex;
      ctx.fill();
    };
    drawMiniStar(166, 98, 14);
    drawMiniStar(174, 140, 9);
  } else if (motif === 'flower') {
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = 128 + Math.cos(a) * 34;
      const py = 128 + Math.sin(a) * 34;
      ctx.beginPath();
      ctx.ellipse(px, py, 20, 30, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = isLightBody ? '#FFFBEB' : '#1E143B';
    ctx.beginPath();
    ctx.arc(128, 128, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === 'butterfly') {
    ctx.globalAlpha = 0.9;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(128, 118);
      ctx.bezierCurveTo(
        128 + dir * 24,
        64,
        128 + dir * 74,
        74,
        128 + dir * 58,
        122,
      );
      ctx.bezierCurveTo(
        128 + dir * 48,
        134,
        128 + dir * 22,
        130,
        128,
        128,
      );
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(128, 130);
      ctx.bezierCurveTo(
        128 + dir * 42,
        132,
        128 + dir * 58,
        166,
        128 + dir * 28,
        180,
      );
      ctx.bezierCurveTo(128 + dir * 12, 184, 128 + dir * 6, 158, 128, 144);
      ctx.fill();
    }
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(128, 98);
    ctx.lineTo(128, 166);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export class EnvelopeProp {
  public readonly group = new THREE.Group();

  private bodyGroup = new THREE.Group();
  private flapPivot = new THREE.Group();
  private sealGroup = new THREE.Group();

  private baseMesh: THREE.Mesh;
  private pocketMesh: THREE.Mesh;
  private flapMesh: THREE.Mesh;
  private bodyOutline: THREE.Line;
  private pocketOutline: THREE.Line;
  private flapOutline: THREE.Line;
  private motifMesh: THREE.Mesh;
  private innerGlowSprite: THREE.Sprite;
  private sealDiscMesh: THREE.Mesh;
  private sealRimMesh: THREE.Mesh;
  private sealStarMesh: THREE.Mesh;
  private sealHaloSprite: THREE.Sprite;

  private burstPoints: THREE.Points;
  private burstGeo: THREE.BufferGeometry;
  private burstMat: THREE.PointsMaterial;
  private burstVelocities: Float32Array;
  private burstOrigins: Float32Array;
  private burstCount = 130;

  private currentShape: EnvelopeShapeId;
  private currentMotif: EnvelopeMotifId = 'none';
  private currentMotifInk = '';
  private currentMotifIsLight = false;
  private sealRestingY = -0.14;

  private baseGeo!: THREE.ExtrudeGeometry;
  private pocketGeo!: THREE.ExtrudeGeometry;
  private flapGeo!: THREE.ExtrudeGeometry;
  private bodyOutlineGeo!: THREE.BufferGeometry;
  private pocketOutlineGeo!: THREE.BufferGeometry;
  private flapOutlineGeo!: THREE.BufferGeometry;
  private motifGeo: THREE.PlaneGeometry;
  private motifTex: THREE.CanvasTexture | null = null;

  private sealDiscGeo: THREE.CylinderGeometry;
  private sealRimGeo: THREE.TorusGeometry;
  private sealStarGeo: THREE.ExtrudeGeometry;

  private bodyMat: THREE.MeshPhysicalMaterial;
  private pocketMat: THREE.MeshStandardMaterial;
  private flapMat: THREE.MeshStandardMaterial;
  private seamMat: THREE.LineBasicMaterial;
  private motifMat: THREE.MeshBasicMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private sealRimMat: THREE.MeshStandardMaterial;
  private sealStarMat: THREE.MeshStandardMaterial;
  private sealHaloMat: THREE.SpriteMaterial;
  private innerGlowMat: THREE.SpriteMaterial;

  private state: 'sealed' | 'opening' | 'finaleOpening' | 'hidden' = 'sealed';
  private openProgress = 0; // 0..1 during opening animation
  private isHovered = false;
  private sealedScale = 1;
  private sealedOffsetY = 0;
  private glowFactors!: ResolvedEnvelopeGlowFactors;

  constructor(
    palette: CosmicPaletteConfig,
    glow: GlowColorConfig,
    glowTex: THREE.Texture,
    envelopeSettings?: EnvelopeSettings,
  ) {
    this.currentShape = resolveEnvelopeShape(envelopeSettings);
    const geomSet = buildEnvelopeGeometrySet(this.currentShape);
    this.baseGeo = geomSet.baseGeo;
    this.pocketGeo = geomSet.pocketGeo;
    this.flapGeo = geomSet.flapGeo;
    this.bodyOutlineGeo = geomSet.bodyOutlineGeo;
    this.pocketOutlineGeo = geomSet.pocketOutlineGeo;
    this.flapOutlineGeo = geomSet.flapOutlineGeo;
    this.sealRestingY = geomSet.sealRestingY;

    const envColors = resolveEnvelopePaletteColors(
      envelopeSettings?.envelopeColor,
      palette,
    );
    const sealColors = resolveSealPaletteColors(
      envelopeSettings?.sealColor,
      glow,
    );
    this.glowFactors = resolveEnvelopeGlowFactors(
      envelopeSettings?.glowIntensity,
      envColors,
      sealColors,
    );

    // 1. Primary beveled envelope body
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(envColors.bodyHex).multiplyScalar(
        this.glowFactors.albedoScale,
      ),
      emissive: envColors.emissiveHex,
      emissiveIntensity: this.glowFactors.bodyEmissiveIntensity,
      roughness: envColors.isLightBody ? 0.9 : 0.62,
      metalness: envColors.isLightBody ? 0.01 : 0.08,
      clearcoat: this.glowFactors.bodyClearcoat,
      clearcoatRoughness: 0.72,
      envMapIntensity: this.glowFactors.bodyEnvMapIntensity,
      transparent: false,
      opacity: 1,
    });
    this.baseMesh = new THREE.Mesh(this.baseGeo, this.bodyMat);
    this.bodyGroup.add(this.baseMesh);

    // 2. Front lower folded pocket trim
    this.pocketMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(envColors.pocketHex).multiplyScalar(
        this.glowFactors.albedoScale,
      ),
      emissive: envColors.emissiveHex,
      emissiveIntensity: this.glowFactors.pocketEmissiveIntensity,
      roughness: envColors.isLightBody ? 0.88 : 0.58,
      metalness: envColors.isLightBody ? 0.01 : 0.1,
      envMapIntensity: this.glowFactors.pocketEnvMapIntensity,
      transparent: false,
      opacity: 1,
    });
    this.pocketMesh = new THREE.Mesh(this.pocketGeo, this.pocketMat);
    this.pocketMesh.position.z = 0.05;
    this.bodyGroup.add(this.pocketMesh);

    // Crisp rim/fold outlines for high legibility against any cosmic background
    this.seamMat = new THREE.LineBasicMaterial({
      color: envColors.borderHex,
      transparent: true,
      opacity: 0.72,
    });
    this.bodyOutline = new THREE.Line(this.bodyOutlineGeo, this.seamMat);
    this.bodyOutline.position.z = 0.032;
    this.bodyOutline.scale.set(1.012, 1.015, 1);
    this.bodyGroup.add(this.bodyOutline);

    this.pocketOutline = new THREE.Line(this.pocketOutlineGeo, this.seamMat);
    this.pocketOutline.position.z = 0.098;
    this.bodyGroup.add(this.pocketOutline);

    // 3. Inner celestial light glow peeking from inside the envelope
    this.innerGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: glow.coreHex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.innerGlowSprite = new THREE.Sprite(this.innerGlowMat);
    this.innerGlowSprite.position.set(0, 0.25, 0.14);
    this.innerGlowSprite.scale.set(2.8, 2.2, 1);
    this.bodyGroup.add(this.innerGlowSprite);

    // 4. Articulated top flap pivoted along the top edge (y = +0.98)
    this.flapMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(envColors.flapHex).multiplyScalar(
        this.glowFactors.albedoScale,
      ),
      emissive: envColors.emissiveHex,
      emissiveIntensity: this.glowFactors.flapEmissiveIntensity,
      roughness: envColors.isLightBody ? 0.88 : 0.54,
      metalness: envColors.isLightBody ? 0.01 : 0.12,
      envMapIntensity: this.glowFactors.flapEnvMapIntensity,
      transparent: false,
      opacity: 1,
    });
    this.flapMesh = new THREE.Mesh(this.flapGeo, this.flapMat);
    this.flapPivot.position.set(0, 0.98, 0.088);
    this.flapPivot.add(this.flapMesh);

    this.flapOutline = new THREE.Line(this.flapOutlineGeo, this.seamMat);
    this.flapOutline.position.z = 0.044;
    this.flapPivot.add(this.flapOutline);
    this.bodyGroup.add(this.flapPivot);

    // 4b. Optional small picture/motif badge in lower-right pocket corner
    this.motifGeo = new THREE.PlaneGeometry(0.5, 0.5);
    this.motifMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    this.motifMesh = new THREE.Mesh(this.motifGeo, this.motifMat);
    this.motifMesh.position.set(0.94, -0.5, 0.122);
    this.motifMesh.rotation.z = -0.07;
    this.motifMesh.renderOrder = 2;
    this.motifMesh.visible = false;
    this.bodyGroup.add(this.motifMesh);

    // 5. Star wax-gold seal on flap tip (halo strictly behind disc, crisp contrasting rim & star)
    this.sealHaloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: sealColors.haloHex,
      transparent: true,
      opacity: this.glowFactors.sealHaloOpacityBase,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sealHaloSprite = new THREE.Sprite(this.sealHaloMat);
    this.sealHaloSprite.position.z = -0.025;
    this.sealHaloSprite.scale.set(1.38, 1.38, 1);
    this.sealHaloSprite.visible = this.glowFactors.sealHaloHoverOpacity > 0.001;
    this.sealGroup.add(this.sealHaloSprite);

    this.goldMat = new THREE.MeshStandardMaterial({
      color: sealColors.discHex,
      emissive: sealColors.discHex,
      emissiveIntensity: this.glowFactors.sealDiscEmissive,
      metalness: 0.38,
      roughness: 0.34,
      transparent: false,
      opacity: 1,
    });
    this.sealDiscGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.056, 32);
    this.sealDiscMesh = new THREE.Mesh(this.sealDiscGeo, this.goldMat);
    this.sealDiscMesh.rotation.x = Math.PI / 2;
    this.sealGroup.add(this.sealDiscMesh);

    this.sealRimMat = new THREE.MeshStandardMaterial({
      color: sealColors.rimHex,
      emissive: sealColors.rimHex,
      emissiveIntensity: this.glowFactors.sealRimEmissive,
      metalness: 0.84,
      roughness: 0.2,
      transparent: false,
      opacity: 1,
    });
    this.sealRimGeo = new THREE.TorusGeometry(0.328, 0.025, 12, 36);
    this.sealRimMesh = new THREE.Mesh(this.sealRimGeo, this.sealRimMat);
    this.sealRimMesh.position.z = 0.028;
    this.sealGroup.add(this.sealRimMesh);

    // 6. Raised 8-point radiant star emblem on the seal
    const starShape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? 0.23 : 0.092;
      const sx = Math.cos(a) * rad;
      const sy = Math.sin(a) * rad;
      if (i === 0) starShape.moveTo(sx, sy);
      else starShape.lineTo(sx, sy);
    }
    starShape.closePath();

    this.sealStarGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    this.sealStarMat = new THREE.MeshStandardMaterial({
      color: sealColors.starHex,
      emissive: sealColors.starEmissiveHex,
      emissiveIntensity: this.glowFactors.sealStarEmissive,
      metalness: 0.35,
      roughness: 0.18,
      transparent: false,
      opacity: 1,
    });
    this.sealStarMesh = new THREE.Mesh(this.sealStarGeo, this.sealStarMat);
    this.sealStarMesh.position.z = 0.032;
    this.sealGroup.add(this.sealStarMesh);

    this.sealGroup.position.set(0, this.sealRestingY, 0.175);
    this.bodyGroup.add(this.sealGroup);

    this.group.add(this.bodyGroup);

    // 7. Dissolve burst particles
    this.burstOrigins = new Float32Array(this.burstCount * 3);
    this.burstVelocities = new Float32Array(this.burstCount * 3);
    const burstPos = new Float32Array(this.burstCount * 3);

    for (let i = 0; i < this.burstCount; i++) {
      const i3 = i * 3;
      const ox = (Math.random() - 0.5) * 2.8;
      const oy = (Math.random() - 0.5) * 1.8;
      const oz = (Math.random() - 0.5) * 0.25;
      this.burstOrigins[i3] = ox;
      this.burstOrigins[i3 + 1] = oy;
      this.burstOrigins[i3 + 2] = oz;
      burstPos[i3] = ox;
      burstPos[i3 + 1] = oy;
      burstPos[i3 + 2] = oz;

      const angle = Math.atan2(oy, ox) + (Math.random() - 0.5) * 0.7;
      const speed = 1.2 + Math.random() * 2.4;
      this.burstVelocities[i3] = Math.cos(angle) * speed;
      this.burstVelocities[i3 + 1] = Math.sin(angle) * speed + 0.45;
      this.burstVelocities[i3 + 2] = (Math.random() - 0.5) * 2.2;
    }

    this.burstGeo = new THREE.BufferGeometry();
    this.burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
    this.burstMat = new THREE.PointsMaterial({
      color: sealColors.haloHex,
      size: 0.28,
      map: glowTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.burstPoints = new THREE.Points(this.burstGeo, this.burstMat);
    this.burstPoints.visible = false;
    this.burstPoints.frustumCulled = false;
    this.group.add(this.burstPoints);

    this.syncMotifTexture(
      resolveEnvelopeMotif(envelopeSettings),
      envColors.motifInkHex,
      envColors.isLightBody,
    );
  }

  private applyShapeGeometry(nextShape: EnvelopeShapeId): void {
    if (nextShape === this.currentShape) return;
    this.currentShape = nextShape;
    const oldBase = this.baseGeo;
    const oldPocket = this.pocketGeo;
    const oldFlap = this.flapGeo;
    const oldBodyOut = this.bodyOutlineGeo;
    const oldPocketOut = this.pocketOutlineGeo;
    const oldFlapOut = this.flapOutlineGeo;

    const geomSet = buildEnvelopeGeometrySet(nextShape);
    this.baseGeo = geomSet.baseGeo;
    this.pocketGeo = geomSet.pocketGeo;
    this.flapGeo = geomSet.flapGeo;
    this.bodyOutlineGeo = geomSet.bodyOutlineGeo;
    this.pocketOutlineGeo = geomSet.pocketOutlineGeo;
    this.flapOutlineGeo = geomSet.flapOutlineGeo;
    this.sealRestingY = geomSet.sealRestingY;

    this.baseMesh.geometry = this.baseGeo;
    this.pocketMesh.geometry = this.pocketGeo;
    this.flapMesh.geometry = this.flapGeo;
    this.bodyOutline.geometry = this.bodyOutlineGeo;
    this.pocketOutline.geometry = this.pocketOutlineGeo;
    this.flapOutline.geometry = this.flapOutlineGeo;

    if (this.state === 'sealed') {
      this.sealGroup.position.y = this.sealRestingY;
    }

    oldBase.dispose();
    oldPocket.dispose();
    oldFlap.dispose();
    oldBodyOut.dispose();
    oldPocketOut.dispose();
    oldFlapOut.dispose();
  }

  private syncMotifTexture(
    motif: EnvelopeMotifId,
    inkHex: string,
    isLightBody: boolean,
  ): void {
    if (
      motif === this.currentMotif &&
      inkHex === this.currentMotifInk &&
      isLightBody === this.currentMotifIsLight
    ) {
      return;
    }
    this.currentMotif = motif;
    this.currentMotifInk = inkHex;
    this.currentMotifIsLight = isLightBody;

    if (this.motifTex) {
      this.motifTex.dispose();
      this.motifTex = null;
    }

    if (motif === 'none') {
      this.motifMat.map = null;
      this.motifMat.needsUpdate = true;
      this.motifMesh.visible = false;
      return;
    }

    const nextTex = drawEnvelopeMotifTexture(motif, inkHex, isLightBody);
    if (nextTex) {
      this.motifTex = nextTex;
      this.motifMat.map = nextTex;
      this.motifMat.needsUpdate = true;
      this.motifMesh.visible = true;
    } else {
      this.motifMesh.visible = false;
    }
  }

  public setPaletteAndGlow(
    palette: CosmicPaletteConfig,
    glow: GlowColorConfig,
    envelopeSettings?: EnvelopeSettings,
  ): void {
    const nextShape = resolveEnvelopeShape(envelopeSettings);
    this.applyShapeGeometry(nextShape);

    const envColors = resolveEnvelopePaletteColors(
      envelopeSettings?.envelopeColor,
      palette,
    );
    const sealColors = resolveSealPaletteColors(
      envelopeSettings?.sealColor,
      glow,
    );
    this.glowFactors = resolveEnvelopeGlowFactors(
      envelopeSettings?.glowIntensity,
      envColors,
      sealColors,
    );

    const bodyEmissiveTarget =
      envColors.isLightBody && this.glowFactors.bodyEmissiveIntensity > 0
        ? '#EDE9FE'
        : envColors.emissiveHex;

    this.bodyMat.color.set(envColors.bodyHex).multiplyScalar(this.glowFactors.albedoScale);
    this.bodyMat.emissive.set(bodyEmissiveTarget);
    this.bodyMat.emissiveIntensity = this.glowFactors.bodyEmissiveIntensity;
    this.bodyMat.roughness = envColors.isLightBody ? 0.9 : 0.62;
    this.bodyMat.metalness = envColors.isLightBody ? 0.01 : 0.08;
    this.bodyMat.clearcoat = this.glowFactors.bodyClearcoat;
    this.bodyMat.envMapIntensity = this.glowFactors.bodyEnvMapIntensity;

    this.pocketMat.color
      .set(envColors.pocketHex)
      .multiplyScalar(this.glowFactors.albedoScale);
    this.pocketMat.emissive.set(bodyEmissiveTarget);
    this.pocketMat.emissiveIntensity = this.glowFactors.pocketEmissiveIntensity;
    this.pocketMat.roughness = envColors.isLightBody ? 0.88 : 0.58;
    this.pocketMat.metalness = envColors.isLightBody ? 0.01 : 0.1;
    this.pocketMat.envMapIntensity = this.glowFactors.pocketEnvMapIntensity;

    this.flapMat.color.set(envColors.flapHex).multiplyScalar(this.glowFactors.albedoScale);
    this.flapMat.emissive.set(bodyEmissiveTarget);
    this.flapMat.emissiveIntensity = this.glowFactors.flapEmissiveIntensity;
    this.flapMat.roughness = envColors.isLightBody ? 0.88 : 0.54;
    this.flapMat.metalness = envColors.isLightBody ? 0.01 : 0.12;
    this.flapMat.envMapIntensity = this.glowFactors.flapEnvMapIntensity;

    this.seamMat.color.set(envColors.borderHex);

    this.goldMat.color.set(sealColors.discHex);
    this.goldMat.emissive.set(sealColors.discHex);
    this.goldMat.emissiveIntensity = this.glowFactors.sealDiscEmissive;

    this.sealRimMat.color.set(sealColors.rimHex);
    this.sealRimMat.emissive.set(sealColors.rimHex);
    this.sealRimMat.emissiveIntensity = this.glowFactors.sealRimEmissive;

    this.sealStarMat.color.set(sealColors.starHex);
    this.sealStarMat.emissive.set(sealColors.starEmissiveHex);
    this.sealStarMat.emissiveIntensity = this.glowFactors.sealStarEmissive;

    this.sealHaloMat.color.set(sealColors.haloHex);
    if (this.state === 'sealed') {
      this.sealHaloMat.opacity = this.glowFactors.sealHaloOpacityBase;
      this.sealHaloSprite.visible = this.glowFactors.sealHaloHoverOpacity > 0.001;
    }
    this.innerGlowMat.color.set(glow.coreHex);
    this.burstMat.color.set(sealColors.haloHex);

    this.syncMotifTexture(
      resolveEnvelopeMotif(envelopeSettings),
      envColors.motifInkHex,
      envColors.isLightBody,
    );
  }

  public setHovered(hovered: boolean): void {
    this.isHovered = hovered;
  }

  public setSealedScale(scale: number): void {
    this.sealedScale = Math.max(0.22, Math.min(1.5, scale));
    if (this.state === 'sealed') {
      this.group.scale.setScalar(this.sealedScale);
    }
  }

  public setSealedOffsetY(offsetY: number): void {
    this.sealedOffsetY = Math.max(-1.2, Math.min(1.2, offsetY));
    if (this.state === 'sealed') {
      this.group.position.y = this.sealedOffsetY;
    }
  }

  public getHitMeshes(): THREE.Object3D[] {
    return [this.baseMesh, this.pocketMesh, this.flapMesh, this.sealDiscMesh];
  }

  private setSolidMaterialsOpacity(opacity: number): void {
    const needTransparent = opacity < 0.999;
    const mats = [
      this.bodyMat,
      this.pocketMat,
      this.flapMat,
      this.goldMat,
      this.sealRimMat,
      this.sealStarMat,
    ];
    for (const mat of mats) {
      if (mat.transparent !== needTransparent) {
        mat.transparent = needTransparent;
        mat.needsUpdate = true;
      }
      mat.opacity = opacity;
    }
  }

  public resetSealed(): void {
    this.state = 'sealed';
    this.openProgress = 0;
    this.group.visible = true;
    this.group.position.set(0, this.sealedOffsetY, 0);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(this.sealedScale);
    this.bodyGroup.visible = true;
    this.bodyGroup.scale.setScalar(1);
    this.flapPivot.rotation.x = 0;
    this.sealGroup.position.set(0, this.sealRestingY, 0.175);
    this.sealGroup.scale.setScalar(1);
    this.sealGroup.rotation.z = 0;
    this.setSolidMaterialsOpacity(1);
    this.seamMat.opacity = 0.62;
    this.motifMat.opacity = 1;
    this.sealStarMat.emissiveIntensity = this.glowFactors.sealStarEmissive;
    this.sealHaloMat.opacity = this.glowFactors.sealHaloOpacityBase;
    this.sealHaloSprite.visible = this.glowFactors.sealHaloHoverOpacity > 0.001;
    this.innerGlowMat.opacity = 0;
    this.burstPoints.visible = false;
    this.burstMat.opacity = 0;
  }

  public startOpening(): void {
    if (this.state === 'sealed') {
      this.state = 'opening';
      this.openProgress = 0;
      this.sealHaloSprite.visible = true;
      this.burstPoints.visible = true;
    }
  }

  public startFinaleAppear(): void {
    this.state = 'finaleOpening';
    this.openProgress = 0;
    this.group.visible = false;
    this.group.position.set(0, -2.55, 4.9);
    this.group.rotation.set(0.08, 0, 0);
    this.group.scale.setScalar(0.56);
    this.bodyGroup.visible = true;
    this.bodyGroup.scale.setScalar(1);
    this.flapPivot.rotation.x = 0;
    this.sealGroup.position.set(0, this.sealRestingY, 0.175);
    this.sealGroup.scale.setScalar(1);
    this.sealGroup.rotation.z = 0;
    this.setSolidMaterialsOpacity(0);
    this.seamMat.opacity = 0;
    this.motifMat.opacity = 0;
    this.sealHaloMat.opacity = 0;
    this.sealHaloSprite.visible = true;
    this.innerGlowMat.opacity = 0;
    this.burstPoints.visible = true;
    this.burstMat.opacity = 0;
  }

  public hideImmediately(): void {
    this.state = 'hidden';
    this.group.visible = false;
  }

  /**
   * Drives envelope animation from sealed idle -> seal ignition -> flap open -> dissolve into particles,
   * or during finale reveal -> smooth reappearance in lower-center foreground -> flap opening for the paper letter.
   */
  public update(
    elapsed: number,
    dt: number,
    choreographySec: number,
    reducedMotion: boolean,
  ): void {
    if (this.state === 'hidden') return;

    if (this.state === 'finaleOpening') {
      // Appears at 0..0.75s, opens flap at 0.75..1.85s, softly dissolves into emerging paper letter at 1.9..2.6s
      if (choreographySec <= 0.02) {
        this.group.visible = false;
        return;
      }
      this.group.visible = true;
      const enterP = THREE.MathUtils.clamp(choreographySec / 0.75, 0, 1);
      const enterEase = 1 - Math.pow(1 - enterP, 3);
      const sealP = THREE.MathUtils.clamp((choreographySec - 0.35) / 0.75, 0, 1);
      const flapP = THREE.MathUtils.clamp((choreographySec - 0.75) / 1.05, 0, 1);
      const handoffFadeP = THREE.MathUtils.clamp((choreographySec - 2.05) / 0.65, 0, 1);

      this.group.position.set(
        0,
        THREE.MathUtils.lerp(-2.6, -1.35, enterEase),
        THREE.MathUtils.lerp(4.2, 5.4, enterEase),
      );
      this.group.rotation.set(0.12, Math.sin(elapsed * 0.9) * 0.05, 0);
      this.group.scale.setScalar(0.56 * (0.85 + enterEase * 0.15 + handoffFadeP * 0.08));

      const baseOpacity = enterEase * (1 - handoffFadeP);
      this.setSolidMaterialsOpacity(baseOpacity);
      this.seamMat.opacity = baseOpacity * 0.62;
      this.motifMat.opacity = baseOpacity;

      const sealEase = 1 - Math.pow(1 - sealP, 3);
      this.sealGroup.rotation.z = sealEase * Math.PI * 0.65;
      this.sealGroup.position.z = 0.175 + sealEase * 0.36;
      this.sealGroup.scale.setScalar(1 + sealEase * 0.2);
      this.sealStarMat.emissiveIntensity = 0.65 + sealEase * 1.4;
      this.sealHaloMat.opacity = Math.max(0, baseOpacity * (0.45 + sealEase * 0.25));

      const flapEase = 1 - Math.pow(1 - flapP, 3);
      this.flapPivot.rotation.x = -flapEase * Math.PI * 0.85;

      const glowBell = Math.sin(
        THREE.MathUtils.clamp((choreographySec - 0.75) / 1.8, 0, 1) * Math.PI,
      );
      this.innerGlowMat.opacity = glowBell * 0.98 * (1 - handoffFadeP * 0.7);
      this.innerGlowSprite.scale.setScalar(2.6 + glowBell * 2.6);

      if (choreographySec >= 2.75) {
        this.state = 'hidden';
        this.group.visible = false;
      }
      return;
    }

    if (this.state === 'sealed') {
      if (!reducedMotion) {
        this.group.position.y = this.sealedOffsetY + Math.sin(elapsed * 1.45) * 0.08;
        this.group.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
        this.group.rotation.x = Math.cos(elapsed * 0.85) * 0.05;
        this.sealStarMesh.rotation.z = Math.sin(elapsed * 0.9) * 0.08;
      } else {
        this.group.position.y = this.sealedOffsetY;
      }

      const targetScale = this.isHovered ? 1.05 : 1.0;
      const nextScale = THREE.MathUtils.lerp(
        this.bodyGroup.scale.x,
        targetScale,
        1 - Math.exp(-8 * dt),
      );
      this.bodyGroup.scale.setScalar(nextScale);

      const pulse = reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 2.5);
      const targetHaloOpacity = this.isHovered
        ? this.glowFactors.sealHaloHoverOpacity
        : this.glowFactors.sealHaloOpacityBase;
      this.sealHaloMat.opacity = targetHaloOpacity * pulse;
      const hSize = (this.isHovered ? 1.62 : 1.36) * pulse;
      this.sealHaloSprite.scale.set(hSize, hSize, 1);
      return;
    }

    // State === 'opening':
    const sealP = THREE.MathUtils.clamp(choreographySec / 1.25, 0, 1);
    const flapP = THREE.MathUtils.clamp((choreographySec - 0.9) / 1.2, 0, 1);
    const dissolveP = THREE.MathUtils.clamp((choreographySec - 1.55) / 1.65, 0, 1);

    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0, 1 - Math.exp(-6 * dt));
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0.08, 1 - Math.exp(-5 * dt));
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, 0, 1 - Math.exp(-5 * dt));

    // Seal ignition & lift
    const sealEase = 1 - Math.pow(1 - sealP, 3);
    this.sealGroup.rotation.z = sealEase * Math.PI * 0.75;
    this.sealGroup.position.z = 0.175 + sealEase * 0.42;
    this.sealGroup.scale.setScalar(1 + sealEase * 0.25);
    this.sealStarMat.emissiveIntensity = 0.65 + sealEase * 1.6;
    this.sealHaloMat.opacity = Math.max(0, (0.68 - dissolveP) * (0.55 + sealEase * 0.25));
    this.sealHaloSprite.scale.setScalar(1.4 + sealEase * 1.1);

    // Flap opening
    const flapEase = 1 - Math.pow(1 - flapP, 3);
    this.flapPivot.rotation.x = -flapEase * Math.PI * 0.82;

    // Inner light swell
    const glowBell = Math.sin(THREE.MathUtils.clamp((choreographySec - 0.8) / 2.2, 0, 1) * Math.PI);
    this.innerGlowMat.opacity = glowBell * 0.95;
    this.innerGlowSprite.scale.setScalar(2.6 + glowBell * 2.4);

    // Body fade & particle burst
    const bodyFade = 1 - dissolveP;
    this.setSolidMaterialsOpacity(bodyFade);
    this.seamMat.opacity = bodyFade * 0.62;
    this.motifMat.opacity = bodyFade;
    this.goldMat.opacity = bodyFade;
    this.sealRimMat.opacity = bodyFade;
    this.sealStarMat.opacity = bodyFade;
    this.bodyGroup.scale.setScalar(1 + dissolveP * 0.14);

    if (dissolveP > 0) {
      const posAttr = this.burstGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < this.burstCount; i++) {
        const i3 = i * 3;
        const t = dissolveP * 1.9;
        arr[i3] = this.burstOrigins[i3] + this.burstVelocities[i3] * t;
        arr[i3 + 1] = this.burstOrigins[i3 + 1] + this.burstVelocities[i3 + 1] * t;
        arr[i3 + 2] = this.burstOrigins[i3 + 2] + this.burstVelocities[i3 + 2] * t;
      }
      posAttr.needsUpdate = true;
      this.burstMat.opacity = Math.sin(dissolveP * Math.PI) * 0.95;
    }

    if (choreographySec >= 3.35) {
      this.state = 'hidden';
      this.group.visible = false;
    }
  }

  public dispose(): void {
    this.baseGeo.dispose();
    this.pocketGeo.dispose();
    this.flapGeo.dispose();
    this.bodyOutlineGeo.dispose();
    this.pocketOutlineGeo.dispose();
    this.flapOutlineGeo.dispose();
    this.motifGeo.dispose();
    if (this.motifTex) {
      this.motifTex.dispose();
      this.motifTex = null;
    }
    this.sealDiscGeo.dispose();
    this.sealRimGeo.dispose();
    this.sealStarGeo.dispose();
    this.burstGeo.dispose();

    this.bodyMat.dispose();
    this.pocketMat.dispose();
    this.flapMat.dispose();
    this.seamMat.dispose();
    this.motifMat.dispose();
    this.goldMat.dispose();
    this.sealRimMat.dispose();
    this.sealStarMat.dispose();
    this.sealHaloMat.dispose();
    this.innerGlowMat.dispose();
    this.burstMat.dispose();
  }
}

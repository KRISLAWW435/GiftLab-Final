import * as THREE from 'three';
import type { EnvelopeSettings } from '../types/project';
import type { CosmicPaletteConfig, GlowColorConfig } from './paletteConfig';

export class EnvelopeProp {
  public readonly group = new THREE.Group();

  private bodyGroup = new THREE.Group();
  private flapPivot = new THREE.Group();
  private sealGroup = new THREE.Group();

  private baseMesh: THREE.Mesh;
  private pocketMesh: THREE.Mesh;
  private flapMesh: THREE.Mesh;
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

  private baseGeo: THREE.ExtrudeGeometry;
  private pocketGeo: THREE.ExtrudeGeometry;
  private flapGeo: THREE.ExtrudeGeometry;
  private sealDiscGeo: THREE.CylinderGeometry;
  private sealRimGeo: THREE.TorusGeometry;
  private sealStarGeo: THREE.ExtrudeGeometry;

  private bodyMat: THREE.MeshPhysicalMaterial;
  private trimMat: THREE.MeshStandardMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private sealStarMat: THREE.MeshStandardMaterial;
  private sealHaloMat: THREE.SpriteMaterial;
  private innerGlowMat: THREE.SpriteMaterial;

  private state: 'sealed' | 'opening' | 'finaleOpening' | 'hidden' = 'sealed';
  private openProgress = 0; // 0..1 during opening animation
  private isHovered = false;
  private sealedScale = 1;
  private sealedOffsetY = 0;

  constructor(
    palette: CosmicPaletteConfig,
    glow: GlowColorConfig,
    glowTex: THREE.Texture,
    envelopeSettings?: EnvelopeSettings,
  ) {
    // 1. Primary beveled envelope body
    const bodyShape = new THREE.Shape();
    const w = 1.55;
    const h = 1.02;
    const r = 0.08;
    bodyShape.moveTo(-w + r, -h);
    bodyShape.lineTo(w - r, -h);
    bodyShape.quadraticCurveTo(w, -h, w, -h + r);
    bodyShape.lineTo(w, h - r);
    bodyShape.quadraticCurveTo(w, h, w - r, h);
    bodyShape.lineTo(-w + r, h);
    bodyShape.quadraticCurveTo(-w, h, -w, h - r);
    bodyShape.lineTo(-w, -h + r);
    bodyShape.quadraticCurveTo(-w, -h, -w + r, -h);

    this.baseGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    this.baseGeo.center();

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: palette.midColor,
      emissive: palette.nebulaPrimary,
      emissiveIntensity: 0.16,
      roughness: 0.62,
      metalness: 0.12,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
      transparent: true,
      opacity: 1,
    });
    this.baseMesh = new THREE.Mesh(this.baseGeo, this.bodyMat);
    this.bodyGroup.add(this.baseMesh);

    // 2. Front lower folded pocket V-trim
    const pocketShape = new THREE.Shape();
    pocketShape.moveTo(-1.52, -0.98);
    pocketShape.lineTo(1.52, -0.98);
    pocketShape.lineTo(1.52, 0.32);
    pocketShape.lineTo(0, -0.22);
    pocketShape.lineTo(-1.52, 0.32);
    pocketShape.closePath();

    this.pocketGeo = new THREE.ExtrudeGeometry(pocketShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    this.trimMat = new THREE.MeshStandardMaterial({
      color: palette.deepColor,
      emissive: palette.nebulaSecondary,
      emissiveIntensity: 0.2,
      roughness: 0.48,
      metalness: 0.28,
      transparent: true,
      opacity: 1,
    });
    this.pocketMesh = new THREE.Mesh(this.pocketGeo, this.trimMat);
    this.pocketMesh.position.z = 0.05;
    this.bodyGroup.add(this.pocketMesh);

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
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-1.52, 0);
    flapShape.lineTo(1.52, 0);
    flapShape.lineTo(0.14, -1.12);
    flapShape.quadraticCurveTo(0, -1.24, -0.14, -1.12);
    flapShape.closePath();

    this.flapGeo = new THREE.ExtrudeGeometry(flapShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    this.flapMesh = new THREE.Mesh(this.flapGeo, this.trimMat);
    this.flapPivot.position.set(0, 0.98, 0.085);
    this.flapPivot.add(this.flapMesh);
    this.bodyGroup.add(this.flapPivot);

    // 5. Star wax-gold seal on flap tip
    this.goldMat = new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: glow.haloHex,
      emissiveIntensity: 0.35,
      metalness: 0.92,
      roughness: 0.18,
      transparent: true,
      opacity: 1,
    });
    this.sealDiscGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.06, 28);
    this.sealDiscMesh = new THREE.Mesh(this.sealDiscGeo, this.goldMat);
    this.sealDiscMesh.rotation.x = Math.PI / 2;
    this.sealGroup.add(this.sealDiscMesh);

    this.sealRimGeo = new THREE.TorusGeometry(0.33, 0.024, 10, 32);
    this.sealRimMesh = new THREE.Mesh(this.sealRimGeo, this.goldMat);
    this.sealRimMesh.position.z = 0.025;
    this.sealGroup.add(this.sealRimMesh);

    // 6. Raised 8-point radiant star emblem on the seal
    const starShape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? 0.24 : 0.095;
      const sx = Math.cos(a) * rad;
      const sy = Math.sin(a) * rad;
      if (i === 0) starShape.moveTo(sx, sy);
      else starShape.lineTo(sx, sy);
    }
    starShape.closePath();

    this.sealStarGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    this.sealStarMat = new THREE.MeshStandardMaterial({
      color: glow.coreHex,
      emissive: glow.hex,
      emissiveIntensity: 1.25,
      metalness: 0.45,
      roughness: 0.14,
      transparent: true,
      opacity: 1,
    });
    this.sealStarMesh = new THREE.Mesh(this.sealStarGeo, this.sealStarMat);
    this.sealStarMesh.position.z = 0.028;
    this.sealGroup.add(this.sealStarMesh);

    this.sealHaloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: glow.hex,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sealHaloSprite = new THREE.Sprite(this.sealHaloMat);
    this.sealHaloSprite.position.z = 0.06;
    this.sealHaloSprite.scale.set(1.55, 1.55, 1);
    this.sealGroup.add(this.sealHaloSprite);

    this.sealGroup.position.set(0, -0.14, 0.16);
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
      color: glow.hex,
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
    if (envelopeSettings) {
      this.setPaletteAndGlow(palette, glow, envelopeSettings);
    }
  }

  public setPaletteAndGlow(
    palette: CosmicPaletteConfig,
    glow: GlowColorConfig,
    envelopeSettings?: EnvelopeSettings,
  ): void {
    const customEnv = envelopeSettings?.envelopeColor;
    if (customEnv) {
      const envBase = new THREE.Color(customEnv);
      const envTrim = envBase.clone().multiplyScalar(0.76);
      const envGlow = envBase.clone().multiplyScalar(0.32);
      this.bodyMat.color.copy(envBase);
      this.bodyMat.emissive.copy(envGlow);
      this.trimMat.color.copy(envTrim);
      this.trimMat.emissive.copy(envGlow);
    } else {
      this.bodyMat.color.set(palette.midColor);
      this.bodyMat.emissive.set(palette.nebulaPrimary);
      this.trimMat.color.set(palette.deepColor);
      this.trimMat.emissive.set(palette.nebulaSecondary);
    }

    const customSeal = envelopeSettings?.sealColor;
    if (customSeal) {
      const sealBase = new THREE.Color(customSeal);
      const sealCore = sealBase.clone().lerp(new THREE.Color('#ffffff'), 0.42);
      this.goldMat.color.copy(sealBase);
      this.goldMat.emissive.copy(sealBase);
      this.sealStarMat.color.copy(sealCore);
      this.sealStarMat.emissive.copy(sealBase);
      this.sealHaloMat.color.copy(sealBase);
      this.innerGlowMat.color.copy(sealCore);
      this.burstMat.color.copy(sealBase);
    } else {
      this.goldMat.color.set('#fde68a');
      this.goldMat.emissive.set(glow.haloHex);
      this.sealStarMat.color.set(glow.coreHex);
      this.sealStarMat.emissive.set(glow.hex);
      this.sealHaloMat.color.set(glow.hex);
      this.innerGlowMat.color.set(glow.coreHex);
      this.burstMat.color.set(glow.hex);
    }
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
    this.sealGroup.position.set(0, -0.14, 0.16);
    this.sealGroup.scale.setScalar(1);
    this.sealGroup.rotation.z = 0;
    this.bodyMat.opacity = 1;
    this.trimMat.opacity = 1;
    this.goldMat.opacity = 1;
    this.sealStarMat.opacity = 1;
    this.sealHaloMat.opacity = 0.78;
    this.innerGlowMat.opacity = 0;
    this.burstPoints.visible = false;
    this.burstMat.opacity = 0;
  }

  public startOpening(): void {
    if (this.state === 'sealed') {
      this.state = 'opening';
      this.openProgress = 0;
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
    this.sealGroup.position.set(0, -0.14, 0.16);
    this.sealGroup.scale.setScalar(1);
    this.sealGroup.rotation.z = 0;
    this.bodyMat.opacity = 0;
    this.trimMat.opacity = 0;
    this.goldMat.opacity = 0;
    this.sealStarMat.opacity = 0;
    this.sealHaloMat.opacity = 0;
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
      this.bodyMat.opacity = baseOpacity;
      this.trimMat.opacity = baseOpacity;
      this.goldMat.opacity = baseOpacity;
      this.sealStarMat.opacity = baseOpacity;

      const sealEase = 1 - Math.pow(1 - sealP, 3);
      this.sealGroup.rotation.z = sealEase * Math.PI * 0.65;
      this.sealGroup.position.z = 0.16 + sealEase * 0.36;
      this.sealGroup.scale.setScalar(1 + sealEase * 0.2);
      this.sealStarMat.emissiveIntensity = 1.25 + sealEase * 2.1;
      this.sealHaloMat.opacity = Math.max(0, baseOpacity * (0.75 + sealEase * 0.25));

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
      this.sealHaloMat.opacity = (this.isHovered ? 0.92 : 0.72) * pulse;
      const hSize = (this.isHovered ? 1.85 : 1.5) * pulse;
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
    this.sealGroup.position.z = 0.16 + sealEase * 0.42;
    this.sealGroup.scale.setScalar(1 + sealEase * 0.25);
    this.sealStarMat.emissiveIntensity = 1.25 + sealEase * 2.4;
    this.sealHaloMat.opacity = Math.max(0, (0.95 - dissolveP) * (0.75 + sealEase * 0.25));
    this.sealHaloSprite.scale.setScalar(1.6 + sealEase * 1.4);

    // Flap opening
    const flapEase = 1 - Math.pow(1 - flapP, 3);
    this.flapPivot.rotation.x = -flapEase * Math.PI * 0.82;

    // Inner light swell
    const glowBell = Math.sin(THREE.MathUtils.clamp((choreographySec - 0.8) / 2.2, 0, 1) * Math.PI);
    this.innerGlowMat.opacity = glowBell * 0.95;
    this.innerGlowSprite.scale.setScalar(2.6 + glowBell * 2.4);

    // Body fade & particle burst
    const bodyFade = 1 - dissolveP;
    this.bodyMat.opacity = bodyFade;
    this.trimMat.opacity = bodyFade;
    this.goldMat.opacity = bodyFade;
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
    this.sealDiscGeo.dispose();
    this.sealRimGeo.dispose();
    this.sealStarGeo.dispose();
    this.burstGeo.dispose();

    this.bodyMat.dispose();
    this.trimMat.dispose();
    this.goldMat.dispose();
    this.sealStarMat.dispose();
    this.sealHaloMat.dispose();
    this.innerGlowMat.dispose();
    this.burstMat.dispose();
  }
}

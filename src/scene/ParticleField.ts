import * as THREE from 'three';
import type { ConstellationAnimationId } from '../types/project';

interface ShootingStarSlot {
  line: THREE.Line;
  geo: THREE.BufferGeometry;
  mat: THREE.LineBasicMaterial;
  active: boolean;
  age: number;
  duration: number;
  startPos: THREE.Vector3;
  vel: THREE.Vector3;
}

export class ParticleField {
  public readonly group = new THREE.Group();

  private bgGeo: THREE.BufferGeometry;
  private bgMat: THREE.PointsMaterial;
  private bgPoints: THREE.Points;

  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.PointsMaterial;
  private dustPoints: THREE.Points;

  private dustBasePositions: Float32Array;
  private dustPhases: Float32Array;
  private dustCount: number;
  private finaleSwirl = 0;
  private targetFinaleSwirl = 0;

  private shootingStars: ShootingStarSlot[] = [];
  private nextShootCooldown = 2.4;

  constructor(
    dustColorHex: string,
    glowTex: THREE.Texture,
    lowPerformance: boolean,
  ) {
    const bgCount = lowPerformance ? 240 : 520;
    this.dustCount = lowPerformance ? 65 : 140;

    // 1. Distant multi-shell background starfield
    const bgPositions = new Float32Array(bgCount * 3);
    const bgColors = new Float32Array(bgCount * 3);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < bgCount; i++) {
      const r = 26 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      bgPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      bgPositions[i * 3 + 1] = r * Math.cos(phi);
      bgPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tintPick = Math.random();
      if (tintPick < 0.6) tmpCol.set('#f8fafc');
      else if (tintPick < 0.8) tmpCol.set('#bae6fd');
      else tmpCol.set('#f5d0fe');

      const brightness = 0.55 + Math.random() * 0.45;
      bgColors[i * 3] = tmpCol.r * brightness;
      bgColors[i * 3 + 1] = tmpCol.g * brightness;
      bgColors[i * 3 + 2] = tmpCol.b * brightness;
    }

    this.bgGeo = new THREE.BufferGeometry();
    this.bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    this.bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

    this.bgMat = new THREE.PointsMaterial({
      size: 0.28,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.bgPoints = new THREE.Points(this.bgGeo, this.bgMat);
    this.group.add(this.bgPoints);

    // 2. Midground floating cosmic dust
    this.dustBasePositions = new Float32Array(this.dustCount * 3);
    this.dustPhases = new Float32Array(this.dustCount);
    const dustPositions = new Float32Array(this.dustCount * 3);

    for (let i = 0; i < this.dustCount; i++) {
      const x = (Math.random() - 0.5) * 22;
      const y = (Math.random() - 0.5) * 14;
      const z = (Math.random() - 0.5) * 14;
      this.dustBasePositions[i * 3] = x;
      this.dustBasePositions[i * 3 + 1] = y;
      this.dustBasePositions[i * 3 + 2] = z;
      dustPositions[i * 3] = x;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = z;
      this.dustPhases[i] = Math.random() * Math.PI * 2;
    }

    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    this.dustMat = new THREE.PointsMaterial({
      color: dustColorHex,
      size: 0.22,
      map: glowTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPoints.frustumCulled = false;
    this.group.add(this.dustPoints);

    // 3. Pre-allocated subtle background shooting stars (zero per-frame GC)
    const streakCount = lowPerformance ? 1 : 2;
    for (let s = 0; s < streakCount; s++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(6), 3),
      );
      geo.setAttribute(
        'color',
        new THREE.BufferAttribute(
          new Float32Array([0.35, 0.4, 0.75, 1.0, 0.98, 0.9]),
          3,
        ),
      );
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.group.add(line);

      this.shootingStars.push({
        line,
        geo,
        mat,
        active: false,
        age: 0,
        duration: 1.0,
        startPos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      });
    }
  }

  public setDustColor(hex: string): void {
    this.dustMat.color.set(hex);
  }

  public setFinaleActive(active: boolean): void {
    this.targetFinaleSwirl = active ? 1 : 0;
  }

  private spawnShootingStar(): void {
    const slot = this.shootingStars.find((s) => !s.active);
    if (!slot) return;

    const fromLeft = Math.random() > 0.45;
    const x = fromLeft ? -16 - Math.random() * 6 : 16 + Math.random() * 6;
    const y = 3.5 + Math.random() * 8;
    const z = -18 - Math.random() * 10;

    slot.startPos.set(x, y, z);
    const speedX = (fromLeft ? 1 : -1) * (16 + Math.random() * 8);
    const speedY = -(6 + Math.random() * 5);
    slot.vel.set(speedX, speedY, 0);
    slot.duration = 0.85 + Math.random() * 0.45;
    slot.age = 0;
    slot.active = true;
    slot.line.visible = true;
  }

  public update(
    elapsed: number,
    dt: number,
    reducedMotion: boolean,
    animationMode: ConstellationAnimationId = 'rotation',
  ): void {
    this.finaleSwirl = THREE.MathUtils.lerp(
      this.finaleSwirl,
      this.targetFinaleSwirl,
      1 - Math.exp(-2.5 * dt),
    );

    const staticMode = reducedMotion || animationMode === 'none';
    if (staticMode) {
      this.dustMat.size = 0.22;
      this.dustMat.opacity = 0.55;
      for (const s of this.shootingStars) {
        s.active = false;
        s.line.visible = false;
      }
      return;
    }

    const isDustMode = animationMode === 'dust';
    this.bgPoints.rotation.y = elapsed * (isDustMode ? 0.02 : 0.012);

    const posAttr = this.dustGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const pull = 1 - this.finaleSwirl * 0.42;
    const driftAmp = isDustMode ? 0.72 : 0.34;
    const swirlAngle =
      this.finaleSwirl * elapsed * 0.45 + (isDustMode ? elapsed * 0.18 : 0);
    const cosA = Math.cos(swirlAngle);
    const sinA = Math.sin(swirlAngle);

    for (let i = 0; i < this.dustCount; i++) {
      const i3 = i * 3;
      const ph = this.dustPhases[i];
      const bx = this.dustBasePositions[i3] * pull;
      const by = this.dustBasePositions[i3 + 1] * pull;
      const bz = this.dustBasePositions[i3 + 2] * pull;

      const rx = bx * cosA - bz * sinA;
      const rz = bx * sinA + bz * cosA;

      const freq = isDustMode ? 0.55 : 0.35;
      arr[i3] = rx + Math.sin(elapsed * freq + ph) * driftAmp;
      arr[i3 + 1] = by + Math.cos(elapsed * (freq * 0.85) + ph * 1.3) * driftAmp;
      arr[i3 + 2] = rz + Math.sin(elapsed * (freq * 0.9) + ph * 0.7) * driftAmp;
    }

    posAttr.needsUpdate = true;
    this.dustMat.size = isDustMode ? 0.32 : 0.22;
    this.dustMat.opacity = isDustMode
      ? Math.min(0.95, 0.85 + 0.1 * Math.sin(elapsed * 1.6))
      : 0.62 + this.finaleSwirl * 0.28;

    // Update background shooting stars
    this.nextShootCooldown -= dt;
    if (this.nextShootCooldown <= 0) {
      this.spawnShootingStar();
      this.nextShootCooldown =
        this.targetFinaleSwirl > 0.5
          ? 2.4 + Math.random() * 2.8
          : 4.5 + Math.random() * 4.5;
    }

    for (const s of this.shootingStars) {
      if (!s.active) continue;
      s.age += dt;
      const t = s.age / s.duration;
      if (t >= 1) {
        s.active = false;
        s.line.visible = false;
        continue;
      }

      const hx = s.startPos.x + s.vel.x * s.age;
      const hy = s.startPos.y + s.vel.y * s.age;
      const hz = s.startPos.z + s.vel.z * s.age;
      const tailLag = 0.16;
      const tx = hx - s.vel.x * tailLag;
      const ty = hy - s.vel.y * tailLag;
      const tz = hz - s.vel.z * tailLag;

      const attr = s.geo.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(0, tx, ty, tz);
      attr.setXYZ(1, hx, hy, hz);
      attr.needsUpdate = true;

      s.mat.opacity = Math.sin(t * Math.PI) * (this.targetFinaleSwirl > 0.5 ? 0.92 : 0.68);
    }
  }

  public dispose(): void {
    this.bgGeo.dispose();
    this.bgMat.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    for (const s of this.shootingStars) {
      s.geo.dispose();
      s.mat.dispose();
    }
  }
}

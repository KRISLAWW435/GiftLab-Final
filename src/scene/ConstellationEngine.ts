import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type {
  ConstellationAnimationId,
  ConstellationStar,
  CosmicPaletteId,
  DeviceConstellationLayout,
  DeviceLayoutKey,
  EditorInteractionMode,
  EnvelopeSettings,
  GlowColorId,
  RecipientPhase,
  StarConnection,
  StarPosition3D,
} from '../types/project';
import {
  COSMIC_PALETTES,
  GLOW_COLORS,
  buildLegacySequentialConnections,
  computeEnvelopeWorldOffsetY,
  resolveEnvelopeEffectiveWorldScale,
  resolveEnvelopeOffsetY,
  resolveStarGlowHex,
  resolveStarShape,
  resolveViewportDeviceMode,
} from './paletteConfig';
import {
  createGlowSpriteTexture,
  createNebulaCloudTexture,
  createStarFlareTexture,
  createStudioEnvironment,
  detectSoftwareWebGL,
  hasWebGL2Support,
} from './proceduralAssets';
import { NebulaBackground } from './NebulaBackground';
import {
  StarNode,
  createSharedStarGeometries,
  disposeSharedStarGeometries,
  type SharedStarGeometries,
} from './StarNode';
import { ConstellationLines } from './ConstellationLines';
import { ParticleField } from './ParticleField';
import { CameraController } from './CameraController';
import { EnvelopeProp } from './EnvelopeProp';

export interface ConstellationEngineCallbacks {
  onSelectStar?: (starId: string) => void;
  onSelectConnection?: (connectionId: string | null) => void;
  onMoveStar?: (starId: string, position: StarPosition3D) => void;
  onDragStar?: (starId: string, position: StarPosition3D, isDepthDrag: boolean) => void;
  onDragEnd?: () => void;
  onIntroComplete?: () => void;
  onBirthComplete?: () => void;
  onFinalRevealComplete?: () => void;
  onOpenEnvelope?: () => void;
  onCameraOrbit?: () => void;
  onWebGLUnavailable?: () => void;
}

export interface ConstellationSceneState {
  paletteId: CosmicPaletteId;
  globalGlowColor: GlowColorId;
  stars: ConstellationStar[];
  connections?: StarConnection[];
  selectedStarId: string | null;
  selectedConnectionId?: string | null;
  pendingLinkStarId?: string | null;
  visitedStarIds: string[];
  interactionMode: EditorInteractionMode | 'recipient';
  recipientPhase?: RecipientPhase;
  unlockedCount?: number;
  finaleActive: boolean;
  lowPerformance: boolean;
  reducedMotion: boolean;
  deviceMode?: DeviceLayoutKey;
  constellationLayout?: DeviceConstellationLayout;
  envelopeSettings?: EnvelopeSettings;
  constellationAnimation?: ConstellationAnimationId;
}

const _ndc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _dragPlane = new THREE.Plane();
const _camForward = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _hitPoint = new THREE.Vector3();
const _worldTmp = new THREE.Vector3();
const _heroSlotTmp = new THREE.Vector3();
const _camLocalTmp = new THREE.Vector3();

// 1 full 360° vertical rotation of the completed constellation every ~52 seconds
const FINALE_ROTATE_SPEED = (Math.PI * 2) / 52;

/**
 * Reusable zero-GC particle convergence burst when any individual star is born.
 */
class StarBirthBurst {
  public readonly group = new THREE.Group();
  private geo: THREE.BufferGeometry;
  private mat: THREE.PointsMaterial;
  private points: THREE.Points;
  private coreMat: THREE.SpriteMaterial;
  private coreSprite: THREE.Sprite;

  private readonly count = 88;
  private readonly dirs: Float32Array;
  private readonly seeds: Float32Array;
  private active = false;
  private age = 0;
  private readonly duration = 1.2;

  constructor(glowTex: THREE.Texture) {
    this.dirs = new Float32Array(this.count * 3);
    this.seeds = new Float32Array(this.count);
    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      this.dirs[i3] = Math.sin(phi) * Math.cos(theta);
      this.dirs[i3 + 1] = Math.cos(phi);
      this.dirs[i3 + 2] = Math.sin(phi) * Math.sin(theta);
      this.seeds[i] = 0.65 + Math.random() * 1.1;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.mat = new THREE.PointsMaterial({
      color: '#fde68a',
      size: 0.26,
      map: glowTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    this.coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: '#fffbeb',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreSprite = new THREE.Sprite(this.coreMat);
    this.coreSprite.scale.set(2.2, 2.2, 1);
    this.group.add(this.coreSprite);

    this.group.visible = false;
  }

  public trigger(center: THREE.Vector3, glowHex: string, coreHex: string): void {
    this.group.position.copy(center);
    this.mat.color.set(glowHex);
    this.coreMat.color.set(coreHex);
    this.age = 0;
    this.active = true;
    this.group.visible = true;
  }

  public update(dt: number, reducedMotion: boolean): void {
    if (!this.active) return;
    if (reducedMotion) {
      this.active = false;
      this.group.visible = false;
      return;
    }

    this.age += dt;
    const t = this.age / this.duration;
    if (t >= 1) {
      this.active = false;
      this.group.visible = false;
      return;
    }

    const posAttr = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    // 0..0.42: particles swirl inward to ignite star; 0.42..1.0: sparkling corona expands out
    const gather = t < 0.42;
    const phaseT = gather ? 1 - t / 0.42 : (t - 0.42) / 0.58;
    const swirl = t * Math.PI * 2.2;
    const cosS = Math.cos(swirl);
    const sinS = Math.sin(swirl);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const radius = (gather ? 1.85 * Math.pow(phaseT, 1.3) : 0.35 + phaseT * 1.95) * this.seeds[i];
      const dx = this.dirs[i3];
      const dy = this.dirs[i3 + 1];
      const dz = this.dirs[i3 + 2];

      const rx = dx * cosS - dz * sinS;
      const rz = dx * sinS + dz * cosS;

      arr[i3] = rx * radius;
      arr[i3 + 1] = dy * radius;
      arr[i3 + 2] = rz * radius;
    }
    posAttr.needsUpdate = true;

    const fade = Math.sin(t * Math.PI);
    this.mat.opacity = Math.min(0.95, fade * 1.15);
    this.coreMat.opacity = Math.sin(Math.min(1, t * 1.35) * Math.PI) * 0.85;
    const cScale = 1.4 + Math.sin(t * Math.PI) * 2.1;
    this.coreSprite.scale.set(cScale, cScale, 1);
  }

  public dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.coreMat.dispose();
  }
}

export class ConstellationEngine {
  private container: HTMLElement;
  private callbacks: ConstellationEngineCallbacks;

  private renderer!: THREE.WebGLRenderer;
  private composer?: EffectComposer;
  private bloomPass?: UnrealBloomPass;
  private outputPass?: OutputPass;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private envTexture!: THREE.Texture;

  private glowTex!: THREE.CanvasTexture;
  private flareTex!: THREE.CanvasTexture;
  private cloudTex!: THREE.CanvasTexture;
  private sharedStarGeos!: SharedStarGeometries;

  private constellationRoot = new THREE.Group();
  private nebula!: NebulaBackground;
  private lines!: ConstellationLines;
  private particles!: ParticleField;
  private cameraCtrl!: CameraController;
  private envelope?: EnvelopeProp;
  private birthBurst!: StarBirthBurst;

  private starNodes = new Map<string, StarNode>();
  private orderedStarIds: string[] = [];
  private starIndexById = new Map<string, number>();

  private state: ConstellationSceneState;
  private isSoftwareGl = false;
  private isDisposed = false;
  private isTabHidden = false;
  private frameId = 0;
  private lastTime = performance.now();
  private elapsed = 0;

  // Recipient choreographies & finale spin
  private sealedMode = false;
  private birthPlaying = false;
  private birthElapsed = 0;
  private birthBurstTriggered = false;
  private readonly birthDuration = 3.85;

  private finalRevealPlaying = false;
  private finalRevealElapsed = 0;
  private readonly finalRevealDuration = 4.35;

  private introPlaying = false;
  private introElapsed = 0;
  private introDuration = 3.2;

  private currentSpinSpeed = 0;
  private lastAppliedRecipientPhase: RecipientPhase | undefined;

  // Pointer & drag state
  private hoveredStarId: string | null = null;
  private hoveredEnvelope = false;
  private draggingStarId: string | null = null;
  private draggingPointerId: number | null = null;
  private activePointers = new Map<number, string>();
  private pointerDownPos = { x: 0, y: 0 };
  private isPointerDown = false;
  private dragOffset = new THREE.Vector3();
  private lastDragClientY = 0;
  private wasShiftDragging = false;
  private dragPlaneUsesWorldZ = true;
  private lastStarDragAt = -10;

  private resizeObserver?: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialState: ConstellationSceneState,
    callbacks: ConstellationEngineCallbacks,
    startOptions: boolean | { playIntroOnStart?: boolean; startSealed?: boolean } = false,
  ) {
    this.container = container;
    this.state = initialState;
    this.callbacks = callbacks;

    if (!hasWebGL2Support()) {
      this.callbacks.onWebGLUnavailable?.();
      return;
    }

    const opts =
      typeof startOptions === 'boolean'
        ? { playIntroOnStart: startOptions, startSealed: false }
        : startOptions;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.initScene(Boolean(opts.playIntroOnStart), Boolean(opts.startSealed));
    this.bindEvents();
    this.startLoop();
  }

  private initScene(playIntroOnStart: boolean, startSealed: boolean): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    const maxDpr = this.state.lowPerformance || window.innerWidth < 768 ? 1.5 : 2;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr),
    );
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';

    this.container.appendChild(this.renderer.domElement);

    const palette = COSMIC_PALETTES[this.state.paletteId];

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(palette.fogColor, 0.011);
    this.envTexture = createStudioEnvironment(this.renderer);
    this.scene.environment = this.envTexture;

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 240);
    this.camera.position.set(0, 0.5, 12.2);

    // Balanced three-point lighting for crisp crystal facet contrast without overexposure
    const hemiLight = new THREE.HemisphereLight('#c4b5fd', '#0c0614', 0.42);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 1.65);
    keyLight.position.set(6, 8, 9);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.15);
    rimLight.position.set(-7, -4, -6);
    this.scene.add(rimLight);

    const accentRimLight = new THREE.DirectionalLight('#f472b6', 0.85);
    accentRimLight.position.set(5, -6, -5);
    this.scene.add(accentRimLight);

    const maxAniso = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.glowTex = createGlowSpriteTexture(maxAniso);
    this.flareTex = createStarFlareTexture(maxAniso);
    this.cloudTex = createNebulaCloudTexture(maxAniso);
    this.sharedStarGeos = createSharedStarGeometries();

    this.nebula = new NebulaBackground(palette, this.cloudTex);
    this.scene.add(this.nebula.group);

    this.lines = new ConstellationLines(palette.lineTint, this.glowTex);
    this.constellationRoot.add(this.lines.group);
    this.scene.add(this.constellationRoot);

    this.particles = new ParticleField(
      palette.dustTint,
      this.glowTex,
      this.state.lowPerformance,
    );
    this.scene.add(this.particles.group);

    this.birthBurst = new StarBirthBurst(this.glowTex);
    this.scene.add(this.birthBurst.group);

    this.cameraCtrl = new CameraController(
      this.camera,
      this.renderer.domElement,
      this.isSoftwareGl,
      () => this.callbacks.onCameraOrbit?.(),
    );

    if (startSealed) {
      const glowCfg = GLOW_COLORS[this.state.globalGlowColor];
      this.envelope = new EnvelopeProp(
        palette,
        glowCfg,
        this.glowTex,
        this.state.envelopeSettings,
      );
      this.scene.add(this.envelope.group);
    }

    this.syncStars(this.state.stars, this.state.connections);
    this.applySceneState(this.state);

    if (!this.isSoftwareGl) {
      const bloomScale = this.state.lowPerformance ? 0.35 : 0.5;
      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(width, height);

      const renderPass = new RenderPass(this.scene, this.camera);
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(
          Math.max(1, Math.floor(width * bloomScale)),
          Math.max(1, Math.floor(height * bloomScale)),
        ),
        0.22,
        0.34,
        0.88,
      );
      this.outputPass = new OutputPass();

      this.composer.addPass(renderPass);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.outputPass);

      this.renderer.compile(this.scene, this.camera);
    }

    if (startSealed) {
      this.enterSealedState();
    } else if (playIntroOnStart && !this.state.reducedMotion) {
      this.playIntro();
    }
  }

  private getHeroShowcaseSlot(out: THREE.Vector3): { scale: number; isPortrait: boolean } {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    const isPortrait = height > width || width < 540;
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const tanHalf = Math.tan(fovRad * 0.5);

    let localX = 0;
    let localY = 0;
    let d = 5.1;
    let scale = 1.8;

    if (isPortrait) {
      // Portrait phone/tablet: 3D star positioned in upper ~26% above story illustration & text
      d = 5.8;
      const halfH = d * tanHalf;
      localY = halfH * 0.48;
      scale = width < 440 ? 1.2 : 1.36;
    } else {
      // Landscape (wide phones, tablets, desktop): left ~44% area
      d = 5.1;
      const halfH = d * tanHalf;
      const halfW = halfH * aspect;
      localX = -halfW * 0.54;
      localY = height < 520 ? 0.02 : 0.08;
      scale = height < 520 ? 1.3 : width < 1024 ? 1.52 : 1.82;
    }

    this.camera.updateMatrixWorld();
    this.constellationRoot.updateMatrixWorld();
    _camLocalTmp.set(localX, localY, -d).applyMatrix4(this.camera.matrixWorld);
    this.constellationRoot.worldToLocal(_camLocalTmp);
    out.copy(_camLocalTmp);

    const rootScale = Math.max(0.5, this.constellationRoot.scale.x || 1);
    return { scale: scale / rootScale, isPortrait };
  }

  private syncEnvelopeScale(state: ConstellationSceneState = this.state): void {
    if (!this.envelope) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    const device = state.deviceMode ?? resolveViewportDeviceMode(width, height);
    const effectiveScale = resolveEnvelopeEffectiveWorldScale(
      state.envelopeSettings,
      aspect,
      device,
    );
    this.envelope.setSealedScale(effectiveScale);
    const offsetY = resolveEnvelopeOffsetY(state.envelopeSettings, device);
    this.envelope.setSealedOffsetY(computeEnvelopeWorldOffsetY(offsetY, aspect));
  }

  private enterSealedState(): void {
    this.sealedMode = true;
    this.birthPlaying = false;
    this.finalRevealPlaying = false;
    this.introPlaying = false;
    this.constellationRoot.rotation.y = 0;
    this.syncEnvelopeScale(this.state);
    this.envelope?.resetSealed();
    this.lines.setRevealProgress(0);
    for (const node of this.starNodes.values()) {
      node.clearTargetPosition();
      node.snapRevealZero();
    }
    this.cameraCtrl.setEnvelopeView();
    this.cameraCtrl.setOrbitEnabled(false);
  }

  /** Opens envelope into particles and births ONLY the first star into the left foreground slot */
  public playBirthSequence(): void {
    if (!this.renderer || this.isDisposed) return;

    if (this.state.reducedMotion) {
      this.skipBirthSequence();
      return;
    }

    this.sealedMode = false;
    this.introPlaying = false;
    this.finalRevealPlaying = false;
    this.birthPlaying = true;
    this.birthElapsed = 0;
    this.birthBurstTriggered = false;
    this.hoveredEnvelope = false;
    this.constellationRoot.rotation.y = 0;

    this.envelope?.startOpening();
    this.lines.setRevealProgress(0);

    for (const node of this.starNodes.values()) {
      node.clearTargetPosition();
      node.snapRevealZero();
      node.group.position.set(0, 0, 0.25);
    }

    this.cameraCtrl.setOrbitEnabled(false);
  }

  public skipBirthSequence(): void {
    if (!this.renderer || this.isDisposed) return;
    this.sealedMode = false;
    this.birthPlaying = false;
    this.introPlaying = false;
    this.envelope?.hideImmediately();
    this.constellationRoot.rotation.y = 0;

    const firstId = this.orderedStarIds[0];
    const heroInfo = this.getHeroShowcaseSlot(_heroSlotTmp);
    this.orderedStarIds.forEach((id, idx) => {
      const node = this.starNodes.get(id);
      if (!node) return;
      if (idx === 0) {
        node.setInteractionState({
          storyHero: true,
          storyBackground: false,
          storyHeroScale: heroInfo.scale,
          finale: false,
        });
        node.setTargetPosition(_heroSlotTmp.x, _heroSlotTmp.y, _heroSlotTmp.z, true);
        node.snapReveal(1);
      } else {
        node.clearTargetPosition();
        node.snapRevealZero();
      }
    });

    if (firstId) {
      this.starNodes.get(firstId)?.triggerPulse();
    }
    this.lines.setRevealProgress(0);
    this.cameraCtrl.setStoryView(true);
    this.cameraCtrl.setOrbitEnabled(true);
    this.callbacks.onBirthComplete?.();
    this.callbacks.onIntroComplete?.();
  }

  /** Particle burst when lighting the next sequential star (#2..N) */
  public triggerStarBirth(starId: string): void {
    if (!this.renderer || this.isDisposed) return;
    const node = this.starNodes.get(starId);
    const star = this.state.stars.find((s) => s.id === starId);
    if (!node || !star) return;

    this.getHeroShowcaseSlot(_heroSlotTmp);
    const glowId = resolveStarGlowHex(star, this.state.globalGlowColor);
    const glowCfg = GLOW_COLORS[glowId];

    // Emerge slightly ahead of stardust swirl, then expand cleanly to showcase slot
    node.group.position.set(
      _heroSlotTmp.x * 0.45,
      _heroSlotTmp.y + 0.15,
      _heroSlotTmp.z - 1.1,
    );
    node.snapReveal(0.06);
    node.setTargetPosition(_heroSlotTmp.x, _heroSlotTmp.y, _heroSlotTmp.z, false);
    node.setReveal(1);
    node.triggerPulse();

    _worldTmp.copy(_heroSlotTmp);
    this.constellationRoot.localToWorld(_worldTmp);
    this.birthBurst.trigger(_worldTmp, glowCfg.hex, glowCfg.coreHex);
  }

  /** Finale reveal: stars settle -> lines draw sequentially -> camera pulls back -> envelope appears & opens */
  public playFinalReveal(): void {
    if (!this.renderer || this.isDisposed) return;

    if (this.state.reducedMotion) {
      this.skipFinalReveal();
      return;
    }

    this.sealedMode = false;
    this.birthPlaying = false;
    this.introPlaying = false;
    this.finalRevealPlaying = true;
    this.finalRevealElapsed = 0;
    this.constellationRoot.rotation.y = 0;

    for (const node of this.starNodes.values()) {
      node.setInteractionState({
        storyHero: false,
        storyBackground: false,
        finale: true,
      });
      node.setTargetPosition(
        node.homePosition.x,
        node.homePosition.y,
        node.homePosition.z,
        false,
      );
      node.setReveal(1);
      node.triggerPulse();
    }

    this.envelope?.startFinaleAppear();
    this.lines.setRevealProgress(0);
    this.lines.setFinaleHighlight(true);
    this.particles.setFinaleActive(true);
    this.cameraCtrl.setFinaleFrameView(false);
    this.cameraCtrl.setOrbitEnabled(false);
  }

  public skipFinalReveal(): void {
    if (!this.renderer || this.isDisposed) return;
    this.finalRevealPlaying = false;
    this.sealedMode = false;
    this.birthPlaying = false;
    this.envelope?.hideImmediately();

    for (const node of this.starNodes.values()) {
      node.setInteractionState({
        storyHero: false,
        storyBackground: false,
        finale: true,
      });
      node.setTargetPosition(
        node.homePosition.x,
        node.homePosition.y,
        node.homePosition.z,
        true,
      );
      node.snapReveal(1);
    }
    this.refreshLinesFromNodes();
    this.lines.setRevealProgress(1);
    this.lines.setFinaleHighlight(true);
    this.particles.setFinaleActive(true);
    this.cameraCtrl.setFinaleFrameView(true);
    this.cameraCtrl.setOrbitEnabled(true);
    this.callbacks.onFinalRevealComplete?.();
  }

  public playIntro(): void {
    if (!this.renderer || this.isDisposed) return;
    if (this.state.reducedMotion) {
      this.introPlaying = false;
      this.lines.setRevealProgress(1);
      for (const node of this.starNodes.values()) node.setReveal(1);
      this.cameraCtrl.resetView();
      this.callbacks.onIntroComplete?.();
      return;
    }

    this.introPlaying = true;
    this.introElapsed = 0;
    this.lines.setRevealProgress(0);
    for (const node of this.starNodes.values()) {
      node.setReveal(0.001);
    }
    this.cameraCtrl.setStartFarForIntro();
  }

  public resetCamera(): void {
    const isFinale =
      this.state.recipientPhase === 'constellation' ||
      this.state.recipientPhase === 'finalReveal' ||
      this.state.finaleActive;
    this.cameraCtrl?.resetView(isFinale);
  }

  public restoreCameraAfterCard(): void {
    this.cameraCtrl?.restoreViewAfterFocus();
  }

  public focusOnStar(starId: string): void {
    const node = this.starNodes.get(starId);
    if (!node || !this.cameraCtrl) return;
    node.triggerPulse();
    node.group.getWorldPosition(_worldTmp);
    this.cameraCtrl.focusStar(_worldTmp);
  }

  public updateState(next: ConstellationSceneState): void {
    if (!this.renderer || this.isDisposed) return;
    const prev = this.state;
    this.state = next;

    if (
      prev.paletteId !== next.paletteId ||
      prev.globalGlowColor !== next.globalGlowColor ||
      prev.envelopeSettings?.envelopeColor !== next.envelopeSettings?.envelopeColor ||
      prev.envelopeSettings?.sealColor !== next.envelopeSettings?.sealColor
    ) {
      const palette = COSMIC_PALETTES[next.paletteId];
      const glowCfg = GLOW_COLORS[next.globalGlowColor];
      this.scene.fog = new THREE.FogExp2(palette.fogColor, 0.011);
      this.nebula.setPalette(palette);
      this.lines.setTint(palette.lineTint);
      this.particles.setDustColor(palette.dustTint);
      this.envelope?.setPaletteAndGlow(palette, glowCfg, next.envelopeSettings);
    }

    this.syncStars(next.stars, next.connections);
    this.applySceneState(next);

    if (
      next.interactionMode === 'recipient' &&
      next.recipientPhase === 'constellation' &&
      prev.recipientPhase === 'starStory'
    ) {
      this.cameraCtrl.setFinaleFrameView(false);
    }
  }

  private syncStars(
    stars: ConstellationStar[],
    connections?: StarConnection[],
  ): void {
    const nextIds = new Set(stars.map((s) => s.id));

    for (const [id, node] of this.starNodes.entries()) {
      if (!nextIds.has(id)) {
        this.constellationRoot.remove(node.group);
        node.dispose();
        this.starNodes.delete(id);
      }
    }

    this.orderedStarIds = [];
    this.starIndexById.clear();
    const positionsById = new Map<string, THREE.Vector3>();

    stars.forEach((star, idx) => {
      this.orderedStarIds.push(star.id);
      this.starIndexById.set(star.id, idx);

      const glowId = resolveStarGlowHex(star, this.state.globalGlowColor);
      const glowCfg = GLOW_COLORS[glowId];
      const shape = resolveStarShape(star);

      let node = this.starNodes.get(star.id);
      if (!node) {
        node = new StarNode(
          star.id,
          idx,
          shape,
          this.sharedStarGeos,
          glowCfg,
          this.glowTex,
          this.flareTex,
          this.isSoftwareGl,
        );
        this.constellationRoot.add(node.group);
        this.starNodes.set(star.id, node);
      } else {
        node.setShape(shape);
        node.setGlowColor(glowCfg);
      }

      node.homePosition.set(star.position.x, star.position.y, star.position.z);

      const isRecipientManaged =
        this.state.interactionMode === 'recipient' && Boolean(this.state.recipientPhase);
      if (
        !isRecipientManaged &&
        this.draggingStarId !== star.id &&
        !this.birthPlaying &&
        !this.sealedMode
      ) {
        node.clearTargetPosition();
        node.group.position.copy(node.homePosition);
      }

      positionsById.set(star.id, node.homePosition);
    });

    const resolvedConnections =
      connections ?? buildLegacySequentialConnections(stars);
    this.lines.setGraph(positionsById, resolvedConnections);
  }

  private applyConstellationRootTransform(state: ConstellationSceneState): void {
    const useLayout =
      state.interactionMode === 'recipient' &&
      state.recipientPhase !== 'sealed' &&
      state.recipientPhase !== 'birthing' &&
      Boolean(state.constellationLayout);
    if (!useLayout || !state.constellationLayout) {
      this.constellationRoot.position.set(0, 0, 0);
      this.constellationRoot.scale.setScalar(1);
      return;
    }
    const offsetX = Math.max(-100, Math.min(100, state.constellationLayout.offsetX ?? 0));
    const offsetY = Math.max(-100, Math.min(100, state.constellationLayout.offsetY ?? 0));
    const sc = Math.max(0.55, Math.min(1.45, state.constellationLayout.scale ?? 1));
    const wx = (offsetX / 100) * 3.1;
    const wy = (offsetY / 100) * 2.5;
    this.constellationRoot.position.set(wx, wy, 0);
    this.constellationRoot.scale.setScalar(sc);
  }

  private applySceneState(state: ConstellationSceneState): void {
    this.applyConstellationRootTransform(state);
    const visitedSet = new Set(state.visitedStarIds);
    const rPhase = state.recipientPhase;
    const recipientPhaseChanged = rPhase !== this.lastAppliedRecipientPhase;
    this.lastAppliedRecipientPhase = rPhase;

    if (state.interactionMode === 'recipient' && rPhase) {
      this.cameraCtrl.setArrangeMouseMode(false);
      if (rPhase === 'sealed') {
        if (!this.envelope) {
          const palette = COSMIC_PALETTES[state.paletteId];
          const glowCfg = GLOW_COLORS[state.globalGlowColor];
          this.envelope = new EnvelopeProp(
            palette,
            glowCfg,
            this.glowTex,
            state.envelopeSettings,
          );
          this.scene.add(this.envelope.group);
        } else {
          this.envelope.setPaletteAndGlow(
            COSMIC_PALETTES[state.paletteId],
            GLOW_COLORS[state.globalGlowColor],
            state.envelopeSettings,
          );
        }
        this.syncEnvelopeScale(state);
        if (recipientPhaseChanged || !this.sealedMode) {
          this.enterSealedState();
        }
        this.lines.setFinaleHighlight(false);
        this.particles.setFinaleActive(false);
        return;
      }

      if (rPhase === 'birthing') {
        this.sealedMode = false;
        this.cameraCtrl.setOrbitEnabled(false);
        return;
      }

      if (rPhase === 'starStory') {
        this.sealedMode = false;
        this.birthPlaying = false;
        this.finalRevealPlaying = false;

        if (recipientPhaseChanged) {
          this.cameraCtrl.setStoryView();
        }

        const unlocked = Math.max(1, state.unlockedCount ?? 1);
        const heroInfo = this.getHeroShowcaseSlot(_heroSlotTmp);

        this.orderedStarIds.forEach((id, idx) => {
          const node = this.starNodes.get(id);
          if (!node) return;

          if (idx >= unlocked) {
            // Unopened stars stay strictly hidden
            node.setInteractionState({
              hovered: false,
              selected: false,
              visited: false,
              finale: false,
              storyHero: false,
              storyBackground: false,
            });
            node.snapRevealZero();
            return;
          }

          const isHero = state.selectedStarId === id;
          node.setInteractionState({
            hovered: !isHero && this.hoveredStarId === id,
            selected: isHero,
            visited: visitedSet.has(id),
            finale: false,
            pendingLink: false,
            storyHero: isHero,
            storyBackground: !isHero,
            storyHeroScale: heroInfo.scale,
          });

          if (isHero) {
            node.setTargetPosition(_heroSlotTmp.x, _heroSlotTmp.y, _heroSlotTmp.z);
          } else {
            node.setTargetPosition(
              node.homePosition.x,
              node.homePosition.y,
              node.homePosition.z,
            );
          }
          node.setReveal(1);
        });

        this.lines.setFinaleHighlight(false);
        this.lines.setRevealProgress(0);
        this.particles.setFinaleActive(false);
        this.cameraCtrl.setOrbitEnabled(true);
        return;
      }

      if (rPhase === 'finalReveal') {
        this.sealedMode = false;
        this.birthPlaying = false;
        this.cameraCtrl.setOrbitEnabled(false);
        return;
      }

      if (rPhase === 'constellation') {
        this.sealedMode = false;
        this.birthPlaying = false;
        this.finalRevealPlaying = false;

        for (const [id, node] of this.starNodes.entries()) {
          node.setInteractionState({
            hovered: this.hoveredStarId === id,
            selected: state.selectedStarId === id,
            visited: true,
            finale: true,
            pendingLink: false,
            storyHero: false,
            storyBackground: false,
          });
          node.setTargetPosition(
            node.homePosition.x,
            node.homePosition.y,
            node.homePosition.z,
          );
          node.setReveal(1);
        }

        this.lines.setSelectedConnection(null);
        this.lines.setFinaleHighlight(true);
        this.lines.setRevealProgress(1);
        this.particles.setFinaleActive(true);
        this.cameraCtrl.setOrbitEnabled(true);
        return;
      }
    }

    // Editor mode
    for (const [id, node] of this.starNodes.entries()) {
      node.setInteractionState({
        hovered: this.hoveredStarId === id,
        selected: state.selectedStarId === id,
        dragging: this.draggingStarId === id,
        visited: visitedSet.has(id),
        finale: state.finaleActive,
        pendingLink: state.pendingLinkStarId === id,
        storyHero: false,
        storyBackground: false,
      });
      node.setReveal(1);
    }

    this.lines.setSelectedConnection(state.selectedConnectionId ?? null);
    this.lines.setFinaleHighlight(state.finaleActive);
    this.lines.setRevealProgress(1);
    this.particles.setFinaleActive(state.finaleActive);

    const isArrangeMode = state.interactionMode === 'arrange';
    this.cameraCtrl.setArrangeMouseMode(isArrangeMode);
    const orbitAllowed =
      !this.sealedMode &&
      !this.birthPlaying &&
      !this.draggingStarId &&
      (isArrangeMode || state.interactionMode === 'orbit' || state.interactionMode === 'connect');
    this.cameraCtrl.setControlsEnabled(orbitAllowed);
    this.cameraCtrl.setOrbitEnabled(orbitAllowed);
  }

  private syncDragPlane(
    node: StarNode,
    clientX: number,
    clientY: number,
  ): void {
    this.camera.getWorldDirection(_camForward);
    this.dragPlaneUsesWorldZ = Math.abs(_camForward.z) >= 0.25;
    const planeNormal = this.dragPlaneUsesWorldZ ? _zAxis : _camForward;
    this.constellationRoot.updateMatrixWorld();
    node.group.getWorldPosition(_worldTmp);
    _dragPlane.setFromNormalAndCoplanarPoint(planeNormal, _worldTmp);

    this.updateNdc(clientX, clientY);
    _raycaster.setFromCamera(_ndc, this.camera);
    if (_raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) {
      this.dragOffset.copy(_worldTmp).sub(_hitPoint);
    } else {
      this.dragOffset.set(0, 0, 0);
    }
  }

  private roundPosition(pos: THREE.Vector3): StarPosition3D {
    return {
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      z: Number(pos.z.toFixed(2)),
    };
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    const finishActiveStarDrag = (commit: boolean) => {
      if (!this.draggingStarId) return;
      const movedId = this.draggingStarId;
      const pointerId = this.draggingPointerId;
      const node = this.starNodes.get(movedId);
      this.draggingStarId = null;
      this.draggingPointerId = null;
      this.wasShiftDragging = false;

      if (pointerId !== null) {
        try {
          if (canvas.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId);
          }
        } catch {
          // ignore
        }
      }

      if (commit && node) {
        this.callbacks.onMoveStar?.(movedId, this.roundPosition(node.group.position));
      }
      this.lastStarDragAt = this.elapsed;
      this.callbacks.onDragEnd?.();
      this.cameraCtrl.setControlsEnabled(true);
      this.applySceneState(this.state);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (this.isDisposed) return;

      this.activePointers.set(e.pointerId, e.pointerType);

      // Multi-touch gesture (e.g. 2-finger pinch): immediately yield to OrbitControls zoom without conflict
      if (this.activePointers.size >= 2) {
        if (this.draggingStarId) {
          finishActiveStarDrag(true);
        }
        const canOrbit = !this.sealedMode && !this.birthPlaying && !this.finalRevealPlaying;
        this.cameraCtrl.setControlsEnabled(canOrbit);
        this.cameraCtrl.setOrbitEnabled(canOrbit);
        return;
      }

      if (e.pointerType === 'mouse' && e.button !== 0) {
        const canOrbit = !this.sealedMode && !this.birthPlaying && !this.finalRevealPlaying;
        this.cameraCtrl.setControlsEnabled(canOrbit);
        return;
      }

      this.isPointerDown = true;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };

      if (
        this.state.interactionMode === 'arrange' &&
        !this.sealedMode &&
        !this.birthPlaying &&
        !this.finalRevealPlaying
      ) {
        const hitId = this.pickStar(e.clientX, e.clientY);
        if (hitId) {
          const node = this.starNodes.get(hitId);
          if (node) {
            this.draggingStarId = hitId;
            this.draggingPointerId = e.pointerId;
            this.lastDragClientY = e.clientY;
            this.wasShiftDragging = e.shiftKey;
            this.cameraCtrl.setControlsEnabled(false);
            this.cameraCtrl.setOrbitEnabled(false);

            if (hitId !== this.state.selectedStarId) {
              this.callbacks.onSelectStar?.(hitId);
            }

            this.syncDragPlane(node, e.clientX, e.clientY);
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = e.shiftKey ? 'ns-resize' : 'grabbing';
            this.lastStarDragAt = this.elapsed;
            this.currentSpinSpeed = 0;
            this.callbacks.onDragStar?.(
              hitId,
              this.roundPosition(node.group.position),
              e.shiftKey,
            );
          }
        } else {
          this.cameraCtrl.setControlsEnabled(true);
          this.cameraCtrl.setOrbitEnabled(true);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.isDisposed) return;

      if (this.draggingStarId && e.pointerId === this.draggingPointerId) {
        const node = this.starNodes.get(this.draggingStarId);
        if (!node) return;

        if (e.shiftKey) {
          const dy = e.clientY - this.lastDragClientY;
          this.lastDragClientY = e.clientY;
          this.wasShiftDragging = true;
          canvas.style.cursor = 'ns-resize';

          node.group.position.z = THREE.MathUtils.clamp(
            node.group.position.z - dy * 0.024,
            -5.5,
            5.5,
          );
          this.refreshLinesFromNodes();
          this.callbacks.onDragStar?.(
            this.draggingStarId,
            this.roundPosition(node.group.position),
            true,
          );
          return;
        }

        this.lastDragClientY = e.clientY;
        canvas.style.cursor = 'grabbing';

        if (this.wasShiftDragging) {
          this.wasShiftDragging = false;
          this.syncDragPlane(node, e.clientX, e.clientY);
          this.callbacks.onDragStar?.(
            this.draggingStarId,
            this.roundPosition(node.group.position),
            false,
          );
          return;
        }

        this.updateNdc(e.clientX, e.clientY);
        _raycaster.setFromCamera(_ndc, this.camera);
        if (_raycaster.ray.intersectPlane(_dragPlane, _hitPoint)) {
          _hitPoint.add(this.dragOffset);
          this.constellationRoot.updateMatrixWorld();
          this.constellationRoot.worldToLocal(_hitPoint);
          const clampedX = THREE.MathUtils.clamp(_hitPoint.x, -8.5, 8.5);
          const clampedY = THREE.MathUtils.clamp(_hitPoint.y, -5.5, 5.5);
          const nextZ = this.dragPlaneUsesWorldZ
            ? node.group.position.z
            : THREE.MathUtils.clamp(_hitPoint.z, -5.5, 5.5);

          node.group.position.set(clampedX, clampedY, nextZ);
          this.lastStarDragAt = this.elapsed;
          this.refreshLinesFromNodes();
          this.callbacks.onDragStar?.(
            this.draggingStarId,
            this.roundPosition(node.group.position),
            false,
          );
        }
        return;
      }

      if (e.pointerType === 'mouse') {
        if (this.sealedMode && this.envelope) {
          const hitEnv = this.pickEnvelope(e.clientX, e.clientY);
          if (hitEnv !== this.hoveredEnvelope) {
            this.hoveredEnvelope = hitEnv;
            this.envelope.setHovered(hitEnv);
          }
          canvas.style.cursor = hitEnv ? 'pointer' : 'default';
          return;
        }

        if (this.birthPlaying || this.finalRevealPlaying) {
          canvas.style.cursor = 'default';
          return;
        }

        const hitId = this.pickStar(e.clientX, e.clientY);
        if (hitId !== this.hoveredStarId) {
          this.hoveredStarId = hitId;
          this.applySceneState(this.state);
        }
        if (hitId) {
          canvas.style.cursor =
            this.state.interactionMode === 'arrange'
              ? e.shiftKey
                ? 'ns-resize'
                : 'grab'
              : 'pointer';
        } else if (this.state.interactionMode === 'connect') {
          const hitConn = this.pickConnection(e.clientX, e.clientY);
          canvas.style.cursor = hitConn ? 'pointer' : 'default';
        } else {
          canvas.style.cursor = 'default';
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (this.isDisposed) return;

      const dist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y,
      );

      if (this.draggingStarId && e.pointerId === this.draggingPointerId) {
        const movedId = this.draggingStarId;
        finishActiveStarDrag(true);
        if (this.activePointers.size === 0) {
          this.isPointerDown = false;
        }
        canvas.style.cursor = this.pickStar(e.clientX, e.clientY)
          ? e.shiftKey
            ? 'ns-resize'
            : 'grab'
          : 'default';

        if (e.type === 'pointerup' && dist < 7) {
          this.handleStarClick(movedId);
        }
        return;
      }

      if (this.activePointers.size === 0) {
        const wasDown = this.isPointerDown;
        this.isPointerDown = false;
        const canOrbit = !this.sealedMode && !this.birthPlaying && !this.finalRevealPlaying;
        this.cameraCtrl.setControlsEnabled(canOrbit);
        if (!wasDown || e.type !== 'pointerup') return;

        if (dist < 8) {
          if (this.sealedMode && this.envelope) {
            if (this.pickEnvelope(e.clientX, e.clientY)) {
              this.callbacks.onOpenEnvelope?.();
            }
            return;
          }

          if (this.birthPlaying || this.finalRevealPlaying) return;

          const hitId = this.pickStar(e.clientX, e.clientY);
          if (hitId) {
            this.handleStarClick(hitId);
          } else if (this.state.interactionMode === 'connect') {
            const hitConnId = this.pickConnection(e.clientX, e.clientY);
            this.callbacks.onSelectConnection?.(hitConnId);
          }
        }
      }
    };

    const onShiftKeyChange = (e: KeyboardEvent) => {
      if (e.key !== 'Shift' || this.isDisposed) return;
      if (this.draggingStarId) {
        const node = this.starNodes.get(this.draggingStarId);
        canvas.style.cursor = e.shiftKey ? 'ns-resize' : 'grabbing';
        if (node) {
          this.callbacks.onDragStar?.(
            this.draggingStarId,
            this.roundPosition(node.group.position),
            e.shiftKey,
          );
        }
      } else if (this.hoveredStarId && this.state.interactionMode === 'arrange') {
        canvas.style.cursor = e.shiftKey ? 'ns-resize' : 'grab';
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onShiftKeyChange);
    window.addEventListener('keyup', onShiftKeyChange);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      this.cancelPendingFrame();
    };
    const onContextRestored = () => {
      this.lastTime = performance.now();
      this.startLoop();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const onVisibility = () => {
      this.isTabHidden = document.hidden;
      if (!this.isTabHidden) {
        this.lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.cleanupListeners = () => {
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true });
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onShiftKeyChange);
      window.removeEventListener('keyup', onShiftKeyChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      document.removeEventListener('visibilitychange', onVisibility);
      this.resizeObserver?.disconnect();
    };
  }

  private cleanupListeners: () => void = () => {};

  private refreshLinesFromNodes(): void {
    const positionsById = new Map<string, THREE.Vector3>();
    for (const id of this.orderedStarIds) {
      const node = this.starNodes.get(id);
      if (node) positionsById.set(id, node.group.position);
    }
    this.lines.updatePositions(positionsById);
  }

  private handleStarClick(starId: string): void {
    const node = this.starNodes.get(starId);
    if (node) {
      node.triggerPulse();
    }
    this.callbacks.onSelectStar?.(starId);
  }

  private updateNdc(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickStar(clientX: number, clientY: number): string | null {
    this.updateNdc(clientX, clientY);
    _raycaster.setFromCamera(_ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const node of this.starNodes.values()) {
      if (node.group.visible) targets.push(node.hitMesh);
    }
    const hits = _raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      return (hits[0].object.userData.starId as string) ?? null;
    }
    return null;
  }

  private pickConnection(clientX: number, clientY: number): string | null {
    this.updateNdc(clientX, clientY);
    _raycaster.setFromCamera(_ndc, this.camera);
    return this.lines.pickConnection(_raycaster);
  }

  private pickEnvelope(clientX: number, clientY: number): boolean {
    if (!this.envelope) return false;
    this.updateNdc(clientX, clientY);
    _raycaster.setFromCamera(_ndc, this.camera);
    const hits = _raycaster.intersectObjects(this.envelope.getHitMeshes(), false);
    return hits.length > 0;
  }

  private handleResize(): void {
    if (!this.renderer || this.isDisposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer && this.bloomPass) {
      const bloomScale = this.state.lowPerformance ? 0.35 : 0.5;
      this.composer.setSize(width, height);
      this.bloomPass.resolution.set(
        Math.max(1, Math.floor(width * bloomScale)),
        Math.max(1, Math.floor(height * bloomScale)),
      );
    }
    if (this.sealedMode || this.state.recipientPhase === 'sealed') {
      this.syncEnvelopeScale(this.state);
    }
    if (this.state.interactionMode === 'recipient' && this.state.recipientPhase === 'starStory') {
      this.applySceneState(this.state);
    }
  }

  private cancelPendingFrame(): void {
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDisposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      if (!this.isTabHidden) {
        this.elapsed += dt;
        this.stepScene(dt);
        if (this.composer) {
          this.composer.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private stepScene(dt: number): void {
    if (this.sealedMode) {
      this.envelope?.update(this.elapsed, dt, 0, this.state.reducedMotion);
    } else if (this.birthPlaying) {
      this.birthElapsed += dt;
      // Accelerate envelope open cleanly across 0 .. 2.7s
      this.envelope?.update(
        this.elapsed,
        dt,
        this.birthElapsed * 1.25,
        this.state.reducedMotion,
      );

      // Camera pulls gently from envelope distance to studio story frame
      if (this.birthElapsed >= 1.2) {
        const pullT = THREE.MathUtils.clamp((this.birthElapsed - 1.2) / 2.2, 0, 1);
        this.cameraCtrl.setBirthPullback(pullT);
      }

      // First star ONLY emerges out of particles and glides smoothly into hero showcase slot
      const firstId = this.orderedStarIds[0];
      const firstNode = firstId ? this.starNodes.get(firstId) : undefined;
      if (firstNode) {
        const heroInfo = this.getHeroShowcaseSlot(_heroSlotTmp);
        if (this.birthElapsed >= 1.45 && !this.birthBurstTriggered) {
          this.birthBurstTriggered = true;
          const star = this.state.stars[0];
          const glowId = star ? resolveStarGlowHex(star, this.state.globalGlowColor) : this.state.globalGlowColor;
          const glowCfg = GLOW_COLORS[glowId];
          _worldTmp.set(0, 0.05, 0.55);
          this.birthBurst.trigger(_worldTmp, glowCfg.hex, glowCfg.coreHex);
          firstNode.triggerPulse();
        }

        const flyT = THREE.MathUtils.clamp(
          (this.birthElapsed - 1.55) / (this.birthDuration - 1.65),
          0,
          1,
        );
        if (flyT <= 0.001) {
          firstNode.setReveal(0);
        } else {
          const ease = 1 - Math.pow(1 - flyT, 3);
          firstNode.setInteractionState({
            storyHero: true,
            storyBackground: false,
            storyHeroScale: heroInfo.scale,
          });
          firstNode.setReveal(Math.min(1, flyT * 1.65));
          const arcY = Math.sin(flyT * Math.PI) * 0.65;
          firstNode.clearTargetPosition();
          firstNode.group.position.set(
            THREE.MathUtils.lerp(0, _heroSlotTmp.x, ease),
            THREE.MathUtils.lerp(0, _heroSlotTmp.y, ease) + arcY,
            THREE.MathUtils.lerp(0.35, _heroSlotTmp.z, ease),
          );
        }
      }

      if (this.birthElapsed >= this.birthDuration) {
        this.birthPlaying = false;
        this.cameraCtrl.setStoryView(true);
        this.cameraCtrl.setOrbitEnabled(true);
        const heroInfo = this.getHeroShowcaseSlot(_heroSlotTmp);
        if (firstNode) {
          firstNode.setInteractionState({
            storyHero: true,
            storyBackground: false,
            storyHeroScale: heroInfo.scale,
          });
          firstNode.setTargetPosition(_heroSlotTmp.x, _heroSlotTmp.y, _heroSlotTmp.z, true);
          firstNode.setReveal(1);
        }
        this.callbacks.onBirthComplete?.();
        this.callbacks.onIntroComplete?.();
      }
    } else if (this.finalRevealPlaying) {
      this.finalRevealElapsed += dt;

      // 0.35s .. 2.15s: draw constellation connections progressively
      const lineP = THREE.MathUtils.clamp((this.finalRevealElapsed - 0.35) / 1.8, 0, 1);
      this.lines.setRevealProgress(lineP);

      // 1.65s .. 4.35s: envelope reappears in lower foreground, opens flap & glows before letter emerges
      const envSec = Math.max(0, this.finalRevealElapsed - 1.65);
      this.envelope?.update(this.elapsed, dt, envSec, this.state.reducedMotion);

      if (this.finalRevealElapsed >= this.finalRevealDuration) {
        this.finalRevealPlaying = false;
        this.envelope?.hideImmediately();
        this.lines.setRevealProgress(1);
        this.cameraCtrl.setOrbitEnabled(true);
        this.callbacks.onFinalRevealComplete?.();
      }
    } else if (this.introPlaying) {
      this.introElapsed += dt;
      const p = Math.min(1, this.introElapsed / this.introDuration);

      const total = Math.max(1, this.orderedStarIds.length);
      this.orderedStarIds.forEach((id, idx) => {
        const node = this.starNodes.get(id);
        if (!node) return;
        const startAt = (idx / total) * 0.45;
        const starP = THREE.MathUtils.clamp((p - startAt) / 0.28, 0.001, 1);
        node.setReveal(starP);
      });

      const lineP = THREE.MathUtils.clamp((p - 0.42) / 0.52, 0, 1);
      this.lines.setRevealProgress(lineP);

      if (p >= 1) {
        this.introPlaying = false;
        this.callbacks.onIntroComplete?.();
      }
    }

    const animMode = this.state.constellationAnimation ?? 'rotation';
    const sceneReducedMotion = this.state.reducedMotion || animMode === 'none';

    // 360-degree constellation rotation when animationMode === 'rotation' (pauses when orbiting or dragging stars)
    const isRecipientStoryView =
      this.state.interactionMode === 'recipient' && this.state.recipientPhase === 'starStory';
    const allowRotation =
      animMode === 'rotation' &&
      !this.state.reducedMotion &&
      !this.sealedMode &&
      !this.birthPlaying &&
      !this.finalRevealPlaying &&
      (this.state.interactionMode !== 'recipient' ||
        this.state.recipientPhase === 'constellation');

    if (allowRotation) {
      const targetRotateSpeed =
        this.state.interactionMode === 'recipient'
          ? FINALE_ROTATE_SPEED
          : FINALE_ROTATE_SPEED * 0.72;
      const wantSpin =
        !this.draggingStarId &&
        !this.cameraCtrl.isUserInteracting &&
        this.cameraCtrl.timeSinceLastInteraction >= 1.2 &&
        this.elapsed - this.lastStarDragAt >= 1.2;
      const targetSpeed = wantSpin ? targetRotateSpeed : 0;
      const accel = wantSpin ? 2.2 : 8.0;
      this.currentSpinSpeed = THREE.MathUtils.lerp(
        this.currentSpinSpeed,
        targetSpeed,
        1 - Math.exp(-accel * dt),
      );
      this.constellationRoot.rotation.y += this.currentSpinSpeed * dt;
    } else {
      this.currentSpinSpeed = 0;
      if (this.sealedMode || this.birthPlaying || this.finalRevealPlaying) {
        this.constellationRoot.rotation.y = 0;
      } else if (isRecipientStoryView || animMode !== 'rotation') {
        // Shortest-angle smooth reset back to front orientation
        const curY = this.constellationRoot.rotation.y;
        const wrapped = Math.atan2(Math.sin(curY), Math.cos(curY));
        this.constellationRoot.rotation.y = sceneReducedMotion
          ? 0
          : THREE.MathUtils.lerp(wrapped, 0, 1 - Math.exp(-7 * dt));
      } else {
        this.constellationRoot.rotation.y = 0;
      }
    }

    this.cameraCtrl.update(dt, this.state.reducedMotion);

    // Keep active hero star anchored cleanly in the camera showcase slot if user orbits the 3D scene
    if (
      this.state.interactionMode === 'recipient' &&
      this.state.recipientPhase === 'starStory' &&
      !this.birthPlaying &&
      !this.finalRevealPlaying &&
      this.state.selectedStarId
    ) {
      const heroNode = this.starNodes.get(this.state.selectedStarId);
      if (heroNode) {
        const heroInfo = this.getHeroShowcaseSlot(_heroSlotTmp);
        heroNode.setInteractionState({ storyHeroScale: heroInfo.scale });
        heroNode.setTargetPosition(_heroSlotTmp.x, _heroSlotTmp.y, _heroSlotTmp.z);
      }
    }

    this.nebula.update(this.elapsed, sceneReducedMotion);
    this.particles.update(this.elapsed, dt, this.state.reducedMotion, animMode);
    this.lines.update(this.elapsed, dt, sceneReducedMotion);
    this.birthBurst.update(dt, this.state.reducedMotion);

    for (const node of this.starNodes.values()) {
      node.update(this.elapsed, dt, this.camera.quaternion, this.state.reducedMotion, animMode);
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    this.cancelPendingFrame();
    this.cleanupListeners();

    if (this.renderer) {
      this.cameraCtrl?.dispose();
      this.nebula?.dispose();
      this.lines?.dispose();
      this.particles?.dispose();
      this.envelope?.dispose();
      this.birthBurst?.dispose();
      for (const node of this.starNodes.values()) {
        node.dispose();
      }
      this.starNodes.clear();
      disposeSharedStarGeometries(this.sharedStarGeos);
      this.glowTex?.dispose();
      this.flareTex?.dispose();
      this.cloudTex?.dispose();
      this.envTexture?.dispose();
      this.bloomPass?.dispose();
      this.outputPass?.dispose();
      this.composer?.dispose();
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}

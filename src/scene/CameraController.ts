import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DEFAULT_CAM_POS = new THREE.Vector3(0, 0.5, 12.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const FINALE_CAM_POS = new THREE.Vector3(0, 0.35, 14.2);
const FINALE_TARGET = new THREE.Vector3(0, -0.1, 0);

export class CameraController {
  public readonly controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;

  private isTransitioning = false;
  private desiredCamPos = DEFAULT_CAM_POS.clone();
  private desiredTarget = DEFAULT_TARGET.clone();
  private savedCamPos: THREE.Vector3 | null = null;
  private savedTarget: THREE.Vector3 | null = null;
  private isSoftwareGl: boolean;

  public isUserInteracting = false;
  public timeSinceLastInteraction = 999;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    isSoftwareGl: boolean,
    onUserOrbit?: () => void,
  ) {
    this.camera = camera;
    this.isSoftwareGl = isSoftwareGl;
    this.controls = new OrbitControls(camera, domElement);

    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.78;
    this.controls.zoomSpeed = 0.92;
    this.controls.minDistance = 3.8;
    this.controls.maxDistance = 38;
    // Prevent camera flipping upside down or losing the constellation
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI - 0.28;

    let startAzimuth = 0;
    let startPolar = 0;
    let notifiedOrbit = false;

    this.controls.addEventListener('start', () => {
      // Never fight user manual camera movement
      this.isTransitioning = false;
      this.isUserInteracting = true;
      this.timeSinceLastInteraction = 0;
      startAzimuth = this.controls.getAzimuthalAngle();
      startPolar = this.controls.getPolarAngle();
      notifiedOrbit = false;
    });

    this.controls.addEventListener('change', () => {
      if (!this.isUserInteracting || notifiedOrbit || !onUserOrbit) return;
      const dAz = Math.abs(this.controls.getAzimuthalAngle() - startAzimuth);
      const dPol = Math.abs(this.controls.getPolarAngle() - startPolar);
      if (dAz > 0.035 || dPol > 0.035) {
        notifiedOrbit = true;
        onUserOrbit();
      }
    });

    this.controls.addEventListener('end', () => {
      this.isUserInteracting = false;
      this.timeSinceLastInteraction = 0;
    });
  }

  public setOrbitEnabled(enabled: boolean): void {
    this.controls.enableRotate = enabled;
    this.controls.enableZoom = enabled;
  }

  public setControlsEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  public setArrangeMouseMode(isArrange: boolean): void {
    if (isArrange) {
      this.controls.mouseButtons = {
        LEFT: null,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
      this.controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
    } else {
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
      this.controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
    }
  }

  public setEnvelopeView(): void {
    this.camera.position.set(0, 0.12, 5.2);
    this.controls.target.set(0, 0, 0);
    this.desiredCamPos.set(0, 0.12, 5.2);
    this.desiredTarget.set(0, 0, 0);
    this.isTransitioning = false;
    this.savedCamPos = null;
    this.savedTarget = null;
    this.controls.update();
  }

  public setStoryView(immediate = false): void {
    this.savedCamPos = null;
    this.savedTarget = null;
    this.desiredCamPos.set(0, 0.12, 11.2);
    this.desiredTarget.set(0, 0, 0);
    if (immediate) {
      this.camera.position.copy(this.desiredCamPos);
      this.controls.target.copy(this.desiredTarget);
      this.isTransitioning = false;
      this.controls.update();
    } else {
      this.isTransitioning = true;
    }
  }

  public setFinaleFrameView(immediate = false): void {
    this.savedCamPos = null;
    this.savedTarget = null;
    this.desiredCamPos.copy(FINALE_CAM_POS);
    this.desiredTarget.copy(FINALE_TARGET);
    if (immediate) {
      this.camera.position.copy(this.desiredCamPos);
      this.controls.target.copy(this.desiredTarget);
      this.isTransitioning = false;
      this.controls.update();
    } else {
      this.isTransitioning = true;
    }
  }

  public setBirthPullback(pullProgress: number): void {
    const t = THREE.MathUtils.clamp(pullProgress, 0, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    this.desiredCamPos.set(
      0,
      THREE.MathUtils.lerp(0.12, 0.12, ease),
      THREE.MathUtils.lerp(5.4, 11.2, ease),
    );
    this.desiredTarget.copy(DEFAULT_TARGET);
    this.isTransitioning = true;
  }

  public setStartFarForIntro(): void {
    this.camera.position.set(0, 1.4, 18.5);
    this.controls.target.set(0, 0, 0);
    this.desiredCamPos.copy(DEFAULT_CAM_POS);
    this.desiredTarget.copy(DEFAULT_TARGET);
    this.isTransitioning = true;
    this.controls.update();
  }

  public resetView(isFinale = false): void {
    this.savedCamPos = null;
    this.savedTarget = null;
    this.desiredCamPos.copy(isFinale ? FINALE_CAM_POS : DEFAULT_CAM_POS);
    this.desiredTarget.copy(isFinale ? FINALE_TARGET : DEFAULT_TARGET);
    this.isTransitioning = true;
  }

  public focusStar(starPosition: THREE.Vector3): void {
    if (!this.savedCamPos) {
      this.savedCamPos = this.camera.position.clone();
      this.savedTarget = this.controls.target.clone();
    }

    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0.12, 1).normalize();

    this.desiredTarget.copy(starPosition).multiplyScalar(0.84);
    this.desiredCamPos.copy(this.desiredTarget).addScaledVector(dir, 5.1);
    this.isTransitioning = true;
  }

  public restoreViewAfterFocus(): void {
    if (this.savedCamPos && this.savedTarget) {
      this.desiredCamPos.copy(this.savedCamPos);
      this.desiredTarget.copy(this.savedTarget);
      this.savedCamPos = null;
      this.savedTarget = null;
      this.isTransitioning = true;
    } else {
      this.resetView();
    }
  }

  public update(dt: number, reducedMotion: boolean): void {
    if (!this.isUserInteracting) {
      this.timeSinceLastInteraction = Math.min(999, this.timeSinceLastInteraction + dt);
    }

    if (this.isTransitioning) {
      if (reducedMotion || this.isSoftwareGl) {
        this.camera.position.copy(this.desiredCamPos);
        this.controls.target.copy(this.desiredTarget);
        this.isTransitioning = false;
      } else {
        const k = 1 - Math.exp(-4.6 * dt);
        this.camera.position.lerp(this.desiredCamPos, k);
        this.controls.target.lerp(this.desiredTarget, k);
        if (
          this.camera.position.distanceToSquared(this.desiredCamPos) < 0.002 &&
          this.controls.target.distanceToSquared(this.desiredTarget) < 0.002
        ) {
          this.camera.position.copy(this.desiredCamPos);
          this.controls.target.copy(this.desiredTarget);
          this.isTransitioning = false;
        }
      }
    }

    this.controls.update();
  }

  public dispose(): void {
    this.controls.dispose();
  }
}

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function hasWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();
  return envTex;
}

export function createGlowSpriteTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.82)');
  grad.addColorStop(0.42, 'rgba(255, 255, 255, 0.28)');
  grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.06)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStarFlareTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Draw crisp 4-point celestial diffraction spike
  const drawSpike = (angle: number, length: number, width: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(-length, 0, length, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.38, `rgba(255,255,255,${alpha * 0.35})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.62, `rgba(255,255,255,${alpha * 0.35})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawSpike(0, 122, 5.5, 0.92);
  drawSpike(Math.PI / 2, 122, 5.5, 0.92);
  drawSpike(Math.PI / 4, 72, 2.8, 0.48);
  drawSpike(-Math.PI / 4, 72, 2.8, 0.48);

  const coreGrad = ctx.createRadialGradient(cx, cx, 0, cx, cx, 36);
  coreGrad.addColorStop(0, 'rgba(255,255,255,1)');
  coreGrad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createNebulaCloudTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const blobs = [
    { x: 128, y: 128, r: 112, a: 0.32 },
    { x: 96, y: 112, r: 78, a: 0.24 },
    { x: 158, y: 138, r: 84, a: 0.24 },
    { x: 128, y: 152, r: 66, a: 0.18 },
  ];

  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, `rgba(255,255,255,${b.a})`);
    g.addColorStop(0.5, `rgba(255,255,255,${b.a * 0.42})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

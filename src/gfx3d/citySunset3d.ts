import * as THREE from "three";

/**
 * Path 2's "time passes while Dad drives over" beat, previously five
 * crossfading 2D frames (see gfx/citySunset.ts — still used nowhere now,
 * kept as-is rather than deleted in case a future beat wants a cheap static
 * skyline again). This is the real-3D remake: a high rooftop vantage over a
 * procedural skyline, the sun actually arcing down and setting rather than
 * five still frames dissolving into each other, windows lighting up one by
 * one as it darkens. Same self-mounting/self-disposing overlay pattern as
 * gfx3d/streetCutscene.ts.
 */

const RENDER_W = 320;
const RENDER_H = 180;

export interface CitySunset3DHandle {
  dispose(): void;
}

interface SkyStop {
  t: number;
  sky: number;
  sun: number;
  sunIntensity: number;
}

// same palette as the old 2D frames (DAY/GOLDEN/SUNSET/DUSK/NIGHT), so the
// mood beats land at the same points even though this is a continuous arc
// now rather than five discrete stills
const SKY_STOPS: SkyStop[] = [
  { t: 0, sky: 0x5a9fd6, sun: 0xfff8e0, sunIntensity: 2.4 },
  { t: 0.26, sky: 0x7ab0d8, sun: 0xffd88a, sunIntensity: 1.9 },
  { t: 0.5, sky: 0x3d3f6e, sun: 0xff9a4d, sunIntensity: 1.1 },
  { t: 0.74, sky: 0x1c1f3f, sun: 0xa85a55, sunIntensity: 0.25 },
  { t: 1, sky: 0x05061a, sun: 0x1b1f3f, sunIntensity: 0 },
];

function sampleSky(t: number): { sky: THREE.Color; sun: THREE.Color; sunIntensity: number } {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const a = SKY_STOPS[i];
    const b = SKY_STOPS[i + 1];
    if (t <= b.t) {
      const localT = (t - a.t) / (b.t - a.t);
      return {
        sky: new THREE.Color(a.sky).lerp(new THREE.Color(b.sky), localT),
        sun: new THREE.Color(a.sun).lerp(new THREE.Color(b.sun), localT),
        sunIntensity: THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, localT),
      };
    }
  }
  const last = SKY_STOPS[SKY_STOPS.length - 1];
  return { sky: new THREE.Color(last.sky), sun: new THREE.Color(last.sun), sunIntensity: last.sunIntensity };
}

interface WindowLight {
  mesh: THREE.Mesh;
  litAt: number;
  lit: boolean;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Sprite) {
      child.geometry?.dispose?.();
      const mat = child.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

function mountContainer(): HTMLDivElement {
  const app = document.getElementById("app")!;
  const uiRoot = document.getElementById("ui-root")!;
  const appRect = app.getBoundingClientRect();
  const uiRect = uiRoot.getBoundingClientRect();

  const el = document.createElement("div");
  el.id = "sunset3d-layer";
  el.style.position = "absolute";
  el.style.left = `${uiRect.left - appRect.left}px`;
  el.style.top = `${uiRect.top - appRect.top}px`;
  el.style.width = `${uiRect.width}px`;
  el.style.height = `${uiRect.height}px`;
  el.style.pointerEvents = "none";
  el.style.overflow = "hidden";
  app.insertBefore(el, uiRoot);
  return el;
}

function buildBuilding(scene: THREE.Scene, x: number, z: number, windows: WindowLight[]): void {
  const w = 2.4 + Math.random() * 3.2;
  const h = 3 + Math.random() * 15;
  const d = 2.4 + Math.random() * 3.2;
  const shade = 0.08 + Math.random() * 0.06;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(shade, shade * 1.05, shade * 1.15), roughness: 1 }),
  );
  body.position.set(x, h / 2, z);
  scene.add(body);

  // a smaller stacked cap on some — a uniform block skyline reads flattest
  if (Math.random() < 0.35) {
    const capW = w * (0.4 + Math.random() * 0.3);
    const capH = 1.5 + Math.random() * 3;
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(capW, capH, capW),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(shade * 0.8, shade * 0.85, shade * 0.95), roughness: 1 }),
    );
    cap.position.set(x, h + capH / 2, z);
    scene.add(cap);
  }

  const cols = Math.max(1, Math.floor(w / 0.9));
  const rows = Math.max(1, Math.floor(h / 1.4));
  const faceZ = z + d / 2 + 0.02;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (Math.random() < 0.35) continue; // gaps read as floors/architecture, not every tile lit-capable
      const wx = x - w / 2 + 0.5 + c * (w / cols);
      const wy = 0.9 + r * (h / rows);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.5), new THREE.MeshBasicMaterial({ color: 0x0a0a12 }));
      win.position.set(wx, wy, faceZ);
      scene.add(win);
      windows.push({ mesh: win, litAt: 0.35 + Math.random() * 0.6, lit: false });
    }
  }
}

/**
 * Mounts its own full-viewport Three.js canvas and plays a continuous
 * rooftop-view sunset: the sun actually arcs down and sets, city windows
 * light up one by one as the sky darkens, a slow pan across the skyline.
 * Caller drives fade in/out and overall timing; this renders until dispose().
 */
export function createCitySunset3D(): CitySunset3DHandle {
  const container = mountContainer();
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.imageRendering = "pixelated";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_W, RENDER_H, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_STOPS[0].sky);
  scene.fog = new THREE.Fog(SKY_STOPS[0].sky, 30, 95);

  const camera = new THREE.PerspectiveCamera(48, RENDER_W / RENDER_H, 0.1, 140);
  camera.position.set(0, 9, 16);

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(SKY_STOPS[0].sun, SKY_STOPS[0].sunIntensity);
  scene.add(sunLight);

  // the sun itself — a bright unlit disc plus a soft halo, arcing from high
  // in the sky down behind the skyline as the timelapse runs
  const sunMesh = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), new THREE.MeshBasicMaterial({ color: SKY_STOPS[0].sun }));
  scene.add(sunMesh);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(5, 16), new THREE.MeshBasicMaterial({ color: SKY_STOPS[0].sun, transparent: true, opacity: 0.25 }));
  scene.add(halo);

  const windows: WindowLight[] = [];
  const near: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < 42; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = -20 - Math.random() * 65;
    near.push({ x, z });
  }
  for (const pos of near) buildBuilding(scene, pos.x, pos.z, windows);

  // a scatter of stars, invisible until full dark
  const STAR_COUNT = 90;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 120;
    starPos[i * 3 + 1] = 20 + Math.random() * 40;
    starPos[i * 3 + 2] = -30 - Math.random() * 80;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xe8ecf8, size: 0.4, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  let rafId = 0;
  let disposed = false;
  let elapsed = 0;
  const DURATION_SEC = 9;
  const clock = new THREE.Clock();

  function animate(): void {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const t = Math.min(1, elapsed / DURATION_SEC);

    const { sky, sun, sunIntensity } = sampleSky(t);
    (scene.background as THREE.Color).copy(sky);
    (scene.fog as THREE.Fog).color.copy(sky);
    sunLight.color.copy(sun);
    sunLight.intensity = sunIntensity;
    ambient.intensity = THREE.MathUtils.lerp(1.2, 0.25, t);

    // arcs from high overhead down behind the skyline — a real setting sun,
    // not a still frame standing in for one
    const sunX = THREE.MathUtils.lerp(-18, 22, t);
    const sunY = THREE.MathUtils.lerp(34, -6, t * t);
    const sunZ = -70;
    sunMesh.position.set(sunX, sunY, sunZ);
    halo.position.set(sunX, sunY, sunZ);
    (sunMesh.material as THREE.MeshBasicMaterial).color.copy(sun);
    (halo.material as THREE.MeshBasicMaterial).color.copy(sun);
    (halo.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.3 * (1 - t * 0.9));
    sunLight.position.set(sunX * 0.3, Math.max(sunY, 2), sunZ * 0.3 + 10);

    starMat.opacity = Math.max(0, (t - 0.55) / 0.45) * 0.9;

    for (const w of windows) {
      if (!w.lit && t >= w.litAt) {
        w.lit = true;
        (w.mesh.material as THREE.MeshBasicMaterial).color.set(Math.random() < 0.5 ? 0xffdb8a : 0xffe9b0);
      }
    }

    // a slow pan across the skyline — enough to read as a real shot, not a
    // slideshow, without fighting the sunset itself for attention
    camera.position.x = Math.sin(elapsed * 0.05) * 4;
    camera.lookAt(0, 6, -50);

    renderer.render(scene, camera);
  }
  animate();

  return {
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(rafId);
      disposeObject(scene);
      renderer.dispose();
      container.remove();
    },
  };
}

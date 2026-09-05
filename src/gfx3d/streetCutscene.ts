import * as THREE from "three";

/**
 * The one genuinely-3D moment in the game — everything else here is
 * procedural 2D canvas art (see src/gfx). Deliberately kept that way: a
 * scoped, self-contained overlay mounted only for this one cutscene, not a
 * retrofit of the engine. Rendered at a tiny internal resolution and
 * upscaled with pixelation (see mount()) so it still reads as part of the
 * same chunky pixel-art game rather than a smooth, out-of-place insert.
 * Geometry is all primitive (box/cylinder/sphere/cone), matching the
 * procedural-only-assets convention everywhere else in this codebase.
 */

const RENDER_W = 320;
const RENDER_H = 180;
const ZOOM_DURATION_SEC = 7;

export interface StreetCutsceneHandle {
  dispose(): void;
}

interface ZombieSway {
  group: THREE.Group;
  baseRotY: number;
  swaySpeed: number;
  swayPhase: number;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry.dispose();
      child.material.dispose();
    }
  });
}

/** A low-poly, deliberately-jagged humanoid — cheap enough for a crowd, chunky enough to match the game's low-fi aesthetic rather than looking like a mismatched attempt at realism. */
function buildZombie(halfTurned: boolean): THREE.Group {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x3f4a3a, roughness: 1 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 1 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 6), clothMat);
  torso.position.y = 0.95;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), skinMat);
  head.position.y = 1.53;
  // a half-turned figure's head/torso lead the twist — mid-turn toward
  // whatever it just noticed, not yet fully facing it
  head.rotation.y = halfTurned ? 0.9 : 0.15 * (Math.random() - 0.5);
  g.add(head);

  const armGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.7, 5);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.3, 1.05, 0);
  armL.rotation.z = 0.5 + Math.random() * 0.3;
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.3, 1.05, 0);
  armR.rotation.z = -0.4 - Math.random() * 0.3;
  g.add(armR);

  const legGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.85, 5);
  const legL = new THREE.Mesh(legGeo, clothMat);
  legL.position.set(-0.11, 0.42, 0);
  g.add(legL);
  const legR = new THREE.Mesh(legGeo, clothMat);
  legR.position.set(0.11, 0.42, 0);
  g.add(legR);

  torso.rotation.y = halfTurned ? 0.65 : 0;
  return g;
}

function buildHouse(scene: THREE.Scene, x: number, z: number, facingSign: 1 | -1): void {
  const w = 4 + Math.random() * 2.4;
  const h = 3 + Math.random() * 1.6;
  const d = 5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 1 }));
  body.position.set(x, h / 2, z);
  scene.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 1 }));
  roof.position.set(x, h + 0.5, z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);

  // every window dark — the outage isn't just this house
  if (Math.random() < 0.4) {
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x05050a }),
    );
    win.position.set(x, h * 0.55, z + (d / 2 + 0.02) * facingSign);
    if (facingSign < 0) win.rotation.y = Math.PI;
    scene.add(win);
  }
}

function buildTree(scene: THREE.Scene, x: number, z: number): void {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 5), new THREE.MeshStandardMaterial({ color: 0x1c1610, roughness: 1 }));
  trunk.position.set(x, 0.7, z);
  scene.add(trunk);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x111a12, roughness: 1 }));
  leaves.position.set(x, 2.1, z);
  scene.add(leaves);
}

/** A streetlamp — most are simply dark texture-less poles; `lit` gets a faint glowing head so at least one working light survives the outage for contrast. */
function buildLamp(scene: THREE.Scene, x: number, z: number, lit: boolean): THREE.PointLight | null {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 1 }));
  pole.position.set(x, 1.6, z);
  scene.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 6, 5),
    lit ? new THREE.MeshBasicMaterial({ color: 0xffdca0 }) : new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 }),
  );
  head.position.set(x, 3.25, z);
  scene.add(head);
  if (!lit) return null;
  const light = new THREE.PointLight(0xffdca0, 2.2, 13, 2);
  light.position.set(x, 3.1, z);
  scene.add(light);
  return light;
}

/**
 * Builds a full-viewport container synced to the game canvas's current
 * on-screen rect, inserted just below #ui-root — so #fade-layer (a child of
 * #ui-root) still paints over it during the fade in/out either side of this
 * cutscene, and it still paints over the Phaser canvas beneath it. Mirrors
 * the left/top/width/height math UIRoot's own syncViewport does, since this
 * is a one-off overlay that doesn't belong in the shared UI template.
 */
function mountContainer(): HTMLDivElement {
  const app = document.getElementById("app")!;
  const uiRoot = document.getElementById("ui-root")!;
  const appRect = app.getBoundingClientRect();
  const uiRect = uiRoot.getBoundingClientRect();

  const el = document.createElement("div");
  el.id = "street-cutscene-layer";
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

/**
 * Mounts its own full-viewport Three.js canvas overlay and plays a slow,
 * silent dolly-in on a dark residential street: a downed, sparking utility
 * pole and a crowd of zombies (some mid-turn) filling the road. No shake, no
 * cuts — this is the "calm before it builds again" beat, not an action one.
 * Caller drives the fade in/out and timing; this just renders until dispose().
 */
export function createStreetCutscene(): StreetCutsceneHandle {
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
  renderer.setClearColor(0x0a0e18, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x10131f, 0.017);

  const camera = new THREE.PerspectiveCamera(52, RENDER_W / RENDER_H, 0.1, 80);
  const zStart = 7;
  const zEnd = 3.6;
  camera.position.set(1.2, 1.55, zStart);
  camera.lookAt(-0.6, 1.15, -30);

  // "dim" needs to mean "visible but moody", not "black" — task-list history
  // has this exact lesson already for the 2D night exteriors (see
  // "Raise night-exterior ambient light so it's playable outside light
  // pools"), and this 3D shot needed a second pass of the same fix — the
  // first brightening pass still read as too dark/too pixelated to make
  // out the zombies. Ambient/hemisphere alone still reads flat, so a weak
  // angled "moonlight" directional is what actually gives the zombies and
  // pole real shape instead of silhouette mush.
  scene.add(new THREE.AmbientLight(0x3a4568, 3.6));
  scene.add(new THREE.HemisphereLight(0x3a4568, 0x12121a, 1.9));
  const moon = new THREE.DirectionalLight(0xb8c4e0, 1.5);
  moon.position.set(-4, 10, 6);
  scene.add(moon);

  // fallen pole + sparking wires, roughly centre-frame so the zoom lands on it
  const sparkPos = new THREE.Vector3(0.4, 0.55, -11.2);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 7.5, 6), new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 1 }));
  pole.rotation.z = Math.PI / 2 - 0.3;
  pole.rotation.y = 0.2;
  pole.position.set(0.6, 0.5, -11.6);
  scene.add(pole);

  const wireMat = new THREE.LineBasicMaterial({ color: 0x08080a });
  const wirePoints: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-2.6, 3.4, -14), new THREE.Vector3(sparkPos.x, sparkPos.y, sparkPos.z)],
    [new THREE.Vector3(sparkPos.x, sparkPos.y, sparkPos.z), new THREE.Vector3(2.2, 0.2, -9.4)],
  ];
  for (const [a, b] of wirePoints) {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), wireMat));
  }

  const sparkLight = new THREE.PointLight(0x9fd8ff, 1.6, 9, 2);
  sparkLight.position.copy(sparkPos);
  scene.add(sparkLight);

  const SPARK_COUNT = 14;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
  const sparkPoints = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xcdeeff, size: 0.06, transparent: true, opacity: 0.9 }));
  scene.add(sparkPoints);

  // road + sidewalks running away from the window into the fog
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 70), new THREE.MeshStandardMaterial({ color: 0x1b1b21, roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -25);
  scene.add(road);
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x28282e, roughness: 1 });
  const sidewalkGeo = new THREE.BoxGeometry(1.5, 0.12, 70);
  const sideL = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sideL.position.set(-4.1, 0.06, -25);
  scene.add(sideL);
  const sideR = sideL.clone();
  sideR.position.x = 4.1;
  scene.add(sideR);

  for (let i = 0; i < 8; i++) {
    const z = -5 - i * 6.5;
    buildHouse(scene, -6.5 - Math.random() * 1.5, z, 1);
    buildHouse(scene, 6.5 + Math.random() * 1.5, z, -1);
    if (i % 2 === 0) buildTree(scene, -4.6, z + 2);
    if (i % 3 === 1) buildTree(scene, 4.6, z - 1);
  }

  const lampLights: THREE.PointLight[] = [];
  for (let i = 0; i < 6; i++) {
    const z = -4 - i * 7;
    const lit = i !== 1 && i !== 4; // most of the street still has power — just not right where the pole came down
    const light = buildLamp(scene, i % 2 === 0 ? -3.6 : 3.6, z, lit);
    if (light) lampLights.push(light);
  }

  const zombies: ZombieSway[] = [];
  const ZOMBIE_COUNT = 18;
  for (let i = 0; i < ZOMBIE_COUNT; i++) {
    const nearPole = i < 5;
    const z = nearPole ? -9 - Math.random() * 5 : -6 - Math.random() * 42;
    const x = nearPole ? (Math.random() - 0.5) * 3.5 + 0.4 : (Math.random() - 0.5) * 8;
    const halfTurned = nearPole ? Math.random() < 0.7 : Math.random() < 0.35;
    const group = buildZombie(halfTurned);
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    // a jitter of scale reads as "not a single reused model" at a glance
    const s = 0.92 + Math.random() * 0.22;
    group.scale.set(s, s, s);
    scene.add(group);
    zombies.push({ group, baseRotY: group.rotation.y, swaySpeed: 0.6 + Math.random() * 0.8, swayPhase: Math.random() * Math.PI * 2 });
  }

  let rafId = 0;
  let disposed = false;
  let elapsed = 0;
  const clock = new THREE.Clock();

  function animate(): void {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    const t = Math.min(1, elapsed / ZOOM_DURATION_SEC);
    const eased = t * t * (3 - 2 * t); // smoothstep — a slow lean-in, easing off rather than a hard stop
    camera.position.z = THREE.MathUtils.lerp(zStart, zEnd, eased);

    let intensity = 1.1 + Math.random() * 1.6 + Math.sin(elapsed * 37) * 0.25;
    if (Math.random() < 0.06) intensity *= 0.15; // the wire briefly guttering out
    sparkLight.intensity = Math.max(0, intensity);

    const posAttr = sparkGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (Math.random() < 0.4) {
        posAttr.setXYZ(
          i,
          sparkPos.x + (Math.random() - 0.5) * 0.6,
          sparkPos.y + Math.random() * 0.7,
          sparkPos.z + (Math.random() - 0.5) * 0.4,
        );
      }
    }
    posAttr.needsUpdate = true;

    for (const z of zombies) {
      z.group.rotation.y = z.baseRotY + Math.sin(elapsed * z.swaySpeed + z.swayPhase) * 0.025;
    }
    for (const lamp of lampLights) {
      lamp.intensity = 2.1 + Math.sin(elapsed * 3 + lamp.position.x) * 0.15;
    }

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

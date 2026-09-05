import * as THREE from "three";

/**
 * Path 1's "the bat's still in the boot" beat, previously a single static
 * illustrated POV frame (see gfx/returnDrivePov.ts's PovTex.BOOT — left in
 * place, unused now, same as the old city-sunset frames). This is the
 * real-3D remake: looking down into the open boot as an arm reaches in and
 * actually lifts the bat out, rather than a still picture standing in for
 * the moment. Same self-mounting/self-disposing overlay pattern as
 * gfx3d/streetCutscene.ts and gfx3d/citySunset3d.ts.
 */

const RENDER_W = 320;
const RENDER_H = 180;

export interface BootCutsceneHandle {
  dispose(): void;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

function mountContainer(): HTMLDivElement {
  const app = document.getElementById("app")!;
  const uiRoot = document.getElementById("ui-root")!;
  const appRect = app.getBoundingClientRect();
  const uiRect = uiRoot.getBoundingClientRect();

  const el = document.createElement("div");
  el.id = "boot3d-layer";
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

function buildArm(): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89670, roughness: 0.9 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 1 });

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.9, 8), skin);
  forearm.position.y = 0.45;
  g.add(forearm);

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.3, 8), sleeve);
  cuff.position.y = 0.85;
  g.add(cuff);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), skin);
  hand.position.y = -0.02;
  g.add(hand);

  return g;
}

/**
 * Mounts its own full-viewport Three.js canvas: a POV straight down into an
 * open car boot (jerry can, rolled blanket, the bat front and centre) with
 * the lid propped up behind it, as an arm reaches in, grips the bat, and
 * lifts it up toward camera. Caller drives the fade in/out and dialogue
 * timing; this just renders and animates until dispose().
 */
export function createBootCutscene(): BootCutsceneHandle {
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
  renderer.setClearColor(0x0e0f10, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e0f10, 3, 9);

  // near-vertical looking-down-into-the-boot POV — steep on purpose, so the
  // propped-open lid (which sits well behind/above this framing) never
  // swings into view as a big flat plane the way a shallower angle risked
  const camera = new THREE.PerspectiveCamera(50, RENDER_W / RENDER_H, 0.05, 20);
  camera.position.set(0, 3.4, 0.15);
  camera.lookAt(0, 0, -0.4);

  // daylight spilling in from the open lid above/behind, plus a soft fill
  // so the boot well doesn't just crush to black — it's shadowed, not night
  scene.add(new THREE.AmbientLight(0x9aa4b8, 1.6));
  const spill = new THREE.DirectionalLight(0xd8e0f0, 1.4);
  spill.position.set(-1.5, 4, 2);
  scene.add(spill);

  // the boot well — a shallow open-top tray, not a sealed box
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x232320, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.6), trayMat);
  floor.position.set(0, -0.05, -0.4);
  scene.add(floor);
  const wallGeo = new THREE.BoxGeometry(2.2, 0.4, 0.1);
  const backWall = new THREE.Mesh(wallGeo, trayMat);
  backWall.position.set(0, 0.15, -1.15);
  scene.add(backWall);
  const sideWallGeo = new THREE.BoxGeometry(0.1, 0.4, 1.6);
  const leftWall = new THREE.Mesh(sideWallGeo, trayMat);
  leftWall.position.set(-1.1, 0.15, -0.4);
  scene.add(leftWall);
  const rightWall = leftWall.clone();
  rightWall.position.x = 1.1;
  scene.add(rightWall);

  // boot lid, propped open behind everything
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.6 }));
  lid.position.set(0, 1.1, -1.55);
  lid.rotation.x = -0.35;
  scene.add(lid);

  // jerry can, left
  const canBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.32), new THREE.MeshStandardMaterial({ color: 0x2e4a2c, roughness: 0.8 }));
  canBody.position.set(-0.65, 0.22, -0.35);
  scene.add(canBody);
  const canCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x1c3320, roughness: 0.8 }));
  canCap.position.set(-0.65, 0.53, -0.35);
  scene.add(canCap);

  // rolled blanket, right
  const blanket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10), new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 1 }));
  blanket.rotation.z = Math.PI / 2;
  blanket.position.set(0.65, 0.24, -0.3);
  scene.add(blanket);

  // the bat — front and centre, the whole point of the shot. Cylinders are
  // Y-axis-long by default, same as the blanket above — rotation.z=PI/2 is
  // what actually lays it flat on the tray floor rather than standing it
  // up on end (which is what left it invisible, half-buried in the floor,
  // before this fix)
  const batGroup = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a3f, roughness: 0.7 }));
  handle.position.y = -0.35;
  batGroup.add(handle);
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.65, 8), new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: 0.6 }));
  blade.position.y = 0.12;
  batGroup.add(blade);
  batGroup.rotation.z = Math.PI / 2;
  batGroup.rotation.y = 0.35;
  batGroup.position.set(0.05, 0.065, -0.15);
  scene.add(batGroup);

  const arm = buildArm();
  scene.add(arm);

  const REACH_START = new THREE.Vector3(0.35, 2.6, 1.4);
  const REACH_GRIP = new THREE.Vector3(0.05, 0.35, -0.1);
  const LIFT_END = new THREE.Vector3(-0.1, 2.9, 1.7);
  const BAT_REST = batGroup.position.clone();
  const BAT_REST_ROT = batGroup.rotation.z;

  let rafId = 0;
  let disposed = false;
  let elapsed = 0;
  const clock = new THREE.Clock();

  // phases, in seconds — reach down, grip pause, lift up and out, then hold
  const T_REACH = 0.6;
  const T_GRIP = 0.9;
  const T_LIFT = 1.6;

  function animate(): void {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (elapsed <= T_REACH) {
      const t = elapsed / T_REACH;
      const eased = t * t * (3 - 2 * t);
      arm.position.lerpVectors(REACH_START, REACH_GRIP, eased);
      arm.rotation.x = THREE.MathUtils.lerp(-0.3, 0.15, eased);
    } else if (elapsed <= T_GRIP) {
      arm.position.copy(REACH_GRIP);
      arm.position.y += Math.sin((elapsed - T_REACH) * 40) * 0.01;
    } else if (elapsed <= T_LIFT) {
      const t = (elapsed - T_GRIP) / (T_LIFT - T_GRIP);
      const eased = 1 - (1 - t) * (1 - t);
      arm.position.lerpVectors(REACH_GRIP, LIFT_END, eased);
      arm.rotation.x = THREE.MathUtils.lerp(0.15, -0.4, eased);
      batGroup.position.lerpVectors(BAT_REST, new THREE.Vector3(LIFT_END.x, LIFT_END.y - 0.35, LIFT_END.z - 0.2), eased);
      // rotates from lying flat (BAT_REST_ROT, ~PI/2) up toward held-upright
      // as the arm lifts it clear of the boot
      batGroup.rotation.z = THREE.MathUtils.lerp(BAT_REST_ROT, 0.4, eased);
    } else {
      // held up in view — a faint hand tremor so it doesn't look frozen
      const hold = Math.sin(elapsed * 5) * 0.01;
      arm.position.set(LIFT_END.x, LIFT_END.y + hold, LIFT_END.z);
      batGroup.position.set(LIFT_END.x, LIFT_END.y - 0.35 + hold, LIFT_END.z - 0.2);
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

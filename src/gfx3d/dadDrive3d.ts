import * as THREE from "three";

/**
 * Path 2's flagship remake: Dad's reckless backseat-POV drive home, then the
 * "parked it" wall crash — previously flat 2D sprites scaling toward the
 * viewer against a static sky/dashboard image (see gfx/dadDrivePov.ts, left
 * in place unused, same as the old sunset frames). This is genuinely 3D: a
 * continuously scrolling suburban street with recycled houses/trees/lamps,
 * a real swerve the camera physically lurches through, then a hard cut to
 * an exterior third-person shot of the car actually slamming into the
 * house wall — crumple, cracks, debris, camera shake, all in one continuous
 * shot rather than a tween between two flat images. Same self-mounting/
 * disposing overlay pattern as the other gfx3d/ cutscenes. Played for
 * laughs, same as the 2D original — chaotic, not grim.
 */

const RENDER_W = 320;
const RENDER_H = 180;

export interface DriveCutsceneHandle {
  /** Kicks the camera into a hard swerve around something suddenly in the road. Resolves once it's settled back out. */
  swerve(): Promise<void>;
  /** Ramps the scroll speed up further — called once things are meant to be getting out of hand. */
  speedUp(): void;
  dispose(): void;
}

export interface CrashCutsceneHandle {
  dispose(): void;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry.dispose();
      const mat = child.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

function mountContainer(id: string): HTMLDivElement {
  const app = document.getElementById("app")!;
  const uiRoot = document.getElementById("ui-root")!;
  const appRect = app.getBoundingClientRect();
  const uiRect = uiRoot.getBoundingClientRect();

  const el = document.createElement("div");
  el.id = id;
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

function makeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(RENDER_W, RENDER_H, false);
  return renderer;
}

// ---------------------------------------------------------------------------
// Phase 1: backseat POV drive
// ---------------------------------------------------------------------------

const ROAD_HALF_WIDTH = 3;
const SPAWN_Z = -80;
const RECYCLE_Z = 4;

type PropKind = "house" | "tree" | "lamp" | "zombie" | "dash";

interface ScrollProp {
  group: THREE.Group;
  kind: PropKind;
  lampLight?: THREE.PointLight;
}

function buildRoadsideHouse(litWindow: boolean): THREE.Group {
  const g = new THREE.Group();
  const w = 3.5 + Math.random() * 2;
  const h = 2.2 + Math.random() * 1.6;
  const d = 3 + Math.random() * 2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x1c1a20, roughness: 1 }));
  body.position.y = h / 2;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, 1.1, 4), new THREE.MeshStandardMaterial({ color: 0x100e14, roughness: 1 }));
  roof.position.y = h + 0.45;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.8),
    new THREE.MeshBasicMaterial({ color: litWindow ? 0xffd98a : 0x08080c }),
  );
  win.position.set(0, h * 0.55, d / 2 + 0.02);
  g.add(win);
  return g;
}

function buildRoadsideTree(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x1c1610, roughness: 1 }));
  trunk.position.y = 0.8;
  g.add(trunk);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 7), new THREE.MeshStandardMaterial({ color: 0x101a10, roughness: 1 }));
  leaves.position.y = 2.4;
  g.add(leaves);
  return g;
}

function buildRoadsideLamp(): { group: THREE.Group; light: THREE.PointLight } {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 1 }));
  pole.position.y = 1.5;
  g.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffdca0 }));
  head.position.y = 3.1;
  g.add(head);
  const light = new THREE.PointLight(0xffdca0, 1.8, 8, 2);
  light.position.y = 3.0;
  g.add(light);
  return { group: g, light };
}

function buildRoadsideZombie(): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x3f4a3a, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 1 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.85, 6), cloth);
  torso.position.y = 0.9;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), skin);
  head.position.y = 1.45;
  g.add(head);
  const legGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.8, 5);
  const legL = new THREE.Mesh(legGeo, cloth);
  legL.position.set(-0.1, 0.4, 0);
  g.add(legL);
  const legR = new THREE.Mesh(legGeo, cloth);
  legR.position.set(0.1, 0.4, 0);
  g.add(legR);
  return g;
}

function buildDash(): THREE.Mesh {
  return new THREE.Mesh(new THREE.PlaneGeometry(0.25, 1.4), new THREE.MeshBasicMaterial({ color: 0xd8d0b8 }));
}

/**
 * Mounts a continuously-scrolling first-person drive down a dark suburban
 * street: recycled houses/trees/lamps sliding past, an occasional zombie at
 * the verge. speed/swerve are exposed so the calling scene can drive the
 * pacing off its own dialogue beats rather than this module guessing at
 * timing on its own.
 */
export function createDriveCutscene(): DriveCutsceneHandle {
  const container = mountContainer("daddrive3d-layer");
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.imageRendering = "pixelated";
  container.appendChild(canvas);

  const renderer = makeRenderer(canvas);
  renderer.setClearColor(0x0a0c14, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0c14, 0.02);

  const camera = new THREE.PerspectiveCamera(58, RENDER_W / RENDER_H, 0.1, 100);
  const baseCameraY = 1.15;
  camera.position.set(0, baseCameraY, 1.2);

  scene.add(new THREE.AmbientLight(0x2c3550, 2.4));
  scene.add(new THREE.HemisphereLight(0x2a3550, 0x0a0a12, 1.2));
  const headlightGlow = new THREE.PointLight(0xcfe0ff, 1.2, 14, 2);
  headlightGlow.position.set(0, 1, -3);
  scene.add(headlightGlow);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, 140), new THREE.MeshStandardMaterial({ color: 0x1b1b21, roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -30);
  scene.add(road);
  const pavementMat = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 1 });
  const pavementGeo = new THREE.BoxGeometry(1.4, 0.1, 140);
  const pavementL = new THREE.Mesh(pavementGeo, pavementMat);
  pavementL.position.set(-ROAD_HALF_WIDTH - 0.7, 0.05, -30);
  scene.add(pavementL);
  const pavementR = pavementL.clone();
  pavementR.position.x = ROAD_HALF_WIDTH + 0.7;
  scene.add(pavementR);

  const props: ScrollProp[] = [];

  function spawnAt(kind: PropKind, z: number): void {
    const group = new THREE.Group();
    let lampLight: THREE.PointLight | undefined;
    const side = Math.random() < 0.5 ? -1 : 1;

    if (kind === "house") {
      const inner = buildRoadsideHouse(Math.random() < 0.15);
      group.add(inner);
      group.position.set(side * (ROAD_HALF_WIDTH + 2.6 + Math.random() * 1.5), 0, z);
    } else if (kind === "tree") {
      group.add(buildRoadsideTree());
      group.position.set(side * (ROAD_HALF_WIDTH + 1.3 + Math.random() * 0.6), 0, z);
    } else if (kind === "lamp") {
      const built = buildRoadsideLamp();
      group.add(built.group);
      lampLight = built.light;
      group.position.set(side * (ROAD_HALF_WIDTH + 0.5), 0, z);
    } else if (kind === "zombie") {
      group.add(buildRoadsideZombie());
      group.rotation.y = Math.random() * Math.PI * 2;
      group.position.set(side * (ROAD_HALF_WIDTH + 0.2 + Math.random() * 0.8), 0, z);
    } else {
      group.add(buildDash());
      group.rotation.x = -Math.PI / 2;
      group.position.set(0, 0.01, z);
    }

    group.userData.kind = kind;
    scene.add(group);
    props.push({ group, kind, lampLight });
  }

  for (let i = 0; i < 16; i++) spawnAt("house", -10 - i * 9 + (Math.random() - 0.5) * 3);
  for (let i = 0; i < 10; i++) spawnAt("tree", -8 - i * 13 + (Math.random() - 0.5) * 3);
  for (let i = 0; i < 8; i++) spawnAt("lamp", -6 - i * 16);
  for (let i = 0; i < 3; i++) spawnAt("zombie", -20 - i * 30 + (Math.random() - 0.5) * 10);
  for (let i = 0; i < 10; i++) spawnAt("dash", -i * 8);

  function recycle(p: ScrollProp): void {
    const kind = p.kind;
    const z = SPAWN_Z + (Math.random() - 0.5) * 10;
    const side = Math.random() < 0.5 ? -1 : 1;
    if (kind === "house") {
      p.group.position.set(side * (ROAD_HALF_WIDTH + 2.6 + Math.random() * 1.5), 0, z);
    } else if (kind === "tree") {
      p.group.position.set(side * (ROAD_HALF_WIDTH + 1.3 + Math.random() * 0.6), 0, z);
    } else if (kind === "lamp") {
      p.group.position.set(side * (ROAD_HALF_WIDTH + 0.5), 0, z);
    } else if (kind === "zombie") {
      p.group.rotation.y = Math.random() * Math.PI * 2;
      p.group.position.set(side * (ROAD_HALF_WIDTH + 0.2 + Math.random() * 0.8), 0, z);
    } else {
      p.group.position.set(0, 0.01, z + (RECYCLE_Z - z) - 8 * 10);
    }
  }

  let speed = 16;
  let swerveOffset = 0;
  let swerveRoll = 0;
  let disposed = false;
  let rafId = 0;
  let elapsed = 0;
  const clock = new THREE.Clock();

  function animate(): void {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    for (const p of props) {
      p.group.position.z += speed * dt;
      if (p.group.position.z > RECYCLE_Z) recycle(p);
    }

    camera.position.x = swerveOffset;
    camera.position.y = baseCameraY + Math.sin(elapsed * 7) * 0.015;
    camera.rotation.z = swerveRoll;
    camera.lookAt(swerveOffset * 0.4, baseCameraY - 0.05, -30);

    renderer.render(scene, camera);
  }
  animate();

  return {
    speedUp(): void {
      speed += 10;
    },
    swerve(): Promise<void> {
      return new Promise((resolve) => {
        // something suddenly right in the lane ahead — the reason for the swerve
        const jumpScare = buildRoadsideZombie();
        jumpScare.position.set(0.3, 0, -13);
        scene.add(jumpScare);
        window.setTimeout(() => {
          disposeObject(jumpScare);
          scene.remove(jumpScare);
        }, 1400);

        const state = { offset: 0, roll: 0 };
        const tl = [
          { offset: -1.7, roll: -0.22, duration: 180 },
          { offset: 1.3, roll: 0.18, duration: 260 },
          { offset: 0, roll: 0, duration: 320 },
        ];
        let i = 0;
        const step = () => {
          if (i >= tl.length) {
            resolve();
            return;
          }
          const target = tl[i];
          i++;
          const tweenTargets = { x: state.offset, r: state.roll };
          const start = performance.now();
          const from = { ...tweenTargets };
          const run = () => {
            const t = Math.min(1, (performance.now() - start) / target.duration);
            const eased = 1 - (1 - t) * (1 - t);
            state.offset = THREE.MathUtils.lerp(from.x, target.offset, eased);
            state.roll = THREE.MathUtils.lerp(from.r, target.roll, eased);
            swerveOffset = state.offset;
            swerveRoll = state.roll;
            if (t < 1) requestAnimationFrame(run);
            else step();
          };
          run();
        };
        step();
      });
    },
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(rafId);
      disposeObject(scene);
      renderer.dispose();
      container.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Phase 2: exterior crash
// ---------------------------------------------------------------------------

function buildCar(): THREE.Group {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x8a1f2b, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fa8c0, roughness: 0.2, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 1.6), paint);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.4), glass);
  cabin.position.set(-0.2, 1.05, 0);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.9 });
  for (const [wx, wz] of [
    [1.3, 0.75],
    [1.3, -0.75],
    [-1.3, 0.75],
    [-1.3, -0.75],
  ] as const) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.3, wz);
    g.add(wheel);
  }
  return g;
}

/**
 * Mounts the exterior third-person crash shot: the car races in from the
 * side and slams into the house wall — crumple, cracked wall, debris burst,
 * camera shake. Holds on the aftermath (embedded in the wall) until
 * dispose(); the caller cuts away over the top of that hold.
 */
export function createCrashCutscene(onImpact?: () => void): CrashCutsceneHandle {
  const container = mountContainer("daddrivecrash3d-layer");
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.imageRendering = "pixelated";
  container.appendChild(canvas);

  const renderer = makeRenderer(canvas);
  renderer.setClearColor(0x14181c, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14181c, 12, 30);

  const camera = new THREE.PerspectiveCamera(42, RENDER_W / RENDER_H, 0.1, 60);
  const baseCamPos = new THREE.Vector3(0.5, 2.3, 7.5);
  camera.position.copy(baseCamPos);
  camera.lookAt(0, 1.2, 0);

  scene.add(new THREE.AmbientLight(0x8890a8, 1.8));
  const moon = new THREE.DirectionalLight(0xaeb8d8, 1.1);
  moon.position.set(-3, 8, 5);
  scene.add(moon);

  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x2a3a22, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.01;
  scene.add(lawn);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 4.2, 0.6), wallMat);
  wall.position.set(0, 2.1, -1.2);
  scene.add(wall);
  const doorFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 1 }));
  doorFrame.position.set(-4.2, 1.3, -0.89);
  scene.add(doorFrame);
  for (const wx of [2.6, 5.2]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.4 }));
    win.position.set(wx, 2.3, -0.89);
    scene.add(win);
  }

  const car = buildCar();
  car.rotation.y = Math.PI / 2;
  const startX = -13;
  const impactX = -0.4;
  car.position.set(startX, 0, 2.4);
  scene.add(car);

  let rafId = 0;
  let disposed = false;
  let elapsed = 0;
  let impacted = false;
  const clock = new THREE.Clock();
  const debris: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; born: number }> = [];
  let shakeUntil = 0;

  const APPROACH_SEC = 1.0;
  const SLOWMO_START = 0.72;

  function spawnDebris(x: number, y: number, z: number): void {
    const colors = [0x5a5040, 0x8a1f2b, 0xcfc6ae];
    for (let i = 0; i < 22; i++) {
      const size = 0.06 + Math.random() * 0.14;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 1 }));
      mesh.position.set(x, y, z);
      scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      debris.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 3, Math.sin(angle) * speed * 0.6 + 1),
        born: elapsed,
      });
    }

    const crackMat = new THREE.LineBasicMaterial({ color: 0x2a241c });
    for (let i = 0; i < 6; i++) {
      const dx = (Math.random() - 0.5) * 2.4;
      const dy = (Math.random() - 0.5) * 1.6;
      const pts = [new THREE.Vector3(x, y, z + 0.31), new THREE.Vector3(x + dx, y + dy, z + 0.31)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crackMat));
    }
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 }));
    hole.position.set(x, y, z + 0.32);
    scene.add(hole);
  }

  function animate(): void {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    const rawDt = Math.min(clock.getDelta(), 0.05);
    const timeScale = !impacted && elapsed / APPROACH_SEC > SLOWMO_START ? 0.35 : 1;
    const dt = rawDt * timeScale;
    elapsed += dt;

    if (!impacted) {
      const t = Math.min(1, elapsed / APPROACH_SEC);
      const eased = t * t * t;
      car.position.x = THREE.MathUtils.lerp(startX, impactX, eased);
      car.rotation.z = Math.sin(t * 12) * 0.02;
      if (t >= 1) {
        impacted = true;
        onImpact?.();
        spawnDebris(car.position.x + 1.4, 1.4, -0.9);
        shakeUntil = elapsed + 0.4;
        car.scale.set(0.6, 0.85, 1);
        car.position.x += 0.6;
        car.rotation.z = 0.18;
      }
    } else {
      for (const d of debris) {
        const age = elapsed - d.born;
        d.vel.y -= 9 * rawDt;
        d.mesh.position.addScaledVector(d.vel, rawDt);
        d.mesh.rotation.x += rawDt * 4;
        d.mesh.rotation.y += rawDt * 3;
        if (d.mesh.position.y < 0.05) {
          d.mesh.position.y = 0.05;
          d.vel.y = 0;
          d.vel.x *= 0.9;
          d.vel.z *= 0.9;
        }
        (d.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - age / 2.2);
        if (age > 2.2 && d.mesh.material instanceof THREE.MeshStandardMaterial) {
          d.mesh.material.transparent = true;
        }
      }
    }

    camera.position.copy(baseCamPos);
    if (elapsed < shakeUntil) {
      const shake = (shakeUntil - elapsed) * 0.06;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
    }
    camera.lookAt(impactX + 0.6, 1.2, -0.9);

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

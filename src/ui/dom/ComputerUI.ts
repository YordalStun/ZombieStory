import { EMAILS, NEWS_ARTICLE, REQUIRED_EMAIL_IDS, type ComputerEmail } from "@/data/dialogue/officeComputerContent";
import { AudioManager } from "@/core/managers/AudioManager";
import { drawEmptyShelvesPhoto, drawStreetCrowdPhoto } from "@/ui/dom/emailArt";
import * as compAudio from "@/ui/dom/ComputerAudio";

export interface ComputerCallbacks {
  onEmailsRead: () => void;
  onNewsRead: () => void;
}

const BOOT_LINES = [
  "MERIDIAN BIOS v4.12 — OFFICE WORKSTATION",
  "640K BASE MEMORY OK",
  "Initializing IDE devices... OK",
  "Checking NVRAM... OK",
  "Detecting network adapter... OK",
  "Starting OFFICE-OS...",
];

const EMAIL_ART: Record<"shelves" | "crowd", () => string> = {
  shelves: drawEmptyShelvesPhoto,
  crowd: drawStreetCrowdPhoto,
};

/** How far the rest of the game's audio ducks while the computer is open. */
const DUCK_FACTOR = 0.12;

let overlay: HTMLDivElement;
let logoScreen: HTMLDivElement;
let bootScreen: HTMLDivElement;
let bootLog: HTMLDivElement;
let loginScreen: HTMLDivElement;
let loginPassword: HTMLDivElement;
let loginStatus: HTMLDivElement;
let desktopScreen: HTMLDivElement;
let appWindow: HTMLDivElement;
let appTitle: HTMLDivElement;
let appBody: HTMLDivElement;
let clockEl: HTMLDivElement;

let resolveOpen: (() => void) | null = null;
let callbacks: ComputerCallbacks | null = null;
let readEmailIds = new Set<string>();
let emailsCompleted = false;
let newsCompleted = false;
let dinoStop: (() => void) | null = null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function initComputerUI(): void {
  overlay = document.getElementById("computer-overlay") as HTMLDivElement;
  logoScreen = document.getElementById("computer-logo") as HTMLDivElement;
  bootScreen = document.getElementById("computer-boot") as HTMLDivElement;
  bootLog = document.getElementById("computer-boot-log") as HTMLDivElement;
  loginScreen = document.getElementById("computer-login") as HTMLDivElement;
  loginPassword = document.getElementById("computer-login-password") as HTMLDivElement;
  loginStatus = document.getElementById("computer-login-status") as HTMLDivElement;
  desktopScreen = document.getElementById("computer-desktop") as HTMLDivElement;
  appWindow = document.getElementById("computer-app-window") as HTMLDivElement;
  appTitle = document.getElementById("computer-app-title") as HTMLDivElement;
  appBody = document.getElementById("computer-app-body") as HTMLDivElement;
  clockEl = document.getElementById("computer-clock") as HTMLDivElement;

  buildDesktopIcons();

  document.getElementById("computer-app-close")!.addEventListener("click", closeApp);
  document.getElementById("computer-power-off")!.addEventListener("click", () => void closeComputer());

  window.addEventListener("keydown", (e) => {
    if (overlay.classList.contains("hidden")) return;
    if (e.code === "Escape") {
      e.preventDefault();
      if (!appWindow.classList.contains("hidden")) closeApp();
      else void closeComputer();
    }
  });

  updateClock();
  window.setInterval(updateClock, 30000);
  compAudio.initComputerAudio();
}

function updateClock(): void {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = now.getMinutes().toString().padStart(2, "0");
  clockEl.textContent = `${h}:${m} ${now.getHours() >= 12 ? "PM" : "AM"}`;
}

interface IconDef {
  id: string;
  label: string;
  glyph: string;
  onOpen: () => void;
  /** Dead icons play a "nope" buzz instead of the normal open chime. */
  inert?: boolean;
}

function buildDesktopIcons(): void {
  const container = document.getElementById("computer-icons")!;
  const icons: IconDef[] = [
    { id: "mail", label: "Mail", glyph: "✉", onOpen: openMailApp },
    { id: "news", label: "Newsline", glyph: "🗞", onOpen: openNewsApp },
    { id: "dino", label: "Canyon Runner", glyph: "▶", onOpen: openDinoApp },
    { id: "docs", label: "My Documents", glyph: "🗀", onOpen: () => openInertApp("My Documents", "This folder is empty."), inert: true },
    { id: "photos", label: "Photos", glyph: "🖼", onOpen: () => openInertApp("Photos", "0 items."), inert: true },
    {
      id: "portal",
      label: "Company Portal",
      glyph: "⌂",
      onOpen: () => openInertApp("Company Portal", "Connection failed.\n\nThe server could not be reached. Check your network connection and try again."),
      inert: true,
    },
    { id: "recycle", label: "Recycle Bin", glyph: "🗑", onOpen: () => openInertApp("Recycle Bin", "The Recycle Bin is empty."), inert: true },
  ];

  container.replaceChildren();
  for (const icon of icons) {
    const btn = document.createElement("button");
    btn.className = "computer-icon";
    btn.dataset.iconId = icon.id;
    btn.innerHTML = `<span class="computer-icon-glyph">${icon.glyph}</span><span class="computer-icon-label">${icon.label}</span>`;
    btn.addEventListener("click", () => {
      compAudio.playClick();
      icon.onOpen();
      if (icon.inert) compAudio.playError();
      else compAudio.playOpen();
    });
    container.appendChild(btn);
  }
}

/** Boots, logs in, shows the desktop, and resolves once the player steps away. */
export function openComputer(cb: ComputerCallbacks): Promise<void> {
  callbacks = cb;
  readEmailIds = new Set();
  emailsCompleted = false;
  newsCompleted = false;

  // the office hum/ambience keeps playing underneath — turn it right down
  // so the computer's own sounds (and the player's attention) aren't
  // fighting it; restored in closeComputer()
  AudioManager.duck(DUCK_FACTOR);

  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("visible"));

  logoScreen.classList.remove("hidden");
  bootScreen.classList.add("hidden");
  loginScreen.classList.add("hidden");
  desktopScreen.classList.add("hidden");
  appWindow.classList.add("hidden");

  void runBootSequence();

  return new Promise((resolve) => {
    resolveOpen = resolve;
  });
}

async function runBootSequence(): Promise<void> {
  compAudio.playStartup();
  await wait(1500);
  logoScreen.classList.add("hidden");
  bootScreen.classList.remove("hidden");

  bootLog.replaceChildren();
  for (const line of BOOT_LINES) {
    await wait(220 + Math.random() * 140);
    const p = document.createElement("div");
    p.textContent = line;
    bootLog.appendChild(p);
  }
  await wait(500);
  bootScreen.classList.add("hidden");

  loginScreen.classList.remove("hidden");
  loginPassword.textContent = "";
  loginStatus.textContent = "";
  const dots = "••••••••";
  for (let i = 1; i <= dots.length; i++) {
    await wait(70 + Math.random() * 60);
    loginPassword.textContent = dots.slice(0, i);
  }
  await wait(300);
  loginStatus.textContent = "Signing in...";
  await wait(700);
  loginScreen.classList.add("hidden");

  desktopScreen.classList.remove("hidden");
}

function closeApp(): void {
  if (dinoStop) {
    dinoStop();
    dinoStop = null;
  }
  appWindow.classList.add("hidden");
}

function openAppWindow(title: string): HTMLDivElement {
  closeApp();
  appTitle.textContent = title;
  appBody.replaceChildren();
  // replaceChildren() only clears content — each app tags this same shared
  // element with its own layout class (.computer-mail, .computer-news-outer,
  // ...), and those don't self-remove, so a leftover class from whichever
  // app was open last was still fighting the next one's layout
  appBody.className = "";
  appWindow.classList.remove("hidden");
  return appBody;
}

function openInertApp(title: string, message: string): void {
  const body = openAppWindow(title);
  const p = document.createElement("div");
  p.className = "computer-inert-message";
  p.textContent = message;
  body.appendChild(p);
}

// ---------------------------------------------------------------- mail ----

function openMailApp(): void {
  const body = openAppWindow("Mail — Inbox");
  body.classList.add("computer-mail");

  const list = document.createElement("div");
  list.className = "computer-mail-list";
  const detail = document.createElement("div");
  detail.className = "computer-mail-detail";
  body.appendChild(list);
  body.appendChild(detail);

  const renderDetail = (email: ComputerEmail) => {
    detail.replaceChildren();
    const h = document.createElement("div");
    h.className = "computer-mail-detail-header";
    h.innerHTML = `<div class="computer-mail-detail-subject">${email.subject}</div>
      <div class="computer-mail-detail-meta">From: ${email.from} &lt;${email.fromAddress}&gt;<br/>${email.date}</div>`;
    detail.appendChild(h);

    for (const para of email.body) {
      const p = document.createElement("p");
      p.textContent = para;
      detail.appendChild(p);
    }

    if (email.photo) {
      const wrap = document.createElement("div");
      wrap.className = "computer-mail-photo";
      const img = document.createElement("img");
      img.className = "computer-mail-photo-img";
      img.src = EMAIL_ART[email.photo.art]();
      img.alt = email.photo.caption;
      const cap = document.createElement("div");
      cap.className = "computer-mail-photo-caption";
      cap.textContent = email.photo.caption;
      wrap.appendChild(img);
      wrap.appendChild(cap);
      detail.appendChild(wrap);
    }

    if (email.required && !readEmailIds.has(email.id)) {
      readEmailIds.add(email.id);
      checkEmailsComplete();
    }
  };

  const renderList = () => {
    list.replaceChildren();
    for (const email of EMAILS) {
      const row = document.createElement("button");
      row.className = "computer-mail-row";
      if (readEmailIds.has(email.id)) row.classList.add("read");
      row.innerHTML = `<span class="computer-mail-from">${email.from}</span><span class="computer-mail-subject">${email.subject}</span><span class="computer-mail-date">${email.date}</span>`;
      row.addEventListener("click", () => {
        compAudio.playClick();
        renderDetail(email);
        renderList();
      });
      list.appendChild(row);
    }
  };

  renderList();
  const first = EMAILS[0];
  if (first) renderDetail(first);
  renderList();
}

function checkEmailsComplete(): void {
  if (emailsCompleted) return;
  const allRead = REQUIRED_EMAIL_IDS.every((id) => readEmailIds.has(id));
  if (allRead) {
    emailsCompleted = true;
    callbacks?.onEmailsRead();
  }
}

// ---------------------------------------------------------------- news ----

function openNewsApp(): void {
  const outer = openAppWindow("Newsline — newsline.co.uk");
  outer.classList.add("computer-news-outer");

  const masthead = document.createElement("div");
  masthead.className = "computer-news-masthead";
  masthead.innerHTML = `<span class="computer-news-wordmark">NEWSLINE</span><span class="computer-news-tagline">UK &amp; NATIONAL</span>`;

  const banner = document.createElement("div");
  banner.className = "computer-news-banner";
  banner.innerHTML = `<span class="computer-news-banner-tag">${NEWS_ARTICLE.kicker}</span><span class="computer-news-banner-live">● LIVE</span>`;

  const row = document.createElement("div");
  row.className = "computer-news";

  const article = document.createElement("div");
  article.className = "computer-news-article";
  const headline = document.createElement("div");
  headline.className = "computer-news-headline";
  headline.textContent = NEWS_ARTICLE.headline;
  const byline = document.createElement("div");
  byline.className = "computer-news-byline";
  byline.textContent = `${NEWS_ARTICLE.byline} — ${NEWS_ARTICLE.date}`;
  article.appendChild(headline);
  article.appendChild(byline);
  for (const para of NEWS_ARTICLE.paragraphs) {
    const p = document.createElement("p");
    p.textContent = para;
    article.appendChild(p);
  }

  const sidebar = document.createElement("div");
  sidebar.className = "computer-news-sidebar";
  const sbTitle = document.createElement("div");
  sbTitle.className = "computer-news-sidebar-title";
  sbTitle.textContent = "Also happening";
  sidebar.appendChild(sbTitle);
  for (const item of NEWS_ARTICLE.sidebar) {
    const li = document.createElement("div");
    li.className = "computer-news-sidebar-item";
    li.textContent = item;
    sidebar.appendChild(li);
  }

  row.appendChild(article);
  row.appendChild(sidebar);
  outer.appendChild(masthead);
  outer.appendChild(banner);
  outer.appendChild(row);

  if (!newsCompleted) {
    newsCompleted = true;
    callbacks?.onNewsRead();
  }
}

// ---------------------------------------------------------------- dino ----

type RunnerObstacle = { x: number; w: number; h: number; flying: boolean };
type RunnerState = "ready" | "running" | "dead";

function openDinoApp(): void {
  const body = openAppWindow("Canyon Runner");
  body.classList.add("computer-dino");

  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 170;
  canvas.className = "computer-dino-canvas";
  const hint = document.createElement("div");
  hint.className = "computer-dino-hint";
  hint.textContent = "SPACE / click to jump — hold ↓ to duck";
  body.appendChild(canvas);
  body.appendChild(hint);

  const ctx = canvas.getContext("2d")!;
  const groundY = 132;
  const runnerX = 46;

  let state: RunnerState = "ready";
  let runnerY = groundY;
  let vy = 0;
  let onGround = true;
  let ducking = false;
  let obstacles: RunnerObstacle[] = [];
  let speed = 2.6; // deliberately slow to start — the original was "way too fast"
  let distance = 0;
  let best = Number(localStorage.getItem("zs_dino_best") ?? "0");
  let spawnTimer = 90;
  let running = true;
  let animTick = 0;
  let lastMilestone = 0;
  // three hill layers at different speeds for a cheap sense of real depth
  const hillsFar = { x: 0, speedMul: 0.15 };
  const hillsNear = { x: 0, speedMul: 0.35 };

  function reset(): void {
    runnerY = groundY;
    vy = 0;
    onGround = true;
    ducking = false;
    obstacles = [];
    speed = 2.6;
    distance = 0;
    spawnTimer = 90;
    lastMilestone = 0;
    state = "running";
  }

  const jump = () => {
    if (state === "ready") {
      reset();
      return;
    }
    if (state === "dead") {
      reset();
      return;
    }
    if (onGround && !ducking) {
      vy = -7.6;
      onGround = false;
      compAudio.playOpen();
    }
  };

  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      jump();
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      if (state === "running" && onGround) ducking = true;
    }
  };
  const keyUpHandler = (e: KeyboardEvent) => {
    if (e.code === "ArrowDown") ducking = false;
  };
  window.addEventListener("keydown", keyHandler);
  window.addEventListener("keyup", keyUpHandler);
  canvas.addEventListener("click", jump);

  function drawRunner(y: number, isDucking: boolean, tick: number): void {
    const legFrame = Math.floor(tick / 8) % 2;
    if (isDucking) {
      // low, flattened silhouette sliding under overhead obstacles
      ctx.fillStyle = "#2c3624";
      ctx.fillRect(runnerX - 4, y - 12, 26, 12);
      ctx.fillRect(runnerX + 14, y - 16, 8, 6); // head tucked forward
    } else {
      ctx.fillStyle = "#2c3624";
      ctx.fillRect(runnerX, y - 26, 16, 16); // torso
      ctx.fillRect(runnerX + 3, y - 32, 10, 8); // head
      ctx.fillRect(runnerX - 3, y - 24, 5, 10); // trailing arm
      // alternating legs for a running read, not just a static box
      if (legFrame === 0) {
        ctx.fillRect(runnerX + 2, y - 10, 5, 10);
        ctx.fillRect(runnerX + 9, y - 10, 5, 8);
      } else {
        ctx.fillRect(runnerX + 2, y - 10, 5, 8);
        ctx.fillRect(runnerX + 9, y - 10, 5, 10);
      }
    }
  }

  function frame(): void {
    if (!running) return;

    if (state === "running") {
      animTick++;
      vy += 0.42;
      runnerY += vy;
      if (runnerY >= groundY) {
        runnerY = groundY;
        vy = 0;
        onGround = true;
      }

      spawnTimer--;
      if (spawnTimer <= 0) {
        const flying = distance > 260 && Math.random() < 0.35;
        if (flying) {
          obstacles.push({ x: canvas.width, w: 20, h: 12, flying: true });
        } else {
          const h = 16 + Math.random() * 16;
          obstacles.push({ x: canvas.width, w: 12 + Math.random() * 8, h, flying: false });
        }
        spawnTimer = Math.max(38, 95 - speed * 6 + Math.random() * 30);
      }
      for (const o of obstacles) o.x -= speed;
      obstacles = obstacles.filter((o) => o.x + o.w > 0);
      hillsFar.x -= speed * hillsFar.speedMul;
      hillsNear.x -= speed * hillsNear.speedMul;

      distance += speed;
      // gentle, capped ramp — old version hit max speed almost immediately
      speed = Math.min(6.5, 2.6 + distance / 1400);

      const score = Math.floor(distance / 8);
      if (score > 0 && score % 100 === 0 && score !== lastMilestone) {
        lastMilestone = score;
        compAudio.playClick();
      }

      const runnerBox = ducking
        ? { x: runnerX - 4, y: runnerY - 12, w: 26, h: 12 }
        : { x: runnerX - 3, y: runnerY - 32, w: 17, h: 32 };
      for (const o of obstacles) {
        const oBox = o.flying
          ? { x: o.x, y: groundY - 34, w: o.w, h: o.h }
          : { x: o.x, y: groundY - o.h, w: o.w, h: o.h };
        if (runnerBox.x < oBox.x + oBox.w && runnerBox.x + runnerBox.w > oBox.x && runnerBox.y < oBox.y + oBox.h && runnerBox.y + runnerBox.h > oBox.y) {
          state = "dead";
          best = Math.max(best, score);
          localStorage.setItem("zs_dino_best", String(best));
          compAudio.playError();
        }
      }
    }

    // sky
    ctx.fillStyle = "#e8dfc0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // two parallax hill bands, canyon-coloured
    drawHillBand(ctx, hillsFar.x, groundY - 30, canvas.width, "#c9b287", 90);
    drawHillBand(ctx, hillsNear.x, groundY - 14, canvas.width, "#b89968", 60);

    ctx.strokeStyle = "#7a6242";
    ctx.beginPath();
    ctx.moveTo(0, groundY + 4);
    ctx.lineTo(canvas.width, groundY + 4);
    ctx.stroke();
    // scattered ground grit tied to distance so it visibly streams past
    ctx.fillStyle = "#a68a5c";
    for (let i = 0; i < 10; i++) {
      const gx = (i * 61 - distance * 1.4) % canvas.width;
      ctx.fillRect(((gx + canvas.width) % canvas.width), groundY + 8, 3, 2);
    }

    drawRunner(runnerY, ducking && state === "running", animTick);

    for (const o of obstacles) {
      if (o.flying) {
        ctx.fillStyle = "#5a4a2c";
        const flap = Math.floor(animTick / 6) % 2 === 0 ? 4 : -4;
        ctx.fillRect(o.x, groundY - 34, o.w, 6);
        ctx.fillRect(o.x + 4, groundY - 34 - Math.abs(flap), 5, Math.abs(flap) + 4);
        ctx.fillRect(o.x + o.w - 9, groundY - 34 - Math.abs(flap), 5, Math.abs(flap) + 4);
      } else {
        ctx.fillStyle = "#6a5a3a";
        ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
        ctx.fillStyle = "#8a7550";
        ctx.fillRect(o.x + 1, groundY - o.h + 1, Math.max(1, o.w - 6), 3);
      }
    }

    ctx.fillStyle = "#5a4a2c";
    ctx.font = "12px monospace";
    ctx.fillText(`SCORE ${Math.floor(distance / 8)}`, canvas.width - 140, 20);
    ctx.fillText(`BEST ${best}`, canvas.width - 140, 36);

    if (state === "ready") {
      ctx.fillStyle = "rgba(30,24,14,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f0ece2";
      ctx.font = "16px monospace";
      ctx.fillText("CANYON RUNNER", canvas.width / 2 - 78, canvas.height / 2 - 6);
      ctx.font = "11px monospace";
      ctx.fillText("space or click to start", canvas.width / 2 - 66, canvas.height / 2 + 14);
    } else if (state === "dead") {
      ctx.fillStyle = "rgba(20,20,16,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f0ece2";
      ctx.font = "16px monospace";
      ctx.fillText("GAME OVER", canvas.width / 2 - 44, canvas.height / 2 - 6);
      ctx.font = "11px monospace";
      ctx.fillText("space or click to retry", canvas.width / 2 - 62, canvas.height / 2 + 14);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  dinoStop = () => {
    running = false;
    window.removeEventListener("keydown", keyHandler);
    window.removeEventListener("keyup", keyUpHandler);
  };
}

function drawHillBand(ctx: CanvasRenderingContext2D, offsetX: number, baseY: number, width: number, color: string, bumpW: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 40);
  const start = -bumpW * 2 + (offsetX % bumpW);
  for (let x = start; x < width + bumpW; x += bumpW) {
    ctx.quadraticCurveTo(x + bumpW / 2, baseY - 10, x + bumpW, baseY + 6);
  }
  ctx.lineTo(width, baseY + 40);
  ctx.closePath();
  ctx.fill();
}

// --------------------------------------------------------------- close ----

async function closeComputer(): Promise<void> {
  if (dinoStop) {
    dinoStop();
    dinoStop = null;
  }
  AudioManager.unduck();
  overlay.classList.remove("visible");
  await wait(350);
  overlay.classList.add("hidden");
  const resolve = resolveOpen;
  resolveOpen = null;
  resolve?.();
}

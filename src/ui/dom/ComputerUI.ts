import { EMAILS, NEWS_ARTICLE, REQUIRED_EMAIL_IDS, type ComputerEmail } from "@/data/dialogue/officeComputerContent";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

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

let overlay: HTMLDivElement;
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
}

function buildDesktopIcons(): void {
  const container = document.getElementById("computer-icons")!;
  const icons: IconDef[] = [
    { id: "mail", label: "Mail", glyph: "✉", onOpen: openMailApp },
    { id: "news", label: "Daily Wire", glyph: "🗞", onOpen: openNewsApp },
    { id: "dino", label: "Canyon Runner", glyph: "▶", onOpen: openDinoApp },
    { id: "docs", label: "My Documents", glyph: "🗀", onOpen: () => openInertApp("My Documents", "This folder is empty.") },
    { id: "photos", label: "Photos", glyph: "🖼", onOpen: () => openInertApp("Photos", "0 items.") },
    {
      id: "portal",
      label: "Company Portal",
      glyph: "⌂",
      onOpen: () => openInertApp("Company Portal", "Connection failed.\n\nThe server could not be reached. Check your network connection and try again."),
    },
    { id: "recycle", label: "Recycle Bin", glyph: "🗑", onOpen: () => openInertApp("Recycle Bin", "The Recycle Bin is empty.") },
  ];

  container.replaceChildren();
  for (const icon of icons) {
    const btn = document.createElement("button");
    btn.className = "computer-icon";
    btn.dataset.iconId = icon.id;
    btn.innerHTML = `<span class="computer-icon-glyph">${icon.glyph}</span><span class="computer-icon-label">${icon.label}</span>`;
    btn.addEventListener("click", () => {
      AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5 });
      icon.onOpen();
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

  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("visible"));

  bootScreen.classList.remove("hidden");
  loginScreen.classList.add("hidden");
  desktopScreen.classList.add("hidden");
  appWindow.classList.add("hidden");

  void runBootSequence();

  return new Promise((resolve) => {
    resolveOpen = resolve;
  });
}

async function runBootSequence(): Promise<void> {
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
      const img = document.createElement("div");
      img.className = "computer-mail-photo-img";
      img.style.background = email.photo.gradient;
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
        AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.4 });
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
  const body = openAppWindow("Daily Wire — dailywire.local");
  body.classList.add("computer-news");

  const article = document.createElement("div");
  article.className = "computer-news-article";
  const kicker = document.createElement("div");
  kicker.className = "computer-news-kicker";
  kicker.textContent = NEWS_ARTICLE.kicker;
  const headline = document.createElement("div");
  headline.className = "computer-news-headline";
  headline.textContent = NEWS_ARTICLE.headline;
  const byline = document.createElement("div");
  byline.className = "computer-news-byline";
  byline.textContent = `${NEWS_ARTICLE.byline} — ${NEWS_ARTICLE.date}`;
  article.appendChild(kicker);
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

  body.appendChild(article);
  body.appendChild(sidebar);

  if (!newsCompleted) {
    newsCompleted = true;
    callbacks?.onNewsRead();
  }
}

// ---------------------------------------------------------------- dino ----

function openDinoApp(): void {
  const body = openAppWindow("Canyon Runner");
  body.classList.add("computer-dino");

  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 160;
  canvas.className = "computer-dino-canvas";
  const hint = document.createElement("div");
  hint.className = "computer-dino-hint";
  hint.textContent = "SPACE or click to jump";
  body.appendChild(canvas);
  body.appendChild(hint);

  const ctx = canvas.getContext("2d")!;
  const groundY = 128;
  let dinoY = groundY;
  let vy = 0;
  let onGround = true;
  let obstacles: { x: number; w: number; h: number }[] = [];
  let speed = 4.2;
  let distance = 0;
  let best = Number(localStorage.getItem("zs_dino_best") ?? "0");
  let alive = true;
  let spawnTimer = 60;
  let running = true;

  const jump = () => {
    if (!alive) {
      reset();
      return;
    }
    if (onGround) {
      vy = -8.5;
      onGround = false;
    }
  };

  function reset(): void {
    dinoY = groundY;
    vy = 0;
    onGround = true;
    obstacles = [];
    speed = 4.2;
    distance = 0;
    alive = true;
    spawnTimer = 60;
  }

  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      jump();
    }
  };
  window.addEventListener("keydown", keyHandler);
  canvas.addEventListener("click", jump);

  function frame(): void {
    if (!running) return;

    if (alive) {
      vy += 0.5;
      dinoY += vy;
      if (dinoY >= groundY) {
        dinoY = groundY;
        vy = 0;
        onGround = true;
      }

      spawnTimer--;
      if (spawnTimer <= 0) {
        const h = 14 + Math.random() * 14;
        obstacles.push({ x: canvas.width, w: 10 + Math.random() * 8, h });
        spawnTimer = 55 + Math.random() * 45 - speed * 4;
      }
      for (const o of obstacles) o.x -= speed;
      obstacles = obstacles.filter((o) => o.x + o.w > 0);

      distance += speed;
      speed = Math.min(9, 4.2 + distance / 900);

      const dinoBox = { x: 40, y: dinoY - 22, w: 18, h: 22 };
      for (const o of obstacles) {
        const oBox = { x: o.x, y: groundY - o.h + 6, w: o.w, h: o.h };
        if (dinoBox.x < oBox.x + oBox.w && dinoBox.x + dinoBox.w > oBox.x && dinoBox.y < oBox.y + oBox.h && dinoBox.y + dinoBox.h > oBox.y) {
          alive = false;
          best = Math.max(best, Math.floor(distance / 10));
          localStorage.setItem("zs_dino_best", String(best));
        }
      }
    }

    ctx.fillStyle = "#d7e0c8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#3a4530";
    ctx.beginPath();
    ctx.moveTo(0, groundY + 6);
    ctx.lineTo(canvas.width, groundY + 6);
    ctx.stroke();

    ctx.fillStyle = "#2c3624";
    ctx.fillRect(40, dinoY - 22, 18, 22);

    ctx.fillStyle = "#4a5c38";
    for (const o of obstacles) ctx.fillRect(o.x, groundY - o.h + 6, o.w, o.h);

    ctx.fillStyle = "#3a4530";
    ctx.font = "12px monospace";
    ctx.fillText(`SCORE ${Math.floor(distance / 10)}`, canvas.width - 140, 20);
    ctx.fillText(`BEST ${best}`, canvas.width - 140, 36);

    if (!alive) {
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
  };
}

// --------------------------------------------------------------- close ----

async function closeComputer(): Promise<void> {
  if (dinoStop) {
    dinoStop();
    dinoStop = null;
  }
  overlay.classList.remove("visible");
  await wait(350);
  overlay.classList.add("hidden");
  const resolve = resolveOpen;
  resolveOpen = null;
  resolve?.();
}

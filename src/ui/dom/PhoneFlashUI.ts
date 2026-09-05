import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import type { PhoneMessage } from "@/data/dialogue/blackoutLines";

const MESSAGE_INTERVAL_MS = 340;
const READ_HOLD_MS = 1300;
const NO_SERVICE_HOLD_MS = 750;
const FADE_MS = 500;

let layer: HTMLDivElement | null = null;

function build(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = "phone-flash-layer";
  el.className = "hidden";
  el.innerHTML = `
    <div class="phone-flash-panel">
      <div class="phone-flash-topbar">
        <span class="phone-flash-carrier">EE</span>
        <span class="phone-flash-signal">
          <span class="phone-flash-bar"></span><span class="phone-flash-bar"></span>
          <span class="phone-flash-bar"></span><span class="phone-flash-bar"></span>
        </span>
      </div>
      <div class="phone-flash-messages"></div>
      <div class="phone-flash-status hidden">NO SERVICE</div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * One bar of signal just long enough for a backlog of messages to slam in
 * at once, then gone again — Jack's "the telly won't come on but for two
 * seconds his phone loses its mind" beat. Fully self-contained (own timers,
 * own fade) so BlackoutScene just awaits the whole thing.
 */
export async function playPhoneFlash(messages: PhoneMessage[]): Promise<void> {
  if (!layer) layer = build();
  const panel = layer.querySelector<HTMLDivElement>(".phone-flash-panel")!;
  const bars = layer.querySelectorAll<HTMLSpanElement>(".phone-flash-bar");
  const list = layer.querySelector<HTMLDivElement>(".phone-flash-messages")!;
  const status = layer.querySelector<HTMLDivElement>(".phone-flash-status")!;

  list.innerHTML = "";
  status.classList.add("hidden");
  bars.forEach((bar, i) => bar.classList.toggle("lit", i === 0));
  panel.classList.remove("fade-out");
  panel.classList.add("buzzing");
  layer.classList.remove("hidden");

  for (const msg of messages) {
    const row = document.createElement("div");
    row.className = "phone-flash-message entering";
    row.innerHTML = `<span class="phone-flash-sender">${msg.sender}</span><span class="phone-flash-text">${msg.text}</span>`;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    AudioManager.playSfx(SfxKey.UI_HOVER, { volume: 0.4, rate: 1.5 + Math.random() * 0.3 });
    requestAnimationFrame(() => row.classList.remove("entering"));
    await wait(MESSAGE_INTERVAL_MS);
  }

  await wait(READ_HOLD_MS);

  panel.classList.remove("buzzing");
  bars.forEach((bar) => bar.classList.remove("lit"));
  status.classList.remove("hidden");
  await wait(NO_SERVICE_HOLD_MS);

  panel.classList.add("fade-out");
  await wait(FADE_MS);
  layer.classList.add("hidden");
}

import { EventBus, Events } from "@/core/EventBus";
import { SaveManager } from "@/core/managers/SaveManager";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { setHudVisible } from "@/ui/dom/HUDUI";

function makeButton(label: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "menu-button";
  btn.textContent = label;
  btn.disabled = disabled;
  btn.addEventListener("mouseenter", () => {
    if (!disabled) AudioManager.playSfx(SfxKey.UI_HOVER, { volume: 0.4 });
  });
  btn.addEventListener("click", () => {
    if (disabled) return;
    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5 });
    onClick();
  });
  return btn;
}

function makeChoiceRow<T extends string>(
  label: string,
  options: Array<{ value: T; label: string }>,
  current: T,
  onChange: (v: T) => void,
): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "settings-choice-row";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;

  const group = document.createElement("div");
  group.className = "settings-choice-options";

  const buttons = options.map((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "settings-choice-btn";
    btn.textContent = opt.label;
    btn.classList.toggle("active", opt.value === current);
    btn.addEventListener("click", () => {
      if (opt.value === current) return;
      AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.4 });
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(opt.value);
    });
    group.appendChild(btn);
    return btn;
  });

  row.append(labelEl, group);
  return row;
}

function makeSlider(label: string, value: number, onChange: (v: number) => void): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "settings-slider-row";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "100";
  input.value = String(Math.round(value * 100));

  const valueEl = document.createElement("span");
  valueEl.className = "slider-value";
  valueEl.textContent = `${Math.round(value * 100)}%`;

  input.addEventListener("input", () => {
    const v = Number(input.value) / 100;
    valueEl.textContent = `${Math.round(v * 100)}%`;
    onChange(v);
  });

  row.append(labelEl, input, valueEl);
  return row;
}

function attemptQuit(panel: HTMLElement): void {
  window.close();
  window.setTimeout(() => {
    if (panel.querySelector(".quit-note")) return;
    const note = document.createElement("div");
    note.className = "quit-note";
    note.textContent = "This is just a browser tab — close it whenever you're ready.";
    panel.appendChild(note);
  }, 150);
}

export function showMainMenu(): void {
  setHudVisible(false);
  const layer = document.getElementById("menu-layer")!;
  layer.classList.remove("hidden");
  layer.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "menu-panel";

  const title = document.createElement("h1");
  title.className = "game-title";
  title.textContent = "ZOMBIE STORY";
  const subtitle = document.createElement("div");
  subtitle.className = "game-subtitle";
  subtitle.textContent = "everything is probably fine";
  panel.append(title, subtitle);

  const nav = document.createElement("div");
  nav.className = "menu-nav";
  const canContinue = SaveManager.hasProgress();
  nav.appendChild(makeButton("New Game", () => EventBus.emit(Events.MENU_NEW_GAME)));
  nav.appendChild(makeButton("Continue", () => EventBus.emit(Events.MENU_CONTINUE), !canContinue));
  nav.appendChild(makeButton("Settings", () => EventBus.emit(Events.MENU_OPEN_SETTINGS)));
  nav.appendChild(makeButton("Quit", () => attemptQuit(panel)));
  panel.appendChild(nav);

  layer.appendChild(panel);
}

export function showSettingsMenu(onBack: () => void): void {
  setHudVisible(false);
  const layer = document.getElementById("menu-layer")!;
  layer.classList.remove("hidden");
  layer.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "menu-panel";

  const title = document.createElement("h1");
  title.className = "game-title small";
  title.textContent = "SETTINGS";
  panel.appendChild(title);

  const settings = SaveManager.loadSettings();

  const onVolumeChange = (patch: Partial<Parameters<typeof SaveManager.updateSettings>[0]>) => {
    SaveManager.updateSettings(patch);
    EventBus.emit(Events.SETTINGS_CHANGED);
  };

  panel.appendChild(makeSlider("Master Volume", settings.masterVolume, (v) => onVolumeChange({ masterVolume: v })));
  panel.appendChild(makeSlider("Music Volume", settings.musicVolume, (v) => onVolumeChange({ musicVolume: v })));
  panel.appendChild(makeSlider("SFX Volume", settings.sfxVolume, (v) => onVolumeChange({ sfxVolume: v })));

  panel.appendChild(
    makeChoiceRow(
      "Sound",
      [
        { value: "generated" as const, label: "Generated" },
        { value: "pack" as const, label: "Sound Pack" },
      ],
      settings.soundSource,
      (v) => {
        SaveManager.updateSettings({ soundSource: v });
        EventBus.emit(Events.SETTINGS_CHANGED);
      },
    ),
  );
  const soundHint = document.createElement("div");
  soundHint.className = "settings-hint";
  soundHint.textContent = "Generated: synthesized in-browser. Sound Pack: real recordings (CC0/CC-BY).";
  panel.appendChild(soundHint);

  const fsRow = document.createElement("label");
  fsRow.className = "settings-checkbox-row";
  const fsCheckbox = document.createElement("input");
  fsCheckbox.type = "checkbox";
  fsCheckbox.checked = settings.fullscreen;
  fsCheckbox.addEventListener("change", () => {
    SaveManager.updateSettings({ fullscreen: fsCheckbox.checked });
    if (fsCheckbox.checked) {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => undefined);
    }
  });
  fsRow.append(fsCheckbox, document.createTextNode(" Fullscreen"));
  panel.appendChild(fsRow);

  const nav = document.createElement("div");
  nav.className = "menu-nav";
  nav.appendChild(
    makeButton("Back", () => {
      EventBus.emit(Events.MENU_CLOSE_SETTINGS);
      onBack();
    }),
  );
  panel.appendChild(nav);

  layer.appendChild(panel);
}

export function hideMenu(): void {
  const layer = document.getElementById("menu-layer")!;
  layer.classList.add("hidden");
  layer.innerHTML = "";
}

export function showLoading(): void {
  setHudVisible(false);
  const layer = document.getElementById("menu-layer")!;
  layer.classList.remove("hidden");
  layer.innerHTML = `<div class="menu-panel"><div class="game-subtitle">Loading...</div></div>`;
}

export function showEndSlate(title: string, subtitle: string): void {
  setHudVisible(false);
  const layer = document.getElementById("menu-layer")!;
  layer.classList.remove("hidden");
  layer.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "menu-panel";
  const titleEl = document.createElement("h1");
  titleEl.className = "game-title small";
  titleEl.textContent = title;
  const subtitleEl = document.createElement("div");
  subtitleEl.className = "game-subtitle";
  subtitleEl.textContent = subtitle;
  panel.append(titleEl, subtitleEl);
  layer.appendChild(panel);
}

export interface PathChoiceOption {
  id: string;
  label: string;
  hint?: string;
}

let overlay: HTMLDivElement;
let titleEl: HTMLDivElement;
let optionsEl: HTMLDivElement;
let resolveFn: ((id: string) => void) | null = null;

/**
 * A minimal one-off "pick one of these" prompt — not a general dialogue
 * branching system (DialoguePlayer has none), just enough to fork the
 * story at the one point it actually needs to. Resolves once the player
 * clicks an option.
 */
export function initPathChoiceUI(): void {
  const root = document.getElementById("ui-root")!;

  overlay = document.createElement("div");
  overlay.id = "path-choice-overlay";
  overlay.className = "path-choice-overlay hidden";

  const panel = document.createElement("div");
  panel.className = "path-choice-panel";

  titleEl = document.createElement("div");
  titleEl.className = "path-choice-title";

  optionsEl = document.createElement("div");
  optionsEl.className = "path-choice-options";

  panel.appendChild(titleEl);
  panel.appendChild(optionsEl);
  overlay.appendChild(panel);
  root.appendChild(overlay);
}

export function showPathChoice(title: string, options: PathChoiceOption[]): Promise<string> {
  return new Promise((resolve) => {
    resolveFn = resolve;
    titleEl.textContent = title;
    optionsEl.replaceChildren();

    for (const opt of options) {
      const btn = document.createElement("button");
      btn.className = "menu-button path-choice-btn";
      btn.type = "button";

      const label = document.createElement("div");
      label.textContent = opt.label;
      btn.appendChild(label);

      if (opt.hint) {
        const hint = document.createElement("div");
        hint.className = "path-choice-hint";
        hint.textContent = opt.hint;
        btn.appendChild(hint);
      }

      btn.addEventListener("click", () => {
        overlay.classList.add("hidden");
        const resolve = resolveFn;
        resolveFn = null;
        resolve?.(opt.id);
      });
      optionsEl.appendChild(btn);
    }

    overlay.classList.remove("hidden");
  });
}

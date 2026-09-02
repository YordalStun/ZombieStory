import type { EditorScene, MarkerKind } from "@/editor/EditorScene";
import type { PropSpec } from "@/editor/types";

type Selection = { kind: "prop"; index: number } | { kind: "marker"; which: MarkerKind } | null;

/**
 * Which panel's own input just pushed a change to the scene, if any.
 * "level-changed" fires for every edit, including ones a panel made to
 * itself — rebuilding that same panel's DOM in response would yank focus
 * out from under whatever the user is about to interact with next (e.g.
 * Tab from one field to another destroys the very field being tabbed
 * into). Checking document.activeElement instead of tracking this
 * explicitly is timing-dependent on exactly when focus moves during a
 * blur/focus pair and isn't reliable enough to build on.
 */
let activeEditingPanel: HTMLElement | null = null;

function withPanelEdit(panel: HTMLElement, fn: () => void): void {
  activeEditingPanel = panel;
  try {
    fn();
  } finally {
    activeEditingPanel = null;
  }
}

function field(labelText: string): { wrap: HTMLDivElement; input: HTMLInputElement } {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  wrap.appendChild(label);
  wrap.appendChild(input);
  return { wrap, input };
}

function checkboxField(labelText: string): { wrap: HTMLDivElement; input: HTMLInputElement } {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "6px";
  const input = document.createElement("input");
  input.type = "checkbox";
  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.margin = "0";
  wrap.appendChild(input);
  wrap.appendChild(label);
  return { wrap, input };
}

function buildInspectorTab(container: HTMLElement, scene: EditorScene): void {
  container.innerHTML = "";

  const sel: Selection = scene.selectedPropIndex !== null
    ? { kind: "prop", index: scene.selectedPropIndex }
    : scene.selectedMarker
      ? { kind: "marker", which: scene.selectedMarker }
      : null;

  if (!sel) {
    const empty = document.createElement("div");
    empty.className = "inspector-empty";
    empty.textContent = "Nothing selected.\nClick a prop or marker on the canvas, or pick a swatch from the palette to place something new.";
    empty.style.whiteSpace = "pre-line";
    container.appendChild(empty);
    return;
  }

  if (sel.kind === "marker") {
    const pt = scene.getLevel()[sel.which];
    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = sel.which;
    container.appendChild(title);
    if (pt) {
      const row = document.createElement("div");
      row.className = "field-row";
      const fx = field("X");
      fx.input.type = "number";
      fx.input.value = String(Math.round(pt.x));
      fx.input.onchange = () => scene.loadLevel({ ...scene.getLevel(), [sel.which]: { x: Number(fx.input.value), y: pt.y } });
      const fy = field("Y");
      fy.input.type = "number";
      fy.input.value = String(Math.round(pt.y));
      fy.input.onchange = () => scene.loadLevel({ ...scene.getLevel(), [sel.which]: { x: pt.x, y: Number(fy.input.value) } });
      row.appendChild(fx.wrap);
      row.appendChild(fy.wrap);
      container.appendChild(row);
    }
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear marker";
    clearBtn.onclick = () => scene.clearMarker(sel.which);
    container.appendChild(clearBtn);
    return;
  }

  const spec: PropSpec = scene.getLevel().props[sel.index];
  if (!spec) return;

  const update = (patch: Partial<PropSpec>) => withPanelEdit(container, () => scene.updateSelectedProp(patch));

  const idF = field("ID");
  idF.input.type = "text";
  idF.input.value = spec.id;
  idF.input.onchange = () => update({ id: idF.input.value });
  container.appendChild(idF.wrap);

  const texRow = document.createElement("div");
  texRow.className = "field";
  const texLabel = document.createElement("label");
  texLabel.textContent = "Texture";
  const texVal = document.createElement("div");
  texVal.textContent = spec.tex;
  texVal.style.color = "var(--text-dim)";
  texRow.appendChild(texLabel);
  texRow.appendChild(texVal);
  container.appendChild(texRow);

  const posRow = document.createElement("div");
  posRow.className = "field-row";
  const xF = field("X");
  xF.input.type = "number";
  xF.input.value = String(Math.round(spec.x));
  xF.input.onchange = () => update({ x: Number(xF.input.value) });
  const yF = field("Y");
  yF.input.type = "number";
  yF.input.value = String(Math.round(spec.y));
  yF.input.onchange = () => update({ y: Number(yF.input.value) });
  posRow.appendChild(xF.wrap);
  posRow.appendChild(yF.wrap);
  container.appendChild(posRow);

  const flagsRow = document.createElement("div");
  flagsRow.className = "field-row";
  (
    [
      ["solid", "Solid"],
      ["flipX", "Flip X"],
      ["flipY", "Flip Y"],
    ] as const
  ).forEach(([key, label]) => {
    const cb = checkboxField(label);
    cb.input.checked = !!spec[key];
    cb.input.onchange = () => update({ [key]: cb.input.checked } as Partial<PropSpec>);
    flagsRow.appendChild(cb.wrap);
  });
  container.appendChild(flagsRow);

  const flagsRow2 = document.createElement("div");
  flagsRow2.className = "field-row";
  (
    [
      ["fullBody", "Full body"],
      ["floorDecal", "Floor decal"],
      ["sway", "Sway"],
    ] as const
  ).forEach(([key, label]) => {
    const cb = checkboxField(label);
    cb.input.checked = !!spec[key];
    cb.input.onchange = () => update({ [key]: cb.input.checked } as Partial<PropSpec>);
    flagsRow2.appendChild(cb.wrap);
  });
  container.appendChild(flagsRow2);

  // ---- tint ----
  const tintTitle = document.createElement("div");
  tintTitle.className = "section-title";
  tintTitle.textContent = "Tint";
  container.appendChild(tintTitle);
  const tintCb = checkboxField("Recolor this sprite");
  tintCb.input.checked = typeof spec.tint === "number";
  const tintInput = document.createElement("input");
  tintInput.type = "color";
  tintInput.value = typeof spec.tint === "number" ? `#${spec.tint.toString(16).padStart(6, "0")}` : "#ffffff";
  tintInput.style.display = tintCb.input.checked ? "block" : "none";
  tintCb.input.onchange = () => {
    tintInput.style.display = tintCb.input.checked ? "block" : "none";
    update({ tint: tintCb.input.checked ? parseInt(tintInput.value.slice(1), 16) : undefined });
  };
  tintInput.oninput = () => update({ tint: parseInt(tintInput.value.slice(1), 16) });
  container.appendChild(tintCb.wrap);
  container.appendChild(tintInput);

  // ---- interactable ----
  const intTitle = document.createElement("div");
  intTitle.className = "section-title";
  intTitle.textContent = "Interactable";
  container.appendChild(intTitle);
  const intCb = checkboxField("Player can interact with this");
  intCb.input.checked = !!spec.interactable;
  container.appendChild(intCb.wrap);
  const intFields = document.createElement("div");
  const promptF = field("Prompt text");
  promptF.input.type = "text";
  promptF.input.value = spec.interactable?.prompt ?? "Press F";
  const rangeF = field("Range");
  rangeF.input.type = "number";
  rangeF.input.value = String(spec.interactable?.range ?? 24);
  intFields.appendChild(promptF.wrap);
  intFields.appendChild(rangeF.wrap);
  intFields.style.display = intCb.input.checked ? "block" : "none";
  const syncInteractable = () => update({ interactable: { prompt: promptF.input.value, range: Number(rangeF.input.value) } });
  promptF.input.onchange = syncInteractable;
  rangeF.input.onchange = syncInteractable;
  intCb.input.onchange = () => {
    intFields.style.display = intCb.input.checked ? "block" : "none";
    update({ interactable: intCb.input.checked ? { prompt: promptF.input.value, range: Number(rangeF.input.value) } : undefined });
  };
  container.appendChild(intFields);

  // ---- light ----
  const lightTitle = document.createElement("div");
  lightTitle.className = "section-title";
  lightTitle.textContent = "Light";
  container.appendChild(lightTitle);
  const lightCb = checkboxField("This prop casts light");
  lightCb.input.checked = !!spec.light;
  container.appendChild(lightCb.wrap);
  const lightFields = document.createElement("div");
  const radiusF = field("Radius");
  radiusF.input.type = "number";
  radiusF.input.value = String(spec.light?.radius ?? 40);
  const colorF = document.createElement("input");
  colorF.type = "color";
  colorF.value = spec.light ? `#${spec.light.color.toString(16).padStart(6, "0")}` : "#ffcc66";
  const colorWrap = document.createElement("div");
  colorWrap.className = "field";
  const colorLabel = document.createElement("label");
  colorLabel.textContent = "Color";
  colorWrap.appendChild(colorLabel);
  colorWrap.appendChild(colorF);
  const intensityF = field("Intensity (0-1)");
  intensityF.input.type = "number";
  intensityF.input.step = "0.05";
  intensityF.input.value = String(spec.light?.intensity ?? 0.7);
  const flickerCb = checkboxField("Flicker");
  flickerCb.input.checked = !!spec.light?.flicker;
  lightFields.appendChild(radiusF.wrap);
  lightFields.appendChild(colorWrap);
  lightFields.appendChild(intensityF.wrap);
  lightFields.appendChild(flickerCb.wrap);
  lightFields.style.display = lightCb.input.checked ? "block" : "none";
  const syncLight = () =>
    update({
      light: {
        radius: Number(radiusF.input.value),
        color: parseInt(colorF.value.slice(1), 16),
        intensity: Number(intensityF.input.value),
        flicker: flickerCb.input.checked ? { intensityJitter: 0.25, radiusJitter: 0.1 } : undefined,
      },
    });
  radiusF.input.onchange = syncLight;
  colorF.oninput = syncLight;
  intensityF.input.onchange = syncLight;
  flickerCb.input.onchange = syncLight;
  lightCb.input.onchange = () => {
    lightFields.style.display = lightCb.input.checked ? "block" : "none";
    if (lightCb.input.checked) syncLight();
    else update({ light: undefined });
  };
  container.appendChild(lightFields);

  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.style.marginTop = "12px";
  delBtn.style.borderColor = "var(--danger)";
  delBtn.style.color = "var(--danger)";
  delBtn.onclick = () => scene.deleteSelected();
  container.appendChild(delBtn);
}

function buildObjectivesTab(container: HTMLElement, scene: EditorScene): void {
  container.innerHTML = "";
  const level = scene.getLevel();

  const titleF = field("Checklist title");
  titleF.input.type = "text";
  titleF.input.value = level.objectives.title;
  container.appendChild(titleF.wrap);

  const listWrap = document.createElement("div");
  container.appendChild(listWrap);

  function commit(): void {
    const rows = Array.from(listWrap.querySelectorAll<HTMLDivElement>(".objective-row"));
    const steps = rows.map((row) => ({
      id: row.querySelector<HTMLInputElement>(".obj-id")!.value,
      label: row.querySelector<HTMLInputElement>(".obj-label")!.value,
    }));
    withPanelEdit(container, () => scene.setObjectives(titleF.input.value, steps));
  }
  titleF.input.onchange = commit;

  function renderRows(): void {
    listWrap.innerHTML = "";
    scene.getLevel().objectives.steps.forEach((step, i) => {
      const row = document.createElement("div");
      row.className = "objective-row";
      const idInput = document.createElement("input");
      idInput.className = "obj-id";
      idInput.type = "text";
      idInput.placeholder = "id";
      idInput.value = step.id;
      idInput.style.flex = "0 0 70px";
      idInput.onchange = commit;
      const labelInput = document.createElement("input");
      labelInput.className = "obj-label";
      labelInput.type = "text";
      labelInput.placeholder = "label";
      labelInput.value = step.label;
      labelInput.onchange = commit;
      const rm = document.createElement("button");
      rm.textContent = "✕";
      rm.onclick = () => {
        const steps = scene.getLevel().objectives.steps.filter((_, j) => j !== i);
        withPanelEdit(container, () => scene.setObjectives(scene.getLevel().objectives.title, steps));
        renderRows();
      };
      row.appendChild(idInput);
      row.appendChild(labelInput);
      row.appendChild(rm);
      listWrap.appendChild(row);
    });
  }
  renderRows();

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add objective";
  addBtn.style.marginTop = "6px";
  addBtn.onclick = () => {
    const steps = [...scene.getLevel().objectives.steps, { id: `step_${scene.getLevel().objectives.steps.length}`, label: "" }];
    withPanelEdit(container, () => scene.setObjectives(scene.getLevel().objectives.title, steps));
    renderRows();
  };
  container.appendChild(addBtn);
}

function buildLevelTab(container: HTMLElement, scene: EditorScene): void {
  container.innerHTML = "";
  const level = scene.getLevel();

  const nameF = field("Level name");
  nameF.input.type = "text";
  nameF.input.value = level.meta.name;
  nameF.input.onchange = () => withPanelEdit(container, () => scene.setMeta(nameF.input.value, notesF.value));
  container.appendChild(nameF.wrap);

  const notesWrap = document.createElement("div");
  notesWrap.className = "field";
  const notesLabel = document.createElement("label");
  notesLabel.textContent = "Notes";
  const notesF = document.createElement("textarea");
  notesF.rows = 3;
  notesF.value = level.meta.notes;
  notesF.onchange = () => withPanelEdit(container, () => scene.setMeta(nameF.input.value, notesF.value));
  notesWrap.appendChild(notesLabel);
  notesWrap.appendChild(notesF);
  container.appendChild(notesWrap);

  const sizeTitle = document.createElement("div");
  sizeTitle.className = "section-title";
  sizeTitle.textContent = "Grid size (tiles)";
  container.appendChild(sizeTitle);
  const sizeRow = document.createElement("div");
  sizeRow.className = "field-row";
  const wF = field("Width");
  wF.input.type = "number";
  wF.input.value = String(level.width);
  const hF = field("Height");
  hF.input.type = "number";
  hF.input.value = String(level.height);
  sizeRow.appendChild(wF.wrap);
  sizeRow.appendChild(hF.wrap);
  container.appendChild(sizeRow);
  const resizeBtn = document.createElement("button");
  resizeBtn.textContent = "Resize grid";
  resizeBtn.onclick = () =>
    withPanelEdit(container, () => scene.resizeLevel(Math.max(1, Number(wF.input.value)), Math.max(1, Number(hF.input.value))));
  container.appendChild(resizeBtn);

  const ambientTitle = document.createElement("div");
  ambientTitle.className = "section-title";
  ambientTitle.textContent = "Ambient light level (0-1)";
  container.appendChild(ambientTitle);
  const ambientF = field("");
  ambientF.input.type = "number";
  ambientF.input.min = "0";
  ambientF.input.max = "1";
  ambientF.input.step = "0.05";
  ambientF.input.value = String(level.ambientLevel);
  ambientF.input.onchange = () => withPanelEdit(container, () => scene.setAmbientLevel(Number(ambientF.input.value)));
  container.appendChild(ambientF.wrap);

  const markerTitle = document.createElement("div");
  markerTitle.className = "section-title";
  markerTitle.textContent = "Markers";
  container.appendChild(markerTitle);

  (
    [
      ["playerStart", "Player start"],
      ["endPoint", "End point"],
      ["zombieSpawn", "Zombie spawn"],
    ] as const
  ).forEach(([kind, label]) => {
    const row = document.createElement("div");
    row.className = "field-row";
    row.style.alignItems = "center";
    row.style.marginBottom = "4px";
    const btn = document.createElement("button");
    const pt = level[kind];
    btn.textContent = pt ? `${label}: (${Math.round(pt.x)}, ${Math.round(pt.y)})` : `Place ${label}`;
    btn.style.flex = "1";
    btn.onclick = () => scene.setTool({ type: "marker", which: kind });
    row.appendChild(btn);
    container.appendChild(row);
  });
}

export function buildInspector(container: HTMLElement, scene: EditorScene): void {
  const tabBar = document.createElement("div");
  tabBar.className = "tab-bar";
  const inspectorPanel = document.createElement("div");
  inspectorPanel.className = "tab-panel active";
  const objectivesPanel = document.createElement("div");
  objectivesPanel.className = "tab-panel";
  const levelPanel = document.createElement("div");
  levelPanel.className = "tab-panel";

  const tabs: Array<[string, HTMLElement]> = [
    ["Inspector", inspectorPanel],
    ["Objectives", objectivesPanel],
    ["Level", levelPanel],
  ];
  const buttons: HTMLButtonElement[] = [];
  tabs.forEach(([label, panel], i) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (i === 0) btn.classList.add("active");
    btn.onclick = () => {
      tabs.forEach(([, p]) => p.classList.remove("active"));
      buttons.forEach((b) => b.classList.remove("active"));
      panel.classList.add("active");
      btn.classList.add("active");
    };
    buttons.push(btn);
    tabBar.appendChild(btn);
  });

  container.appendChild(tabBar);
  container.appendChild(inspectorPanel);
  container.appendChild(objectivesPanel);
  container.appendChild(levelPanel);

  const refreshInspector = () => buildInspectorTab(inspectorPanel, scene);
  const refreshObjectives = () => buildObjectivesTab(objectivesPanel, scene);
  const refreshLevel = () => buildLevelTab(levelPanel, scene);

  refreshInspector();
  refreshObjectives();
  refreshLevel();

  scene.events.on("selection-changed", refreshInspector);
  scene.events.on("level-changed", () => {
    if (activeEditingPanel !== levelPanel) refreshLevel();
    if (activeEditingPanel !== objectivesPanel) refreshObjectives();
    if (activeEditingPanel !== inspectorPanel) refreshInspector();
  });
}

import type { EditorLevelData } from "@/editor/types";

/** Triggers a normal browser file download — this is a real served page, not a sandboxed artifact preview, so a Blob URL + <a download> works fine. */
export function downloadLevel(data: EditorLevelData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (data.meta.name || "level").trim().replace(/[^a-z0-9_-]+/gi, "_") || "level";
  a.href = url;
  a.download = `${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isFinitePoint(v: unknown): v is { x: number; y: number } {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { x?: unknown }).x === "number" &&
    typeof (v as { y?: unknown }).y === "number"
  );
}

/** Best-effort validation — accepts anything roughly level-shaped rather than requiring an exact match, since a hand-edited or Claude-authored file is a first-class input path here. */
export function parseLevelJson(raw: string): EditorLevelData {
  const obj = JSON.parse(raw) as Partial<EditorLevelData> & Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Not a JSON object");
  if (!Array.isArray(obj.tiles)) throw new Error("Missing tiles[][] array");
  if (!Array.isArray(obj.props)) throw new Error("Missing props[] array");

  const height = typeof obj.height === "number" ? obj.height : obj.tiles.length;
  const width = typeof obj.width === "number" ? obj.width : (obj.tiles[0]?.length ?? 0);

  return {
    formatVersion: 1,
    meta: {
      name: typeof obj.meta?.name === "string" ? obj.meta.name : "imported-level",
      notes: typeof obj.meta?.notes === "string" ? obj.meta.notes : "",
    },
    width,
    height,
    tiles: obj.tiles as number[][],
    props: obj.props,
    playerStart: isFinitePoint(obj.playerStart) ? obj.playerStart : null,
    endPoint: isFinitePoint(obj.endPoint) ? obj.endPoint : null,
    zombieSpawn: isFinitePoint(obj.zombieSpawn) ? obj.zombieSpawn : null,
    ambientLevel: typeof obj.ambientLevel === "number" ? obj.ambientLevel : 1,
    objectives: {
      title: typeof obj.objectives?.title === "string" ? obj.objectives.title : "",
      steps: Array.isArray(obj.objectives?.steps) ? obj.objectives!.steps : [],
    },
  };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

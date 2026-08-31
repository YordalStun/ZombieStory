/**
 * Small builder for hand-authored tile levels — no external map editor
 * (e.g. Tiled) is available in this environment, so levels are built in
 * code as rectangles + doorway cuts instead of painted. The result feeds
 * straight into Phaser's blank-tilemap API (`scene.make.tilemap({ data })`).
 * Reusable for every future room, not just this one.
 */
export class TileGrid {
  readonly width: number;
  readonly height: number;
  private data: number[][];

  constructor(width: number, height: number, fill = -1) {
    this.width = width;
    this.height = height;
    this.data = Array.from({ length: height }, () => new Array<number>(width).fill(fill));
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  set(x: number, y: number, tile: number): void {
    if (this.inBounds(x, y)) this.data[y][x] = tile;
  }

  get(x: number, y: number): number {
    return this.inBounds(x, y) ? this.data[y][x] : -1;
  }

  fillRect(x: number, y: number, w: number, h: number, tile: number): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, tile);
    }
  }

  /** Hollow rectangular room: wall border + floor interior. */
  room(x: number, y: number, w: number, h: number, wallTile: number, floorTile: number): void {
    this.fillRect(x, y, w, h, wallTile);
    this.fillRect(x + 1, y + 1, w - 2, h - 2, floorTile);
  }

  /** Cuts a doorway through a vertical wall (a shared wall between two rooms side by side). */
  doorwayV(col: number, rowStart: number, rowEnd: number, floorTile: number): void {
    for (let y = rowStart; y <= rowEnd; y++) this.set(col, y, floorTile);
  }

  /** Cuts a doorway through a horizontal wall (rooms stacked vertically). */
  doorwayH(row: number, colStart: number, colEnd: number, floorTile: number): void {
    for (let x = colStart; x <= colEnd; x++) this.set(x, row, floorTile);
  }

  toArray(): number[][] {
    return this.data;
  }
}

type PatternType = "solid" | "stipple" | "hachures" | "cross" | "grid" | "dots";
/** Tile edge length in px. MapLibre does not require power-of-two fill-pattern images. Larger tiles read as a lower-density pattern. */
type TileSize = number;
type HachureAngle = 0 | 45 | 90 | -45;
/** Raw RGBA pixel buffer ready for `map.addImage` / `map.updateImage`. */
interface TileImage {
    width: number;
    height: number;
    data: Uint8Array;
}
/**
 * The subset of the Canvas 2D API `makeTile` needs. A real
 * `CanvasRenderingContext2D` satisfies this directly in the browser; in Node
 * (or anywhere `document` is unavailable) {@link createMiniContext} provides
 * a small pure-JS implementation so the pattern engine has no DOM dependency.
 */
interface TileContext {
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    lineCap: string;
    clearRect(x: number, y: number, w: number, h: number): void;
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    stroke(): void;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
    fill(): void;
}

export type { HachureAngle as H, PatternType as P, TileContext as T, TileImage as a, TileSize as b };

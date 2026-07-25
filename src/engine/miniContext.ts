import type { TileContext, TileImage } from "./types";

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(v: string): RGBA {
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = v.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] !== undefined ? +rgba[4] : 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Minimal software rasterizer implementing just the {@link TileContext}
 * surface `makeTile` relies on (straight strokes with round caps, filled
 * circles). Lets the pattern engine run in Node without a DOM or a native
 * canvas dependency. The browser path uses the real Canvas 2D API instead,
 * this is only exercised server-side (tests, tooling, SSR previews).
 */
export function createMiniContext(size: number): { ctx: TileContext; toTileImage: () => TileImage } {
  const buf = new Uint8ClampedArray(size * size * 4);
  let strokeColor: RGBA = { r: 0, g: 0, b: 0, a: 1 };
  let fillColor: RGBA = { r: 0, g: 0, b: 0, a: 1 };
  let lineWidth = 1;
  let subpaths: Array<Array<{ x: number; y: number }>> = [];
  let pendingArc: { x: number; y: number; r: number } | null = null;

  function setPixel(x: number, y: number, c: RGBA) {
    if (x < 0 || y < 0 || x >= size || y >= size || c.a <= 0) return;
    const i = (y * size + x) * 4;
    if (c.a >= 1) {
      buf[i] = c.r;
      buf[i + 1] = c.g;
      buf[i + 2] = c.b;
      buf[i + 3] = 255;
      return;
    }
    const dstA = buf[i + 3] / 255;
    const outA = c.a + dstA * (1 - c.a);
    if (outA <= 0) return;
    buf[i] = (c.r * c.a + buf[i] * dstA * (1 - c.a)) / outA;
    buf[i + 1] = (c.g * c.a + buf[i + 1] * dstA * (1 - c.a)) / outA;
    buf[i + 2] = (c.b * c.a + buf[i + 2] * dstA * (1 - c.a)) / outA;
    buf[i + 3] = outA * 255;
  }

  // Distance-to-segment (clamped projection) gives naturally rounded caps.
  // exactly what ctx.lineCap = "round" produces on a real canvas.
  function strokeSegment(x0: number, y0: number, x1: number, y1: number) {
    const half = lineWidth / 2;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + half + 1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const cx = px + 0.5;
        const cy = py + 0.5;
        let t = lenSq === 0 ? 0 : ((cx - x0) * dx + (cy - y0) * dy) / lenSq;
        t = clamp01(t);
        const projX = x0 + t * dx;
        const projY = y0 + t * dy;
        const dist = Math.hypot(cx - projX, cy - projY);
        const coverage = clamp01(half + 0.5 - dist);
        if (coverage > 0) setPixel(px, py, { ...strokeColor, a: strokeColor.a * coverage });
      }
    }
  }

  function fillCircle(cx: number, cy: number, r: number) {
    const minX = Math.max(0, Math.floor(cx - r - 1));
    const maxX = Math.min(size - 1, Math.ceil(cx + r + 1));
    const minY = Math.max(0, Math.floor(cy - r - 1));
    const maxY = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
        const coverage = clamp01(r + 0.5 - dist);
        if (coverage > 0) setPixel(px, py, { ...fillColor, a: fillColor.a * coverage });
      }
    }
  }

  const ctx: TileContext = {
    get strokeStyle() {
      return `rgba(${strokeColor.r},${strokeColor.g},${strokeColor.b},${strokeColor.a})`;
    },
    set strokeStyle(v: string) {
      strokeColor = parseColor(v);
    },
    get fillStyle() {
      return `rgba(${fillColor.r},${fillColor.g},${fillColor.b},${fillColor.a})`;
    },
    set fillStyle(v: string) {
      fillColor = parseColor(v);
    },
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(v: number) {
      lineWidth = v;
    },
    lineCap: "round",
    clearRect() {
      buf.fill(0);
    },
    beginPath() {
      subpaths = [];
      pendingArc = null;
    },
    moveTo(x: number, y: number) {
      subpaths.push([{ x, y }]);
    },
    lineTo(x: number, y: number) {
      const current = subpaths[subpaths.length - 1];
      if (current) current.push({ x, y });
    },
    stroke() {
      for (const sp of subpaths) {
        for (let i = 1; i < sp.length; i++) strokeSegment(sp[i - 1].x, sp[i - 1].y, sp[i].x, sp[i].y);
      }
    },
    arc(x: number, y: number, radius: number) {
      // Only full circles are needed by the built-in patterns (stipple/dots),
      // so start/end angles are accepted for API parity but not used.
      pendingArc = { x, y, r: radius };
    },
    fill() {
      if (pendingArc) fillCircle(pendingArc.x, pendingArc.y, pendingArc.r);
    },
  };

  return {
    ctx,
    toTileImage: (): TileImage => ({ width: size, height: size, data: new Uint8Array(buf.buffer) }),
  };
}

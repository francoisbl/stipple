// src/maplibre/loadSvgImage.ts
async function loadSvgImage(svg) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// src/maplibre/svgIcon.ts
async function addSvgIcon(map, options) {
  const { id, svg, size = 32, pixelRatio = 2 } = options;
  const image = await loadSvgImage(svg);
  const px = Math.round(size * pixelRatio);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(image, 0, 0, px, px);
  const imageData = ctx.getImageData(0, 0, px, px);
  const tile = { width: px, height: px, data: new Uint8Array(imageData.data.buffer) };
  if (map.hasImage(id)) map.removeImage(id);
  map.addImage(id, tile, { pixelRatio });
  return { id, width: px, height: px };
}

export {
  loadSvgImage,
  addSvgIcon
};
//# sourceMappingURL=chunk-QO6U5GJG.js.map
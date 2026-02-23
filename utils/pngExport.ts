/**
 * SVG-to-PNG conversion via offscreen canvas.
 */

export function svgToPngBlob(
  svgContent: string,
  scale: number = 2
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgEl = doc.documentElement;

    let w = parseFloat(svgEl.getAttribute("width") || "220");
    let h = parseFloat(svgEl.getAttribute("height") || "160");
    if (isNaN(w) || w <= 0) w = 220;
    if (isNaN(h) || h <= 0) h = 160;

    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas not supported")); return; }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error("PNG conversion failed"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG into image"));
    };
    img.src = url;
  });
}

export async function downloadPNG(
  svgContent: string,
  filename: string,
  scale: number = 2
): Promise<void> {
  const blob = await svgToPngBlob(svgContent, scale);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyPNGToClipboard(
  svgContent: string,
  scale: number = 2
): Promise<void> {
  const blob = await svgToPngBlob(svgContent, scale);
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}

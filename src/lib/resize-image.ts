// Shrinks a photo before upload: max 1600 px on the long side, JPEG at 85%. A phone photo goes
// from ~4 MB to ~300 KB, so the board loads fast and storage stays small. GIFs (may be animated)
// and HEIC (browsers can't draw it) are kept as they are, as is anything already small enough.

export const MAX_SIDE = 1600;
const QUALITY = 0.85;
const SMALL_ENOUGH = 600 * 1024;

/** Size that fits within max x max, keeping the shape; never enlarges. */
export function fitWithin(w: number, h: number, max = MAX_SIDE) {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

export const keepAsIs = (type: string) => type === "image/gif" || type === "image/heic";

/** Web only. Returns the original if it can't (or needn't) be shrunk. */
export async function shrinkImage(file: Blob & { type: string }): Promise<{ body: Blob; type: string }> {
  if (keepAsIs(file.type) || typeof createImageBitmap !== "function") return { body: file, type: file.type };
  try {
    const bmp = await createImageBitmap(file);
    const { w, h } = fitWithin(bmp.width, bmp.height);
    if (w === bmp.width && file.size <= SMALL_ENOUGH) {
      bmp.close();
      return { body: file, type: file.type };
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { body: file, type: file.type };
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white, not black, background as JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    return out && out.size < file.size ? { body: out, type: "image/jpeg" } : { body: file, type: file.type };
  } catch {
    return { body: file, type: file.type };
  }
}

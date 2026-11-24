// Pick one image or PDF. Web uses a plain file input (no extra dependency). The phone app gets a
// native picker once it ships; until then attaching works from the web version.
import { Platform } from "react-native";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "application/pdf"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type PickedFile = { name: string; type: AcceptedType; size: number; body: Blob };

export const canPickFiles = Platform.OS === "web" && typeof document !== "undefined";

export const IMAGE_TYPES = ACCEPTED_TYPES.filter((t) => t.startsWith("image/"));

/** Pick one or more images (web). Files of the wrong type or over 10 MB are skipped and counted. */
export function pickImages(): Promise<{ files: PickedFile[]; skipped: number } | null> {
  if (!canPickFiles) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = IMAGE_TYPES.join(",");
    input.onchange = () => {
      const all = Array.from(input.files ?? []);
      if (!all.length) return resolve(null);
      const files = all
        .filter((f) => (IMAGE_TYPES as readonly string[]).includes(f.type) && f.size <= MAX_FILE_BYTES)
        .map((f) => ({ name: f.name.slice(0, 200), type: f.type as AcceptedType, size: f.size, body: f as Blob }));
      resolve({ files, skipped: all.length - files.length });
    };
    input.click();
  });
}

export function pickFile(): Promise<PickedFile | "too_big" | "wrong_type" | null> {
  if (!canPickFiles) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_TYPES.join(",");
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      if (!(ACCEPTED_TYPES as readonly string[]).includes(f.type)) return resolve("wrong_type");
      if (f.size > MAX_FILE_BYTES) return resolve("too_big");
      resolve({ name: f.name.slice(0, 200), type: f.type as AcceptedType, size: f.size, body: f });
    };
    input.click();
  });
}

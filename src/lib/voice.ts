// Voice notes for the monthly check-in. Web uses the browser's MediaRecorder (no extra dependency),
// like file picking does; the phone app gets native recording (expo-audio) in a later build, and
// until then voice notes record and play from the web version.
import { Platform } from "react-native";

export const MAX_VOICE_SECONDS = 180;
export const MAX_VOICE_BYTES = 10 * 1024 * 1024;

const web = Platform.OS === "web" && typeof window !== "undefined";

export const canRecordVoice =
  web && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
export const canPlayVoice = web && typeof Audio !== "undefined";

/** Best format this browser records in, from the ones the storage bucket accepts. */
function pickMime() {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"])
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}

export type Recording = { blob: Blob; type: string; ext: string; seconds: number };
export type Recorder = { stop: () => Promise<Recording | null>; cancel: () => void; startedAt: number };

export const extFor = (type: string) => (type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm");

/** Ask for the mic and start recording. Stops by itself after MAX_VOICE_SECONDS. */
export async function startRecording(onAutoStop?: () => void): Promise<Recorder | "denied" | "unsupported"> {
  if (!canRecordVoice) return "unsupported";
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return "denied";
  }
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const startedAt = Date.now();
  const release = () => stream.getTracks().forEach((t) => t.stop());
  let cancelled = false;
  const finished = new Promise<Recording | null>((resolve) => {
    rec.onstop = () => {
      release();
      if (cancelled || !chunks.length) return resolve(null);
      const type = (rec.mimeType || mime || "audio/webm").split(";")[0]!;
      const blob = new Blob(chunks, { type });
      resolve(blob.size > MAX_VOICE_BYTES ? null : { blob, type, ext: extFor(type), seconds: Math.round((Date.now() - startedAt) / 1000) });
    };
  });
  const timer = setTimeout(() => {
    if (rec.state !== "inactive") rec.stop();
    onAutoStop?.();
  }, MAX_VOICE_SECONDS * 1000);
  rec.start(1000);
  return {
    startedAt,
    stop: () => {
      clearTimeout(timer);
      if (rec.state !== "inactive") rec.stop();
      return finished;
    },
    cancel: () => {
      cancelled = true;
      clearTimeout(timer);
      if (rec.state !== "inactive") rec.stop();
      else release();
    },
  };
}

/** One shared player, so starting a note stops the one already playing. */
let current: HTMLAudioElement | null = null;
export function playVoice(url: string, onEnd: () => void) {
  if (!canPlayVoice) return () => undefined;
  current?.pause();
  const a = new Audio(url);
  current = a;
  a.onended = onEnd;
  a.onerror = onEnd;
  a.play().catch(onEnd);
  return () => {
    a.pause();
    if (current === a) current = null;
    onEnd();
  };
}

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

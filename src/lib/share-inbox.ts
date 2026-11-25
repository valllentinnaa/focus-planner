// Android "Share → Focus Planner" lands here (see public/sw.js). Phones' native app: nothing yet.
export type SharedItem = { id: string; title: string; text: string; url: string; images: Blob[]; clear: () => Promise<void> };

export function registerShareWorker() {}
export async function readSharedInbox(): Promise<SharedItem[]> {
  return [];
}

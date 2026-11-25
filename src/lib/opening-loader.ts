// Phones show the native splash screen instead (see app.json).
export function hideOpeningLoader() {}
/** Resolves once the web opening loader is gone (phones: right away). */
export const openingLoaderGone: Promise<void> = Promise.resolve();

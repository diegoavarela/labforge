import { get, set } from "idb-keyval";

const KEYS = ["plugin-forge-state", "plugin-forge-library"];

export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  for (const key of KEYS) {
    try {
      const data = localStorage.getItem(key);
      if (!data) continue;

      // Only migrate if IndexedDB doesn't already have data for this key
      const existing = await get(key);
      if (existing) continue;

      await set(key, data);

      // Verify the write succeeded before deleting localStorage
      const verified = await get(key);
      if (verified) {
        localStorage.removeItem(key);
      }
    } catch {
      // Keep localStorage data intact on any error
    }
  }
}

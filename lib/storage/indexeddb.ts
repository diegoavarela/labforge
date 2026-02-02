import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

export const indexedDBStorage: StateStorage = {
  getItem: async (name: string) => {
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await set(name, value);
  },
  removeItem: async (name: string) => {
    await del(name);
  },
};

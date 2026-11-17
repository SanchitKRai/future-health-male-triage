import { create } from "zustand";
import type { HealthRecord, UserPreferences } from "../types";

interface LocState {
  records: HealthRecord[];
  preferences: UserPreferences;
  addRecord: (record: HealthRecord) => void;
  deleteRecord: (id: string) => void;
  setPreference: (key: keyof UserPreferences, value: boolean) => void;
  clearLocalData: () => void;
}

const initialPreferences: UserPreferences = {
  analyticsConsent: false,
  localStorageConsent: false
};

/**
 * In-memory state for the foundation milestone.
 * Persistent health storage is deliberately NOT enabled yet.
 * A later milestone will add explicit opt-in encrypted IndexedDB storage.
 */
export const useLocStore = create<LocState>((set) => ({
  records: [],
  preferences: initialPreferences,
  addRecord: (record) =>
    set((state) => ({ records: [record, ...state.records] })),
  deleteRecord: (id) =>
    set((state) => ({ records: state.records.filter((item) => item.id !== id) })),
  setPreference: (key, value) =>
    set((state) => ({
      preferences: { ...state.preferences, [key]: value }
    })),
  clearLocalData: () =>
    set({ records: [], preferences: initialPreferences })
}));

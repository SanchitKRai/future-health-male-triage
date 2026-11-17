import { create } from "zustand";
import type { HealthRecord } from "../types";

interface LocState {
  records: HealthRecord[];
  addRecord: (record: HealthRecord) => void;
  deleteRecord: (id: string) => void;
  clearLocalData: () => void;
}

/**
 * M1/M2 state remains in memory only.
 * Persistent health storage is deliberately not enabled.
 * Do not add localStorage or IndexedDB persistence without an approved
 * consent flow, threat model and encryption/key-lifecycle design.
 */
export const useLocStore = create<LocState>((set) => ({
  records: [],
  addRecord: (record) =>
    set((state) => ({ records: [record, ...state.records] })),
  deleteRecord: (id) =>
    set((state) => ({ records: state.records.filter((item) => item.id !== id) })),
  clearLocalData: () => set({ records: [] })
}));

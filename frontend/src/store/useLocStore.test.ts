import { afterEach, describe, expect, it } from "vitest";
import { useLocStore } from "./useLocStore";

afterEach(() => {
  useLocStore.getState().clearLocalData();
});

describe("LOC in-memory health store", () => {
  it("starts without health records or optional consent", () => {
    const state = useLocStore.getState();

    expect(state.records).toEqual([]);
    expect(state.preferences.analyticsConsent).toBe(false);
    expect(state.preferences.localStorageConsent).toBe(false);
  });

  it("adds and removes a session record", () => {
    const record = {
      id: "test-record-1",
      category: "vital" as const,
      title: "Example measurement",
      value: "Example only",
      recordedAt: "2026-11-17",
    };

    useLocStore.getState().addRecord(record);
    expect(useLocStore.getState().records).toEqual([record]);

    useLocStore.getState().deleteRecord(record.id);
    expect(useLocStore.getState().records).toEqual([]);
  });

  it("clears records and resets preferences", () => {
    useLocStore.getState().setPreference("analyticsConsent", true);
    useLocStore.getState().addRecord({
      id: "test-record-2",
      category: "screening",
      title: "Example screening",
      value: "Example only",
      recordedAt: "2026-11-17",
    });

    useLocStore.getState().clearLocalData();
    const state = useLocStore.getState();

    expect(state.records).toEqual([]);
    expect(state.preferences).toEqual({
      analyticsConsent: false,
      localStorageConsent: false,
    });
  });
});

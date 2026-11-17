import { afterEach, describe, expect, it } from "vitest";
import { useLocStore } from "./useLocStore";
import type { LabResultRecord } from "../types/health-records";

afterEach(() => {
  useLocStore.getState().clearLocalData();
});

const exampleLabRecord: LabResultRecord = {
  id: "test-record-1",
  category: "lab",
  testName: "Example analyte",
  value: { kind: "text", value: "Example only" },
  collectedOn: "2026-11-16",
  recordedAt: "2026-11-17T12:00:00.000Z",
  source: "manual",
};

describe("LOC in-memory health store", () => {
  it("starts without health records or optional consent", () => {
    const state = useLocStore.getState();
    expect(state.records).toEqual([]);
  });

  it("adds and removes a typed session record", () => {
    useLocStore.getState().addRecord(exampleLabRecord);
    expect(useLocStore.getState().records).toEqual([exampleLabRecord]);
    useLocStore.getState().deleteRecord(exampleLabRecord.id);
    expect(useLocStore.getState().records).toEqual([]);
  });

  it("clears session records", () => {
    useLocStore.getState().addRecord(exampleLabRecord);
    useLocStore.getState().clearLocalData();
    const state = useLocStore.getState();
    expect(state.records).toEqual([]);
  });
});

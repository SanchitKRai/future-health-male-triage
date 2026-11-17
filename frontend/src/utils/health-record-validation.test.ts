import { describe, expect, it } from "vitest";
import { validateExposureRecord, validateLabResult, validateLifestyleCheckIn, validateVitalRecord } from "./health-record-validation";
import type { LabResultRecord, LifestyleCheckIn, OccupationalExposureRecord, VitalRecord } from "../types/health-records";

const metadata = { id: "record-1", recordedAt: "2026-11-17T12:00:00.000Z", source: "manual" as const };

describe("health record input validation", () => {
  it("accepts numeric lab results when the reported units agree", () => {
    const record: LabResultRecord = { ...metadata, category: "lab", testName: "Example analyte", collectedOn: "2026-11-16", value: { kind: "numeric", value: 5.2, unit: "mmol/L" }, referenceInterval: { low: 3.5, high: 5.5, unit: "mmol/L", source: "laboratory-report" } };
    expect(validateLabResult(record).valid).toBe(true);
  });

  it("rejects unit mismatches and reversed reference intervals", () => {
    const record: LabResultRecord = { ...metadata, category: "lab", testName: "Example analyte", collectedOn: "2026-11-16", value: { kind: "numeric", value: 5.2, unit: "mmol/L" }, referenceInterval: { low: 8, high: 2, unit: "mg/dL", source: "laboratory-report" } };
    expect(validateLabResult(record).errors).toEqual(expect.arrayContaining(["Result and reference interval units must match.", "Reference interval low value cannot exceed its high value."]));
  });

  it("rejects impossible calendar dates", () => {
    const record: LabResultRecord = { ...metadata, category: "lab", testName: "Example analyte", collectedOn: "2026-02-30", value: { kind: "text", value: "Example only" } };
    expect(validateLabResult(record).valid).toBe(false);
  });

  it("accepts a positive vital measurement", () => {
    const record: VitalRecord = { ...metadata, category: "vital", measurement: { type: "weight", value: 72, unit: "kg" } };
    expect(validateVitalRecord(record).valid).toBe(true);
  });

  it("rejects negative occupational exposure duration", () => {
    const record: OccupationalExposureRecord = {
      ...metadata,
      category: "exposure",
      exposureType: "heat",
      frequency: "weekly",
      durationMonths: -3,
    };
    expect(validateExposureRecord(record).valid).toBe(false);
  });

  it("rejects invalid lifestyle periods and values", () => {
    const record: LifestyleCheckIn = { ...metadata, category: "lifestyle", periodStart: "2026-11-18", periodEnd: "2026-11-17", sleepHoursAverage: 25, activityMinutesPerWeek: -1 };
    const result = validateLifestyleCheckIn(record);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });
});

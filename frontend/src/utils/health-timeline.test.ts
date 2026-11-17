import { describe, expect, it } from "vitest";
import { buildTrendMetrics } from "./health-timeline";
import type { HealthRecord } from "../types/health-records";

const lab = (id: string, date: string, value: number, unit: string, testName = "HbA1c"): HealthRecord => ({
  id, category: "lab", testName, collectedOn: date, recordedAt: `${date}T12:00:00.000Z`, source: "manual",
  value: { kind: "numeric", value, unit },
});

describe("health timeline trends", () => {
  it("groups the same lab test and same unit, sorted by collection date", () => {
    const metrics = buildTrendMetrics([lab("b", "2026-02-10", 5.8, "%"), lab("a", "2026-01-10", 5.5, "%")]);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].points.map((point) => point.date)).toEqual(["2026-01-10", "2026-02-10"]);
  });

  it("never combines the same test when units differ", () => {
    const metrics = buildTrendMetrics([lab("a", "2026-01-10", 5.5, "%"), lab("b", "2026-02-10", 37, "mmol/mol")]);
    expect(metrics).toHaveLength(2);
    expect(metrics.map((metric) => metric.unit).sort()).toEqual(["%", "mmol/mol"]);
  });

  it("keeps vital measurements separate from laboratory values", () => {
    const vital: HealthRecord = { id: "v1", category: "vital", measurement: { type: "weight", value: 72, unit: "kg" }, recordedAt: "2026-01-10T12:00:00.000Z", source: "manual" };
    const metrics = buildTrendMetrics([lab("l1", "2026-01-10", 72, "kg", "Example"), vital]);
    expect(metrics).toHaveLength(2);
    expect(metrics.map((metric) => metric.key)).toEqual(expect.arrayContaining(["lab:example:kg", "vital:weight:kg"]));
  });

  it("does not chart text results or self-reported context records", () => {
    const textResult: HealthRecord = { id: "t1", category: "lab", testName: "Qualitative test", value: { kind: "text", value: "Detected" }, collectedOn: "2026-01-10", recordedAt: "2026-01-10T12:00:00.000Z", source: "manual" };
    const lifestyle: HealthRecord = { id: "s1", category: "lifestyle", periodStart: "2026-01-01", periodEnd: "2026-01-07", sleepHoursAverage: 7, recordedAt: "2026-01-08T12:00:00.000Z", source: "manual" };
    expect(buildTrendMetrics([textResult, lifestyle])).toEqual([]);
  });
});

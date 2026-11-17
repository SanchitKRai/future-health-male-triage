import type { HealthRecord, VitalRecord } from "../types/health-records";

export interface TrendPoint { date: string; value: number; label: string; }
export interface TrendMetric { key: string; label: string; unit: string; points: TrendPoint[]; }

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function vitalLabel(record: VitalRecord): string {
  const labels: Record<VitalRecord["measurement"]["type"], string> = {
    weight: "Weight", height: "Height", "systolic-blood-pressure": "Systolic blood pressure",
    "diastolic-blood-pressure": "Diastolic blood pressure", "resting-heart-rate": "Resting heart rate",
  };
  return labels[record.measurement.type];
}

/** Group numeric readings only when metric identity AND unit both match. */
export function buildTrendMetrics(records: HealthRecord[]): TrendMetric[] {
  const groups = new Map<string, TrendMetric>();
  for (const record of records) {
    let key: string; let label: string; let unit: string; let value: number; let date: string;
    if (record.category === "lab" && record.value.kind === "numeric") {
      const normalizedName = record.testName.trim().toLocaleLowerCase();
      key = `lab:${normalizedName}:${record.value.unit}`;
      label = record.testName; unit = record.value.unit; value = record.value.value; date = record.collectedOn;
    } else if (record.category === "vital") {
      key = `vital:${record.measurement.type}:${record.measurement.unit}`;
      label = vitalLabel(record); unit = record.measurement.unit; value = record.measurement.value; date = record.recordedAt.slice(0, 10);
    } else continue;
    const group = groups.get(key) ?? { key, label, unit, points: [] };
    group.points.push({ date, value, label: formatDate(date) });
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((metric) => ({ ...metric, points: metric.points.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.unit.localeCompare(b.unit));
}

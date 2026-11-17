import type { HealthRecord, LabResultRecord, LifestyleCheckIn, OccupationalExposureRecord, VitalRecord } from "../types/health-records";

export interface ValidationResult { valid: boolean; errors: string[]; }

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validMetadata(record: HealthRecord): string[] {
  const errors: string[] = [];
  if (!record.id.trim()) errors.push("A record ID is required.");
  if (!Number.isFinite(Date.parse(record.recordedAt))) errors.push("A valid recorded-at timestamp is required.");
  if (record.source !== "manual" && record.source !== "imported") errors.push("Unknown record source.");
  return errors;
}

export function validateLabResult(record: LabResultRecord): ValidationResult {
  const errors = validMetadata(record);
  if (!record.testName.trim()) errors.push("A test name is required.");
  if (!isRealIsoDate(record.collectedOn)) errors.push("Collection date must be a real YYYY-MM-DD date.");
  if (record.value.kind === "numeric") {
    if (!Number.isFinite(record.value.value)) errors.push("Numeric result must be finite.");
    if (!record.value.unit.trim()) errors.push("A unit is required for numeric results.");
    if (record.referenceInterval) {
      const { low, high, unit } = record.referenceInterval;
      if (!unit.trim()) errors.push("Reference interval unit is required.");
      if (unit !== record.value.unit) errors.push("Result and reference interval units must match.");
      if (low !== undefined && !Number.isFinite(low)) errors.push("Reference low value must be finite.");
      if (high !== undefined && !Number.isFinite(high)) errors.push("Reference high value must be finite.");
      if (low !== undefined && high !== undefined && low > high) errors.push("Reference interval low value cannot exceed its high value.");
    }
  } else if (!record.value.value.trim()) {
    errors.push("Text result cannot be blank.");
  } else if (record.referenceInterval) {
    errors.push("Text results cannot have a numeric reference interval.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateVitalRecord(record: VitalRecord): ValidationResult {
  const errors = validMetadata(record);
  const { value, unit } = record.measurement;
  if (!Number.isFinite(value) || value <= 0) errors.push("Measurement must be a positive finite number.");
  if (!unit.trim()) errors.push("Measurement unit is required.");
  return { valid: errors.length === 0, errors };
}

export function validateLifestyleCheckIn(record: LifestyleCheckIn): ValidationResult {
  const errors = validMetadata(record);
  if (!isRealIsoDate(record.periodStart)) errors.push("Period start must be a real YYYY-MM-DD date.");
  if (!isRealIsoDate(record.periodEnd)) errors.push("Period end must be a real YYYY-MM-DD date.");
  if (isRealIsoDate(record.periodStart) && isRealIsoDate(record.periodEnd) && record.periodStart > record.periodEnd) {
    errors.push("Period start cannot be after period end.");
  }
  if (record.sleepHoursAverage !== undefined && (!Number.isFinite(record.sleepHoursAverage) || record.sleepHoursAverage < 0 || record.sleepHoursAverage > 24)) {
    errors.push("Average sleep must be between 0 and 24 hours.");
  }
  if (record.activityMinutesPerWeek !== undefined && (!Number.isFinite(record.activityMinutesPerWeek) || record.activityMinutesPerWeek < 0)) {
    errors.push("Weekly activity minutes cannot be negative.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateExposureRecord(record: OccupationalExposureRecord): ValidationResult {
  const errors = validMetadata(record);
  if (record.durationMonths !== undefined && (!Number.isFinite(record.durationMonths) || record.durationMonths < 0)) {
    errors.push("Exposure duration in months cannot be negative.");
  }
  return { valid: errors.length === 0, errors };
}

export type RecordSource = "manual" | "imported";
export type HealthRecordCategory = "lab" | "vital" | "lifestyle" | "exposure";

export interface RecordMetadata { id: string; recordedAt: string; source: RecordSource; }

export interface NumericLabValue { kind: "numeric"; value: number; unit: string; }
export interface TextLabValue { kind: "text"; value: string; }
export interface LabReferenceInterval { low?: number; high?: number; unit: string; source: "laboratory-report"; }

export interface LabResultRecord extends RecordMetadata {
  category: "lab"; testName: string; value: NumericLabValue | TextLabValue;
  collectedOn: string; laboratoryName?: string; referenceInterval?: LabReferenceInterval;
}

export type VitalMeasurement =
  | { type: "weight"; value: number; unit: "kg" | "lb" }
  | { type: "height"; value: number; unit: "cm" | "in" }
  | { type: "systolic-blood-pressure"; value: number; unit: "mmHg" }
  | { type: "diastolic-blood-pressure"; value: number; unit: "mmHg" }
  | { type: "resting-heart-rate"; value: number; unit: "bpm" };

export interface VitalRecord extends RecordMetadata { category: "vital"; measurement: VitalMeasurement; }

export interface LifestyleCheckIn extends RecordMetadata {
  category: "lifestyle"; periodStart: string; periodEnd: string;
  sleepHoursAverage?: number; activityMinutesPerWeek?: number;
  tobaccoUse?: "never" | "former" | "current" | "prefer-not-to-say";
  alcoholPattern?: "none" | "occasional" | "regular" | "prefer-not-to-say";
  stressSelfRating?: 1 | 2 | 3 | 4 | 5;
}

export interface OccupationalExposureRecord extends RecordMetadata {
  category: "exposure";
  exposureType: "heat" | "chemicals" | "pesticides" | "heavy-metals" | "radiation" | "other";
  frequency: "daily" | "weekly" | "monthly" | "occasional" | "unknown";
  durationMonths?: number;
  protectiveEquipmentUsed?: "always" | "sometimes" | "never" | "unknown";
}

export type HealthRecord = LabResultRecord | VitalRecord | LifestyleCheckIn | OccupationalExposureRecord;

export type NavigationKey =
  | "overview"
  | "screening"
  | "timeline"
  | "insights"
  | "care"
  | "privacy";

export type {
  HealthRecord,
  HealthRecordCategory,
  LabResultRecord,
  LabReferenceInterval,
  LifestyleCheckIn,
  OccupationalExposureRecord,
  RecordMetadata,
  RecordSource,
  VitalMeasurement,
  VitalRecord,
} from "./health-records";

export interface UserPreferences {
  analyticsConsent: boolean;
  localStorageConsent: boolean;
}

export type NavigationKey =
  | "overview"
  | "screening"
  | "timeline"
  | "insights"
  | "care"
  | "privacy";

export type HealthRecordCategory =
  | "lab"
  | "vital"
  | "lifestyle"
  | "screening";

export interface HealthRecord {
  id: string;
  category: HealthRecordCategory;
  title: string;
  value: string;
  recordedAt: string;
  unit?: string;
}

export interface UserPreferences {
  analyticsConsent: boolean;
  localStorageConsent: boolean;
}

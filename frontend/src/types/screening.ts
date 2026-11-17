export type BooleanQuestionKey =
  | "d1_sudden_severe_pain" | "d2_sudden_swelling" | "d3_fever_with_pain_swelling"
  | "d4_prolonged_erection" | "d5_lump_or_size_change" | "d6_blood_in_semen_or_persistent_ache"
  | "d7_sexual_function_issue" | "d8_recent_groin_injury_swelling"
  | "b1_abnormal_semen_test" | "b2_undescended_testis" | "b3_mumps_orchitis"
  | "b4_testis_groin_surgery_injury" | "b5_varicocele" | "b6_cancer_treatment"
  | "b7_genetic_condition" | "b8_untreated_infection"
  | "c2_diabetes_metabolic" | "c3_tobacco" | "c5_testosterone_steroids"
  | "c6_recreational_drugs" | "c7_heat_exposure" | "c8_work_chemicals"
  | "c9_recent_fever_illness";

export type ScreeningAnswer = boolean | null;
export type ScreeningAnswers = Partial<Record<BooleanQuestionKey, ScreeningAnswer>>;

export interface ScreeningConsent {
  adult_confirmed: boolean;
  screening_acknowledged: boolean;
  session_processing_consent: boolean;
}

export interface ScreeningSubmissionPayload extends ScreeningAnswers {
  consent: ScreeningConsent;
  age: number;
  trying: "now" | "within_year" | "not_planning" | null;
  months_trying?: number | null;
  partner_35_plus?: boolean | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  c4_alcohol?: "none" | "occasional" | "regular" | "heavy" | null;
  medications: string[];
}

export interface ScreeningFactor {
  id: string;
  label: string;
  points: number;
  modifiable: boolean;
}

export interface ScreeningResult {
  status: "result" | "cannot_continue";
  triage: string;
  rule: string;
  band: "Low" | "Medium" | "High" | null;
  score: number;
  low_confidence: boolean;
  safety_net: boolean;
  top_factors: ScreeningFactor[];
  notes: string[];
  engine: "existing_rules_engine";
  model_status: "not_connected_in_v2_screening";
}

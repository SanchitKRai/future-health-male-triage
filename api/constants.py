"""Questionnaire option values copied from the existing Streamlit prototype."""

MEDICATIONS = (
    "Finasteride or dutasteride",
    "Sulfasalazine",
    "Methotrexate",
    "Opioid painkillers",
    "Long-term antidepressants (SSRIs)",
    "Alpha-blockers (for prostate or blood pressure)",
)
MEDICATION_NONE = "None of these"
MEDICATION_PREFER_NOT = "Prefer not to say"
MEDICATION_OPTIONS = set(MEDICATIONS) | {MEDICATION_NONE, MEDICATION_PREFER_NOT}

RED_FLAG_FIELDS = (
    "d1_sudden_severe_pain",
    "d2_sudden_swelling",
    "d3_fever_with_pain_swelling",
    "d4_prolonged_erection",
    "d8_recent_groin_injury_swelling",
)
URGENT_FIELDS = (
    "d5_lump_or_size_change",
    "d6_blood_in_semen_or_persistent_ache",
)

"""Map the V2 request contract into the repository's existing Intake dataclass."""
from __future__ import annotations

from api.constants import MEDICATION_NONE, MEDICATION_PREFER_NOT, MEDICATIONS
from api.schemas import ScreeningSubmission
from triage import Intake


QUESTION_FIELDS = (
    "d1_sudden_severe_pain",
    "d2_sudden_swelling",
    "d3_fever_with_pain_swelling",
    "d4_prolonged_erection",
    "d5_lump_or_size_change",
    "d6_blood_in_semen_or_persistent_ache",
    "d7_sexual_function_issue",
    "d8_recent_groin_injury_swelling",
    "b1_abnormal_semen_test",
    "b2_undescended_testis",
    "b3_mumps_orchitis",
    "b4_testis_groin_surgery_injury",
    "b5_varicocele",
    "b6_cancer_treatment",
    "b7_genetic_condition",
    "b8_untreated_infection",
    "c2_diabetes_metabolic",
    "c3_tobacco",
    "c5_testosterone_steroids",
    "c6_recreational_drugs",
    "c7_heat_exposure",
    "c8_work_chemicals",
    "c9_recent_fever_illness",
)


def build_intake(submission: ScreeningSubmission) -> Intake:
    """Preserve the original Streamlit build_intake mappings exactly."""
    consent = (
        submission.consent.adult_confirmed
        and submission.consent.screening_acknowledged
        and submission.consent.session_processing_consent
    )

    height = submission.height_cm
    weight = submission.weight_kg
    bmi = round(weight / ((height / 100) ** 2), 1) if height and weight and height > 0 else None

    medications = submission.medications
    if not medications or MEDICATION_PREFER_NOT in medications:
        listed_medicine = None
    elif MEDICATION_NONE in medications:
        listed_medicine = False
    else:
        listed_medicine = any(item in MEDICATIONS for item in medications)

    trying = submission.trying
    return Intake(
        consent=bool(consent),
        age=submission.age,
        trying=trying,
        months_trying=submission.months_trying if trying == "now" else None,
        partner_35_plus=submission.partner_35_plus if trying == "now" else None,
        bmi=bmi,
        c4_alcohol=submission.c4_alcohol,
        c10_listed_medicine=listed_medicine,
        **{field: getattr(submission, field) for field in QUESTION_FIELDS},
    )

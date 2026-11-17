"""Regression tests for mapping the V2 form into the preserved triage engine."""
from pydantic import ValidationError

from api.main import root, screen
from api.schemas import ConsentInput, ScreeningSubmission
from api.intake import build_intake
from triage import Triage


def consent():
    return ConsentInput(
        adult_confirmed=True,
        screening_acknowledged=True,
        session_processing_consent=True,
    )


def test_api_root_explains_available_local_routes():
    response = root()
    assert response["status"] == "ok"
    assert response["health_check"] == "/api/health"
    assert response["screening_endpoint"] == "/api/screening/triage"


def test_consent_and_age_gate_stops_without_scoring():
    result = screen(ScreeningSubmission(age=28))
    assert result.status == "cannot_continue"
    assert result.triage == Triage.STOP.value
    assert result.rule == "R0"


def test_emergency_red_flag_keeps_existing_r1_precedence():
    submission = ScreeningSubmission(
        consent=consent(),
        age=30,
        d1_sudden_severe_pain=True,
        d2_sudden_swelling=None,
        d3_fever_with_pain_swelling=None,
        d4_prolonged_erection=None,
        d8_recent_groin_injury_swelling=None,
    )
    result = screen(submission)
    assert result.triage == Triage.URGENT_EMERGENCY.value
    assert result.rule == "R1"


def test_new_lump_uses_existing_r2_urgent_assessment():
    submission = ScreeningSubmission(
        consent=consent(), age=30, d5_lump_or_size_change=True,
    )
    result = screen(submission)
    assert result.triage == Triage.URGENT_ASSESSMENT.value
    assert result.rule == "R2"


def test_skipped_answer_is_none_not_false():
    intake = build_intake(ScreeningSubmission(
        consent=consent(), age=30,
        d1_sudden_severe_pain=None,
        c3_tobacco=False,
    ))
    assert intake.d1_sudden_severe_pain is None
    assert intake.c3_tobacco is False


def test_skipped_urgent_symptom_sets_safety_net():
    result = screen(ScreeningSubmission(
        consent=consent(), age=30,
    ))
    assert result.status == "result"
    assert result.safety_net is True


def test_bmi_is_mapped_using_original_streamlit_formula():
    intake = build_intake(ScreeningSubmission(
        consent=consent(), age=30, height_cm=180, weight_kg=72,
    ))
    assert intake.bmi == 22.2


def test_trying_timing_is_only_passed_when_trying_now():
    intake = build_intake(ScreeningSubmission(
        consent=consent(), age=30, trying="not_planning",
        months_trying=24, partner_35_plus=True,
    ))
    assert intake.trying == "not_planning"
    assert intake.months_trying is None
    assert intake.partner_35_plus is None


def test_medication_prefer_not_to_say_remains_unknown():
    intake = build_intake(ScreeningSubmission(
        consent=consent(), age=30, medications=["Prefer not to say"],
    ))
    assert intake.c10_listed_medicine is None


def test_none_of_these_medications_maps_to_false():
    intake = build_intake(ScreeningSubmission(
        consent=consent(), age=30, medications=["None of these"],
    ))
    assert intake.c10_listed_medicine is False


def test_known_medicine_maps_to_true():
    intake = build_intake(ScreeningSubmission(
        consent=consent(), age=30, medications=["Finasteride or dutasteride"],
    ))
    assert intake.c10_listed_medicine is True


def test_unknown_fields_are_rejected():
    try:
        ScreeningSubmission.model_validate({"consent": consent().model_dump(), "age": 30, "invented_risk_score": 99})
    except ValidationError:
        return
    raise AssertionError("Unknown fields must be rejected.")


def test_conflicting_medication_options_are_rejected():
    try:
        ScreeningSubmission.model_validate({
            "consent": consent().model_dump(),
            "age": 30,
            "medications": ["None of these", "Methotrexate"],
        })
    except ValidationError:
        return
    raise AssertionError("Conflicting medication selections must be rejected.")

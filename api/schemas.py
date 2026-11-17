"""Validated request and response contracts for the local LOC screening API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from api.constants import MEDICATION_OPTIONS, MEDICATION_PREFER_NOT, MEDICATION_NONE


YesNo = bool | None
TryingStatus = Literal["now", "within_year", "not_planning"] | None
AlcoholStatus = Literal["none", "occasional", "regular", "heavy"] | None


class ConsentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    adult_confirmed: bool = False
    screening_acknowledged: bool = False
    session_processing_consent: bool = False


class ScreeningSubmission(BaseModel):
    """Only fields used by the existing Intake / evaluate() rules are accepted."""

    model_config = ConfigDict(extra="forbid")

    consent: ConsentInput = Field(default_factory=ConsentInput)
    age: int | None = Field(default=None, ge=1, le=120)

    trying: TryingStatus = None
    months_trying: int | None = Field(default=None, ge=0, le=240)
    partner_35_plus: YesNo = None
    height_cm: int | None = Field(default=None, ge=120, le=230)
    weight_kg: int | None = Field(default=None, ge=35, le=250)

    d1_sudden_severe_pain: YesNo = None
    d2_sudden_swelling: YesNo = None
    d3_fever_with_pain_swelling: YesNo = None
    d4_prolonged_erection: YesNo = None
    d5_lump_or_size_change: YesNo = None
    d6_blood_in_semen_or_persistent_ache: YesNo = None
    d7_sexual_function_issue: YesNo = None
    d8_recent_groin_injury_swelling: YesNo = None

    b1_abnormal_semen_test: YesNo = None
    b2_undescended_testis: YesNo = None
    b3_mumps_orchitis: YesNo = None
    b4_testis_groin_surgery_injury: YesNo = None
    b5_varicocele: YesNo = None
    b6_cancer_treatment: YesNo = None
    b7_genetic_condition: YesNo = None
    b8_untreated_infection: YesNo = None

    c2_diabetes_metabolic: YesNo = None
    c3_tobacco: YesNo = None
    c4_alcohol: AlcoholStatus = None
    c5_testosterone_steroids: YesNo = None
    c6_recreational_drugs: YesNo = None
    c7_heat_exposure: YesNo = None
    c8_work_chemicals: YesNo = None
    c9_recent_fever_illness: YesNo = None
    medications: list[str] = Field(default_factory=list)

    @field_validator("medications")
    @classmethod
    def validate_medications(cls, value: list[str]) -> list[str]:
        unknown = sorted(set(value) - MEDICATION_OPTIONS)
        if unknown:
            raise ValueError("Unknown medication option.")
        if MEDICATION_NONE in value and len(value) > 1:
            raise ValueError("'None of these' cannot be combined with another selection.")
        if MEDICATION_PREFER_NOT in value and len(value) > 1:
            raise ValueError("'Prefer not to say' cannot be combined with another selection.")
        return value


class FactorOutput(BaseModel):
    id: str
    label: str
    points: int
    modifiable: bool


class ScreeningResult(BaseModel):
    status: Literal["result", "cannot_continue"]
    triage: str
    rule: str
    band: str | None
    score: int
    low_confidence: bool
    safety_net: bool
    top_factors: list[FactorOutput]
    notes: list[str]
    engine: Literal["existing_rules_engine"] = "existing_rules_engine"
    model_status: Literal["not_connected_in_v2_screening"] = "not_connected_in_v2_screening"

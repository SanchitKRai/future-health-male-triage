# LOC V2 — Guided screening flow

## User journey

1. **Consent and age gate.** The user confirms adulthood, acknowledges screening-only use and consents to this one-time local processing session.
2. **Urgent symptoms.** The existing urgent and prompt-assessment questions are presented first. A positive emergency red flag short-circuits the routine questionnaire and offers immediate-care guidance. A new lump, blood in semen or persistent ache routes to prompt assessment.
3. **About you.** Trying-to-conceive context, months trying, partner age and optional height/weight are collected. Height and weight are only sent to the local service for the existing BMI calculation.
4. **Medical history.** Existing B1–B8 questions are asked.
5. **Health and lifestyle.** Existing metabolic/lifestyle questions, alcohol selection, listed medicines and D7 sexual-function question are asked.
6. **Review.** The user can edit sections before sending. Blank answers remain absent/unknown and “Prefer not to say” is sent as null.
7. **Rules result.** The local API maps the request into the existing Python Intake and calls evaluate(). React displays the returned rules outcome, timeframe, safety-net flags and factors.

## Existing engine mapping

- The API uses the field names in triage.Intake directly.
- `build_intake()` in `api/intake.py` mirrors the original `app.py:build_intake()` mapping for consent, age, trying context, BMI, alcohol, medications and boolean question fields.
- No rules or thresholds are duplicated in TypeScript.
- The ML second opinion is not invoked by this flow. The UI explicitly reports this rather than implying a model or SHAP explanation was produced.

## Unknown answers

- Yes maps to `True`.
- No maps to `False`.
- Prefer not to say maps to `None`.
- A blank optional answer is omitted from JSON and defaults to `None` in the Pydantic request model.
- Unknown is never rewritten as No in the frontend or API mapper.
- The existing rules engine's safety-net and low-confidence behaviour is retained.

## Local API

- `POST /api/screening/triage` validates a strict payload and evaluates the existing rules.
- `GET /api/health` is a non-sensitive process health check.
- The API entry point binds to `127.0.0.1:8000` and disables Uvicorn access logs.
- CORS is allow-listed for the local Vite origin; the host middleware restricts accepted Host values to localhost.
- Response caching is disabled.
- No database, cloud service, browser persistence, health-data analytics or provider integration is used.

## Test coverage

`test_api.py` covers consent/age gates, R1 emergency precedence, R2 prompt assessment, unknown-vs-false semantics, safety-net flags, BMI mapping, trying-time fields, medication mapping and rejection of unknown/conflicting request fields.

## Explicit non-goals in this milestone

- No diagnosis, treatment, fertility prediction or probability is produced.
- No XGBoost inference or SHAP explanation is returned by the React workflow.
- No new lab or vital data is used to modify fertility/reproductive-health triage scores.
- No persistent storage, cloud sync, teleconsult booking or live specialist directory is implemented.
- Thresholds remain design defaults awaiting clinician review and external validation.

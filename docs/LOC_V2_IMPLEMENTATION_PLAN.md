# LOC V2 — Implementation Plan

## Product decision record

- Frontend: React + TypeScript + Vite.
- Data: local-first; no mandatory account, hosted database or automatic synchronization.
- Scope: complete product transformation.
- Existing Python clinical engine: preserve as the authoritative safety/rules implementation.
- ML: optional second opinion only; trained on synthetic data and not clinically validated.
- Product boundary: screening and care navigation, never definitive diagnosis or treatment.

## Architecture

```text
React + TypeScript (Vite)
  ├── Overview and navigation
  ├── Screening intake
  ├── Health timeline
  ├── Health insights and explanations
  ├── Care navigation
  └── Privacy centre
       |
       +-- local UI state
       +-- opt-in encrypted IndexedDB (future milestone)
       +-- optional local FastAPI service
               |
               +-- existing triage.py
               +-- existing model.py
               +-- existing cohort.py (simulation/testing only)
```

The local API is optional because a browser app cannot directly execute the Python model. If a local service is unavailable, the UI must not fabricate a model response. Safety-critical routing must remain in the preserved Python engine.

## Milestones

### M1 — Foundation and interface
- Create an isolated frontend package.
- Build responsive shell, navigation, overview and privacy centre.
- Keep health state in memory only.
- Make non-implemented modules explicit rather than implying they work.
- Preserve all existing Python code and tests.

### M2 — Health data and intake
- Structured symptom/history intake with every optional question skippable.
- Lifestyle and occupational exposure profile.
- Manual laboratory/vital entries with units, collection dates and source.
- Longitudinal timeline.
- Data validation and accessible form flows.

### M3 — Clinical intelligence
- Define a versioned local API contract.
- Map validated frontend inputs to existing Intake fields.
- Preserve consent/adult-age gates and red-flag overrides.
- Display rules outcome separately from ML second opinion.
- Show SHAP as model attribution, not causation.
- Handle unavailable model / low confidence / missing data without false reassurance.
- Add regression tests before integration.

### M4 — Care navigation and privacy
- Plain-language next-step guidance and safety-net wording.
- Provider discovery only from verifiable sources; clearly label demo content.
- No false booking/referral claims.
- Explicit consent before export/share.
- Add encrypted IndexedDB only after key lifecycle, threat model and consent UX review.
- User-controlled export, clear and deletion.

### M5 — Quality and release
- Clinical rule regression suite and independent clinician review.
- API contract, component, accessibility and end-to-end tests.
- Threat model and browser storage review.
- No health-data telemetry by default.
- Documentation that distinguishes synthetic evaluation from real clinical validation.
- Demo and deployment readiness checklist.

## Non-negotiable safeguards

1. Emergency red flags must never be downgraded by ML.
2. Unknown or skipped responses must not be silently treated as "no".
3. The ML score is not a clinical probability until externally validated and calibrated.
4. SHAP explains model behaviour, not medical causation.
5. Synthetic cohort/vignette agreement is not evidence of clinical accuracy.
6. No sensitive information sent to third parties without clear, specific, revocable consent.
7. Local browser storage is not inherently secure; persistent storage requires encryption and a reviewed key lifecycle.
8. Every screen must present LOC as screening/navigation support, not diagnosis.

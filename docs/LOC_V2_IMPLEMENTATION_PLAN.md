# LOC V2 — Implementation Plan

## Product decision record

- Frontend: React + TypeScript + Vite.
- Data: local-first; no mandatory account, hosted database or automatic synchronization.
- Existing Python clinical engine: preserve as the authoritative safety/rules implementation.
- ML: optional second opinion only; trained on synthetic data and not clinically validated.
- Product boundary: screening and care navigation, never definitive diagnosis or treatment.

## Architecture

```text
React + TypeScript (Vite)
  ├── Overview and navigation
  ├── Screening intake
  ├── Health timeline and record entry
  ├── Trend views (same metric + same unit only)
  ├── Health insights and explanations (future)
  ├── Care navigation (future)
  └── Privacy centre
       |
       +-- in-memory session state (current)
       +-- opt-in encrypted IndexedDB (future; security review required)
       +-- optional loopback FastAPI service
               |
               +-- existing triage.py
               +-- existing model.py (not connected to React screening)
               +-- existing cohort.py (simulation/testing only)
```

The local API is required for React to use the existing Python rules engine. The browser does not reimplement clinical decisions. If the local service is unavailable, the UI must not fabricate a screening result.

## Milestones

### M1 — Foundation and interface
- [x] React + TypeScript + Vite app scaffold.
- [x] Responsive shell, navigation, overview and privacy centre.
- [x] Memory-only initial state.
- [x] Existing Python clinical engine preserved.

### M2 — Guided screening and local rules API
- [x] Consent and adult-age gate.
- [x] Urgent symptoms before routine questions.
- [x] Medical history, lifestyle, review and result screens.
- [x] Strict FastAPI request schema and mapping to existing Intake.
- [x] API regression tests for red-flag precedence and skipped-answer semantics.
- [x] Explicitly disclose that ML / SHAP are not connected to the React flow.

### M3 — Longitudinal health records
- [x] Manual laboratory-result entry, including source-reported reference intervals.
- [x] Vital measurement entry with units.
- [x] Lifestyle check-in entry.
- [x] Occupational exposure entry without employer identifiers.
- [x] Session-only timeline, category filters, per-record delete and user-requested JSON export.
- [x] Trend chart groups only the same metric and unit.
- [x] No medical normal/abnormal classification or new inputs to the fertility/reproductive-health score.
- [ ] Browser review at desktop and mobile widths.
- [ ] Add end-to-end form interaction tests.

### M4 — Explainability and clinical intelligence
- Integrate only after an independently reviewed contract and regression plan.
- Display deterministic rules and ML second opinion separately.
- Explain SHAP as model attribution, not causation.
- Handle unavailable model, low confidence and missing data without false reassurance.
- Do not call a model score a clinical probability without external validation and calibration.

### M4 — Encrypted local storage (design first)
- [x] Draft threat model and encrypted-storage architecture proposal.
- [ ] Approve final KDF parameters, key hierarchy and browser support matrix after crypto review.
- [x] Build an isolated Web Crypto + Argon2id + BIP-39/HKDF spike with dummy data only (CI and device benchmarks pending).
- [ ] Implement versioned IndexedDB adapter with no plaintext health metadata.
- [ ] Add explicit opt-in, passphrase, unlock, lock and inactivity lock.
- [ ] Add encrypted backup/restore, passphrase change and deletion flows.
- [ ] Pass crypto, XSS/CSP, browser-storage and independent review gates.
- Keep session-only mode as the default; no silent persistence or cloud sync.

### M5 — Care navigation and privacy
- Plain-language next-step guidance and safety-net wording.
- Provider discovery only from verifiable sources; clearly label demo content.
- No false booking/referral claims.
- Explicit consent before export/share.

### M6 — Quality and release
- Clinical rule regression suite and independent clinician review.
- API contract, component, accessibility and end-to-end tests.
- Threat model and browser storage review.
- No health-data telemetry by default.
- Documentation that distinguishes synthetic evaluation from real clinical validation.
- Demo and deployment readiness checklist.

## Non-negotiable safeguards

1. Emergency red flags must never be downgraded by ML.
2. Unknown or skipped responses must not be silently treated as "no".
3. Health timeline records are contextual history only; they do not alter the existing triage score.
4. Display only source-provided reference intervals; do not infer a normal/abnormal label.
5. Trend charts must not mix measurement types or units.
6. The ML score is not a clinical probability until externally validated and calibrated.
7. SHAP explains model behaviour, not medical causation.
8. Synthetic cohort/vignette agreement is not evidence of clinical accuracy.
9. No sensitive information is sent to third parties without clear, specific, revocable consent.
10. Local browser memory is not secure persistence. Encrypted storage requires a reviewed key lifecycle.
11. Every screen must present LOC as screening/navigation support, not diagnosis.

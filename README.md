# LOC — Private Men's Health Check

**A privacy-conscious, rules-first screening and care-navigation research prototype for male reproductive health.**

LOC is designed to help adult men organise relevant health context, recognise when symptoms may need urgent attention, and understand a possible next step to discuss with a qualified healthcare professional.

> **Clinical boundary:** LOC is a research and demonstration prototype. It does not diagnose, predict fertility, prescribe treatment or replace a clinician. The triage thresholds are design defaults awaiting independent clinical review. No real-world clinical validation or patient-outcome claim is made.

## Current build: LOC V2

The active V2 interface is built with **React, TypeScript and Vite**. It communicates with a **local FastAPI service**, which validates the request and calls the existing Python triage engine. The browser does not reimplement clinical rules.

### What currently works in V2

- Responsive application shell and overview dashboard.
- Guided screening flow: consent and adult-age gate, urgent symptoms, personal context, medical history, lifestyle, review and result.
- Emergency red-flag questions are checked before routine questions. A positive emergency red flag short-circuits the routine questionnaire and presents urgent guidance.
- Skipped and “Prefer not to say” answers remain unknown (`None`/`null`); they are not silently converted to “No”.
- FastAPI validates a strict request model and maps inputs to the existing `triage.Intake` dataclass and `evaluate()` function.
- Results show the rules-based outcome, timeframe, safety-net messages and factors returned by the rules engine.
- User-initiated clinician-summary download.
- Manual health timeline entries for laboratory results, vital measurements, lifestyle check-ins and occupational exposures.
- Timeline category filters, per-record deletion and user-requested JSON export.
- Trend charts group only matching metric names and units.

### Important implementation boundaries

- **The React V2 workflow calls deterministic Python rules only.** The original XGBoost / TreeSHAP second-opinion model is not invoked by the V2 screening flow.
- The timeline is contextual history only. It does not change the existing reproductive-health triage score.
- V2 state is held in memory only. Browser refresh or closing the app may clear it.
- No health-record database, `localStorage`, `IndexedDB`, cloud persistence or automatic synchronization is enabled.
- The local API is intended to bind to `127.0.0.1` only. Do not expose it to a LAN or public network.
- Do not enter real or identifiable health information in this development build, particularly on shared or untrusted devices.

## Architecture

```text
React + TypeScript + Vite
  - Guided screening UI
  - Result and safety-net presentation
  - Manual health timeline and trend views
  - In-memory session state
          |
          | local HTTP request
          v
FastAPI (loopback only)
  - Strict request validation
  - Maps fields to the existing Python Intake
          |
          v
Python triage.py
  - Existing deterministic rules
  - evaluate() is the source of screening decisions

Separate / not connected to the V2 screening flow:
  - Legacy Streamlit application and synthetic-data ML model
  - M4.1 dummy-data encryption proof of concept
```

## Run LOC V2 locally

### Requirements

- Python 3.10 or newer
- Node.js 22.12 or newer
- npm

Keep two terminals open.

**Terminal 1 — local API (from the repository root):**

```bash
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python -m api
```

The API is expected at `http://127.0.0.1:8000`. Useful checks:

- `GET /` — local service summary
- `GET /api/health` — process health check

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

Optional API origin override: copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_LOC_API_URL` only to a trusted local service. Do not point health submissions to a public or third-party endpoint.

### Build and tests

Frontend:

```bash
cd frontend
npm run build
npm test
```

Python regression tests from the repository root:

```bash
python -m pytest -q
```

**Reproducibility note:** A committed `frontend/package-lock.json` and CI migration to `npm ci` remain an open dependency-reproducibility gate before persistent encrypted storage. Do not generate or claim a verified lockfile without reviewing the resolved dependency tree.

## Original Streamlit demonstrator (legacy)

The repository preserves the earlier Streamlit prototype at the root. It includes the original rules-first screening interface and a separate synthetic-cohort machine-learning second opinion.

Legacy hosted URL: [https://future-health-male-triage.streamlit.app/](https://future-health-male-triage.streamlit.app/)

This URL is the **legacy Streamlit demonstrator**, not the current React V2 build. Its behaviour and interface may differ from V2.

Run the legacy version locally:

```bash
pip install -r requirements.txt
streamlit run app.py
```

The legacy model uses a project-generated synthetic cohort and a small gradient-boosted model with feature-attribution explanations. It is research/demo code only. Its predictions are not clinically validated, and its output is not part of the current React V2 screening workflow.

## Evidence and evaluation

- The original project includes 60 written test vignettes authored against the designed triage protocol.
- Automated test suites cover triage behaviour, API mapping, cohort generation, model behaviour, vignettes and report generation.
- The legacy model is trained on synthetic data generated by project code; no real patient dataset is claimed.
- Vignette agreement measures consistency with the written protocol, not clinical accuracy.
- No clinical sensitivity, specificity, AUC, calibration, fairness or patient-outcome claim is made.

## M4.1 encryption research status

M4.1 is an **isolated proof of concept using dummy data only**. It explores browser cryptography, Argon2id, AES-GCM, a DEK/KEK key hierarchy and an optional offline recovery mechanism.

- The spike is not imported by the React application.
- It does not read or write health records.
- It does not use browser storage or IndexedDB.
- It does not enable persistent vault functionality.
- The mobile benchmark measures Argon2id derivation plus Web Crypto key import; it is not a complete vault-unlock or record-decryption benchmark.
- Two AI-assisted technical pre-reviews have been collected. They are not independent human audits.
- Independent human cryptographic review, final KDF/dependency decisions, production schema review and other entry gates remain pending.

**M4.2 IndexedDB persistence remains blocked.** Do not enable persistent health-record storage until the independent review is completed and the documented security gates are satisfied.

Read the current documents:

- [M4.1 benchmark and security pre-review](docs/LOC_V2_M4_1_BENCHMARK_AND_SECURITY_REVIEW.md)
- [Independent cryptographic review brief](docs/LOC_V2_M4_1_INDEPENDENT_CRYPTO_REVIEW_BRIEF.md)
- [M4.1 crypto spike](docs/LOC_V2_M4_1_CRYPTO_SPIKE.md)
- [Encrypted storage architecture proposal](docs/LOC_V2_ENCRYPTED_STORAGE_ARCHITECTURE.md)
- [Tracking issue #13](https://github.com/SanchitKRai/future-health-male-triage/issues/13)

## Clinical, privacy and safety safeguards

1. Emergency red flags must never be downgraded by an ML model.
2. Unknown or skipped responses must not be silently treated as “No”.
3. The existing Python engine remains the source of screening decisions.
4. Timeline records do not modify the existing triage score.
5. Trend views must not mix different metrics or units.
6. Synthetic cohort and vignette results are not clinical validation.
7. No sensitive information is sent to third parties by design in the local V2 workflow.
8. Local browser memory is not secure persistence; no production-vault protection is claimed.
9. Any clinical pilot requires clinical ownership, appropriate governance and ethics review, prospective validation, privacy/security assessment and approved clinical workflows.

## Project documentation

- [LOC V2 implementation plan](docs/LOC_V2_IMPLEMENTATION_PLAN.md)
- [Data and API boundaries](docs/LOC_V2_DATA_AND_API_BOUNDARIES.md)
- [Guided screening flow](docs/LOC_V2_SCREENING_FLOW.md)
- [Frontend setup and current capabilities](frontend/README.md)
- [M4.1 security review brief](docs/LOC_V2_M4_1_INDEPENDENT_CRYPTO_REVIEW_BRIEF.md)

## Licence

The repository declares the MIT License. See [LICENSE](LICENSE). Third-party packages, fonts and other external materials retain their own licences and attribution requirements.

## Disclaimer

This software is a research and demonstration prototype, not a medical device or clinical service. It does not provide medical advice, diagnosis or treatment. Do not use it to make or delay a medical decision. In an emergency, contact local emergency services or go to the nearest emergency department.

# LOC V2 — React frontend and local screening API

React + TypeScript + Vite frontend for the Future Health / LOC men's health screening and care-navigation prototype.

## Requirements

- Node.js 22.12 or newer
- Python 3.10 or newer
- npm

## Run locally

LOC V2 uses two local processes. Keep both terminals open.

**Terminal 1 — local screening API (from repository root):**

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
python -m api
```

The API binds to `127.0.0.1:8000` only. Access logging is disabled, the host header is restricted to localhost, and CORS only allows the local Vite origins configured in `api/main.py`.

**Terminal 2 — React frontend:**

```bash
cd frontend
npm ci
npm run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:5173`). This is the LOC user interface.\n\nYou can verify the API separately at `http://127.0.0.1:8000/` (service summary) or `http://127.0.0.1:8000/api/health` (health check). The API root is not the React application.

Optional API origin override: copy `.env.example` to `.env.local` and change `VITE_LOC_API_URL`. Keep it pointed at a trusted local service. Do not point health submissions to a public or third-party endpoint.

## M4.1 on-device Argon2id benchmark (dummy data only)

While the Vite dev server is running, open `http://127.0.0.1:5173/crypto-benchmark.html`. The benchmark performs one warm-up and five measured Argon2id passphrase-key derivations using a fixed synthetic test passphrase and fresh random salts. It never asks for a real passphrase or recovery phrase, and it does not send or persist benchmark results. Download the JSON report locally and compare results across supported devices. Do not change KDF settings based on one run or lower them below the documented baseline to improve performance.

## Build and test

Frontend:

```bash
cd frontend
npm run build
npm test
```

Python regression suite from repository root:

```bash
python -m pytest -q
```

## Current capabilities

- Responsive app shell and overview dashboard
- Guided screening: consent, urgent symptoms, personal context, medical history, lifestyle, review and result
- Urgent symptom short-circuit before routine questions
- Optional questions preserve unknown / prefer-not-to-say as `None`, not `False`
- Typed local API request/response models
- Python API maps submitted fields into the existing `triage.Intake` dataclass and calls the existing `evaluate()` rules engine
- Result page shows the rules-based outcome, timeframe, safety-net messages and factors returned by the rules
- User-initiated clinician summary download
- Health timeline with manual lab, vital, lifestyle and occupational exposure entries
- Category filters, user-requested JSON export and per-record deletion
- Measurement trend charts only for matching metric names and units
- In-memory browser state only; no localStorage, IndexedDB or cloud persistence

## Clinical and privacy boundaries

- LOC is screening and care-navigation support, not diagnosis, treatment or a fertility prediction.
- The existing Python rules engine remains the source of triage decisions. No clinical rule is reimplemented in React.
- The API calls deterministic rules only. The experimental XGBoost / TreeSHAP second opinion is explicitly not connected in this React workflow.
- A “Yes” to an emergency red-flag question stops the routine questionnaire and offers urgent guidance. It does not replace emergency care.
- Unanswered and “Prefer not to say” responses remain unknown. The rules engine's existing low-confidence and safety-net behaviour is preserved.
- The local API binds to loopback only when launched with `python -m api`; do not expose it to a LAN or public network.
- Request/response caching is disabled and Uvicorn access logs are disabled in the provided entry point. No health payload is written to a database, file, browser storage or application log.
- Do not enter real health information on a shared or untrusted device. Browser memory and a localhost service are not a substitute for a security audit.
- Encrypted persistent storage remains disabled pending device benchmarking, reproducible dependency locking and independent cryptographic review. See `docs/LOC_V2_M4_1_BENCHMARK_AND_SECURITY_REVIEW.md`.

This remains a research and demonstration prototype. Its thresholds are design defaults awaiting independent clinician review, and the ML model is trained on simulated data rather than real patients.

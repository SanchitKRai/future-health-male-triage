# LOC V2 — Milestone 1 verification checklist

## Implemented

- [x] Isolated React + TypeScript + Vite app under frontend/
- [x] Responsive navigation and application shell
- [x] Overview dashboard
- [x] Explicit routes for screening, timeline, insights and care navigation
- [x] In-memory state store only
- [x] Privacy centre with session export and clear-session controls
- [x] No third-party font request or health-data network call in the frontend scaffold
- [x] Existing Python triage, ML, cohort and test files preserved
- [x] Product roadmap and local data/API boundaries
- [x] GitHub Actions CI for frontend and Python regression checks
- [x] Unit tests for in-memory store and structured health-record validation

## Verification status

- [x] User-confirmed frontend production build passed before the M2 data-contract additions.
- [x] Frontend production build passed on the latest M2 branch commit (GitHub Actions).
- [x] GitHub Actions frontend build and unit tests passed on the latest branch commit.
- [x] GitHub Actions Python regression suite passed on the latest branch commit (114 tests).
- [ ] Visual review at desktop width.
- [ ] Visual review at mobile width.
- [ ] Test all sidebar routes and mobile menu.
- [ ] Verify privacy export downloads JSON.
- [ ] Verify clear-session asks for confirmation and clears the in-memory store.
- [ ] Inspect browser Network panel for unexpected external requests.
- [ ] Verify keyboard focus and reduced-motion behaviour.

## Local verification

From the repository root:

```bash
cd frontend
npm install
npm run build
npm test
npm run dev
```

In another terminal, run the original Python regression suite:

```bash
python -m pytest -q
```

## Important

The frontend currently uses in-memory state only. Do not enter real sensitive health information in this development prototype. Encrypted IndexedDB is not implemented.

The original M1 foundation has been merged into main. Visual review remains outstanding. This follow-on branch adds CI and M2 data contracts; do not treat M1 as visually signed off until the desktop/mobile checks above are complete.

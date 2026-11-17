# LOC V2 — Milestone 1 checklist

## Implemented in this branch

- [x] Isolated React + TypeScript + Vite app under `frontend/`
- [x] Responsive navigation and application shell
- [x] Overview dashboard
- [x] Placeholder routes that clearly identify future modules
- [x] Local in-memory state store
- [x] Privacy centre with explicit current capabilities
- [x] Export and clear-session actions
- [x] No external font imports or health-data network calls
- [x] Existing Python triage, ML, cohort and test files left untouched
- [x] Product roadmap and local-data/API boundary documentation

## Required local verification

Run from the repository root:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Then manually verify:
- [ ] Dashboard renders at desktop and mobile widths
- [ ] Each sidebar link opens the expected route
- [ ] Mobile menu opens and closes
- [ ] Privacy export downloads JSON
- [ ] Clear-session action asks for confirmation and clears state
- [ ] Browser devtools Network panel shows no health-data request or third-party font request
- [ ] Keyboard focus is visible and reduced-motion preferences are respected

Run the preserved Python regression suite from the repository root:

```bash
python -m pytest
```

## Validation status

The source scaffold has been statically reviewed. A production build and browser-level test have not been run in this environment because this session could not fetch the repository into a local build workspace or install npm dependencies. Do not treat the milestone as build-verified until the commands above pass.

## Exit criteria

Milestone 1 is complete when the production build succeeds, the responsive navigation and privacy controls pass the manual checks, and the unchanged Python test suite remains green.

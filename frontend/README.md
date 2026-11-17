# LOC V2 — Frontend foundation

React + TypeScript + Vite interface scaffold for the Future Health / LOC men's health screening and care-navigation prototype.

## Requirements

- Node.js 22.12 or newer (required by the selected Vite toolchain)
- npm

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
npm run preview
```

## Current scope

- Responsive application shell and navigation
- Overview dashboard
- Privacy centre with session export and clear-session controls
- Typed Zustand state held in memory only
- Placeholder routes for screening, timeline, insights and care navigation

## Privacy and clinical boundaries

This milestone does not persist health information. State is held in memory and may be lost on refresh or close. Do not enter real sensitive health data in this development prototype.

No cloud API, analytics, third-party health-data service or clinical inference is connected. The existing Python triage and ML modules remain untouched in the repository root. They must be integrated through a separately reviewed local API contract; do not reimplement their safety logic in the browser.

LOC is screening and care-navigation support, not a diagnosis or treatment service.

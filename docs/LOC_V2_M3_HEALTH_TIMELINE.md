# LOC V2 — M3 longitudinal health records

## User experience

The Health Timeline module provides four manual record types:

1. **Laboratory results:** numeric or text result, exact test name, unit for numeric values, collection date, optional laboratory/source name, and optional reference interval transcribed from the report.
2. **Vital measurements:** weight, height, systolic and diastolic blood pressure, and resting heart rate. Units are explicit and retained with each reading.
3. **Lifestyle check-ins:** a date range plus optional average sleep, weekly activity, tobacco use, alcohol pattern and self-rated stress.
4. **Occupational exposure:** category, frequency, approximate duration and protective-equipment use. The initial form does not request employer names or site identifiers.

## Timeline behaviour

- Records appear in reverse chronological order.
- Users can filter by record category.
- Users may delete an individual record from the current session.
- Users can explicitly export a JSON copy.
- Trend charts include numeric lab results and vital measurements only.
- Trend grouping keys include record family, metric/test name and unit. Different units are never charted together.
- At least two readings are required before a line is drawn; a single value is shown as a single reading without suggesting a trend.

## Data handling

- The existing Zustand store remains in memory only.
- No health timeline record is written to localStorage, IndexedDB, cookies, files or a database automatically.
- Refreshing or closing the application may clear records.
- JSON export is triggered only by the user's explicit action.
- No lab PDF/image upload or OCR is provided.
- Do not enter real sensitive health information in a shared or untrusted device while this remains a development prototype.

## Clinical boundary

- This module records and displays user-entered information; it does not classify a lab result as normal or abnormal.
- A reference interval is shown only if a user transcribes it from their own report. It is labelled as source-reported and is not treated as a universal range.
- LOC does not convert units automatically.
- Trend lines are descriptive visualisations, not diagnosis, risk scores, causal explanations or treatment advice.
- Lifestyle and occupational-exposure records are contextual data only. They are not sent to the existing fertility/reproductive-health triage engine and do not change its score.
- A healthcare professional should interpret laboratory results and measurements in clinical context.

## Verification

Frontend CI runs TypeScript build and Vitest tests. Unit tests cover trend ordering, unit separation, separation of lab and vital metric families, and exclusion of text/lifestyle records from numeric charts. The existing Python clinical regression suite is run unchanged.

Before release, manually verify all four forms, data entry/edit mistakes, category filters, per-record deletion, JSON export, no-data behaviour, chart selection, keyboard access and mobile layout.

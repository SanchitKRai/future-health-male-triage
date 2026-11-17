# LOC V2 — M2 data contract

## Purpose

M2 adds structured, user-entered health context. Records support personal history, trend visualisation and preparation for a clinician conversation. They do not automatically alter the existing reproductive-health triage score.

## Record families

1. **Laboratory result:** test name, numeric or text result, unit where applicable, collection date, optional laboratory name, and optional reference interval copied from the laboratory report.
2. **Vital measurement:** named measurement, numeric value and unit. Each measurement is recorded independently with its own date.
3. **Lifestyle check-in:** a user-selected reporting period and optional sleep, activity, tobacco, alcohol and self-rated stress fields.
4. **Occupational exposure:** exposure category, frequency, approximate duration and protective-equipment use. The initial form should not ask for employer name.

## Data integrity rules

- Store the unit alongside every numeric value.
- Keep the collection/measurement date distinct from the date the record was entered.
- Preserve the laboratory's own reference interval and unit if supplied.
- Never infer a high/low/normal label without appropriate validated clinical context.
- Do not silently convert units in the first implementation.
- Do not ingest uploaded laboratory PDFs or images until local file handling, retention, deletion and threat-model decisions are approved.
- Avoid employer names and unnecessary free-text identifiers in the initial exposure form.
- Validation checks data integrity only. It does not classify a result medically.

## Clinical boundary

The existing Python triage and ML modules remain the only current screening implementation. M2 health records are contextual data only. HbA1c, lipid values, blood pressure, lifestyle data and occupational exposures must not be mapped into fertility or reproductive-health risk scores without an explicitly defined, independently reviewed clinical protocol and appropriate validation.

The current intake already has heat-exposure and workplace chemical/radiation questions. The broader exposure record does not replace or silently rewrite those existing inputs.

## Storage boundary

M2 forms and validators initially operate in memory only. Encrypted IndexedDB is a separate milestone requiring a documented threat model, explicit opt-in, key lifecycle, idle-lock behaviour and verified export/deletion. No sensitive health record is written to localStorage, cookies or cloud services.

## M2 sequence

1. Build the screening intake form against the current Python Intake fields, preserving optional/unknown answers.
2. Add lifestyle and workplace exposure history as separate contextual sections.
3. Add manual lab and vital entry with units, dates and source provenance.
4. Add a timeline that displays recorded values without asserting diagnosis or risk.
5. Review all copy and clinical mappings with a qualified clinician before enabling any derived screening interpretation.

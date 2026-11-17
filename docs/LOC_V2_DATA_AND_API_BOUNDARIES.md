# LOC V2 — Data and API boundaries

## Foundation milestone

- UI state is in memory only.
- Browser refresh or close may clear data.
- Do not enter real identifiable or sensitive health information in this development build.
- No health-data API calls, analytics, cloud database, cookies or browser persistence are enabled.

## Planned local API

The React client may later call a loopback-only FastAPI service. This is not implemented in M1.

The service must:
- bind to loopback only by default;
- validate payload shape and API version;
- call the existing Python triage engine without changing safety precedence;
- return an explicit rules result and optional ML second opinion;
- omit ML output if the model is unavailable;
- avoid logging health payloads;
- never accept browser-provided triage decisions as authoritative.

## Persistent local storage

Encrypted IndexedDB is planned, not implemented. Before enabling it, define:
- a threat model covering shared devices, browser-profile access, malware and backup/sync;
- encryption algorithm and Web Crypto usage;
- key creation, unlock, recovery and deletion;
- idle locking and screen privacy;
- explicit opt-in and no persistence by default;
- export/deletion verification.

A consent preference must not imply encryption or persistence exists until it actually does.

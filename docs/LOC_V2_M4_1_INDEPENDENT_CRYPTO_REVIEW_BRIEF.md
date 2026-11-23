# LOC M4.1 — Independent Cryptographic Review Brief

**Status:** Ready for external reviewer handoff  
**Purpose:** Independent review of the M4.1 cryptographic proof of concept and proposed local-vault design  
**Important:** This brief is not an audit, certification, or approval. No independent review has been performed by creating this document.

## 1. Review objective

Obtain a qualified, independent cryptography/security review before any persistent health-data storage work begins.

The reviewer should assess whether the proposed key hierarchy and cryptographic operations are sound for the stated threat model, identify implementation defects and misuse risks, and state what must change before a production vault can be designed or enabled.

The current implementation is a **dummy-data-only spike**. It is not connected to React product flows, Zustand, IndexedDB, localStorage, sessionStorage, the LOC API, or health-record types. The reviewer must not infer production readiness from passing unit tests or benchmark timings.

## 2. Scope and source files

Review these exact files from the LOC `main` branch:

| File | Review purpose |
|---|---|
| `frontend/src/crypto-spike/vaultCryptoSpike.ts` | Key hierarchy, Argon2id, HKDF, BIP-39 entropy encoding, AES-GCM wrapping, AAD, validation, rotation and temporary key handling |
| `frontend/src/crypto-spike/vaultCryptoSpike.test.ts` | Existing cryptographic and malformed-input tests; assess missing cases |
| `frontend/package.json` | Direct crypto dependency versions and dependency ranges |
| `docs/LOC_V2_ENCRYPTED_STORAGE_ARCHITECTURE.md` | Proposed threat model, storage design, lifecycle, recovery and backup boundaries |
| `docs/LOC_V2_M4_1_CRYPTO_SPIKE.md` | Spike decisions, parameters and known limitations |
| `docs/LOC_V2_M4_1_BENCHMARK_AND_SECURITY_REVIEW.md` | Benchmark evidence and internal pre-review findings |

The temporary public mobile benchmark repository was unpublished and archived after data collection. Its reports are retained at:

`https://github.com/SanchitKRai/loc-m4-1-mobile-benchmark/tree/main/docs/benchmarks/live_mobile`

The mobile benchmark measures Argon2id derivation plus import of a non-extractable AES-GCM key. It is performance evidence only, not cryptographic validation.

## 3. Design under review

### Candidate key hierarchy

1. Generate a random 256-bit data-encryption key (DEK) using the browser CSPRNG.
2. Derive a passphrase key-encryption key (KEK) using Argon2id v1.3 and a fresh 16-byte salt.
3. Optionally generate 256 bits of independent random recovery entropy, encoded as a BIP-39 24-word mnemonic. LOC uses the mnemonic as a reversible entropy encoding, not BIP-39 wallet-seed derivation.
4. Derive a separate recovery KEK from that high-entropy random recovery input with HKDF-SHA-256, a fresh salt and a domain-separated context string.
5. Wrap the same DEK independently under the passphrase KEK and optional recovery KEK using AES-GCM.
6. Encrypt records independently with the DEK and fresh AES-GCM IVs.
7. Credential rotation re-wraps the same DEK. A suspected DEK compromise requires a separate new-DEK/re-encryption procedure.

### Current spike parameters

| Parameter | Current candidate |
|---|---:|
| Argon2id version | 1.3 |
| Memory | 19,456 KiB |
| Iterations | 2 |
| Parallelism | 1 |
| Output | 32 bytes |
| Argon2id salt | 16 random bytes |
| Recovery KDF | HKDF-SHA-256 |
| AES | AES-256-GCM |
| IV | 12 random bytes |
| Authentication tag | 128 bits |

These parameters are a benchmarked candidate, not a production decision. Do not approve them solely because measured execution time is low.

## 4. Required independent review questions

### A. KDF and passphrase handling

- Is Argon2id v1.3 correctly configured and invoked through the selected `hash-wasm` version?
- Are the memory, iteration and parallelism values appropriate for the documented threat model and offline-guessing resistance?
- Is the passphrase normalization policy unambiguous and consistent across browsers, keyboards and Unicode inputs?
- Is the minimum passphrase policy defensible? Does the UX need length guidance or strength feedback?
- Could imported/tampered KDF metadata cause resource exhaustion or downgrade? Is strict versioned allow-listing sufficient?
- What migration policy is needed if the KDF library or parameters change?
- What dependency supply-chain checks and reproducible-build requirements are required before use?

### B. Key hierarchy and key wrapping

- Is generating one random DEK and independently wrapping it under separate passphrase and recovery KEKs appropriate?
- Are key sizes, import usages and non-extractability choices appropriate?
- Does the implementation avoid accidental DEK/KEK exposure through return values, logs, error paths, developer tools or serialization?
- Are the wrapper AAD fields sufficient and canonically encoded?
- Are format versions and algorithm identifiers safely bound to authentication?
- Are there edge cases involving partial wrapper creation, failed encryption or failed credential rotation that leave an unusable envelope?

### C. Recovery phrase and HKDF

- Is the use of BIP-39 256-bit entropy as a reversible 24-word offline secret encoding correct for this purpose?
- Is use of entropy decoding, rather than wallet-seed derivation, correct and documented clearly enough?
- Is HKDF-SHA-256 appropriate for the already high-entropy recovery secret?
- Is the recovery domain-separation context sufficiently unique and versioned?
- Are phrase normalization, checksum validation, entropy copies and error handling safe?
- Are the user-facing recovery semantics accurate: phrase is an additional unlock credential, not a backup or server recovery mechanism?

### D. AES-GCM, IVs and AAD

- Are 96-bit IVs generated by a cryptographically secure random generator for every encryption operation?
- Is the IV uniqueness risk acceptable for the anticipated number of encryptions under a DEK? Should a counter-based or otherwise managed nonce strategy be considered?
- Is AAD complete for key wrappers and record envelopes, including vault ID, record ID, format version, wrap type and relevant KDF metadata?
- Can ciphertext, record or wrapper substitution, reordering, replay or cross-vault transplant occur?
- Are authentication failures handled safely without leaking sensitive distinctions?

### E. Runtime validation and malicious inputs

- Are untrusted serialized envelopes validated before expensive KDF work?
- Are all required fields, types, lengths, versions and nested parameter objects checked?
- Are there parser edge cases, oversized-input paths or denial-of-service concerns?
- What production schema should be distinct from the dummy-spike schema?
- What tests are missing for malformed JSON, unknown versions, missing properties, unusual Unicode, tampered metadata and storage corruption?

### F. Memory lifecycle and browser execution

- Are best-effort byte-array overwrites placed correctly?
- Which copies may survive in JavaScript, WebAssembly, `ArrayBuffer` copies, Web Crypto internals or garbage-collected objects?
- Are non-extractable `CryptoKey` objects being used correctly without claiming they protect against same-origin malicious script?
- What should the product promise about clear/lock behaviour, and what must it explicitly not promise?
- Should the design account for tab suspension, process termination, browser crashes and device sleep?

### G. Rotation, compromise, backup and loss

- Does wrapper rotation correctly preserve the DEK and existing ciphertext when the DEK remains trusted?
- Is the separate response to suspected DEK compromise technically correct and complete?
- How should old exported backups with old wrappers be handled?
- Are recovery-loss and device-loss semantics accurate?
- What invariants are necessary for future transactional backup/restore?

### H. Product threat boundary

- Does the design accurately state what client-side encryption does and does not protect against?
- Are same-origin XSS, malicious extensions, compromised devices, local browser-profile access and screen capture treated appropriately?
- What minimum CSP, dedicated-origin, dependency and application-security controls are prerequisites?

## 5. Benchmark evidence available to reviewer

Nine live mobile sessions were collected (three runs per profile). The measurements are not full-vault-unlock timings.

| Profile | Session medians | Average session median |
|---|---:|---:|
| Android phone · Chrome | 43.5, 43.8, 43.5 ms | 43.6 ms |
| iPhone / iPad · Safari | 46.7, 45.1, 43.7 ms | 45.2 ms |
| Other mobile browser | 43.6, 43.9, 41.7 ms | 43.1 ms |

Across all mobile sessions, average of session medians is 43.9 ms; pooled median of the 45 samples is 43.8 ms. The supplied desktop reference is 48.9 ms (average of three desktop session medians). Broad device labels were intentionally used; exact model, OS build and browser build details are not available. The “Other mobile browser” runtime is not precisely identified.

The candidate remains 19,456 KiB / 2 iterations / parallelism 1. Benchmark results must not be used as a substitute for a security review or to justify silent KDF downgrades.

## 6. Known implementation and process caveats to verify

These are review prompts, not conclusions that a vulnerability exists:

- The spike is intentionally limited to one fixed dummy-record shape. Its parser is not a production vault schema.
- The current code uses best-effort byte-array clearing; JavaScript/WebAssembly cannot guarantee secure memory zeroization.
- The recovery derivation path creates an `ArrayBuffer` copy of the entropy for Web Crypto import; assess residual-copy handling realistically.
- The benchmark helper clears salt on its normal success path; inspect exceptional paths and decide whether any additional cleanup is warranted.
- The code is not designed for production record sizes, concurrent writes, IndexedDB transactions, migrations or backups.
- No independent cryptographic review has yet been performed.
- `frontend/package-lock.json` is committed and CI uses `npm ci`. Dependency provenance and the resolved dependency tree still require review before production use.
- The internal review document was authored alongside the spike and must not be represented as an independent audit.

## 7. Expected reviewer deliverables

Request a written report containing:

1. Reviewer identity, relevant cryptography/security experience, review date and conflict-of-interest statement.
2. Exact commit SHA and files reviewed.
3. Review scope, methods and explicit exclusions.
4. Findings with severity, affected code path, reproducible scenario or rationale, impact and recommended remediation.
5. Separate conclusions for the current dummy spike and the proposed production architecture.
6. Assessment of KDF parameter adequacy and dependency/supply-chain risks.
7. Required fixes and tests before M4.2 can begin.
8. Explicit statement whether the design is acceptable to proceed to a production implementation design, not a blanket product security certification.

No finding should be marked resolved solely by changing documentation. Technical remediations must have code/tests and a re-review where appropriate.

## 8. Entry gate after review

M4.2 remains blocked until:

- Independent review has been completed and findings are remediated or explicitly accepted by the project owner.
- A trusted, committed frontend lockfile exists and CI uses `npm ci`.
- Formal supported-browser/device matrix and acceptable unlock latency are approved.
- Final KDF parameters and dependency versions are approved.
- Production vault metadata and encrypted-record schemas are separately specified and reviewed.
- Credential rotation is clearly separated from suspected DEK compromise.
- The threat model, lifecycle tests and fail-closed behaviour are approved.

**Current decision:** Do not add IndexedDB persistence or enable persistent health-data storage during this review handoff.

# LOC V2 — M4.1 cryptography spike

**Status:** Experimental proof of concept using synthetic dummy data only. Not connected to the application and not approved for production. Initial desktop and nine mobile benchmark sessions are collected; independent cryptographic review remains pending. M4.2 remains blocked.

## Scope

This spike tests the cryptographic building blocks for the proposed optional offline recovery phrase. A separate development-only benchmark page measures the candidate Argon2id passphrase-derivation cost on real devices. Neither the spike nor benchmark is connected to persistent health-data storage or production LOC screens.

### Candidate libraries checked

- `@scure/bip39` 2.4.0 for BIP-39 24-word phrase encoding/decoding and checksum validation. Project/NPM reference: https://www.npmjs.com/package/@scure/bip39
- `hash-wasm` 4.13.0 for Argon2id v1.3 in browser/WebAssembly. Project/NPM reference: https://www.npmjs.com/package/hash-wasm
- Native Web Crypto `SubtleCrypto` for AES-GCM and HKDF. References: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey and https://developer.chrome.com/docs/modern-web-guidance/guides/security/client-side-encryption

These versions were checked during the M4.1 implementation. Dependencies still require a security review and lockfile/provenance review before production.

## Candidate flow proven in code

1. Generate a random 256-bit DEK in memory.
2. Derive a passphrase KEK using Argon2id v1.3 with a fresh 128-bit salt.
3. Generate an independent 256-bit recovery secret using the browser CSPRNG and encode it as a BIP-39 24-word mnemonic. The phrase includes the standard BIP-39 checksum. LOC uses `mnemonicToEntropy()` to recover the 32-byte random entropy; it does not use the BIP-39 wallet seed derivation function.
4. Derive a separate recovery KEK using HKDF-SHA-256 from that already-high-entropy recovery secret, a separate fresh salt and domain-separated info string `LOC vault recovery KEK v1`.
5. Wrap the same DEK independently under the passphrase KEK and recovery KEK.
6. Encrypt a fixed synthetic dummy payload with the DEK.
7. Unlock the same dummy payload independently through either wrapper.
8. Re-authenticate through one existing credential, then rotate both wrappers while keeping the existing dummy ciphertext byte-for-byte unchanged.

## Candidate parameters (not production approval)

### Argon2id passphrase KDF

- Memory: 19,456 KiB (19 MiB)
- Iterations: 2
- Parallelism: 1
- Output: 32 bytes (256-bit AES key material)
- Salt: 16 random bytes

These parameters match OWASP's documented minimum Argon2id configuration (19 MiB, 2 iterations, parallelism 1). They are used as a spike baseline only. The final setting must be selected after real-device performance and memory benchmarking, including lower-end Android devices and mobile Safari. Do not blindly raise memory based on desktop performance or lower the cost silently on constrained devices.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

### Recovery KDF

- Input: 32-byte random recovery entropy decoded from the BIP-39 phrase.
- KDF: HKDF-SHA-256.
- Salt: fresh 16-byte random salt.
- Context: fixed, versioned domain-separation string.

HKDF is used only for the high-entropy random recovery secret, not for a human-chosen passphrase.

### Authenticated encryption

- AES-GCM, 256-bit key.
- 12-byte fresh random IV for each encryption operation (DEK wrapper and dummy record are separate operations).
- 128-bit authentication tag.
- Key-wrapper AAD binds vault ID, format version, wrapper kind, KDF identifier, KDF salt and Argon2id parameters.
- Dummy-record AAD binds record ID and record format version.

## Test coverage

- Valid 24-word recovery phrase and 256-bit entropy encoding.
- Phrase is not present in the stored envelope representation.
- Independent passphrase and recovery unlock.
- Incorrect passphrase and invalid recovery phrase rejection.
- Fresh 12-byte IVs for passphrase wrapper, recovery wrapper and dummy record.
- Rejection of tampered wrapper ciphertext, salt, vault ID, record ID, record IV, record ciphertext, KDF parameters and format version.
- Credential rotation through the recovery phrase; old passphrase and old recovery phrase are rejected, new credentials unlock, and dummy record ciphertext remains unchanged.
- Passphrase-only vault when recovery is declined.
- Bounded runtime envelope and credential validation, including rejection of unknown nested Argon2 metadata.
- Cross-vault encrypted-record substitution rejection.
- Local Argon2id benchmark runner (one warm-up plus five timed samples; no network or browser persistence).

## Explicit non-goals

- No health data is used. The only plaintext is a fixed synthetic string in the test.
- No IndexedDB, localStorage, sessionStorage, cookies, filesystem or database writes.
- No Zustand integration, application UI, consent screen, auto-lock or production vault format.
- No encrypted backup/restore implementation.
- No production recovery phrase display, copy, print or download flow.
- No claim of memory zeroization: JavaScript and WebAssembly runtimes do not guarantee immediate erasure, even when temporary byte arrays are overwritten on a best-effort basis.
- No claim that encryption protects against malicious JavaScript/XSS in the same origin while the vault is unlocked.

## Known limitations / open review items

- Initial mobile profile reports are available in the archived [temporary benchmark repository](https://github.com/SanchitKRai/loc-m4-1-mobile-benchmark/tree/main/docs/benchmarks/live_mobile). They include broad Android Chrome, iPhone/iPad Safari and other-mobile-browser labels, but not exact model/OS/browser build details. These measurements cover derivation plus non-extractable AES key import only; they are not full vault-unlock or storage timings.
- The repository does not yet contain `frontend/package-lock.json`, and CI uses `npm install`; dependency resolution is not reproducible enough for a production crypto feature.
- BIP-39 is a standard mnemonic encoding; LOC uses it as an offline secret representation, not as a cryptocurrency wallet. The recovery UX and threat of photographing/copying the phrase require user testing.
- The exact production key-wrapping envelope, algorithm/version migration, and backup format still need independent cryptographic review. A dedicated reviewer brief is available at [LOC_V2_M4_1_INDEPENDENT_CRYPTO_REVIEW_BRIEF.md](LOC_V2_M4_1_INDEPENDENT_CRYPTO_REVIEW_BRIEF.md), tracked in [issue #13](https://github.com/SanchitKRai/future-health-male-triage/issues/13).
- A recovery phrase only unlocks an existing vault or encrypted backup; it cannot restore a deleted browser profile or lost device without a backup.
- Old exported backups may retain old wrapper envelopes after credential rotation. Rotation cannot revoke copies already exported.
- WebCrypto's non-extractable key does not protect against malicious same-origin code that can invoke operations while the vault is unlocked.

## Verification recorded for M4.1

- [x] Frontend TypeScript check and production build passed on PR #11.
- [x] 22 frontend tests passed in CI on PR #11.
- [x] Existing Python regression suite passed unchanged (127 tests) on PR #11.
- [x] Dummy record ciphertext is bound to vault ID, record ID and format version.
- [x] The follow-up benchmark/review branch passes frontend production build and all 25 frontend tests.
- [x] The follow-up branch passes the unchanged Python regression suite (127 tests).
- [x] The follow-up branch includes bounded runtime validation for the dummy envelope and credential object.

Follow-up CI run: https://github.com/SanchitKRai/future-health-male-triage/actions/runs/44463216661

## Exit criteria before M4.2

- [x] Frontend production build passes.
- [x] All crypto-spike and benchmark unit tests pass in CI (25 frontend tests total on the follow-up branch).
- [x] Existing Python regression suite passes unchanged (127 tests).
- [x] Local on-device benchmark runner is implemented.
- [x] Add a local-only Argon2id benchmark runner that uses dummy data and never sends results.
- [x] Collect initial desktop reference and nine mobile-profile benchmark sessions; validate all mobile JSON summary values against raw samples.
- [ ] Approve formal device/browser support matrix, including exact versions and acceptable unlock latency.
- [ ] Review recovery phrase word encoding, confirmation UX and offline storage guidance.
- [ ] Independent review of key hierarchy, AAD, IV handling, rotation and backup threat model (reviewer handoff brief prepared; no independent review completed).
- [ ] Approve production KDF parameters and library versions.
- [x] Confirm no application route or health-record flow imports this spike module.
- [ ] Add and review a committed npm lockfile; switch CI to `npm ci` before M4.2.

Until all gates are met, the spike remains isolated and encrypted persistent storage remains disabled.

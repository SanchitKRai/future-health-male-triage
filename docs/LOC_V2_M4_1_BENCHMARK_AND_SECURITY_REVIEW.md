# LOC V2 — M4.1 benchmark and security pre-review

**Date:** 2026-11-19

**Status:** Benchmark harness implemented; CI passed on PR #12; real-device measurements pending. This document is an internal code review/pre-review, **not an independent cryptographic audit**. M4.2 IndexedDB persistence remains blocked.

## 1. Run the on-device benchmark

1. Check out the `loc-v2-m4-benchmark-review` branch.
2. From the repository root, install the frontend dependencies and start Vite:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. On the device being measured, open `http://127.0.0.1:5173/crypto-benchmark.html`.
4. Optionally enter a device label such as `entry-level Android phone · Chrome`.
5. Select **Run 5 measurements**. The page does one warm-up plus five measured Argon2id runs, each with a fresh random 16-byte salt.
6. Download the JSON report locally. The benchmark page does not upload the report or save it to browser storage.
7. Repeat the full run three times on each supported device, ideally after closing heavy apps and allowing the device to return to normal temperature.

### Benchmark safety

- Uses a fixed synthetic passphrase that is compiled into the benchmark code; it is not the user's passphrase.
- Never enter a vault passphrase, recovery phrase or health information into the benchmark page.
- Only the Argon2id passphrase derivation plus non-extractable AES key import is timed. It does not measure IndexedDB, record decryption, full vault unlock UX or browser storage performance.
- It is a performance measurement, not a cryptographic security test.
- The current benchmark parameters are fixed at 19,456 KiB memory, 2 iterations, parallelism 1 and a 32-byte output. The page cannot change them.
- Do not lower the KDF parameters because one device is slow. Slow results trigger a security/usability design review and possible support-matrix decision.

### Device matrix to collect

| Device class | Browser | Report required |
|---|---|---|
| Main development laptop | Chrome or Edge | 3 runs |
| Lowest-spec supported Windows laptop | Chrome or Edge | 3 runs |
| Lower-end Android phone | Chrome | 3 runs |
| Current iPhone | Safari | 3 runs |
| Older supported iPhone (if in scope) | Safari | 3 runs |

Record model/class, OS version and browser version in the optional device label or accompanying notes. Do not include personal identifiers.

### How to interpret results

- Compare each device's median across the five samples, and then compare the medians across the three separate benchmark sessions.
- Check the slowest sample as well as the median; a good median can hide a poor worst-case unlock experience.
- Do not compare warm-up time with steady-state samples.
- Do not treat a desktop GitHub Actions result as a mobile benchmark.
- No pass/fail latency threshold is approved yet. The supported device matrix and acceptable unlock delay must be agreed before final Argon2id parameters are selected.

## 2. Internal static security pre-review

Scope: `frontend/src/crypto-spike/vaultCryptoSpike.ts`, its unit tests and the benchmark page. The review is a source-level self-review of the proof of concept, not an independent expert audit and not a review of a persistent vault (none exists yet).

### Positive controls observed

- DEK is generated with the browser CSPRNG as 32 random bytes.
- Passphrase and recovery credentials derive independent KEKs and independently wrap the same DEK.
- Recovery entropy is 256 random bits encoded as a 24-word BIP-39 mnemonic; LOC uses the entropy encoding only, not wallet seed derivation.
- Passphrase KDF uses Argon2id v1.3; recovery KDF uses HKDF-SHA-256 only on high-entropy random input.
- AES-GCM uses 256-bit keys, 12-byte random IVs and a 128-bit authentication tag.
- Wrapper AAD binds vault ID, format version, wrapper kind, KDF identifier, KDF salt and Argon2id parameters.
- Dummy-record AAD binds vault ID, record ID and record format version.
- The code imports AES keys as non-extractable CryptoKeys where supported.
- The code makes best-effort overwrites of temporary byte arrays and explicitly does not claim guaranteed JavaScript/WASM memory zeroization.
- The crypto module remains isolated from Zustand, React screens, health-record types and all browser storage APIs.

### Findings and required actions

#### SR-01 — Runtime envelope validation

**Risk:** TypeScript interfaces do not validate data loaded from IndexedDB, imported backups or modified browser storage. A production adapter must treat all serialized envelopes as untrusted.

**Action in this branch:** The dummy spike now validates the outer envelope, nested wrappers, allowed fields, IDs, versions, IV/salt/ciphertext lengths and unlock-credential size before cryptographic operations. It rejects unknown fields and bounds hex parsing.

**Still required for production:** Implement a separately versioned runtime schema for the actual production vault metadata and encrypted record envelope. Do not assume the dummy-spike parser is the production schema.

#### SR-02 — KDF parameter allow-list

**Risk:** Deriving Argon2id with attacker-controlled memory/iteration values can cause resource exhaustion or unexpectedly cheap derivation.

**Action:** The spike accepts only the explicitly defined candidate Argon2id parameter tuple before starting the KDF. Production must use a reviewed versioned allow-list and controlled KDF migrations.

#### SR-03 — Dependency reproducibility and provenance

**Risk:** The repository currently has no committed `frontend/package-lock.json`, and CI uses `npm install`. Transitive dependency resolution can therefore change between runs.

**Action before M4.2:** Generate and commit the npm lockfile from a trusted environment, change CI to `npm ci`, review package provenance and integrity hashes, and audit the WASM and mnemonic dependencies. Do not fabricate a lockfile.

#### SR-04 — Argon2id parameters are a candidate, not a production decision

**Risk:** The 19 MiB / 2-iteration / parallelism-1 configuration is the documented minimum baseline used for the spike; it has not been benchmarked on supported low-end mobile hardware and has not been independently reviewed for this product's threat model.

**Action:** Collect on-device reports, select the supported-browser/device matrix and agree on acceptable unlock latency. Do not reduce the KDF below the baseline to make one device faster without a formal security decision.

#### SR-05 — Credential rotation does not remediate a compromised DEK

**Risk:** The spike's rotation function re-wraps the same DEK. This is correct for a forgotten/changed passphrase when the DEK is still trusted, but it does not help if the DEK itself may have been exposed.

**Action before production:** Define separate operations for (a) passphrase/recovery wrapper rotation and (b) suspected DEK compromise. The latter requires a new DEK and re-encryption of every record, plus explicit handling of older backups.

#### SR-06 — JavaScript memory is not reliably zeroizable

**Risk:** Filling a `Uint8Array` is best effort only. Copies may exist in the runtime, WASM linear memory, garbage-collected objects or browser internals.

**Action:** Keep secrets and decrypted records in memory only while unlocked, minimise copies, lock and clear application references, and document that secure zeroization cannot be guaranteed in a web runtime.

#### SR-07 — Same-origin script/XSS remains in scope

**Risk:** Encryption at rest does not protect decrypted records or an active key from malicious JavaScript executing in the LOC origin while unlocked.

**Action before vault release:** Dedicated origin, restrictive CSP, no third-party scripts/analytics, dependency pinning/audit, safe text rendering, no health-data logging, XSS testing and independent application-security review.

#### SR-08 — Recovery phrase is a second secret, not a backup

**Risk:** Anyone holding the phrase can unlock an existing vault or encrypted backup. The phrase cannot recreate data after browser-profile/device loss if no encrypted backup exists.

**Action:** Keep phrase display one-time, require user verification, advise offline storage physically/logically separate from the vault device, and deliver encrypted backup/restore as a distinct feature. Warn about old backup copies retaining old wrappers after rotation.

#### SR-09 — Independent cryptographic review not performed

**Risk:** This document is an internal review by the implementation team (the same team that authored the spike), not an independent audit.

**Action:** Obtain a separate review by a qualified cryptography/security reviewer of the KDF, key hierarchy, BIP-39 recovery encoding, HKDF context, AES-GCM AAD/IV handling, rotation, backup and recovery-loss scenarios. Record reviewer, scope, date, findings and remediation before M4.2.

#### SR-10 — No persistent-vault lifecycle exists yet

**Risk:** The spike does not implement consent, IndexedDB transactions, lock/unlock UI, inactivity lock, visibility/sleep handling, backup/restore, deletion, schema migration or failure recovery.

**Action:** Do not enable health-record persistence until all of those behaviours are designed, implemented, tested and manually reviewed.

## 3. M4.2 entry gate

M4.2 must not start until all of the following are true:

- [ ] Benchmark reports received from the agreed desktop and mobile support matrix.
- [ ] Supported browser/device matrix and acceptable unlock latency approved.
- [ ] Final Argon2id parameters and dependency versions approved.
- [ ] `package-lock.json` committed and CI switched to `npm ci`.
- [ ] Independent cryptographic review completed and findings resolved or explicitly accepted.
- [ ] Production envelope/runtime schema reviewed separately from the dummy spike.
- [ ] DEK-compromise response distinguished from credential rotation.
- [ ] Threat model updated for IndexedDB, XSS, browser profile, device loss, backups and deletion.
- [ ] No health record is written persistently by default; opt-in remains a separately gated milestone.

**Current decision:** M4.1 benchmark tooling and internal review are in progress. M4.2 IndexedDB adapter is blocked.

# LOC V2 — Encrypted local storage architecture proposal

**Status:** Design proposal only — not implemented or enabled.

**Decision requested:** Approve the threat model, key-management direction and acceptance gates before writing persistence code.

## 1. Purpose and product boundary

LOC currently stores health records in Zustand application memory only. A refresh or closing the app may clear them. This document proposes an opt-in encrypted local vault so a user can deliberately retain their records on the current browser/device.

Non-negotiable defaults:

- Guest/session-only mode remains the default. No record is persisted until the user explicitly opts in.
- No cloud database, account, background sync, telemetry or third-party health-data transfer is introduced.
- The existing screening rules engine and its inputs are not changed by this work.
- Health records remain contextual history. Storage does not create a diagnosis or new clinical interpretation.
- If encryption or key derivation is unavailable, fail closed and keep data in memory; never silently fall back to plaintext persistence.

## 2. Threat model

### Assets to protect

- Laboratory results, units, collection dates and source details.
- Vital measurements and dates.
- Lifestyle check-ins and self-reported occupational exposures.
- Encryption metadata and wrapped data-encryption key (DEK).
- User passphrase and the in-memory unlocked key.

### Threats in scope

- Someone copies or inspects the browser profile / IndexedDB files while the vault is locked.
- Another person using the same browser profile opens LOC after the previous user has left.
- Stored ciphertext or metadata is modified, truncated or replayed.
- Browser refresh, tab suspension or device sleep leaves the interface appearing unlocked.
- A corrupt or older record shape is loaded from storage.
- A user changes their passphrase, exports a backup, or requests deletion.

### Threats not solved by client-side encryption

- Malicious JavaScript or an XSS vulnerability executing in the LOC origin while the vault is unlocked can access decrypted records or ask the Web Crypto API to use the active key.
- Malware, keyloggers, browser extensions with sufficient privileges, operating-system compromise, screen capture or an unlocked device can expose information.
- A person who knows the vault passphrase can unlock it.
- Browser/profile backups, filesystem snapshots and storage-device remnants may outlive an application-level delete operation.
- Encryption does not prevent denial of service, deletion, traffic analysis or a user intentionally exporting plaintext.

**Product copy must not claim that encrypted IndexedDB protects against XSS or a compromised device.** OWASP notes that same-origin script can read/write IndexedDB and may use a non-extractable CryptoKey; browser storage also remains accessible to a person with local profile access. See the [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) and [OWASP Web Security Testing Guide — Browser Storage](https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/11-Client-side/12-Browser_Storage/).

## 3. Proposed storage layout

Use IndexedDB as a transactional store. Do not use localStorage or sessionStorage for health records, passphrases, raw keys or session tokens.

Proposed object stores:

### `vaultMeta`

One vault metadata record containing only the information required to unlock and decrypt:

- vault format/version;
- random vault ID;
- KDF identifier and parameters;
- random KDF salt;
- key-wrap IV;
- wrapped DEK;
- creation / last-updated timestamps that do not reveal health details.

### `encryptedRecords`

One row per health record. Store only a random opaque record ID and the encrypted envelope. Do not index plaintext category, date, test name, value, unit, employer or other health attributes. The UI can decrypt records into memory after unlock, then sort/filter locally.

Suggested envelope:

```text
recordId
formatVersion
iv
ciphertextAndAuthenticationTag
```

All health record fields and metadata (including category, dates, source, lab test name, value and reference interval) belong inside the encrypted payload.

## 4. Proposed cryptographic design

This section is a design candidate for implementation review, not a claim of certification.

### Data encryption

- Use the browser Web Crypto API (`crypto.subtle`) rather than handwritten cryptography.
- Use AES-GCM with a 256-bit data-encryption key.
- Generate a fresh cryptographically random 96-bit (12-byte) IV for every encryption operation. Never reuse an IV with the same key.
- Retain the authentication tag with the ciphertext; decryption must fail closed if authentication fails.
- Bind the record ID and format/schema version as Additional Authenticated Data (AAD), so an envelope cannot be moved to another record ID or interpreted as another schema version without authentication failure.
- Use a fresh random salt for each vault key-derivation operation.

Chrome's Web Crypto guidance specifies a fresh 12-byte IV for AES-GCM and recommends binding relevant metadata as AAD. See [Encrypt data client-side with WebCrypto](https://developer.chrome.com/docs/modern-web-guidance/guides/security/client-side-encryption).

### Key hierarchy

Preferred candidate:

1. Generate a random 256-bit DEK when the vault is created.
2. Derive a key-encryption key (KEK) from the user's high-entropy vault passphrase and a random salt using a reviewed password-based KDF.
3. Use the KEK only to wrap/unwrap the DEK. Store the wrapped DEK, salt and KDF parameters; never store the passphrase or plaintext KEK.
4. Use the DEK to encrypt each record independently with AES-GCM and a new IV.
5. After unlock, keep the usable DEK as a non-extractable CryptoKey where supported. Drop the key reference and clear decrypted records from application state when locking.
6. Change the passphrase by deriving a new KEK and re-wrapping the DEK; do not require rewriting every record.

The wrapping algorithm and exact Web Crypto key import/export sequence must be proven in a small crypto spike and reviewed before implementation. Do not improvise a custom envelope or key format.

### KDF choice — explicit open decision

- OWASP currently prefers Argon2id for password-based protection. A browser implementation would require selecting and auditing a maintained WASM/library dependency, pinning its version and benchmarking memory/CPU on supported devices.
- If a FIPS-constrained deployment is later required, evaluate PBKDF2-HMAC-SHA-256 using the applicable reviewed parameters; OWASP lists 600,000 iterations for that context. LOC must not claim FIPS compliance merely because it uses PBKDF2.
- Do not silently downgrade to a fast hash, a short PIN, or an unreviewed KDF when a preferred implementation is unavailable.
- Select exact parameters only after device benchmarking and security review. Store KDF parameters with the vault so they can be upgraded through a versioned re-wrap process.

Reference: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## 5. Unlock, lock and memory lifecycle

### First-time opt-in

- Persistent storage starts OFF.
- Explain exactly what will be saved, where it is stored, what encryption does/does not protect, and what happens if the passphrase is lost.
- Require a deliberate opt-in and a strong vault passphrase confirmation.
- Create the vault and verify that a test envelope encrypts/decrypts successfully before saving user records.
- Ask separately whether to move records currently in memory into the new vault. Never migrate automatically.

### Unlock

- Request the passphrase only in the LOC interface; never place it in a URL, query string, log, analytics event or error report.
- Derive the KEK, authenticate/unwrap the DEK, decrypt records and validate each decrypted object against the current runtime schema before adding it to Zustand.
- If any envelope fails authentication or validation, do not silently skip or reinterpret it. Show a non-sensitive recovery/error message and keep the rest of the vault unchanged.

### Lock

Proposed initial defaults for usability testing (not yet final):

- Manual **Lock now** control always available.
- Auto-lock after 5 minutes without user interaction.
- Lock on explicit sign-out / clear-vault action.
- Evaluate a visibility-change lock (for example, after the document has remained hidden for 60 seconds) and device sleep/resume behaviour.
- On lock, clear decrypted Zustand records, close open composer state, revoke download object URLs, clear sensitive form state and discard key references.
- Do not claim memory bytes are securely zeroized; JavaScript runtimes do not provide a reliable guarantee of immediate memory erasure.

## 6. Passphrase loss, backup and recovery

- There is no server recovery key and no password-reset email because LOC has no account/server key escrow in this design.
- If the user forgets the passphrase and has no usable backup, encrypted records are unrecoverable. This must be stated before vault creation.
- Provide a user-initiated encrypted backup export that contains ciphertext and the metadata needed to restore the vault; it must not contain the passphrase or an unwrapped DEK.
- Restoring a backup requires the passphrase and must validate the authenticated envelope before importing records.
- A separate plaintext JSON export may remain available only after an explicit warning that the downloaded file is unencrypted and can be read by anyone with access to it.

## 7. Delete and clear semantics

- **Clear session:** clear decrypted application state only; does not imply persistent data is deleted.
- **Delete one record:** delete its encrypted IndexedDB row in a transaction and remove the plaintext record from memory.
- **Delete vault:** require confirmation, clear all record rows and vault metadata, clear Zustand state and discard key references.
- Report success only after the IndexedDB transaction completes.
- Explain that application-level deletion cannot guarantee forensic erasure from browser-profile backups, OS snapshots, SSD remapping or other copies the user exported.

## 8. XSS, dependencies and deployment controls

- Serve production LOC over HTTPS. Web Crypto APIs are restricted to secure contexts; localhost development is a special trusted context in modern browsers. See [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
- Add a restrictive Content Security Policy and avoid inline script/eval where possible.
- Remove third-party analytics, advertising, remote scripts and unnecessary external font/CDN dependencies from the health-data origin.
- Keep dependencies minimal, pinned and audited; review any Argon2/WASM package and its build artefacts.
- Treat every IndexedDB value as untrusted on read. Validate the decrypted record schema and safely render text; never inject stored text as HTML.
- Do not enable Zustand persistence middleware, browser devtools state export, crash reporting or console logging of health payloads.
- Keep the health-data app on a dedicated origin rather than sharing an origin with unrelated applications.

OWASP warns that IndexedDB content can be read or modified by same-origin script, and recommends treating browser-storage data as untrusted input. See the [HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) and [Web Frontend Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Web_Frontend_Security_Cheat_Sheet.html).

## 9. Schema versioning and migration

- Version the vault envelope and health-record schema independently.
- Validate all decrypted records at the storage boundary.
- Migrations must run in memory and write the upgraded encrypted representation transactionally.
- Keep the old encrypted version until the new transaction commits successfully; abort leaves the original vault usable.
- Unknown or malformed records must produce a recoverable error; never coerce them into another record type.
- Backups must declare the format version and be migratable independently of the current IndexedDB database.

## 10. Required test and review gates

Before turning persistence ON, add automated tests for:

- Passphrase-to-key derivation and unlock with correct/wrong passphrase.
- Encryption/decryption round trip for every health-record union type.
- Tampered ciphertext, IV, record ID, AAD, salt, wrapped DEK and format version fail closed.
- Each encryption operation uses a fresh random IV.
- Duplicate IDs, malformed decrypted JSON and unknown record fields are rejected safely.
- Lock clears decrypted Zustand records and makes protected screens unavailable.
- Auto-lock after inactivity and visibility/sleep-resume behaviour.
- Delete-one, delete-all and IndexedDB transaction failure paths.
- Encrypted backup export/restore and explicit plaintext-export warning.
- Database inspection confirms no plaintext test names, dates, units, values, categories or keys are stored.
- Browser network inspection confirms no health payloads or key material leave the origin.
- Migrations preserve data on successful upgrade and roll back on failure.
- Supported-browser and low-memory/mobile-device benchmarks.

Manual security review must include XSS threat review, CSP inspection, dependency review, browser profile access caveats and an independent review of the cryptographic envelope.

## 11. Implementation sequence after design approval

1. **M4.1 — Crypto spike:** prove the KDF, AES-GCM, key wrapping, AAD, IV generation and browser compatibility using non-health dummy payloads only.
2. **M4.2 — Vault metadata and IndexedDB adapter:** schema/versioning and transactions, with no UI persistence toggle yet.
3. **M4.3 — Consent and lock/unlock UX:** guest mode remains first; opt-in creation, unlock, manual lock and inactivity lock.
4. **M4.4 — Encrypted repository integration:** move validated record objects between Zustand memory and the encrypted repository only after unlock.
5. **M4.5 — Backup, restore, passphrase change and delete:** test recovery and failure cases.
6. **M4.6 — Security and mobile QA:** XSS/CSP, dependency audit, browser tests, storage inspection and usability review.

**Release gate:** persistent storage remains disabled until all automated tests, manual checks and independent design review are complete.

## 12. Open product decisions

- Is LOC strictly single-device, or should encrypted backup/restore be a first-class supported workflow?
- Should auto-lock be 5 minutes, configurable, or both?
- Should a forgotten passphrase mean permanent loss, or should users be able to create an offline recovery key during setup?
- Which browsers/devices are in the supported matrix, especially mobile Safari and Android browsers?
- Is any formal compliance target (for example FIPS) required? Do not imply one without an explicit requirement and validated implementation.


/**
 * LOC M4.1 CRYPTO SPIKE — DUMMY DATA ONLY.
 *
 * This module is intentionally not connected to the application, Zustand,
 * IndexedDB, localStorage, the screening API or any health-record type.
 * It proves candidate primitives and envelope behaviours only.
 * Do not import it into production screens or treat current KDF parameters as approved.
 */
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { argon2id } from "hash-wasm";

const FORMAT_VERSION = 1 as const;
const DEK_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;
const ARGON2_SALT_BYTES = 16;
const RECOVERY_DOMAIN = "LOC vault recovery KEK v1";
const DUMMY_RECORD_ID = "loc-crypto-spike-dummy-record";
const BENCHMARK_PASSPHRASE = "LOC synthetic Argon2id benchmark only - not a user credential";
export const DUMMY_PLAINTEXT = "LOC crypto spike: synthetic test payload only; not health information.";

export interface Argon2idParams {
  memorySizeKiB: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
}

export const SPIKE_ARGON2ID_PARAMS: Argon2idParams = {
  memorySizeKiB: 19_456,
  iterations: 2,
  parallelism: 1,
  hashLength: 32,
};

type WrapperKind = "passphrase" | "recovery";
type KdfKind = "argon2id-v1.3" | "hkdf-sha256";

export interface KeyWrapEnvelope {
  kind: WrapperKind;
  kdf: KdfKind;
  saltHex: string;
  ivHex: string;
  ciphertextHex: string;
  argon2id?: {
    memorySizeKiB: number;
    iterations: number;
    parallelism: number;
    hashLength: number;
  };
}

export interface DummyRecordEnvelope {
  recordId: string;
  formatVersion: number;
  ivHex: string;
  ciphertextHex: string;
}

export interface CryptoSpikeVaultEnvelope {
  formatVersion: number;
  vaultId: string;
  keyWraps: {
    passphrase: KeyWrapEnvelope;
    recovery?: KeyWrapEnvelope;
  };
  dummyRecord: DummyRecordEnvelope;
}

export type UnlockCredential =
  | { kind: "passphrase"; secret: string }
  | { kind: "recovery"; secret: string };

export interface CreatedCryptoSpikeVault {
  envelope: CryptoSpikeVaultEnvelope;
  /** Show-once test output. Never store this value in an envelope or database. */
  recoveryPhrase?: string;
}

export interface RotatedCryptoSpikeVault {
  envelope: CryptoSpikeVaultEnvelope;
  /** A newly generated phrase. The previous phrase is invalid for the new envelope. */
  recoveryPhrase?: string;
}

export class CryptoSpikeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoSpikeError";
  }
}

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) throw new CryptoSpikeError("Web Crypto is unavailable in this runtime.");
  return api;
}

function randomBytes(length: number): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) {
    throw new CryptoSpikeError("A cryptographically secure random generator is unavailable.");
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string, maxBytes = 16_384): Uint8Array {
  if (typeof value !== "string" || value.length > maxBytes * 2 || !/^(?:[0-9a-f]{2})*$/i.test(value)) {
    throw new CryptoSpikeError("The crypto envelope contains malformed hexadecimal data.");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeText(value: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(value);
}

function createVaultId(): string {
  return toHex(randomBytes(16));
}

function assertPassphrase(passphrase: string): string {
  const normalized = passphrase.normalize("NFKC");
  if (normalized.length < 12) {
    throw new CryptoSpikeError("For this spike, use a passphrase of at least 12 characters.");
  }
  if (normalized.length > 1024) {
    throw new CryptoSpikeError("The passphrase is too long.");
  }
  return normalized;
}

function hasSupportedArgon2idParams(value: Argon2idParams | undefined): value is Argon2idParams {
  return Boolean(
    value &&
    value.memorySizeKiB === SPIKE_ARGON2ID_PARAMS.memorySizeKiB &&
    value.iterations === SPIKE_ARGON2ID_PARAMS.iterations &&
    value.parallelism === SPIKE_ARGON2ID_PARAMS.parallelism &&
    value.hashLength === SPIKE_ARGON2ID_PARAMS.hashLength,
  );
}

function wrapperAad(vaultId: string, version: number, wrapper: KeyWrapEnvelope): Uint8Array {
  const argon = wrapper.argon2id;
  const params = argon
    ? [argon.memorySizeKiB, argon.iterations, argon.parallelism, argon.hashLength].join(":")
    : "none";
  return encodeText(
    "LOC|vault-wrap|v" + version + "|" + vaultId + "|" + wrapper.kind + "|" + wrapper.kdf + "|" + wrapper.saltHex + "|" + params,
  );
}

function recordAad(vaultId: string, recordId: string, version: number): Uint8Array {
  return encodeText("LOC|record|v" + version + "|" + vaultId + "|" + recordId);
}

async function importAesKey(raw: Uint8Array, extractable: boolean): Promise<CryptoKey> {
  return subtle().importKey(
    "raw",
    asArrayBuffer(raw),
    { name: "AES-GCM" },
    extractable,
    ["encrypt", "decrypt"],
  );
}

async function derivePassphraseKey(
  passphrase: string,
  salt: Uint8Array,
  params: Argon2idParams = SPIKE_ARGON2ID_PARAMS,
): Promise<CryptoKey> {
  const normalized = assertPassphrase(passphrase);
  const output = await argon2id({
    password: normalized,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySizeKiB,
    hashLength: params.hashLength,
    outputType: "binary",
  });

  if (!(output instanceof Uint8Array) || output.byteLength !== 32) {
    throw new CryptoSpikeError("Argon2id did not return the expected 256-bit key material.");
  }
  try {
    return await importAesKey(output, false);
  } finally {
    output.fill(0);
  }
}


export interface Argon2idBenchmarkReport {
  parameters: Argon2idParams;
  warmupMs: number;
  samplesMs: number[];
  minMs: number;
  medianMs: number;
  maxMs: number;
}

export async function runArgon2idBenchmark(
  repetitions = 5,
  onProgress?: (completed: number, total: number) => void,
): Promise<Argon2idBenchmarkReport> {
  if (!Number.isInteger(repetitions) || repetitions < 3 || repetitions > 10) {
    throw new CryptoSpikeError("Choose between 3 and 10 benchmark repetitions.");
  }
  if (typeof performance === "undefined" || typeof performance.now !== "function") {
    throw new CryptoSpikeError("A high-resolution performance timer is unavailable.");
  }

  const runOnce = async (): Promise<number> => {
    const salt = randomBytes(ARGON2_SALT_BYTES);
    const startedAt = performance.now();
    const key = await derivePassphraseKey(BENCHMARK_PASSPHRASE, salt);
    const elapsed = performance.now() - startedAt;
    // CryptoKey is non-extractable; the reference is intentionally not retained.
    void key;
    salt.fill(0);
    return elapsed;
  };

  const warmupMs = await runOnce();
  const samplesMs: number[] = [];
  for (let index = 0; index < repetitions; index += 1) {
    samplesMs.push(await runOnce());
    onProgress?.(index + 1, repetitions);
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];

  return {
    parameters: { ...SPIKE_ARGON2ID_PARAMS },
    warmupMs,
    samplesMs: samplesMs.map((sample) => Math.round(sample * 10) / 10),
    minMs: Math.round(sorted[0] * 10) / 10,
    medianMs: Math.round(medianMs * 10) / 10,
    maxMs: Math.round(sorted[sorted.length - 1] * 10) / 10,
  };
}

export function generateRecoveryPhrase(): string {
  const entropy = randomBytes(32);
  try {
    return entropyToMnemonic(entropy, wordlist);
  } finally {
    entropy.fill(0);
  }
}

export function validateRecoveryPhrase(phrase: string): boolean {
  const normalized = phrase.normalize("NFKD").trim().split(/\s+/).join(" ");
  return validateMnemonic(normalized, wordlist);
}

function decodeRecoveryPhrase(phrase: string): Uint8Array {
  const normalized = phrase.normalize("NFKD").trim().split(/\s+/).join(" ");
  if (!validateMnemonic(normalized, wordlist)) {
    throw new CryptoSpikeError("The recovery phrase is invalid or has a checksum error.");
  }
  const entropy = mnemonicToEntropy(normalized, wordlist);
  if (entropy.byteLength !== 32) {
    entropy.fill(0);
    throw new CryptoSpikeError("The recovery phrase does not represent 256 bits of entropy.");
  }
  return entropy;
}

async function deriveRecoveryKey(entropy: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  if (entropy.byteLength !== 32) {
    throw new CryptoSpikeError("Recovery entropy must be exactly 256 bits.");
  }
  const keyMaterial = await subtle().importKey(
    "raw",
    asArrayBuffer(entropy),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asArrayBuffer(salt),
      info: asArrayBuffer(encodeText(RECOVERY_DOMAIN)),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptBytes(
  key: CryptoKey,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Promise<{ ivHex: string; ciphertextHex: string }> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await subtle().encrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(iv),
      additionalData: asArrayBuffer(aad),
      tagLength: 128,
    },
    key,
    asArrayBuffer(plaintext),
  );
  return { ivHex: toHex(iv), ciphertextHex: toHex(new Uint8Array(ciphertext)) };
}

async function decryptBytes(
  key: CryptoKey,
  ivHex: string,
  ciphertextHex: string,
  aad: Uint8Array,
): Promise<ArrayBuffer> {
  const iv = fromHex(ivHex, IV_BYTES);
  const ciphertext = fromHex(ciphertextHex, DEK_BYTES + 16 + encodeText(DUMMY_PLAINTEXT).length + 16);
  if (iv.byteLength !== IV_BYTES) throw new CryptoSpikeError("The AES-GCM IV must be 12 bytes.");
  try {
    return await subtle().decrypt(
      {
        name: "AES-GCM",
        iv: asArrayBuffer(iv),
        additionalData: asArrayBuffer(aad),
        tagLength: 128,
      },
      key,
      asArrayBuffer(ciphertext),
    );
  } catch {
    throw new CryptoSpikeError("Authentication failed. The credential or encrypted data is invalid.");
  }
}

async function wrapDek(
  rawDek: Uint8Array,
  vaultId: string,
  kind: WrapperKind,
  key: CryptoKey,
  salt: Uint8Array,
  argonParams?: Argon2idParams,
): Promise<KeyWrapEnvelope> {
  const wrapper: KeyWrapEnvelope = {
    kind,
    kdf: kind === "passphrase" ? "argon2id-v1.3" : "hkdf-sha256",
    saltHex: toHex(salt),
    ivHex: "",
    ciphertextHex: "",
    ...(argonParams ? { argon2id: { ...argonParams } } : {}),
  };
  const encrypted = await encryptBytes(key, rawDek, wrapperAad(vaultId, FORMAT_VERSION, wrapper));
  return { ...wrapper, ...encrypted };
}


function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new CryptoSpikeError("Unsupported " + label + " field.");
}

function assertWrapperShape(value: unknown, expectedKind: WrapperKind): asserts value is KeyWrapEnvelope {
  if (!isObject(value)) throw new CryptoSpikeError("The key wrapper is malformed.");
  assertExactKeys(value, ["kind", "kdf", "saltHex", "ivHex", "ciphertextHex", "argon2id"], "key wrapper");

  if (value.kind !== expectedKind) throw new CryptoSpikeError("The key wrapper type is invalid.");
  if (typeof value.saltHex !== "string" || !/^[0-9a-f]{32}$/i.test(value.saltHex)) {
    throw new CryptoSpikeError("The key-wrapper salt is malformed.");
  }
  if (typeof value.ivHex !== "string" || !/^[0-9a-f]{24}$/i.test(value.ivHex)) {
    throw new CryptoSpikeError("The key-wrapper IV is malformed.");
  }
  if (typeof value.ciphertextHex !== "string" || !/^[0-9a-f]{96}$/i.test(value.ciphertextHex)) {
    throw new CryptoSpikeError("The wrapped data-key ciphertext is malformed.");
  }

  if (expectedKind === "passphrase") {
    if (value.kdf !== "argon2id-v1.3" || !hasSupportedArgon2idParams(value.argon2id as Argon2idParams | undefined)) {
      throw new CryptoSpikeError("Unsupported passphrase KDF metadata or parameters.");
    }
  } else {
    if (value.kdf !== "hkdf-sha256" || value.argon2id !== undefined) {
      throw new CryptoSpikeError("Unsupported recovery KDF metadata.");
    }
  }
}

function assertDummyEnvelopeShape(value: unknown): asserts value is CryptoSpikeVaultEnvelope {
  if (!isObject(value)) throw new CryptoSpikeError("The encrypted vault envelope is malformed.");
  assertExactKeys(value, ["formatVersion", "vaultId", "keyWraps", "dummyRecord"], "vault envelope");
  if (value.formatVersion !== FORMAT_VERSION) throw new CryptoSpikeError("Unsupported vault format version.");
  if (typeof value.vaultId !== "string" || !/^[0-9a-f]{32}$/i.test(value.vaultId)) {
    throw new CryptoSpikeError("The vault identifier is malformed.");
  }
  if (!isObject(value.keyWraps)) throw new CryptoSpikeError("The key-wrapper collection is malformed.");
  assertExactKeys(value.keyWraps, ["passphrase", "recovery"], "key-wrapper collection");
  assertWrapperShape(value.keyWraps.passphrase, "passphrase");
  if (value.keyWraps.recovery !== undefined) assertWrapperShape(value.keyWraps.recovery, "recovery");

  if (!isObject(value.dummyRecord)) throw new CryptoSpikeError("The encrypted dummy record is malformed.");
  assertExactKeys(value.dummyRecord, ["recordId", "formatVersion", "ivHex", "ciphertextHex"], "dummy record");
  if (value.dummyRecord.recordId !== DUMMY_RECORD_ID || value.dummyRecord.formatVersion !== FORMAT_VERSION) {
    throw new CryptoSpikeError("Unsupported dummy record identifier or format version.");
  }
  if (typeof value.dummyRecord.ivHex !== "string" || !/^[0-9a-f]{24}$/i.test(value.dummyRecord.ivHex)) {
    throw new CryptoSpikeError("The dummy-record IV is malformed.");
  }
  const expectedCiphertextBytes = encodeText(DUMMY_PLAINTEXT).byteLength + 16;
  if (typeof value.dummyRecord.ciphertextHex !== "string" || value.dummyRecord.ciphertextHex.length !== expectedCiphertextBytes * 2 || !/^[0-9a-f]+$/i.test(value.dummyRecord.ciphertextHex)) {
    throw new CryptoSpikeError("The dummy-record ciphertext is malformed.");
  }
}

async function unwrapDek(
  wrapper: KeyWrapEnvelope,
  vaultId: string,
  formatVersion: number,
  credential: UnlockCredential,
): Promise<Uint8Array> {
  if (wrapper.kind !== credential.kind) {
    throw new CryptoSpikeError("The selected credential does not match this key wrapper.");
  }

  const salt = fromHex(wrapper.saltHex, SALT_BYTES);
  if (salt.byteLength !== SALT_BYTES) throw new CryptoSpikeError("The key-wrapper salt is malformed.");

  let wrappingKey: CryptoKey;
  if (credential.kind === "passphrase") {
    if (wrapper.kdf !== "argon2id-v1.3" || !hasSupportedArgon2idParams(wrapper.argon2id)) {
      throw new CryptoSpikeError("Unsupported passphrase KDF metadata or parameters.");
    }
    wrappingKey = await derivePassphraseKey(credential.secret, salt, wrapper.argon2id);
  } else {
    if (wrapper.kdf !== "hkdf-sha256") {
      throw new CryptoSpikeError("Unsupported recovery KDF metadata.");
    }
    const entropy = decodeRecoveryPhrase(credential.secret);
    try {
      wrappingKey = await deriveRecoveryKey(entropy, salt);
    } finally {
      entropy.fill(0);
    }
  }

  const plaintext = await decryptBytes(
    wrappingKey,
    wrapper.ivHex,
    wrapper.ciphertextHex,
    wrapperAad(vaultId, formatVersion, wrapper),
  );
  const rawDek = new Uint8Array(plaintext);
  if (rawDek.byteLength !== DEK_BYTES) {
    rawDek.fill(0);
    throw new CryptoSpikeError("The unwrapped data key has an unexpected length.");
  }
  return rawDek;
}

async function createPassphraseWrapper(
  rawDek: Uint8Array,
  vaultId: string,
  passphrase: string,
): Promise<KeyWrapEnvelope> {
  const salt = randomBytes(ARGON2_SALT_BYTES);
  const key = await derivePassphraseKey(passphrase, salt);
  return wrapDek(rawDek, vaultId, "passphrase", key, salt, SPIKE_ARGON2ID_PARAMS);
}

async function createRecoveryWrapper(
  rawDek: Uint8Array,
  vaultId: string,
  recoveryPhrase: string,
): Promise<KeyWrapEnvelope> {
  const salt = randomBytes(SALT_BYTES);
  const entropy = decodeRecoveryPhrase(recoveryPhrase);
  try {
    const key = await deriveRecoveryKey(entropy, salt);
    return wrapDek(rawDek, vaultId, "recovery", key, salt);
  } finally {
    entropy.fill(0);
  }
}

async function createUnlockedDek(rawDek: Uint8Array): Promise<CryptoKey> {
  return importAesKey(rawDek, false);
}

async function encryptDummyRecord(rawDek: Uint8Array, vaultId: string): Promise<DummyRecordEnvelope> {
  const key = await createUnlockedDek(rawDek);
  const encrypted = await encryptBytes(
    key,
    encodeText(DUMMY_PLAINTEXT),
    recordAad(vaultId, DUMMY_RECORD_ID, FORMAT_VERSION),
  );
  return {
    recordId: DUMMY_RECORD_ID,
    formatVersion: FORMAT_VERSION,
    ...encrypted,
  };
}

async function decryptDummyRecord(
  rawDek: Uint8Array,
  vaultId: string,
  record: DummyRecordEnvelope,
): Promise<string> {
  const key = await createUnlockedDek(rawDek);
  const plaintext = await decryptBytes(
    key,
    record.ivHex,
    record.ciphertextHex,
    recordAad(vaultId, record.recordId, record.formatVersion),
  );
  return decodeText(plaintext);
}

export async function createDummyVault(
  passphrase: string,
  includeRecovery = true,
): Promise<CreatedCryptoSpikeVault> {
  assertPassphrase(passphrase);
  const vaultId = createVaultId();
  const rawDek = randomBytes(DEK_BYTES);
  let recoveryPhrase: string | undefined;

  try {
    const passphraseWrap = await createPassphraseWrapper(rawDek, vaultId, passphrase);
    let recoveryWrap: KeyWrapEnvelope | undefined;
    if (includeRecovery) {
      recoveryPhrase = generateRecoveryPhrase();
      recoveryWrap = await createRecoveryWrapper(rawDek, vaultId, recoveryPhrase);
    }
    const dummyRecord = await encryptDummyRecord(rawDek, vaultId);
    return {
      envelope: {
        formatVersion: FORMAT_VERSION,
        vaultId,
        keyWraps: {
          passphrase: passphraseWrap,
          ...(recoveryWrap ? { recovery: recoveryWrap } : {}),
        },
        dummyRecord,
      },
      ...(recoveryPhrase ? { recoveryPhrase } : {}),
    };
  } finally {
    rawDek.fill(0);
  }
}

export async function unlockDummyVault(
  envelope: CryptoSpikeVaultEnvelope,
  credential: UnlockCredential,
): Promise<string> {
  assertDummyEnvelopeShape(envelope);
  const wrapper = credential.kind === "passphrase"
    ? envelope.keyWraps.passphrase
    : envelope.keyWraps.recovery;
  if (!wrapper) throw new CryptoSpikeError("This vault has no offline recovery wrapper.");

  const rawDek = await unwrapDek(wrapper, envelope.vaultId, envelope.formatVersion, credential);
  try {
    return await decryptDummyRecord(rawDek, envelope.vaultId, envelope.dummyRecord);
  } finally {
    rawDek.fill(0);
  }
}

export async function rotateDummyVaultCredentials(
  envelope: CryptoSpikeVaultEnvelope,
  currentCredential: UnlockCredential,
  newPassphrase: string,
  includeRecovery = true,
): Promise<RotatedCryptoSpikeVault> {
  assertDummyEnvelopeShape(envelope);
  assertPassphrase(newPassphrase);
  const currentWrapper = currentCredential.kind === "passphrase"
    ? envelope.keyWraps.passphrase
    : envelope.keyWraps.recovery;
  if (!currentWrapper) throw new CryptoSpikeError("No matching unlock wrapper is available.");

  const rawDek = await unwrapDek(
    currentWrapper,
    envelope.vaultId,
    envelope.formatVersion,
    currentCredential,
  );

  let recoveryPhrase: string | undefined;
  try {
    const passphraseWrap = await createPassphraseWrapper(rawDek, envelope.vaultId, newPassphrase);
    let recoveryWrap: KeyWrapEnvelope | undefined;
    if (includeRecovery) {
      recoveryPhrase = generateRecoveryPhrase();
      recoveryWrap = await createRecoveryWrapper(rawDek, envelope.vaultId, recoveryPhrase);
    }
    return {
      envelope: {
        ...envelope,
        keyWraps: {
          passphrase: passphraseWrap,
          ...(recoveryWrap ? { recovery: recoveryWrap } : {}),
        },
        // The already-encrypted record is deliberately copied unchanged.
        dummyRecord: envelope.dummyRecord,
      },
      ...(recoveryPhrase ? { recoveryPhrase } : {}),
    };
  } finally {
    rawDek.fill(0);
  }
}

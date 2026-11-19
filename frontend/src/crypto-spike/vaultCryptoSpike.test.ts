import { beforeAll, describe, expect, it } from "vitest";
import {
  createDummyVault,
  CryptoSpikeError,
  DUMMY_PLAINTEXT,
  generateRecoveryPhrase,
  rotateDummyVaultCredentials,
  SPIKE_ARGON2ID_PARAMS,
  unlockDummyVault,
  validateRecoveryPhrase,
} from "./vaultCryptoSpike";
import type { CryptoSpikeVaultEnvelope } from "./vaultCryptoSpike";

const passphrase = "correct horse battery staple for LOC";
let created: Awaited<ReturnType<typeof createDummyVault>>;

beforeAll(async () => {
  created = await createDummyVault(passphrase, true);
}, 30_000);

function cloneEnvelope(): CryptoSpikeVaultEnvelope {
  return structuredClone(created.envelope);
}

describe("LOC M4.1 crypto spike — dummy data only", () => {
  it("uses the documented Argon2id spike candidate parameters", () => {
    expect(SPIKE_ARGON2ID_PARAMS).toEqual({
      memorySizeKiB: 19_456,
      iterations: 2,
      parallelism: 1,
      hashLength: 32,
    });
  });

  it("generates a valid 24-word BIP-39 recovery phrase and never stores it in the envelope", () => {
    expect(created.recoveryPhrase).toBeTruthy();
    expect(created.recoveryPhrase?.trim().split(/\s+/)).toHaveLength(24);
    expect(validateRecoveryPhrase(created.recoveryPhrase ?? "")).toBe(true);
    expect(JSON.stringify(created.envelope)).not.toContain(created.recoveryPhrase ?? "phrase-not-present");
    expect(created.envelope.keyWraps.recovery?.kind).toBe("recovery");
  });

  it("opens the same dummy payload independently with passphrase and recovery phrase", async () => {
    expect(await unlockDummyVault(created.envelope, {
      kind: "passphrase",
      secret: passphrase,
    })).toBe(DUMMY_PLAINTEXT);

    expect(await unlockDummyVault(created.envelope, {
      kind: "recovery",
      secret: created.recoveryPhrase ?? "",
    })).toBe(DUMMY_PLAINTEXT);
  });

  it("rejects a wrong passphrase and a malformed recovery phrase", async () => {
    await expect(unlockDummyVault(created.envelope, {
      kind: "passphrase",
      secret: "a completely incorrect passphrase",
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    await expect(unlockDummyVault(created.envelope, {
      kind: "recovery",
      secret: "not a valid recovery phrase",
    })).rejects.toBeInstanceOf(CryptoSpikeError);
  });

  it("uses a fresh 12-byte IV for each wrapper and the dummy record", () => {
    const ivs = [
      created.envelope.keyWraps.passphrase.ivHex,
      created.envelope.keyWraps.recovery?.ivHex,
      created.envelope.dummyRecord.ivHex,
    ];
    expect(ivs.every(Boolean)).toBe(true);
    expect(ivs.every((iv) => (iv?.length ?? 0) === 24)).toBe(true);
    expect(new Set(ivs).size).toBe(3);
  });

  it("rejects wrapper, vault ID, record ID, IV and ciphertext tampering", async () => {
    const wrapperTamper = cloneEnvelope();
    wrapperTamper.keyWraps.passphrase.ciphertextHex =
      (wrapperTamper.keyWraps.passphrase.ciphertextHex[0] === "0" ? "1" : "0") +
      wrapperTamper.keyWraps.passphrase.ciphertextHex.slice(1);
    await expect(unlockDummyVault(wrapperTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const saltTamper = cloneEnvelope();
    saltTamper.keyWraps.passphrase.saltHex =
      (saltTamper.keyWraps.passphrase.saltHex[0] === "0" ? "1" : "0") +
      saltTamper.keyWraps.passphrase.saltHex.slice(1);
    await expect(unlockDummyVault(saltTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const vaultIdTamper = cloneEnvelope();
    vaultIdTamper.vaultId = "tampered-vault-id";
    await expect(unlockDummyVault(vaultIdTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const recordIdTamper = cloneEnvelope();
    recordIdTamper.dummyRecord.recordId = "different-record-id";
    await expect(unlockDummyVault(recordIdTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const recordIvTamper = cloneEnvelope();
    recordIvTamper.dummyRecord.ivHex =
      (recordIvTamper.dummyRecord.ivHex[0] === "0" ? "1" : "0") +
      recordIvTamper.dummyRecord.ivHex.slice(1);
    await expect(unlockDummyVault(recordIvTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const recordCiphertextTamper = cloneEnvelope();
    recordCiphertextTamper.dummyRecord.ciphertextHex =
      (recordCiphertextTamper.dummyRecord.ciphertextHex[0] === "0" ? "1" : "0") +
      recordCiphertextTamper.dummyRecord.ciphertextHex.slice(1);
    await expect(unlockDummyVault(recordCiphertextTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);
  });

  it("binds format and KDF metadata to the authenticated wrapper", async () => {
    const kdfTamper = cloneEnvelope();
    if (!kdfTamper.keyWraps.passphrase.argon2id) throw new Error("Missing test KDF metadata");
    kdfTamper.keyWraps.passphrase.argon2id.iterations += 1;
    await expect(unlockDummyVault(kdfTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);


    const nestedKdfField = cloneEnvelope();
    (nestedKdfField.keyWraps.passphrase.argon2id as Record<string, unknown>).unexpected = "unsupported";
    await expect(unlockDummyVault(nestedKdfField, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const formatTamper = cloneEnvelope();
    formatTamper.formatVersion = 2;
    await expect(unlockDummyVault(formatTamper, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);
  });

  it("rotates wrappers after recovery without re-encrypting the dummy record", async () => {
    const oldRecoveryPhrase = created.recoveryPhrase ?? "";
    const oldRecord = created.envelope.dummyRecord;
    const rotated = await rotateDummyVaultCredentials(
      created.envelope,
      { kind: "recovery", secret: oldRecoveryPhrase },
      "new passphrase for the LOC dummy vault",
      true,
    );

    expect(rotated.recoveryPhrase).toBeTruthy();
    expect(rotated.envelope.dummyRecord).toEqual(oldRecord);

    await expect(unlockDummyVault(rotated.envelope, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    await expect(unlockDummyVault(rotated.envelope, {
      kind: "recovery",
      secret: oldRecoveryPhrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    expect(await unlockDummyVault(rotated.envelope, {
      kind: "passphrase",
      secret: "new passphrase for the LOC dummy vault",
    })).toBe(DUMMY_PLAINTEXT);

    expect(await unlockDummyVault(rotated.envelope, {
      kind: "recovery",
      secret: rotated.recoveryPhrase ?? "",
    })).toBe(DUMMY_PLAINTEXT);
  });


  it("runs a benchmark warm-up and returns repeatable timing samples", async () => {
    const { runArgon2idBenchmark } = await import("./vaultCryptoSpike");
    const report = await runArgon2idBenchmark(3);
    expect(report.samplesMs).toHaveLength(3);
    expect(report.samplesMs.every((sample) => Number.isFinite(sample) && sample >= 0)).toBe(true);
    expect(report.minMs).toBeLessThanOrEqual(report.medianMs);
    expect(report.medianMs).toBeLessThanOrEqual(report.maxMs);
    expect(report.parameters).toEqual(SPIKE_ARGON2ID_PARAMS);
  }, 30_000);

  it("rejects malformed envelopes and oversized fields before cryptographic work", async () => {
    const extraField = cloneEnvelope() as CryptoSpikeVaultEnvelope & { unexpected?: string };
    extraField.unexpected = "not supported";
    await expect(unlockDummyVault(extraField, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    const oversizedCiphertext = cloneEnvelope();
    oversizedCiphertext.keyWraps.passphrase.ciphertextHex = "a".repeat(40_000);
    await expect(unlockDummyVault(oversizedCiphertext, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    await expect(unlockDummyVault(cloneEnvelope(), {
      kind: "passphrase",
      secret: "x".repeat(2_000),
    })).rejects.toBeInstanceOf(CryptoSpikeError);

    await expect(unlockDummyVault(cloneEnvelope(), undefined as unknown as { kind: "passphrase"; secret: string })).rejects.toBeInstanceOf(CryptoSpikeError);

  });

  it("rejects copying an encrypted record from a different vault", async () => {
    const other = await createDummyVault("another distinct LOC dummy passphrase", false);
    const transplanted = cloneEnvelope();
    transplanted.dummyRecord = other.envelope.dummyRecord;
    await expect(unlockDummyVault(transplanted, {
      kind: "passphrase",
      secret: passphrase,
    })).rejects.toBeInstanceOf(CryptoSpikeError);
  }, 30_000);

  it("supports a passphrase-only vault when recovery is declined", async () => {
    const passphraseOnly = await createDummyVault("a different LOC passphrase with enough length", false);
    expect(passphraseOnly.recoveryPhrase).toBeUndefined();
    expect(passphraseOnly.envelope.keyWraps.recovery).toBeUndefined();
    expect(await unlockDummyVault(passphraseOnly.envelope, {
      kind: "passphrase",
      secret: "a different LOC passphrase with enough length",
    })).toBe(DUMMY_PLAINTEXT);
    await expect(unlockDummyVault(passphraseOnly.envelope, {
      kind: "recovery",
      secret: generateRecoveryPhrase(),
    })).rejects.toBeInstanceOf(CryptoSpikeError);
  });
});

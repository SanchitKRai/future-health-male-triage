import { runArgon2idBenchmark } from "./vaultCryptoSpike";

const runButton = document.querySelector<HTMLButtonElement>("#run-benchmark");
const downloadButton = document.querySelector<HTMLButtonElement>("#download-report");
const deviceLabelInput = document.querySelector<HTMLInputElement>("#device-label");
const status = document.querySelector<HTMLElement>("#status");
const reportElement = document.querySelector<HTMLElement>("#report");
const metricGrid = document.querySelector<HTMLElement>("#metric-grid");
const medianElement = document.querySelector<HTMLElement>("#median");
const minimumElement = document.querySelector<HTMLElement>("#minimum");
const maximumElement = document.querySelector<HTMLElement>("#maximum");

if (
  !runButton || !downloadButton || !deviceLabelInput || !status ||
  !reportElement || !metricGrid || !medianElement || !minimumElement || !maximumElement
) {
  throw new Error("LOC benchmark page is missing a required element.");
}

let latestReport: Record<string, unknown> | null = null;

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  downloadButton.disabled = true;
  latestReport = null;
  reportElement.hidden = true;
  metricGrid.hidden = true;
  status.textContent = "Warming up the Argon2id engine…";

  try {
    const result = await runArgon2idBenchmark(5, (completed, total) => {
      status.textContent = "Measuring Argon2id · sample " + completed + " of " + total + "…";
    });

    const report = {
      benchmark: "LOC M4.1 Argon2id passphrase derivation",
      dataClassification: "Synthetic benchmark only; no health data or user credential",
      generatedAt: new Date().toISOString(),
      deviceLabel: deviceLabelInput.value.trim() || "Not supplied",
      browserUserAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      warmupMs: result.warmupMs,
      repetitions: result.samplesMs.length,
      samplesMs: result.samplesMs,
      minMs: result.minMs,
      medianMs: result.medianMs,
      maxMs: result.maxMs,
      parameters: result.parameters,
      localOnly: true,
      interpretation: "Performance data only. Not a security validation or approval to change Argon2id parameters.",
    };

    latestReport = report;
    medianElement.textContent = result.medianMs.toFixed(0) + " ms";
    minimumElement.textContent = result.minMs.toFixed(0) + " ms";
    maximumElement.textContent = result.maxMs.toFixed(0) + " ms";
    metricGrid.hidden = false;
    reportElement.textContent = JSON.stringify(report, null, 2);
    reportElement.hidden = false;
    downloadButton.disabled = false;
    status.textContent = "Complete. Results are displayed locally; nothing has been uploaded.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown benchmark error.";
    status.textContent = "Benchmark failed: " + message;
  } finally {
    runButton.disabled = false;
  }
});

downloadButton.addEventListener("click", () => {
  if (!latestReport) return;
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "loc-argon2id-device-benchmark.json";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});

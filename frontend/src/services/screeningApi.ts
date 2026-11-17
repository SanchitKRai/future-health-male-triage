import type { ScreeningResult, ScreeningSubmissionPayload } from "../types/screening";

const API_BASE = (import.meta.env.VITE_LOC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export class ScreeningApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreeningApiError";
  }
}

export async function submitScreening(payload: ScreeningSubmissionPayload): Promise<ScreeningResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/screening/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ScreeningApiError(
      "The local screening service is not reachable. Start it with `python -m api` from the repository root, then try again.",
    );
  }

  if (!response.ok) {
    if (response.status === 422) {
      throw new ScreeningApiError("Some answers could not be validated. Review the form and try again.");
    }
    throw new ScreeningApiError("The local screening service could not complete this check. Your answers have not been saved.");
  }

  try {
    return (await response.json()) as ScreeningResult;
  } catch {
    throw new ScreeningApiError("The local screening service returned an unreadable response. Please try again.");
  }
}

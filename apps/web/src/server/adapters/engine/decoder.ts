import type {
  LeadCandidatesResponse,
  SearchResponse,
} from "~/server/shared/engine/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function decodeSearchResponse(value: unknown): SearchResponse {
  if (!isObject(value) || !isArray(value.results) || typeof value.count !== "number") {
    throw new Error("Invalid SearchResponse structure");
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return value as unknown as SearchResponse;
}

export function decodeLeadCandidatesResponse(value: unknown): LeadCandidatesResponse {
  if (!isObject(value) || !isArray(value.candidates)) {
    throw new Error("Invalid LeadCandidatesResponse structure");
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    candidates: value.candidates as unknown as LeadCandidatesResponse["candidates"],
    count: isObject(value) && typeof value.count === "number" ? value.count : value.candidates.length,
  };
}

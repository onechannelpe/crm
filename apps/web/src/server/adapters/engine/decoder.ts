import { isPlainRecord } from "~/lib/type-guards";
import type {
  LeadCandidate,
  LeadCandidatesResponse,
  SearchResponse,
} from "~/server/shared/engine/types";

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isLeadCandidate(value: unknown): value is LeadCandidate {
  if (!isPlainRecord(value)) return false;
  return (
    typeof value.ruc === "string" &&
    typeof value.organization_name === "string" &&
    typeof value.dni === "string" &&
    typeof value.person_name === "string" &&
    typeof value.phone_primary === "string"
  );
}

function isSearchResponse(value: unknown): value is SearchResponse {
  return (
    isPlainRecord(value) &&
    isArray(value.results) &&
    typeof value.count === "number"
  );
}

export function decodeSearchResponse(value: unknown): SearchResponse {
  if (!isSearchResponse(value)) {
    throw new Error("Invalid SearchResponse structure");
  }
  return value;
}

export function decodeLeadCandidatesResponse(
  value: unknown,
): LeadCandidatesResponse {
  if (
    !isPlainRecord(value) ||
    !isArray(value.candidates) ||
    !value.candidates.every(isLeadCandidate)
  ) {
    throw new Error("Invalid LeadCandidatesResponse structure");
  }

  return {
    candidates: value.candidates,
    count:
      typeof value.count === "number" ? value.count : value.candidates.length,
  };
}

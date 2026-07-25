import type {
  RecordCandidate,
  RecordCandidatesResponse,
  SearchResponse,
} from "~/server/integrations/engine/types";
import { isPlainRecord } from "~/shared/type-guards";

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecordCandidate(value: unknown): value is RecordCandidate {
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

export function decodeRecordCandidatesResponse(
  value: unknown,
): RecordCandidatesResponse {
  if (
    !isPlainRecord(value) ||
    !isArray(value.candidates) ||
    !value.candidates.every(isRecordCandidate)
  ) {
    throw new Error("Invalid RecordCandidatesResponse structure");
  }

  return {
    candidates: value.candidates,
    count:
      typeof value.count === "number" ? value.count : value.candidates.length,
  };
}

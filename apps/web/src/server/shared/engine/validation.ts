import { SEARCH_PROJECTION_PATHS } from "~/server/shared/engine/projection-contract";
import type {
  RecordCandidate,
  RecordCandidatesResponse,
  SearchResponse,
  SearchResult,
} from "~/server/shared/engine/types";

function prop(source: object, key: string): unknown {
  return Reflect.get(source, key);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) return false;
  const person = prop(value, "person");
  const org = prop(value, "org");
  const role = prop(value, "role");
  const phones = prop(value, "phones");

  if (typeof person !== "object" || person === null) return false;
  if (typeof prop(person, "dni") !== "string") return false;
  const personNullableFields = [
    "name",
    "ruc",
    "birth_date",
    "birth_place",
    "sex",
    "marital_status",
    "location_text",
    "ubigeo_code",
    "mother_name",
    "father_name",
    "email",
  ] as const;
  for (const field of personNullableFields) {
    if (!isNullableString(prop(person, field))) return false;
  }

  if (org !== null) {
    if (typeof org !== "object") return false;
    const orgNullableFields = [
      "ruc",
      "name",
      "trade_name",
      "company_type",
      "status",
      "condition",
      "fiscal_address",
      "registration_date",
      "activity_start_date",
      "line_of_business",
      "economic_activity",
    ] as const;
    for (const field of orgNullableFields) {
      if (!isNullableString(prop(org, field))) return false;
    }
  }

  if (role !== null) {
    if (typeof role !== "object") return false;
    const roleNullableFields = [
      "name",
      "start_date",
      "rep_doc_type",
      "rep_doc_number",
      "rep_name",
    ] as const;
    for (const field of roleNullableFields) {
      if (!isNullableString(prop(role, field))) return false;
    }
  }

  if (typeof phones !== "object" || phones === null) return false;
  if (!isNullableString(prop(phones, "primary"))) return false;
  if (!isNullableString(prop(phones, "secondary"))) return false;

  const siblings = prop(phones, "siblings");
  return (
    siblings === null ||
    (Array.isArray(siblings) &&
      siblings.every((item) => typeof item === "string"))
  );
}

function isRecordCandidate(value: unknown): value is RecordCandidate {
  if (typeof value !== "object" || value === null) return false;
  return (
    typeof prop(value, "ruc") === "string" &&
    typeof prop(value, "organization_name") === "string" &&
    typeof prop(value, "dni") === "string" &&
    typeof prop(value, "person_name") === "string" &&
    typeof prop(value, "phone_primary") === "string"
  );
}

function hasPath(source: unknown, path: string): boolean {
  if (typeof source !== "object" || source === null) return false;

  const parts = path.split(".");
  let cursor: unknown = source;
  for (const [index, part] of parts.entries()) {
    if (typeof cursor !== "object" || cursor === null) return false;
    if (!Object.hasOwn(cursor, part)) return false;
    cursor = Reflect.get(cursor, part);
    if (cursor === null && index < parts.length - 1) {
      // A nullable parent object still satisfies nested contract paths.
      return true;
    }
  }
  return true;
}

export function assertSearchResponse(value: unknown): SearchResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("Engine returned invalid response shape");
  }

  const results = prop(value, "results");
  const count = prop(value, "count");
  if (!Array.isArray(results) || typeof count !== "number") {
    throw new Error("Engine returned invalid response shape");
  }

  if (!results.every(isSearchResult)) {
    throw new Error("Engine returned invalid response shape");
  }

  for (const row of results) {
    for (const path of SEARCH_PROJECTION_PATHS) {
      if (!hasPath(row, path)) {
        throw new Error(`Engine result missing projection field: ${path}`);
      }
    }
  }

  return { results, count };
}

export function assertRecordCandidatesResponse(
  value: unknown,
): RecordCandidatesResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("Engine returned invalid candidate response shape");
  }

  const candidates = prop(value, "candidates");
  const count = prop(value, "count");
  if (!Array.isArray(candidates) || typeof count !== "number") {
    throw new Error("Engine returned invalid candidate response shape");
  }
  if (!candidates.every(isRecordCandidate)) {
    throw new Error("Engine returned invalid candidate response shape");
  }

  return { candidates, count };
}

import { COMPANY_PROJECTION_PATHS } from "~/server/shared/engine/company-projection-contract";
import { DOC_PROJECTION_PATHS } from "~/server/shared/engine/doc-projection-contract";
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
  const kind = prop(value, "kind");

  if (kind === "document") {
    const doc = prop(value, "doc");
    if (typeof doc !== "object" || doc === null) return false;
    return (
      typeof prop(doc, "doc_type") === "string" &&
      typeof prop(doc, "doc_number") === "string"
    );
  }

  if (kind === "company") {
    const company = prop(value, "company");
    if (typeof company !== "object" || company === null) return false;
    return typeof prop(company, "ruc") === "string";
  }

  return false;
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
    const paths =
      row.kind === "document" ? DOC_PROJECTION_PATHS : COMPANY_PROJECTION_PATHS;
    for (const path of paths) {
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

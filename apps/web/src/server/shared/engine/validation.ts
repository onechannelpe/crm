import { SEARCH_PROJECTION_PATHS } from "~/server/shared/engine/projection-contract";
import type {
  SearchResponse,
  SearchResult,
} from "~/server/shared/engine/types";

function prop(source: object, key: string): unknown {
  return Reflect.get(source, key);
}

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) return false;
  const person = prop(value, "person");
  const org = prop(value, "org");
  const role = prop(value, "role");
  const phones = prop(value, "phones");

  if (typeof person !== "object" || person === null) return false;
  if (typeof prop(person, "dni") !== "string") return false;
  if (
    typeof prop(person, "name") !== "string" &&
    prop(person, "name") !== null
  ) {
    return false;
  }

  if (org !== null) {
    if (typeof org !== "object") return false;
    if (typeof prop(org, "ruc") !== "string" && prop(org, "ruc") !== null) {
      return false;
    }
    if (typeof prop(org, "name") !== "string" && prop(org, "name") !== null) {
      return false;
    }
  }

  if (role !== null) {
    if (typeof role !== "object") return false;
    if (typeof prop(role, "name") !== "string" && prop(role, "name") !== null) {
      return false;
    }
    if (
      typeof prop(role, "start_date") !== "string" &&
      prop(role, "start_date") !== null
    ) {
      return false;
    }
    if (
      typeof prop(role, "rep_doc_type") !== "string" &&
      prop(role, "rep_doc_type") !== null
    ) {
      return false;
    }
    if (
      typeof prop(role, "rep_doc_number") !== "string" &&
      prop(role, "rep_doc_number") !== null
    ) {
      return false;
    }
    if (
      typeof prop(role, "rep_name") !== "string" &&
      prop(role, "rep_name") !== null
    ) {
      return false;
    }
  }

  if (typeof phones !== "object" || phones === null) return false;
  if (
    typeof prop(phones, "primary") !== "string" &&
    prop(phones, "primary") !== null
  ) {
    return false;
  }
  if (
    typeof prop(phones, "secondary") !== "string" &&
    prop(phones, "secondary") !== null
  ) {
    return false;
  }

  const siblings = prop(phones, "siblings");
  return (
    siblings === null ||
    (Array.isArray(siblings) &&
      siblings.every((item) => typeof item === "string"))
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

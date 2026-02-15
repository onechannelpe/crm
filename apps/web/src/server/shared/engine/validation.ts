import type {
  SearchResponse,
  SearchResult,
} from "~/server/shared/engine/types";

function prop(source: object, key: string): unknown {
  return Reflect.get(source, key);
}

function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== "object" || value === null) return false;

  return (
    typeof prop(value, "dni") === "string" &&
    typeof prop(value, "name") === "string" &&
    (typeof prop(value, "phone_primary") === "string" ||
      prop(value, "phone_primary") === null) &&
    (typeof prop(value, "phone_secondary") === "string" ||
      prop(value, "phone_secondary") === null) &&
    (typeof prop(value, "org_ruc") === "string" ||
      prop(value, "org_ruc") === null) &&
    (typeof prop(value, "org_name") === "string" ||
      prop(value, "org_name") === null)
  );
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

  return { results, count };
}

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
  if (typeof prop(person, "name") !== "string") return false;

  if (org !== null) {
    if (typeof org !== "object") return false;
    if (typeof prop(org, "ruc") !== "string") return false;
    if (typeof prop(org, "name") !== "string") return false;
  }

  if (role !== null) {
    if (typeof role !== "object") return false;
    if (typeof prop(role, "name") !== "string") return false;
    if (
      typeof prop(role, "start_date") !== "string" &&
      prop(role, "start_date") !== null
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

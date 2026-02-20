import { createSignal } from "solid-js";

import { searchClients } from "~/actions/client-search";
import { getErrorMessage } from "~/lib/errors";
import type { SearchResult, SearchType } from "~/server/shared/engine/types";

interface ControllerOptions {
  defaultType: SearchType;
  allowedTypes: readonly SearchType[];
  searchParams: Readonly<Record<string, string | string[] | undefined>>;
  errorFallback: string;
}

function getFirstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export function createClientSearchController(options: ControllerOptions) {
  const [searchType, setSearchType] = createSignal<SearchType>(
    options.defaultType,
  );
  const [query, setQuery] = createSignal("");
  const [limit, setLimit] = createSignal("20");
  const [searching, setSearching] = createSignal(false);
  const [searched, setSearched] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [results, setResults] = createSignal<SearchResult[]>([]);

  const isAllowedType = (value: string): value is SearchType =>
    options.allowedTypes.some((type) => type === value);

  const executeSearch = async (
    type: SearchType,
    value: string,
    limitValue: number,
  ) => {
    setSearching(true);
    setError(null);
    try {
      const response = await searchClients(type, value, limitValue);
      setResults(response.results);
      setSearched(true);
    } catch (searchError: unknown) {
      setResults([]);
      setSearched(true);
      setError(getErrorMessage(searchError, options.errorFallback));
    } finally {
      setSearching(false);
    }
  };

  const runCurrentSearch = async () => {
    const parsedLimit = Number.parseInt(limit(), 10);
    await executeSearch(searchType(), query(), parsedLimit);
  };

  const initializeFromParams = async () => {
    const nextType = getFirstParam(options.searchParams.type);
    const nextQuery = getFirstParam(options.searchParams.query);
    const nextLimit = getFirstParam(options.searchParams.limit);
    if (!nextType || !nextQuery) return;
    if (!isAllowedType(nextType)) return;
    setSearchType(nextType);
    setQuery(nextQuery);
    if (nextLimit) setLimit(nextLimit);
    await executeSearch(
      nextType,
      nextQuery,
      Number.parseInt(nextLimit ?? "20", 10),
    );
  };

  return {
    searchType,
    setSearchType,
    query,
    setQuery,
    limit,
    setLimit,
    searching,
    searched,
    error,
    results,
    isAllowedType,
    runCurrentSearch,
    initializeFromParams,
  };
}

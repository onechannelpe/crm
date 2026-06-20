import { isSearchIntent } from "~/contracts/search/vocabulary";
import type { RunDirectSearchCommand } from "~/server/search-workflow/run-search";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export type SearchQueryInput = Omit<RunDirectSearchCommand, "actorUserId">;

export function parseSearchCommand(
  intent: unknown,
  query: unknown,
  limit: unknown,
): Result<SearchQueryInput, DomainError> {
  if (typeof intent !== "string" || !isSearchIntent(intent)) {
    return Err(invalid({ code: "search.intent.invalid" }));
  }

  if (typeof query !== "string" || query.trim().length === 0) {
    return Err(invalid({ code: "search.value.empty" }));
  }

  const safeLimit = limit == null ? 20 : Number(limit);
  if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) {
    return Err(invalid({ code: "search.limit.out_of_range" }));
  }

  return Ok({
    intent,
    query: query.trim(),
    limit: safeLimit,
  });
}

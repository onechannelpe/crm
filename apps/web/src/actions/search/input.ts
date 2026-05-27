import { isSearchIntent } from "~/contracts/search/vocabulary";
import type { RunDirectSearchCommand } from "~/server/search-workflow/run-search";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseSearchCommand(
  actorUserId: UserId,
  intent: unknown,
  query: unknown,
  limit: unknown,
): Result<RunDirectSearchCommand, DomainError> {
  if (typeof intent !== "string" || !isSearchIntent(intent)) {
    return Err(
      domainError(
        "validation",
        "search.intent.invalid",
        "intent must be a valid search intent",
      ),
    );
  }

  if (typeof query !== "string" || query.trim().length === 0) {
    return Err(
      domainError(
        "validation",
        "search.value.empty",
        "value must be a non-empty string",
      ),
    );
  }

  const safeLimit = limit == null ? 20 : Number(limit);
  if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) {
    return Err(
      domainError(
        "validation",
        "search.limit.out_of_range",
        "limit must be an integer in [1, 100]",
      ),
    );
  }

  return Ok({
    actorUserId,
    intent,
    query: query.trim(),
    limit: safeLimit,
  });
}

import type { RunDirectSearchCommand } from "~/server/search-workflow/run-search";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { isSearchType } from "~/server/shared/pipeline-types";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseSearchCommand(
  actorUserId: UserId,
  type: unknown,
  value: unknown,
  limit: unknown,
): Result<RunDirectSearchCommand, DomainError> {
  if (typeof type !== "string" || !isSearchType(type)) {
    return Err(
      domainError(
        "validation",
        "search.type.invalid",
        "type must be a valid search type",
      ),
    );
  }

  if (typeof value !== "string" || value.trim().length === 0) {
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

  return Ok({ actorUserId, type, value: value.trim(), limit: safeLimit });
}

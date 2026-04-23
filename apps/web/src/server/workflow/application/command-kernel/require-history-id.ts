import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export function requireFirstHistoryId(
  historyIds: string[],
  code: string,
): Result<string, DomainError> {
  const historyId = historyIds[0];
  if (historyId == null) {
    return Err(
      domainError(
        "unexpected",
        code,
        "Expected a persisted history event id for interaction command",
      ),
    );
  }
  return Ok(historyId);
}

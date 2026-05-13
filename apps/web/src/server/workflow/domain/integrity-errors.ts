import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

function integrityError(
  code: string,
  message: string,
  details?: unknown,
): Result<never, DomainError> {
  return Err(domainError("external", code, message, details));
}

export function invalidHistoryPayload(
  event: { id: string; eventType: string },
  key?: string,
): Result<never, DomainError> {
  return integrityError(
    "workflow_history_payload_invalid",
    key
      ? `Invalid history payload field "${key}" for event ${event.id} (${event.eventType})`
      : `Invalid history payload for event ${event.id} (${event.eventType})`,
    {
      eventId: event.id,
      eventType: event.eventType,
      field: key ?? null,
    },
  );
}

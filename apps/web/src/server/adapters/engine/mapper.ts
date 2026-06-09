import { external, type DomainError } from "~/server/shared/domain-error";

interface EngineErrorPayload {
  error?: string;
  request_id?: string;
}

/**
 * Extract error details from response: parse JSON if present, extract correlation ID.
 * Returns {error, request_id} or null if no error payload found.
 */
async function extractEngineErrorPayload(
  response: Response,
): Promise<EngineErrorPayload | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const json = (await response.json()) as unknown;
    if (typeof json !== "object" || json === null) {
      return null;
    }

    return json as EngineErrorPayload;
  } catch {
    // If body parsing fails, just return null; we'll use status code
    return null;
  }
}

/**
 * Map HTTP error response into DomainError.
 * Correlation ID (request_id) flows from response header, then body.
 * Details carry http status, request_id, and engine error message for debugging.
 */
export async function mapEngineErrorResponse(
  response: Response,
  requestId: string,
): Promise<DomainError> {
  const payload = await extractEngineErrorPayload(response);

  const headerRequestId = response.headers.get("x-request-id");
  const bodyRequestId = payload?.request_id;
  const correlationId = headerRequestId ?? bodyRequestId ?? requestId;

  return external(payload?.error ?? `Engine returned status ${response.status}`, {
    code: "engine_request_failed",
    details: {
      request_id: correlationId,
      http_status: response.status,
      engine_error: payload?.error,
    },
  });
}

export function mapEngineNetworkError(
  error: unknown,
  requestId: string,
): DomainError {
  const message =
    error instanceof Error ? error.message : "Engine communication failed";

  return external(message, {
    code: "engine_communication_failed",
    details: { request_id: requestId, http_status: 0 },
  });
}

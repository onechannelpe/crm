import { external, type DomainError } from "~/server/shared/domain-error";

interface EngineErrorPayload {
  error?: string;
  request_id?: string;
}

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

    return json;
  } catch {
    // Malformed engine error bodies fall back to the HTTP status below.
    return null;
  }
}

export async function mapEngineErrorResponse(
  response: Response,
  requestId: string,
): Promise<DomainError> {
  const payload = await extractEngineErrorPayload(response);

  const headerRequestId = response.headers.get("x-request-id");
  const bodyRequestId = payload?.request_id;
  const correlationId = headerRequestId ?? bodyRequestId ?? requestId;

  return external(
    payload?.error ?? `Engine returned status ${response.status}`,
    {
      code: "engine_request_failed",
      details: {
        request_id: correlationId,
        http_status: response.status,
        engine_error: payload?.error,
      },
    },
  );
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

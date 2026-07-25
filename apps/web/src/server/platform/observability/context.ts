import { getRequestEvent } from "solid-js/web";

import { generateRequestId, generateTraceId } from "~/shared/observability/ids";

export interface ActionRequestContext {
  traceId: string;
  requestId: string;
  routePath: string | null;
  httpMethod: string | null;
  requestStartedAt: number;
}

export function getActionRequestContext(): ActionRequestContext {
  const event = getRequestEvent();
  const existing = event?.locals?.requestContext?.observability;
  if (existing) {
    return existing;
  }

  const requestUrl = event?.request.url ? new URL(event.request.url) : null;

  return {
    traceId: generateTraceId(),
    requestId: generateRequestId(),
    routePath: requestUrl?.pathname ?? null,
    httpMethod: event?.request.method ?? null,
    requestStartedAt: Date.now(),
  };
}

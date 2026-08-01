import type { RequestContext } from "~/server/platform/http/request-context";

declare namespace App {
  interface RequestObservabilityContext {
    traceId: string;
    requestId: string;
    routePath: string | null;
    httpMethod: string | null;
  }

  interface RequestEventLocals {
    requestContext: RequestContext;
    nonce: string;
  }
}

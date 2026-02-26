/// <reference types="@solidjs/start/env" />

import type { AuthSession } from "~/lib/auth/access/session-types";

declare namespace App {
  interface RequestObservabilityContext {
    traceId: string;
    requestId: string;
    routePath: string | null;
    httpMethod: string | null;
    requestStartedAt: number;
  }

  interface RequestEventLocals {
    session?: AuthSession;
    observability?: RequestObservabilityContext;
    nonce: string;
  }
}

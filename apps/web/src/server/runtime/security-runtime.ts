import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";

import type { ServerInfra } from "./infra";
import { createServerInfra } from "./infra";

export function createSecurityRuntime(infra: ServerInfra) {
  return {
    requestSessions: createRequestSessionsRepo(infra.db),
  };
}

export const securityRuntime = createSecurityRuntime(createServerInfra());

import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createEventsRepo } from "~/server/shared/repos-events";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createSecurityRuntime(infra: ServerInfra) {
  return {
    requestSessions: createRequestSessionsRepo(infra.db),
    users: createUsersRepo(infra.db),
    passkeys: createPasskeysRepo(infra.db),
    userTotpFactors: createUserTotpFactorsRepo(infra.db),
    userRecoveryCodes: createUserRecoveryCodesRepo(infra.db),
    events: createEventsRepo(infra.db),
  };
}

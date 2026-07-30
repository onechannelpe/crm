import { createUserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";

export function createSecurityComposition(
  serverInfrastructure: ServerInfrastructure,
) {
  return {
    requestSessions: createRequestSessionsRepo(serverInfrastructure.db),
    users: createUsersRepo(serverInfrastructure.db),
    passkeys: createPasskeysRepo(serverInfrastructure.db),
    userTotpFactors: createUserTotpFactorsRepo(serverInfrastructure.db),
    userRecoveryCodes: createUserRecoveryCodesRepo(serverInfrastructure.db),
    events: createEventsRepo(serverInfrastructure.db),
  };
}

export function composeSecurity() {
  return createSecurityComposition(serverInfrastructure);
}

import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
import { createUsersRepo } from "~/server/users/repos-users";

export function createTotpEnrollmentContext(executor: DatabaseExecutor) {
  return {
    repos: {
      sessions: createSessionRepository(executor),
      users: createUsersRepo(executor),
      userTotpFactors: createUserTotpFactorsRepo(executor),
      userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(executor),
      events: createEventsRepo(executor),
    },
  };
}

export type TotpEnrollmentContext = ReturnType<
  typeof createTotpEnrollmentContext
>;

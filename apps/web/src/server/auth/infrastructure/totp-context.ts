import { db } from "~/lib/db/db";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createUsersRepo } from "~/server/users/repos-users";

export function createTotpEnrollmentContext() {
  return {
    repos: {
      sessions: createSessionRepository(db),
      users: createUsersRepo(db),
      userTotpFactors: createUserTotpFactorsRepo(db),
      userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(db),
      auditLogs: createAuditLogsRepo(db),
    },
  };
}

export type TotpEnrollmentContext = ReturnType<
  typeof createTotpEnrollmentContext
>;

import { repos } from "~/server/shared/context";

export function createTotpEnrollmentContext() {
  return {
    repos: {
      sessions: repos.sessions,
      users: repos.users,
      userTotpFactors: repos.userTotpFactors,
      userTotpRecoveryCodes: repos.userTotpRecoveryCodes,
      auditLogs: repos.auditLogs,
    },
  };
}

export type TotpEnrollmentContext = ReturnType<
  typeof createTotpEnrollmentContext
>;

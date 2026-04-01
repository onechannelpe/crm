import { repos } from "~/server/shared/context";

export function createAuthSessionContext() {
  return {
    repos: {
      users: repos.users,
      branches: repos.branches,
      teams: repos.teams,
      passkeys: repos.passkeys,
      userTotpFactors: repos.userTotpFactors,
      extensionRuntime: repos.extensionRuntime,
      auditLogs: repos.auditLogs,
    },
  };
}

export type AuthSessionContext = ReturnType<typeof createAuthSessionContext>;

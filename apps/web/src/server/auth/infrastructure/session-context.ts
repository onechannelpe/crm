import type { Kysely } from "kysely";

import { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { Database } from "~/server/platform/database/types";
import { createBranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";

export function createAuthSessionReadContext(executor: Kysely<Database>) {
  return {
    repos: {
      users: createUsersRepo(executor),
      branches: createBranchesRepo(executor),
      teams: createTeamsRepo(executor),
      branchSupervisors: createBranchSupervisorsRepo(executor),
      passkeys: createPasskeysRepo(executor),
      userTotpFactors: createUserTotpFactorsRepo(executor),
      userChannelAddresses: createUserChannelAddressRepo(executor),
    },
  };
}

export type AuthSessionReadContext = ReturnType<
  typeof createAuthSessionReadContext
>;

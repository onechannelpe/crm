import type { BranchId, TeamId, UserId } from "~/domain/ids";

export function makeMockRepos(
  overrides: {
    users?: { findById: (id: UserId) => Promise<any> };
    teams?: {
      findById: (id: TeamId) => Promise<any>;
    };
    branchSupervisors?: {
      findByBranch: (id: BranchId) => Promise<any>;
    };
  } = {},
) {
  return {
    users: {
      findById: async () => undefined,
      ...overrides.users,
    },
    teams: {
      findById: async () => undefined,
      ...overrides.teams,
    },
    branchSupervisors: {
      findByBranch: async () => [],
      isSupervisor: async () => false,
      ...overrides.branchSupervisors,
    },
  };
}

export function makeUserMockRepos(user: any) {
  return makeMockRepos({
    users: { findById: async () => user },
  });
}

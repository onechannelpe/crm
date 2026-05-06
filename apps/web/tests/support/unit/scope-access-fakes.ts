export function makeMockRepos(
  overrides: {
    users?: { findById: (id: number) => Promise<any> };
    teams?: {
      findById: (id: number) => Promise<any>;
    };
    branchSupervisors?: {
      findByBranch: (id: number) => Promise<any>;
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

import type { Role } from "../../../src/lib/auth/access/rbac";
import type { BranchId, UserId } from "../../../src/server/shared/ids";

export interface TestIdentity {
  userId: UserId;
  username: string;
  branchId: BranchId;
  role: Role;
}

export interface BrowserSeededIdentity extends TestIdentity {
  password: string;
}

export const ISOLATED_DB_IDENTITIES = {
  execOne: {
    userId: 1,
    username: "exec.one",
    branchId: 1,
    role: "executive",
  },
  backOne: {
    userId: 2,
    username: "back.one",
    branchId: 1,
    role: "back_office",
  },
  execTwo: {
    userId: 3,
    username: "exec.two",
    branchId: 2,
    role: "executive",
  },
  backTwo: {
    userId: 4,
    username: "back.two",
    branchId: 2,
    role: "back_office",
  },
  superuser: {
    userId: 5,
    username: "super.user",
    branchId: 2,
    role: "superuser",
  },
} as const satisfies Record<string, TestIdentity>;

export const BROWSER_TEST_PASSWORD = "placeholder";

export const BROWSER_DB_IDENTITIES = {
  passkeyUser: {
    userId: 1,
    username: "valeria.paredes",
    branchId: 1,
    role: "admin",
    password: BROWSER_TEST_PASSWORD,
  },
  strongAuthUser: {
    userId: 12,
    username: "mario.aguirre",
    branchId: 1,
    role: "sales_manager",
    password: BROWSER_TEST_PASSWORD,
  },
} as const satisfies Record<string, BrowserSeededIdentity>;

export type SeededIdentityName = keyof typeof ISOLATED_DB_IDENTITIES;
export type SeededBrowserIdentityName = keyof typeof BROWSER_DB_IDENTITIES;

export function getSeededIdentity(name: SeededIdentityName): TestIdentity {
  return ISOLATED_DB_IDENTITIES[name];
}

export function getSeededBrowserIdentityDefinition(
  name: SeededBrowserIdentityName,
): BrowserSeededIdentity {
  return BROWSER_DB_IDENTITIES[name];
}

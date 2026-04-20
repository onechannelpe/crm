import type { Role } from "../../../src/lib/auth/access/rbac";
import {
  asBranchId,
  asContactId,
  asOrganizationId,
  asUserId,
  type BranchId,
  type ContactId,
  type OrganizationId,
  type UserId,
} from "../../../src/server/shared/ids";

export const TEST_IDS = {
  BRANCH_LIMA: asBranchId("00000000-0000-0000-0000-000000000011"),
  BRANCH_NORTE: asBranchId("00000000-0000-0000-0000-000000000012"),
  ORG_LIMA: asOrganizationId("00000000-0000-0000-0000-000000000101"),
  ORG_NORTE: asOrganizationId("00000000-0000-0000-0000-000000000102"),
  CONTACT_LIMA: asContactId("00000000-0000-0000-0000-000000000201"),
  CONTACT_NORTE: asContactId("00000000-0000-0000-0000-000000000202"),
} as const;

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
    userId: asUserId("00000000-0000-0000-0000-000000000001"),
    username: "exec.one",
    branchId: TEST_IDS.BRANCH_LIMA,
    role: "executive",
  },
  backOne: {
    userId: asUserId("00000000-0000-0000-0000-000000000002"),
    username: "back.one",
    branchId: TEST_IDS.BRANCH_LIMA,
    role: "back_office",
  },
  execTwo: {
    userId: asUserId("00000000-0000-0000-0000-000000000003"),
    username: "exec.two",
    branchId: TEST_IDS.BRANCH_NORTE,
    role: "executive",
  },
  backTwo: {
    userId: asUserId("00000000-0000-0000-0000-000000000004"),
    username: "back.two",
    branchId: TEST_IDS.BRANCH_NORTE,
    role: "back_office",
  },
  superuser: {
    userId: asUserId("00000000-0000-0000-0000-000000000005"),
    username: "super.user",
    branchId: TEST_IDS.BRANCH_NORTE,
    role: "superuser",
  },
} satisfies Record<string, TestIdentity>;

export const BROWSER_TEST_PASSWORD = "placeholder";

export const BROWSER_DB_IDENTITIES = {
  passkeyUser: {
    userId: asUserId("00000000-0000-0000-0000-000000010001"),
    username: "valeria.paredes",
    branchId: TEST_IDS.BRANCH_LIMA,
    role: "admin",
    password: BROWSER_TEST_PASSWORD,
  },
  strongAuthUser: {
    userId: asUserId("00000000-0000-0000-0000-000000010012"),
    username: "mario.aguirre",
    branchId: TEST_IDS.BRANCH_LIMA,
    role: "sales_manager",
    password: BROWSER_TEST_PASSWORD,
  },
} satisfies Record<string, BrowserSeededIdentity>;

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

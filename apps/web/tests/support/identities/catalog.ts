import type { Role } from "~/lib/auth/access/rbac";
import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";

export interface TestIdentity {
  userId: UserId;
  username: string;
  branchId: BranchId;
  role: Role;
}

export const ISOLATED_DB_IDENTITIES = {
  execOne: {
    userId: asUserId("01974fd5-f261-7a7d-93f5-2f3d0f961001"),
    username: "exec.one",
    branchId: asBranchId("01974fd5-f261-7a7d-93f5-2f3d0f960001"),
    role: "executive",
  },
  backOne: {
    userId: asUserId("01974fd5-f261-7a7d-93f5-2f3d0f961002"),
    username: "back.one",
    branchId: asBranchId("01974fd5-f261-7a7d-93f5-2f3d0f960001"),
    role: "back_office",
  },
  execTwo: {
    userId: asUserId("01974fd5-f261-7a7d-93f5-2f3d0f961003"),
    username: "exec.two",
    branchId: asBranchId("01974fd5-f261-7a7d-93f5-2f3d0f960002"),
    role: "executive",
  },
  backTwo: {
    userId: asUserId("01974fd5-f261-7a7d-93f5-2f3d0f961004"),
    username: "back.two",
    branchId: asBranchId("01974fd5-f261-7a7d-93f5-2f3d0f960002"),
    role: "back_office",
  },
  superuser: {
    userId: asUserId("01974fd5-f261-7a7d-93f5-2f3d0f961005"),
    username: "super.user",
    branchId: asBranchId("01974fd5-f261-7a7d-93f5-2f3d0f960002"),
    role: "superuser",
  },
} as const satisfies Record<string, TestIdentity>;

export type SeededIdentityName = keyof typeof ISOLATED_DB_IDENTITIES;

export function getSeededIdentity(name: SeededIdentityName): TestIdentity {
  return ISOLATED_DB_IDENTITIES[name];
}

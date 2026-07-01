import type { Role } from "~/lib/auth/access/rbac";
import type { BranchId, UserId } from "~/server/shared/ids";

export interface BrowserIdentity {
  userId: UserId;
  username: string;
  email: string;
  branchId: BranchId;
  role: Role;
  password: string;
}

export interface BrowserUserOptions {
  role: Role;
  username?: string;
  branchId?: BranchId;
  onboardingCompleted?: boolean;
  active?: boolean;
}

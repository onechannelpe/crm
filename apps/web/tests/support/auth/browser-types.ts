import type { Role } from "../../../src/lib/auth/access/rbac";

export interface BrowserIdentity {
  userId: number;
  username: string;
  email: string;
  branchId: number;
  role: Role;
  password: string;
}

export interface BrowserUserOptions {
  role: Role;
  username?: string;
  branchId?: number;
  onboardingCompleted?: boolean;
  active?: boolean;
}

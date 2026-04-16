import type { Role } from "~/lib/auth/access/rbac";

export type ActorContext = {
  userId: number;
  role: Role;
  branchId: number;
};

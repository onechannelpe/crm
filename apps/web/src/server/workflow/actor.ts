import type { Role } from "~/lib/auth/access/rbac";

export type WorkflowActor = {
  userId: number;
  role: Role;
  branchId: number;
};

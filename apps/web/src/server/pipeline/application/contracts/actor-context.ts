import type { Role } from "~/lib/auth/access/rbac";
import type { UserId } from "~/server/shared/ids";

export type ActorContext = {
  userId: UserId;
  role: Role;
  branchId: number;
};

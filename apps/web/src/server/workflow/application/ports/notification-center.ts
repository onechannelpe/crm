import type { Role } from "~/lib/auth/access/rbac";
import type { AppNotificationEvent } from "~/server/notifications/app-events";

export type WorkflowNotificationCenter = {
  notifyUsers(
    userIds: number[],
    notification: AppNotificationEvent,
  ): Promise<unknown>;
  notifyBranchRoles(
    branchId: number,
    roles: Role[],
    notification: AppNotificationEvent,
  ): Promise<unknown>;
};

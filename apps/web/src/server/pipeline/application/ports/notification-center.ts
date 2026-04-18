import type { Role } from "~/lib/auth/access/rbac";
import type { AppNotificationEvent } from "~/server/notifications/app-events";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

export type PipelineNotificationCenter = {
  notifyUsers(
    userIds: UserId[],
    notification: AppNotificationEvent,
  ): Promise<unknown>;
  notifyBranchRoles(
    branchId: BranchId,
    roles: Role[],
    notification: AppNotificationEvent,
  ): Promise<unknown>;
};

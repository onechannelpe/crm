import type { Role } from "~/lib/auth/access/rbac";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";

import type { NotificationEventType } from "./categories";

export type NotificationAudience =
  | { kind: "user_ids"; userIds: UserId[] }
  | { kind: "branch_role"; branchId: BranchId; role: Role }
  | { kind: "global_role"; role: Role }
  | { kind: "team_id"; teamId: TeamId };

export type NotificationChannel = "in_app" | "email" | "whatsapp";

export type NotificationIntent = {
  id: string;
  eventType: NotificationEventType;
  audience: NotificationAudience;
  channels: NotificationChannel[];
  priority: "high" | "normal" | "low";
  title: string;
  bodyText: string;
  actionUrl: string | null;
};

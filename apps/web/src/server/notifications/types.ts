import type { Role } from "~/lib/auth/access/rbac";

export type NotificationAudience =
  | { kind: "user_ids"; userIds: number[] }
  | { kind: "branch_role"; branchId: number; role: Role }
  | { kind: "global_role"; role: Role }
  | { kind: "team_id"; teamId: number };

export type NotificationChannel = "in_app" | "email" | "whatsapp";

export type NotificationIntent = {
  id: string;
  eventType: string;
  audience: NotificationAudience;
  channels: NotificationChannel[];
  priority: "high" | "normal" | "low";
  title: string;
  bodyText: string;
  actionUrl: string | null;
};

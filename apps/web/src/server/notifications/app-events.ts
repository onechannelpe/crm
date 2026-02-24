import type { UsersTable } from "~/lib/db/schema";

export type AppNotificationPriority = "high" | "normal" | "low";

export interface AppNotificationEvent {
  type:
    | "lead.more_requested"
    | "lead.request_resolved"
    | "quota.assigned"
    | "sale.submitted"
    | "sale.rejected"
    | "sale.confirmed"
    | "sale.resubmitted";
  title: string;
  bodyText: string;
  actionUrl: string | null;
  priority: AppNotificationPriority;
  dedupeKey: string | null;
  metadata?: Record<string, unknown>;
}

export const SUPERVISOR_AUDIENCE_ROLES: UsersTable["role"][] = [
  "supervisor",
  "sales_manager",
  "admin",
  "superuser",
];

export const REVIEW_AUDIENCE_ROLES: UsersTable["role"][] = [
  "back_office",
  "supervisor",
  "sales_manager",
  "admin",
  "superuser",
];

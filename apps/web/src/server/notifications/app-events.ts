import type { UsersTable } from "~/lib/db/types";

export type AppNotificationPriority = "high" | "normal" | "low";

export interface AppNotificationEvent {
  type:
    | "capacity.request_submitted"
    | "capacity.request_approved"
    | "capacity.request_rejected"
    | "search.allowance_granted"
    | "lead.refill_granted"
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

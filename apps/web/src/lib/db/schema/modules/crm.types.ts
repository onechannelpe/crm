import type { ColumnType, Generated } from "kysely";

export type ExecutiveCategoryValue = "elite" | "corporativa";
export type UserRoleValue =
  | "executive"
  | "supervisor"
  | "back_office"
  | "sales_manager"
  | "logistics"
  | "hr"
  | "admin"
  | "superuser";

export function isExecutiveCategoryValue(
  value: string,
): value is ExecutiveCategoryValue {
  return value === "elite" || value === "corporativa";
}

export interface UsersTable {
  id: Generated<number>;
  branch_id: number;
  team_id: number | null;
  username: string;
  email: string;
  password_hash: string;
  names: string;
  first_surname: string;
  second_surname: string;
  expires_at: number | null;
  expiry_notified_at: number | null;
  phone_e164: string | null;
  avatar_storage_key: string | null;
  avatar_mime_type: string | null;
  avatar_updated_at: number | null;
  avatar_version: ColumnType<number, number | undefined, number>;
  onboarding_completed_at: number | null;
  role: UserRoleValue;
  executive_category: ExecutiveCategoryValue | null;
  is_active: number;
  created_at: number;
}

export interface ContactsTable {
  id: Generated<number>;
  organization_id: number;
  dni: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  last_contacted_at: number | null;
  last_contacted_by_user_id: number | null;
  cooldown_until: number | null;
  created_at: number;
}

export interface LeadAssignmentsTable {
  id: Generated<number>;
  user_id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: "active" | "completed" | "expired";
}

export interface InteractionLogsTable {
  id: Generated<number>;
  contact_id: number;
  user_id: number;
  outcome: string;
  notes: string | null;
  duration_seconds: number | null;
  created_at: number;
}

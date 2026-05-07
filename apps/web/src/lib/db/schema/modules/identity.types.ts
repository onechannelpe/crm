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

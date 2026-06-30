import type { ColumnType } from "kysely";

import type {
  BranchId,
  GeneratedId,
  IdColumn,
  NullableIdColumn,
  TeamId,
  UserId,
} from "~/server/shared/ids";

export type ExecutiveCategoryValue = "elite" | "corporativa";

export type Role =
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
  id: GeneratedId<UserId>;
  branch_id: IdColumn<BranchId>;
  team_id: NullableIdColumn<TeamId>;
  username: string;
  email: string;
  password_hash: string;
  names: string;
  first_surname: string;
  second_surname: string;
  expires_at: Date | null;
  expiry_notified_at: Date | null;
  avatar_storage_key: string | null;
  avatar_mime_type: string | null;
  avatar_updated_at: Date | null;
  avatar_version: ColumnType<number, number | undefined, number>;
  onboarding_completed_at: Date | null;
  role: Role;
  executive_category: ExecutiveCategoryValue | null;
  is_active: boolean;
  created_at: Date;
}

import type { ColumnType } from "kysely";

import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type {
  BranchId,
  GeneratedId,
  IdColumn,
  NullableIdColumn,
  TeamId,
  UserId,
} from "~/domain/ids";

export type Role =
  | "executive"
  | "supervisor"
  | "back_office"
  | "sales_manager"
  | "logistics"
  | "hr"
  | "admin"
  | "superuser";

export interface UsersTable {
  id: GeneratedId<UserId>;
  branch_id: IdColumn<BranchId>;
  team_id: NullableIdColumn<TeamId>;
  username: string;
  email: string;
  password_hash: string;
  password_change_required: ColumnType<boolean, boolean | undefined, boolean>;
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
  executive_category: ExecutiveCategory | null;
  is_active: boolean;
  created_at: Date;
}

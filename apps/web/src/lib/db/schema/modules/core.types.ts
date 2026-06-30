import type { Generated } from "kysely";

import type {
  BranchId,
  GeneratedId,
  IdColumn,
  OrganizationId,
  PersonId,
  TeamId,
  UserId,
} from "~/server/shared/ids";

export interface BranchesTable {
  id: GeneratedId<BranchId>;
  name: string;
  created_at: Date;
}

export interface TeamsTable {
  id: GeneratedId<TeamId>;
  branch_id: IdColumn<BranchId>;
  name: string;
  created_at: Date;
}

export interface BranchSupervisorsTable {
  id: Generated<string>;
  branch_id: IdColumn<BranchId>;
  user_id: IdColumn<UserId>;
  created_at: Date;
}

export interface BackOfficeAssignmentsTable {
  id: Generated<string>;
  back_office_user_id: IdColumn<UserId>;
  team_id: IdColumn<TeamId>;
  assigned_at: Date;
}

export interface PeopleTable {
  id: GeneratedId<PersonId>;
  dni: string;
  full_name: string;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationsTable {
  id: IdColumn<OrganizationId>;
  ruc: string;
  legal_name: string | null;
  giro_negocio: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  created_at: Date;
}

export interface OrganizationBranchLocksTable {
  organization_id: IdColumn<OrganizationId>;
  branch_id: IdColumn<BranchId>;
  locked_at: Date;
  locked_by_user_id: IdColumn<UserId>;
}

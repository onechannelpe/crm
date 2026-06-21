import type { Generated } from "kysely";

export interface BranchesTable {
  id: Generated<number>;
  name: string;
  created_at: number;
}

export interface TeamsTable {
  id: Generated<number>;
  branch_id: number;
  name: string;
  created_at: number;
}

export interface BranchSupervisorsTable {
  id: Generated<number>;
  branch_id: number;
  user_id: number;
  created_at: number;
}

export interface BackOfficeAssignmentsTable {
  id: Generated<number>;
  back_office_user_id: number;
  team_id: number;
  assigned_at: number;
}

export interface PeopleTable {
  id: Generated<number>;
  dni: string;
  full_name: string;
  email: string | null;
  created_at: number;
  updated_at: number;
}

export interface OrganizationsTable {
  id: string;
  ruc: string;
  legal_name: string | null;
  giro_negocio: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  created_at: number;
}

export interface OrganizationBranchLocksTable {
  organization_id: string;
  branch_id: number;
  locked_at: number;
  locked_by_user_id: number;
}

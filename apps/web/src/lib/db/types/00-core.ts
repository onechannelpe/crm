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
  supervisor_id: number | null;
  created_at: number;
}

export interface OrganizationsTable {
  id: Generated<number>;
  ruc: string;
  name: string;
  locked_branch_id: number | null;
  locked_at: number | null;
  locked_by_user_id: number | null;
  created_at: number;
}

export type Db = {
  branches: BranchesTable;
  teams: TeamsTable;
  organizations: OrganizationsTable;
};

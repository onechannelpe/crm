import type {
  Database,
  OrganizationsTable,
  UsersTable,
  WorkflowLeadsTable,
} from "~/lib/db/types";

export interface LeadAlias {
  lead: WorkflowLeadsTable;
}

export interface ExecutiveAlias {
  executive: UsersTable;
}

export interface CreatorAlias {
  creator: UsersTable;
}

export interface OrganizationAlias {
  org: OrganizationsTable;
}

export type LeadQueryDatabase = Database &
  LeadAlias &
  ExecutiveAlias &
  CreatorAlias &
  OrganizationAlias;

import type {
  Database,
  OrganizationCurrentOwnersView,
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

export interface OwnerAlias {
  owner: OrganizationCurrentOwnersView;
}

export interface CreatorAlias {
  creator: UsersTable;
}

export interface OrganizationAlias {
  org: OrganizationsTable;
}

export type LeadQueryDatabase = Database &
  LeadAlias &
  OwnerAlias &
  ExecutiveAlias &
  CreatorAlias &
  OrganizationAlias;

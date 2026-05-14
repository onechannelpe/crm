import type { Database, UsersTable, WorkflowLeadsTable } from "~/lib/db/types";

export interface LeadAlias {
  lead: WorkflowLeadsTable;
}

export interface ExecutiveAlias {
  executive: UsersTable;
}

export type LeadQueryDatabase = Database & LeadAlias & ExecutiveAlias;

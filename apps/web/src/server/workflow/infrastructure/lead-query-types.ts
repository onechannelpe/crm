import type { Database } from "~/lib/db/types";
import type { UsersTable, WorkflowLeadsTable } from "~/lib/db/types";

export interface LeadAlias {
  lead: WorkflowLeadsTable;
}

export interface ExecutiveAlias {
  executive: UsersTable;
}

export interface CreatorAlias {
  creator: UsersTable;
}

export type LeadQueryDatabase = Database & LeadAlias & ExecutiveAlias;

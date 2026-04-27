import type { Database } from "~/lib/db/types";
import type { UsersTable } from "~/lib/db/types/02-crm";
import type { WorkflowLeadsTable } from "~/lib/db/types/10-workflow";

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

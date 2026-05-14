import type {
  AssignableExecutivesInput,
  LeadListFiltersInput,
} from "~/contracts/workflow/inputs";

import type { WorkflowActor } from "./actor";

export type ListAssignableExecutivesInput = AssignableExecutivesInput & {
  actor: WorkflowActor;
};

export type ListLeadsInput = {
  actor: WorkflowActor;
  filters: LeadListFiltersInput;
};

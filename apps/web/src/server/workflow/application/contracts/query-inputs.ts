import type {
  ActorContext,
  AssignableExecutivesInput as AssignableExecutivesPayload,
  LeadIdInput,
  LeadListFiltersInput,
} from "~/contracts/workflow";

type WithActor<T> = T & { actor: ActorContext };

export type GetLeadDetailInput = WithActor<LeadIdInput>;

export type ListAssignableExecutivesInput = WithActor<AssignableExecutivesPayload>;

export type ListLeadsInput = {
  actor: ActorContext;
  filters: LeadListFiltersInput;
};

import type {
  AddLeadNoteInput,
  AddVenueAccountsInput,
  AssignableExecutivesInput,
  CreateLeadInput,
  CreateQuotationInput,
  CreateVenueInput,
  LeadIdInput,
  LeadListFiltersInput,
  LogLeadCallInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  RequestRateNegotiationInput,
  ReviewLeadInput,
  SaveCommercialScopeInput,
} from "~/contracts/workflow";
import type { AppContext } from "~/server/shared/action-runtime";
import type {
  AddLeadNoteCommandInput,
  AddVenueAccountsCommandInput,
  CreateQuotationCommandInput,
  CreateVenueCommandInput,
  ListAssignableExecutivesInput,
  ListLeadsInput,
  LogLeadCallCommandInput,
  ReassignLeadCommandInput,
  RegisterLeadInput,
  RequestRateNegotiationCommandInput,
  ReviewLeadCommandInput,
  SaveCommercialScopeCommandInput,
  WorkflowActor,
} from "~/server/workflow/types";

export function workflowActorFrom(ctx: AppContext): WorkflowActor {
  return {
    userId: ctx.actor.userId,
    role: ctx.actor.role,
    branchId: ctx.actor.branchId,
  };
}

export function toRegisterLeadInput(
  ctx: AppContext,
  input: CreateLeadInput,
): RegisterLeadInput {
  return {
    actor: workflowActorFrom(ctx),
    ruc: input.ruc.trim(),
    executiveId: input.executiveId ?? ctx.actor.userId,
  };
}

export function toReviewLeadInput(
  ctx: AppContext,
  input: ReviewLeadInput,
): ReviewLeadCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toSaveCommercialScopeInput(
  ctx: AppContext,
  input: SaveCommercialScopeInput,
): SaveCommercialScopeCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toRecordRepLegalInput(
  ctx: AppContext,
  input: RecordRepLegalInput,
) {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toLeadIdActorInput(ctx: AppContext, input: LeadIdInput) {
  return { actor: workflowActorFrom(ctx), leadId: input.leadId };
}

export function toReassignLeadInput(
  ctx: AppContext,
  input: ReassignLeadInput,
): ReassignLeadCommandInput {
  return {
    actor: workflowActorFrom(ctx),
    leadId: input.leadId,
    toExecutiveId: input.newExecutiveId,
  };
}

export function toCreateQuotationInput(
  ctx: AppContext,
  input: CreateQuotationInput,
): CreateQuotationCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toCreateVenueInput(
  ctx: AppContext,
  input: CreateVenueInput,
): CreateVenueCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toAddVenueAccountsInput(
  ctx: AppContext,
  input: AddVenueAccountsInput,
): AddVenueAccountsCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toRequestRateNegotiationInput(
  ctx: AppContext,
  input: RequestRateNegotiationInput,
): RequestRateNegotiationCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toLogLeadCallInput(
  ctx: AppContext,
  input: LogLeadCallInput,
): LogLeadCallCommandInput {
  return {
    actor: workflowActorFrom(ctx),
    leadId: input.leadId,
    outcome: input.outcome,
    notes: input.notes ?? null,
  };
}

export function toAddLeadNoteInput(
  ctx: AppContext,
  input: AddLeadNoteInput,
): AddLeadNoteCommandInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

export function toListLeadsInput(
  ctx: AppContext,
  filters: LeadListFiltersInput,
): ListLeadsInput {
  return { actor: workflowActorFrom(ctx), filters };
}

export function toGetLeadDetailInput(ctx: AppContext, leadId: string) {
  return { actor: workflowActorFrom(ctx), leadId };
}

export function toListAssignableExecutivesInput(
  ctx: AppContext,
  input: AssignableExecutivesInput,
): ListAssignableExecutivesInput {
  return { actor: workflowActorFrom(ctx), ...input };
}

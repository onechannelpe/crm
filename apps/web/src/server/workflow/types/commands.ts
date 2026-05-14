import type {
  AddLeadNoteInput,
  AddVenueAccountsInput,
  CreateQuotationInput,
  CreateVenueInput,
  LeadIdInput,
  LogLeadCallInput,
  RecordRepLegalInput,
  RequestRateNegotiationInput,
  ReviewLeadInput,
  SaveCommercialScopeInput,
} from "~/contracts/workflow/inputs";
import type { LeadPriority, LeadStatus } from "~/contracts/workflow/vocabulary";

import type { WorkflowActor } from "./actor";

export type WithActor<T> = T & { actor: WorkflowActor };
export type LeadIdWithActor = { actor: WorkflowActor; leadId: string };

export type RegisterLeadInput = {
  actor: WorkflowActor;
  ruc: string;
  executiveId: number;
};

export type ReassignLeadCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  toExecutiveId: number;
};

export type ReviewLeadCommandInput = {
  actor: WorkflowActor;
  leadId: ReviewLeadInput["leadId"];
  status: ReviewLeadInput["status"];
  prioridad: ReviewLeadInput["prioridad"];
  reason: ReviewLeadInput["reason"];
};

export type ApplyImportedReviewInput = {
  actor: WorkflowActor;
  leadId: string;
  type: "import_status" | "import_prioridad";
  status?: LeadStatus;
  prioridad?: LeadPriority;
  expectedUpdatedAt: number;
};

export type AddLeadToFavoritesInput = LeadIdWithActor;
export type RemoveLeadFromFavoritesInput = LeadIdWithActor;
export type ApproveForSaleInput = LeadIdWithActor;
export type RequestQuotationInput = LeadIdWithActor;
export type RequestSunatRefreshInput = LeadIdWithActor;

export type AddLeadNoteCommandInput = WithActor<AddLeadNoteInput>;
export type LogLeadCallCommandInput = WithActor<LogLeadCallInput>;
export type CreateQuotationCommandInput = WithActor<CreateQuotationInput>;
export type SaveCommercialScopeCommandInput =
  WithActor<SaveCommercialScopeInput>;
export type RecordRepLegalCommandInput = WithActor<RecordRepLegalInput>;
export type RequestRateNegotiationCommandInput =
  WithActor<RequestRateNegotiationInput>;
export type CreateVenueCommandInput = WithActor<CreateVenueInput>;
export type AddVenueAccountsCommandInput = WithActor<AddVenueAccountsInput>;

export type UpdateSourcingPolicyInput = {
  actor: WorkflowActor;
  branchId: number;
  engineAssignmentEnabled: boolean;
};

export type GetLeadDetailInput = WithActor<LeadIdInput>;

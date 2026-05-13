import type {
  AddLeadNoteInput as AddLeadNotePayload,
  AddVenueAccountsInput as AddVenueAccountsPayload,
  AssignableExecutivesInput as AssignableExecutivesPayload,
  CreateQuotationInput as CreateQuotationPayload,
  CreateVenueInput as CreateVenuePayload,
  LeadIdInput,
  LeadListFiltersInput,
  LogLeadCallInput as LogLeadCallPayload,
  RecordRepLegalInput as RecordRepLegalPayload,
  RequestRateNegotiationInput as RequestRateNegotiationPayload,
  ReviewLeadInput as ReviewLeadPayload,
  SaveCommercialScopeInput as SaveCommercialScopePayload,
} from "./inputs";
import type { ActorContext } from "./primitives";
import type { LeadPriority, LeadStatus } from "./vocabulary";

export type WithActor<T> = T & { actor: ActorContext };
export type LeadIdWithActor = { actor: ActorContext; leadId: string };

export type RegisterLeadInput = {
  actor: ActorContext;
  ruc: string;
  executiveId: number;
};

export type ReassignLeadCommandInput = {
  actor: ActorContext;
  leadId: string;
  toExecutiveId: number;
};

export type ReviewLeadCommandInput = {
  actor: ActorContext;
  leadId: ReviewLeadPayload["leadId"];
  status: ReviewLeadPayload["status"];
  prioridad: ReviewLeadPayload["prioridad"];
  reason: ReviewLeadPayload["reason"];
};

export type ApplyImportedReviewInput = {
  actor: ActorContext;
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

export type AddLeadNoteCommandInput = WithActor<AddLeadNotePayload>;
export type LogLeadCallCommandInput = WithActor<LogLeadCallPayload>;
export type CreateQuotationCommandInput = WithActor<CreateQuotationPayload>;
export type SaveCommercialScopeCommandInput =
  WithActor<SaveCommercialScopePayload>;
export type RecordRepLegalCommandInput = WithActor<RecordRepLegalPayload>;
export type RequestRateNegotiationCommandInput =
  WithActor<RequestRateNegotiationPayload>;
export type CreateVenueCommandInput = WithActor<CreateVenuePayload>;
export type AddVenueAccountsCommandInput = WithActor<AddVenueAccountsPayload>;

export type UpdateSourcingPolicyInput = {
  actor: ActorContext;
  branchId: number;
  engineAssignmentEnabled: boolean;
};

export type GetLeadDetailInput = WithActor<LeadIdInput>;
export type ListAssignableExecutivesInput =
  WithActor<AssignableExecutivesPayload>;
export type ListLeadsInput = {
  actor: ActorContext;
  filters: LeadListFiltersInput;
};

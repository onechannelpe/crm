import type {
  ActorContext,
  AddLeadNoteInput as AddLeadNotePayload,
  AddVenueAccountsInput as AddVenueAccountsPayload,
  CreateQuotationInput as CreateQuotationPayload,
  CreateVenueInput as CreateVenuePayload,
  LogLeadCallInput as LogLeadCallPayload,
  LeadPriority,
  LeadStatus,
  RecordRepLegalInput as RecordRepLegalPayload,
  RequestRateNegotiationInput as RequestRateNegotiationPayload,
  ReviewLeadInput as ReviewLeadPayload,
  SaveCommercialScopeInput as SaveCommercialScopePayload,
} from "~/contracts/workflow";

type WithActor<T> = T & { actor: ActorContext };

export type ReassignLeadInput = {
  actor: ActorContext;
  leadId: string;
  toExecutiveId: number;
};

export type AddLeadToFavoritesInput = {
  actor: ActorContext;
  leadId: string;
};

export type RemoveLeadFromFavoritesInput = {
  actor: ActorContext;
  leadId: string;
};

export type ReviewLeadInput = {
  actor: ActorContext;
  leadId: ReviewLeadPayload["leadId"];
  status: ReviewLeadPayload["status"];
  prioridad: ReviewLeadPayload["prioridad"];
  reason: ReviewLeadPayload["reason"];
};

export type AddLeadNoteInput = WithActor<AddLeadNotePayload>;

export type LogLeadCallInput = WithActor<LogLeadCallPayload>;

export type ApplyImportedReviewInput = {
  actor: ActorContext;
  leadId: string;
  type: "import_status" | "import_prioridad";
  status?: LeadStatus;
  prioridad?: LeadPriority;
  expectedUpdatedAt: number;
};

export type RegisterLeadInput = {
  actor: ActorContext;
  ruc: string;
  executiveId: number;
};

export type ApproveForSaleInput = {
  actor: ActorContext;
  leadId: string;
};

export type CreateQuotationInput = {
  actor: ActorContext;
} & CreateQuotationPayload;

export type SaveCommercialScopeInput = WithActor<SaveCommercialScopePayload>;

export type RequestQuotationInput = {
  actor: ActorContext;
  leadId: string;
};

export type RecordRepLegalInput = WithActor<RecordRepLegalPayload>;

export type RequestRateNegotiationInput =
  WithActor<RequestRateNegotiationPayload>;

export type CreateVenueInput = WithActor<CreateVenuePayload>;

export type AddVenueAccountsInput = WithActor<AddVenueAccountsPayload>;

export type RequestSunatRefreshInput = {
  actor: ActorContext;
  leadId: string;
};

export type UpdateSourcingPolicyInput = {
  actor: ActorContext;
  branchId: number;
  engineAssignmentEnabled: boolean;
};

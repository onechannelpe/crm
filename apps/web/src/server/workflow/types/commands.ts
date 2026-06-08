import type {
  AddLeadNoteInput,
  AddVenueAccountsInput,
  CreateQuotationInput,
  CreateVenueInput,
  LogLeadCallInput,
  RecordRepLegalInput,
  RequestQuotationInput,
  RequestRateNegotiationInput,
  ReviewLeadInput,
  SaveCommercialScopeInput,
  SaveDigitalPolicyInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";

import type { WorkflowActor } from "./actor";

// A command input is the client payload plus the authenticated actor that the
// action injects server-side. The payload is the contract; the actor never
// crosses the wire.
type WithActor<TPayload> = TPayload & { actor: WorkflowActor };

// Register and reassign do not mirror their client payloads: register resolves
// a concrete executiveId and reassign renames the target field, so both keep an
// explicit shape.
export type RegisterLeadCommandInput = {
  actor: WorkflowActor;
  ruc: string;
  executiveId: number;
};

export type ReassignLeadCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  toExecutiveId: number;
};

export type ReviewLeadCommandInput = WithActor<ReviewLeadInput>;

export type AddLeadNoteCommandInput = WithActor<AddLeadNoteInput>;

export type LogLeadCallCommandInput = WithActor<LogLeadCallInput>;

export type CreateQuotationCommandInput = WithActor<CreateQuotationInput>;

export type SaveCommercialScopeCommandInput =
  WithActor<SaveCommercialScopeInput>;

export type SaveDigitalPolicyCommandInput = WithActor<SaveDigitalPolicyInput>;

export type RequestQuotationCommandInput = WithActor<RequestQuotationInput>;

export type RecordRepLegalCommandInput = WithActor<RecordRepLegalInput>;

export type RequestRateNegotiationCommandInput =
  WithActor<RequestRateNegotiationInput>;

export type CreateVenueCommandInput = WithActor<CreateVenueInput>;

export type UpdateVenueCommandInput = WithActor<UpdateVenueInput>;

export type AddVenueAccountsCommandInput = WithActor<AddVenueAccountsInput>;

export type UpdateSourcingPolicyCommandInput = {
  actor: WorkflowActor;
  branchId: number;
  engineAssignmentEnabled: boolean;
};

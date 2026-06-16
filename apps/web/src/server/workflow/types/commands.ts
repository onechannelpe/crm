import type {
  AcceptRateInput,
  AddLeadNoteInput,
  AddVenueAccountsInput,
  CreateLeadInput,
  CreateVenueInput,
  EditCommercialScopeInput,
  LogLeadCallInput,
  ProposeRateInput,
  RecordRepLegalInput,
  RequestRateRevisionInput,
  SaveDigitalPolicyInput,
  UpdateVenueInput,
} from "~/contracts/workflow/inputs";

import type { WorkflowActor } from "./actor";

type WithActor<TPayload> = TPayload & { actor: WorkflowActor };

export type RegisterLeadCommandInput = WithActor<CreateLeadInput>;

export type ReassignLeadCommandInput = {
  actor: WorkflowActor;
  leadId: string;
  toExecutiveId: number;
};

export type AddLeadNoteCommandInput = WithActor<AddLeadNoteInput>;

export type LogLeadCallCommandInput = WithActor<LogLeadCallInput>;

export type ProposeRateCommandInput = WithActor<ProposeRateInput>;

export type AcceptRateCommandInput = WithActor<AcceptRateInput>;

export type EditCommercialScopeCommandInput =
  WithActor<EditCommercialScopeInput>;

export type SaveDigitalPolicyCommandInput = WithActor<SaveDigitalPolicyInput>;

export type RecordRepLegalCommandInput = WithActor<RecordRepLegalInput>;

export type RequestRateRevisionCommandInput =
  WithActor<RequestRateRevisionInput>;

export type CreateVenueCommandInput = WithActor<CreateVenueInput>;

export type UpdateVenueCommandInput = WithActor<UpdateVenueInput>;

export type AddVenueAccountsCommandInput = WithActor<AddVenueAccountsInput>;

export type UpdateSourcingPolicyCommandInput = {
  actor: WorkflowActor;
  branchId: number;
  engineAssignmentEnabled: boolean;
};

export type UpdateRateProposalPolicyCommandInput = {
  actor: WorkflowActor;
  validityDays: number;
};

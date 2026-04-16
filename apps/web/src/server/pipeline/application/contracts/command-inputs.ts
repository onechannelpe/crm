import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";

import type { ActorContext } from "./actor-context";

export type ReassignLeadInput = {
  actor: ActorContext;
  leadId: number;
  toExecutiveId: number;
};

export type ReviewLeadInput = {
  actor: ActorContext;
  leadId: number;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
};

export type AddLeadNoteInput = {
  actor: ActorContext;
  leadId: number;
  body: string;
};

export type LogLeadCallInput = {
  actor: ActorContext;
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type ApplyImportedReviewInput = {
  actor: ActorContext;
  leadId: number;
  type: "import_status" | "import_prioridad";
  status?: LeadStatus;
  prioridad?: LeadPriority;
  expectedUpdatedAt: number;
};

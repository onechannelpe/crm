import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { LeadId } from "~/server/pipeline/domain/lead-record";

export type RowResult =
  | { row: number; ok: false; reason: string }
  | { row: number; ok: true };

export type ImportRowInput =
  | {
      row: number;
      ruc: string;
      type: "import_status";
      status: LeadStatus;
    }
  | {
      row: number;
      ruc: string;
      type: "import_prioridad";
      prioridad: LeadPriority;
    };

export type LoadedLead = {
  id: LeadId;
  ruc: string;
  executive_id: number;
  created_by: number;
  updated_by: number | null;
  updated_at: number;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  stage: LeadStage;
};

export type LeadMutationOutcome = {
  row: ImportRowInput;
  leadId: LeadId;
  ruc: string;
  executiveId: number;
  previousStatus: LeadStatus | null;
  previousPrioridad: LeadPriority | null;
  previousStage: LeadStage;
  nextStatus: LeadStatus | null;
  nextPrioridad: LeadPriority | null;
  nextStage: LeadStage;
  changedAt: number;
  stageChanged: boolean;
};

export type LeadMutationResult =
  | {
      ok: false;
      rowResult: RowResult;
    }
  | {
      ok: true;
      rowResult: RowResult;
      mutation: LeadMutationOutcome;
    };

export type NeedsExecutiveOutboxEvent = {
  leadId: LeadId;
  ruc: string;
  executiveId: number;
};

export type ReadyForQuotationOutboxEvent = {
  leadId: LeadId;
  ruc: string;
  executiveId: number;
  branchId: number;
};

export type PlannedOutboxEvents = {
  needsExecutiveInput: NeedsExecutiveOutboxEvent[];
  readyForQuotation: ReadyForQuotationOutboxEvent[];
};

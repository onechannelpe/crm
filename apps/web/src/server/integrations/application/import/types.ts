import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";

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
  id: number;
  ruc: string;
  executive_id: number;
  updated_at: number;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  stage: LeadStage;
};

export type LeadMutationOutcome = {
  row: ImportRowInput;
  leadId: number;
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
  leadId: number;
  ruc: string;
  executiveId: number;
};

export type ReadyForQuotationOutboxEvent = {
  leadId: number;
  ruc: string;
  executiveId: number;
  branchId: number;
};

export type PlannedOutboxEvents = {
  needsExecutiveInput: NeedsExecutiveOutboxEvent[];
  readyForQuotation: ReadyForQuotationOutboxEvent[];
};

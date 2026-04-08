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
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  stage: LeadStage;
};

export type OutboxEvent =
  | {
      topic: "lead.needs_executive_input";
      leadId: number;
      ruc: string;
      executiveId: number;
    }
  | {
      topic: "lead.ready_for_quotation";
      leadId: number;
      ruc: string;
      branchId: number;
    };

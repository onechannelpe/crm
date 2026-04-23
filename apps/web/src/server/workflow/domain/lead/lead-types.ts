import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
  Moneda,
} from "~/pipeline/contracts/lead-schema";

import type { LeadRecord } from "../lead-record";

export type LeadOperation =
  | "reassign"
  | "review"
  | "interact"
  | "view_detail"
  | "list_assignable_executives";

export type LeadCapabilitySet = {
  canReassign: boolean;
  canReview: boolean;
  canLogCall: boolean;
  canAddNote: boolean;
  canViewDetail: boolean;
  canListAssignableExecutives: boolean;
};

export type LeadMutationIntent =
  | {
      kind: "reassign";
      toExecutiveId: number;
      reason?: "inactive_previous_executive";
    }
  | {
      kind: "review";
      status: LeadStatus;
      prioridad: LeadPriority;
      reason: string;
    }
  | {
      kind: "add_note";
      body: string;
    }
  | {
      kind: "log_call";
      outcome: LeadCallOutcome;
      notes: string | null;
    }
  | {
      kind: "imported_review";
      type: "import_status" | "import_prioridad";
      status: LeadStatus | null;
      prioridad: LeadPriority | null;
      reason: string;
    }
  | { kind: "approve_for_sale" }
  | {
      kind: "create_quotation";
      quotationId: string;
      version: number;
      moneda: Moneda;
    }
  | {
      kind: "complete_commercial_input";
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      abono: number;
      cantidadPos: number;
    }
  | { kind: "create_sale"; saleId: string };

export type LeadMutationPatch = {
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus | null;
  prioridad?: LeadPriority | null;
};

export type LeadMutationContext = {
  lead: LeadRecord;
  actorUserId: number;
  now: number;
  intent: LeadMutationIntent;
};

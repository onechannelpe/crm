import type {
  AbonoBank,
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
  ModalidadCobro,
  Moneda,
  ProductScope,
} from "~/workflow/contracts/lead-schema";

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
      kind: "save_commercial_scope";
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      giroNegocio: string;
      abonoBank: AbonoBank;
      posTotal: number;
      linkScope: ProductScope;
      linkUrl: string | null;
      onlineScope: ProductScope;
      onlineUrl: string | null;
      onlineModalidad: ModalidadCobro | null;
    }
  | { kind: "request_quotation" }
  | {
      kind: "record_rep_legal";
      nombres: string;
      apellidoPaterno: string;
      apellidoMaterno: string;
      dni: string;
      telefono: string;
      email: string;
    }
  | {
      kind: "create_venue";
      venueId: string;
      nombreComercial: string;
      posQuantity: number;
      direccion: string;
      referencia: string;
      distrito: string;
      provincia: string;
      departamento: string;
    }
  | {
      kind: "add_venue_accounts";
      venueId: string;
      shouldTransitionToLive: boolean;
    }
  | {
      kind: "request_rate_negotiation";
      negotiationRequestId: string;
      round: number;
    };

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

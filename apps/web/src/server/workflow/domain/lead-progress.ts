import type { LeadStage } from "~/workflow/contracts/lead-schema";
import { isBcpBank } from "~/workflow/contracts/lead-schema";

import type { LeadRecord } from "./lead-record";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaActual"
  | "gpv"
  | "ticket"
  | "tipoProducto"
  | "giroNegocio"
  | "venues";

export type LeadProgress = {
  nextStep: string;
  blockingFields: LeadBlockingField[];
};

export function resolveLeadNextStep(lead: Pick<LeadRecord, "stage">): string {
  switch (lead.stage) {
    case "PENDING_EXTERNAL_REVIEW":
      return "Review lead";
    case "REJECTED_BY_STATUS":
      return "No further action";
    case "NEEDS_EXECUTIVE_INPUT":
      return "Complete commercial input";
    case "READY_FOR_QUOTATION":
      return "Create quotation";
    case "QUOTED":
      return "Approve for sale";
    case "READY_FOR_SALE":
      return "Create sale";
    case "CONVERTED":
      return "No further action";
    default: {
      const exhaustive: never = lead.stage;
      return exhaustive;
    }
  }
}

export function resolveLeadBlockingFields(input: {
  stage: LeadStage;
  venueCount?: number;
}): LeadBlockingField[] {
  switch (input.stage) {
    case "PENDING_EXTERNAL_REVIEW":
    case "REJECTED_BY_STATUS":
    case "READY_FOR_QUOTATION":
    case "QUOTED":
    case "CONVERTED":
      return [];
    case "NEEDS_EXECUTIVE_INPUT":
      return [
        "proveedorActual",
        "tasaActual",
        "gpv",
        "ticket",
        "tipoProducto",
        "giroNegocio",
      ];
    case "READY_FOR_SALE": {
      const venueCount_ = input.venueCount ?? 0;
      return venueCount_ === 0 ? ["venues"] : [];
    }
    default: {
      const exhaustive: never = input.stage;
      return exhaustive;
    }
  }
}

export function resolveLeadProgress(input: {
  lead: Pick<LeadRecord, "stage">;
  venueCount?: number;
}): LeadProgress {
  return {
    nextStep: resolveLeadNextStep(input.lead),
    blockingFields: resolveLeadBlockingFields({
      stage: input.lead.stage,
      venueCount: input.venueCount,
    }),
  };
}

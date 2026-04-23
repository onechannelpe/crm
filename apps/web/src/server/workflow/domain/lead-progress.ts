import type { LeadStage } from "~/pipeline/contracts/lead-schema";
import { isBcpBank } from "~/pipeline/contracts/lead-schema";

import type { LeadRecord } from "./lead-record";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaActual"
  | "gpv"
  | "ticket"
  | "abono"
  | "cantidadPos"
  | "banco"
  | "nroCuenta"
  | "cci";

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
  bank?: string | null;
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
        "abono",
        "cantidadPos",
      ];
    case "READY_FOR_SALE": {
      const fields: LeadBlockingField[] = ["banco", "nroCuenta"];
      if (!isBcpBank(input.bank)) {
        fields.push("cci");
      }
      return fields;
    }
    default: {
      const exhaustive: never = input.stage;
      return exhaustive;
    }
  }
}

export function resolveLeadProgress(input: {
  lead: Pick<LeadRecord, "stage">;
  bank?: string | null;
}): LeadProgress {
  return {
    nextStep: resolveLeadNextStep(input.lead),
    blockingFields: resolveLeadBlockingFields({
      stage: input.lead.stage,
      bank: input.bank,
    }),
  };
}

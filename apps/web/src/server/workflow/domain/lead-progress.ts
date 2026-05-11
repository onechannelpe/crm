import type { LeadStage } from "~/workflow/contracts/lead-schema";

import type { LeadRecord } from "./lead-record";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaActual"
  | "gpv"
  | "ticket"
  | "giroNegocio"
  | "venueAccounts";

export type LeadProgress = {
  nextStep: string;
  blockingFields: LeadBlockingField[];
};

export function resolveLeadNextStep(lead: Pick<LeadRecord, "stage">): string {
  switch (lead.stage) {
    case "QUALIFYING":
      return "Review lead";
    case "DISQUALIFIED":
      return "No further action";
    case "SCOPING":
      return "Complete scoping";
    case "QUOTING":
      return "Create quotation";
    case "QUOTED":
      return "Approve for sale";
    case "CLOSING":
      return "Register venue accounts";
    case "LIVE":
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
  venuesWithAccountsCount?: number;
}): LeadBlockingField[] {
  switch (input.stage) {
    case "QUALIFYING":
    case "DISQUALIFIED":
    case "QUOTING":
    case "QUOTED":
    case "LIVE":
      return [];
    case "SCOPING":
      return ["proveedorActual", "tasaActual", "gpv", "ticket", "giroNegocio"];
    case "CLOSING": {
      const venueCount = input.venueCount ?? 0;
      const withAccounts = input.venuesWithAccountsCount ?? 0;
      return venueCount > 0 && withAccounts === 0 ? ["venueAccounts"] : [];
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
  venuesWithAccountsCount?: number;
}): LeadProgress {
  return {
    nextStep: resolveLeadNextStep(input.lead),
    blockingFields: resolveLeadBlockingFields({
      stage: input.lead.stage,
      venueCount: input.venueCount,
      venuesWithAccountsCount: input.venuesWithAccountsCount,
    }),
  };
}

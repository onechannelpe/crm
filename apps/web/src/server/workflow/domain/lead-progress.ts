import type { AbonoBank, LeadStage } from "~/contracts/workflow/vocabulary";

import type { LeadRecord } from "./lead-record";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaActual"
  | "gpv"
  | "ticket"
  | "giroNegocio"
  | "abonoBank"
  | "posTotal"
  | "venueAccounts";

type ScopingProfileFields = {
  proveedorActual?: string | null;
  tasaActual?: number | null;
  gpv?: number | null;
  ticket?: number | null;
  giroNegocio?: string | null;
  abonoBank?: AbonoBank | null;
  posTotal?: number | null;
};

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
      return "Save commercial scope";
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
  profile?: ScopingProfileFields | null;
  venuesWithAccountsCount?: number;
}): LeadBlockingField[] {
  switch (input.stage) {
    case "QUALIFYING":
    case "DISQUALIFIED":
    case "QUOTING":
    case "QUOTED":
    case "LIVE":
      return [];
    case "SCOPING": {
      const p = input.profile;
      const blocking: LeadBlockingField[] = [];
      if (!p?.proveedorActual) blocking.push("proveedorActual");
      if (p?.tasaActual == null) blocking.push("tasaActual");
      if (p?.gpv == null) blocking.push("gpv");
      if (p?.ticket == null) blocking.push("ticket");
      if (!p?.giroNegocio) blocking.push("giroNegocio");
      if (!p?.abonoBank) blocking.push("abonoBank");
      if (p?.posTotal == null) blocking.push("posTotal");
      return blocking;
    }
    case "CLOSING": {
      const withAccounts = input.venuesWithAccountsCount ?? 0;
      return withAccounts === 0 ? ["venueAccounts"] : [];
    }
    default: {
      const exhaustive: never = input.stage;
      return exhaustive;
    }
  }
}

export function resolveLeadProgress(input: {
  lead: Pick<LeadRecord, "stage">;
  profile?: ScopingProfileFields | null;
  venuesWithAccountsCount?: number;
}): LeadProgress {
  return {
    nextStep: resolveLeadNextStep(input.lead),
    blockingFields: resolveLeadBlockingFields({
      stage: input.lead.stage,
      profile: input.profile,
      venuesWithAccountsCount: input.venuesWithAccountsCount,
    }),
  };
}

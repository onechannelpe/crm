import {
  type AbonoBank,
  type LeadNextStep,
  type LeadStage,
} from "~/contracts/workflow/vocabulary";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaActual"
  | "gpv"
  | "ticket"
  | "giroNegocio"
  | "abonoBank"
  | "posTotal"
  | "digitalPolicy"
  | "venueAccounts";

type ScopingProfileFields = {
  proveedorActual?: string | null;
  tasaActual?: number | null;
  gpv?: number | null;
  ticket?: number | null;
  giroNegocio?: string | null;
  abonoBank?: AbonoBank | null;
  posTotal?: number | null;
  linkScope?: "none" | "shared" | "per_venue";
  linkUrl?: string | null;
  onlineScope?: "none" | "shared" | "per_venue";
  onlineUrl?: string | null;
  onlineModalidad?: string | null;
};

export type LeadProgress = {
  nextStep: LeadNextStep;
  blockingFields: LeadBlockingField[];
};

function resolveLeadNextStep(lead: { stage: LeadStage }): LeadNextStep {
  switch (lead.stage) {
    case "QUALIFYING":
      return "REVIEW_LEAD";
    case "DISQUALIFIED":
      return "NO_ACTION";
    case "SCOPING":
      return "SAVE_COMMERCIAL_SCOPE";
    case "QUOTING":
      return "CREATE_QUOTATION";
    case "QUOTED":
      return "APPROVE_FOR_SALE";
    case "SETUP_PLAN":
      return "DEFINE_DIGITAL_POLICY";
    case "SETUP_EXECUTION":
      return "REGISTER_VENUE_ACCOUNTS";
    case "LIVE":
      return "NO_ACTION";
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
    case "SETUP_PLAN": {
      const p = input.profile;
      if (!p) return ["digitalPolicy"];
      if (p.linkScope === "shared" && !p.linkUrl) return ["digitalPolicy"];
      if (p.onlineScope === "shared" && (!p.onlineUrl || !p.onlineModalidad)) {
        return ["digitalPolicy"];
      }
      return [];
    }
    case "SETUP_EXECUTION": {
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
  lead: { stage: LeadStage };
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

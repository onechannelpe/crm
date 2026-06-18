import { type LeadBlockingField } from "~/contracts/workflow/views";
import {
  type LeadNextStep,
  type LeadStage,
} from "~/contracts/workflow/vocabulary";

// Only the digital-policy fields can leave a SETUP lead blocked; commercial scope
// is always present (lead born complete at registration).
export type SetupProfileFields = {
  linkScope?: "none" | "shared" | "per_venue";
  linkUrl?: string | null;
  onlineScope?: "none" | "shared" | "per_venue";
  onlineUrl?: string | null;
  onlineCollectionMode?: string | null;
};

export function resolveLeadNextStep(lead: { stage: LeadStage }): LeadNextStep {
  switch (lead.stage) {
    // Awaiting availability qualification, which happens via the export/import
    // round-trip, not an in-app action. So there is no agent next step here.
    case "QUALIFYING":
      return "NO_ACTION";
    case "DISQUALIFIED":
      return "NO_ACTION";
    case "PRICING":
      return "PROPOSE_RATE";
    case "SETUP":
      return "DEFINE_DIGITAL_POLICY";
    case "LIVE":
      return "NO_ACTION";
    case "EXPIRED":
      return "NO_ACTION";
    default: {
      const exhaustive: never = lead.stage;
      return exhaustive;
    }
  }
}

export function resolveLeadBlockingFields(input: {
  stage: LeadStage;
  profile?: SetupProfileFields | null;
  venuesWithAccountsCount?: number;
}): LeadBlockingField[] {
  switch (input.stage) {
    case "QUALIFYING":
    case "DISQUALIFIED":
    case "PRICING":
    case "LIVE":
    case "EXPIRED":
      return [];
    case "SETUP": {
      const p = input.profile;
      if (!p) return ["digitalPolicy"];
      if (p.linkScope === "shared" && !p.linkUrl) return ["digitalPolicy"];
      if (
        p.onlineScope === "shared" &&
        (!p.onlineUrl || !p.onlineCollectionMode)
      ) {
        return ["digitalPolicy"];
      }
      const withAccounts = input.venuesWithAccountsCount ?? 0;
      return withAccounts === 0 ? ["venueAccounts"] : [];
    }
    default: {
      const exhaustive: never = input.stage;
      return exhaustive;
    }
  }
}

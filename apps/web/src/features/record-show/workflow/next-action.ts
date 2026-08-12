import type { LeadDetailView } from "~/contracts/workflow/views";
import type { LeadActionKind } from "~/features/record-show/model/lead-action-kind";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";

// Message stages have no footer action.
type NextAction =
  | { kind: "message" }
  | { kind: "qualify" }
  | { kind: "propose-rate" }
  | {
      kind: "decide-rate";
      proposal: LeadDetailView["rateProposals"][number];
    }
  | { kind: "setup-checklist" }
  | { kind: "fulfillment" }
  | { kind: "expired"; canRestart: boolean }
  | {
      kind: "disqualified";
      disqualification: LeadDetailView["disqualification"];
    };

function resolveNextAction(data: LeadDetailView): NextAction {
  const { stage } = data.lead;
  const actions = data.availableActions;

  switch (stage) {
    case "QUALIFYING":
      if (actions.includes("review")) {
        return { kind: "qualify" };
      }
      return { kind: "message" };
    case "PRICING": {
      // Back office composes a replacement after a revision request.
      if (actions.includes("propose-rate")) {
        return { kind: "propose-rate" };
      }
      const proposal = data.rateProposals.at(-1);
      if (proposal) {
        return { kind: "decide-rate", proposal };
      }
      return { kind: "message" };
    }
    case "SETUP":
      return { kind: "setup-checklist" };
    case "FULFILLMENT":
      return { kind: "fulfillment" };
    case "LIVE":
      return { kind: "message" };
    case "DISQUALIFIED":
      return { kind: "disqualified", disqualification: data.disqualification };
    case "EXPIRED":
      return {
        kind: "expired",
        canRestart: actions.includes("restart-quotation"),
      };
    case "CLOSED_LOST":
      return { kind: "message" };
    default: {
      const exhaustive: never = stage;
      return exhaustive satisfies never;
    }
  }
}

export type NextActionTarget =
  | { kind: "action"; action: LeadActionKind }
  | { kind: "tab"; tabId: RecordTabId };

export type NextActionCta = {
  label: string;
  target: NextActionTarget;
};

export function nextActionCta(data: LeadDetailView): NextActionCta | null {
  const action = resolveNextAction(data);
  switch (action.kind) {
    case "qualify":
      return {
        label: "Calificar disponibilidad",
        target: { kind: "action", action: "qualify" },
      };
    case "propose-rate":
      return {
        label: "Proponer tarifa",
        target: { kind: "action", action: "propose-rate" },
      };
    case "decide-rate": {
      const canDecide =
        data.availableActions.includes("accept-rate") ||
        data.availableActions.includes("request-rate-revision") ||
        data.availableActions.includes("edit-rate-proposal");
      return canDecide
        ? {
            label: "Confirmar o revisar tarifa",
            target: { kind: "action", action: "decide-rate" },
          }
        : null;
    }
    case "setup-checklist":
      return {
        label: "Completar afiliación",
        target: { kind: "tab", tabId: "afiliacion" },
      };
    case "fulfillment":
      return {
        label: "Gestionar entrega",
        target: { kind: "action", action: "fulfillment" },
      };
    case "expired":
      return action.canRestart
        ? {
            label: "Reiniciar cotización",
            target: { kind: "action", action: "expired" },
          }
        : null;
    case "message":
    case "disqualified":
      return null;
    default: {
      const exhaustive: never = action;
      return exhaustive satisfies never;
    }
  }
}

export function isLeadActionStillRelevant(
  action: LeadActionKind,
  data: LeadDetailView,
): boolean {
  if (action === "close") {
    // Close is available independently of the primary stage action.
    return data.availableActions.includes("close-lead");
  }
  return resolveNextAction(data).kind === action;
}

export type LeadTaskOwner = "executive" | "back_office";

// Tasks describe the pending pipeline step; isYourMove applies the viewer's actions.
export type LeadTask = {
  label: string;
  owner: LeadTaskOwner;
  isYourMove: boolean;
};

const LEAD_TASK_OWNER_LABELS: Record<LeadTaskOwner, string> = {
  executive: "Ejecutivo",
  back_office: "Back office",
};

export function leadTaskOwnerLabel(owner: LeadTaskOwner): string {
  return LEAD_TASK_OWNER_LABELS[owner];
}

export function resolveLeadTask(data: LeadDetailView): LeadTask | null {
  const task = resolveLeadTaskBase(data);
  if (!task) {
    return null;
  }
  return { ...task, isYourMove: nextActionCta(data) !== null };
}

function resolveLeadTaskBase(
  data: LeadDetailView,
): Omit<LeadTask, "isYourMove"> | null {
  const { stage, nextStep } = data.lead;

  switch (stage) {
    case "QUALIFYING":
      // Availability review has no LeadNextStep.
      return { label: "Calificar disponibilidad", owner: "back_office" };
    case "EXPIRED":
      return { label: "Reiniciar cotización", owner: "executive" };
    case "LIVE":
    case "DISQUALIFIED":
    case "CLOSED_LOST":
      return null;
    case "PRICING":
    case "SETUP":
    case "FULFILLMENT":
      break;
    default: {
      const exhaustive: never = stage;
      return exhaustive satisfies never;
    }
  }

  switch (nextStep) {
    case "PROPOSE_RATE":
      return { label: "Proponer tarifa", owner: "back_office" };
    case "ACCEPT_RATE":
      return { label: "Confirmar tarifa con el cliente", owner: "executive" };
    case "DEFINE_DIGITAL_POLICY":
      return { label: "Definir política digital", owner: "executive" };
    case "REGISTER_VENUE_ACCOUNTS":
      return { label: "Registrar cuentas de sedes", owner: "executive" };
    case "COMPLETE_FULFILLMENT":
      return {
        label: "Completar entrega",
        owner: data.fulfillment?.pendingOwner ?? "back_office",
      };
    case "NO_ACTION":
      return null;
    default: {
      const exhaustive: never = nextStep;
      return exhaustive satisfies never;
    }
  }
}

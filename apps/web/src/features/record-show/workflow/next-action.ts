import type { LeadDetailView } from "~/contracts/workflow/views";
import type { LeadActionKind } from "~/features/record-show/model/lead-action-kind";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";

// "message" marks a stage with no actionable next step (nothing for the footer
// CTA to offer); the record body conveys the state through the stage Tag.
export type NextAction =
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

// Server-resolved actions preserve authorization while stage selects presentation.
export function resolveNextAction(data: LeadDetailView): NextAction {
  const { stage } = data.lead;
  const actions = data.availableActions;

  switch (stage) {
    case "QUALIFYING":
      if (actions.includes("review")) {
        return { kind: "qualify" };
      }
      return { kind: "message" };
    case "PRICING": {
      // Only back office holds propose-rate, and only when no proposal is
      // active-pending (none yet, or the last was sent back for revision).
      // Giving it priority lands back office on the compose form after a
      // revision request instead of being stranded on the read-only proposal.
      if (actions.includes("propose-rate")) {
        return { kind: "propose-rate" };
      }
      // Everyone else keys off the latest proposal: the owning executive accepts
      // or requests a revision, back office can still correct a live one, and
      // read-only viewers just see the numbers (the card self-gates its actions).
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
      // Read-only viewers see the proposal in the body, so they get no CTA; the
      // executive and back office (who can act) do.
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

// Whether an opened action page is still the lead's live next step. When it is
// not (the action completed, or another actor advanced the stage), the page
// returns to the record. `close` is a secondary outcome gated by its own
// availability rather than by resolveNextAction.
export function isLeadActionStillRelevant(
  action: LeadActionKind,
  data: LeadDetailView,
): boolean {
  if (action === "close") {
    return data.availableActions.includes("close-lead");
  }
  return resolveNextAction(data).kind === action;
}

export type LeadTaskOwner = "executive" | "back_office";

// The pending step of the pipeline, resolved independently of who is looking so
// the Tareas tab reads the same truth for every role ("Proponer tarifa · Back
// office" whether you are the waiting executive or the acting back office).
// `isYourMove` layers the viewer's authorization on top: the footer CTA exists
// (nextActionCta) exactly when the current user can perform the step.
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
      // No LeadNextStep encodes the availability review, so it is stage-derived.
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

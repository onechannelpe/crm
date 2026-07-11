import type { LeadDetailView } from "~/contracts/workflow/views";

export type NextAction =
  | {
      kind: "message";
      tone: "success" | "terminal" | "waiting";
      title: string;
      message: string;
    }
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

export type SetupChecklistItem = { label: string; done: boolean };

// Server-resolved actions preserve authorization while stage selects presentation.
export function resolveNextAction(data: LeadDetailView): NextAction {
  const { stage } = data.lead;
  const actions = data.availableActions;

  switch (stage) {
    case "QUALIFYING":
      if (actions.includes("review")) {
        return { kind: "qualify" };
      }
      return {
        kind: "message",
        tone: "success",
        title: "Cliente registrado",
        message:
          "En espera de calificación de disponibilidad por back office (Estado y Prioridad).",
      };
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
      return {
        kind: "message",
        tone: "waiting",
        title: "En definición de tarifa",
        message: "Esperando propuesta de tarifa de back office.",
      };
    }
    case "SETUP":
      return { kind: "setup-checklist" };
    case "FULFILLMENT":
      return { kind: "fulfillment" };
    case "LIVE":
      return {
        kind: "message",
        tone: "success",
        title: "Cliente activo",
        message: "La afiliación está completa.",
      };
    case "DISQUALIFIED":
      return { kind: "disqualified", disqualification: data.disqualification };
    case "EXPIRED":
      return {
        kind: "expired",
        canRestart: actions.includes("restart-quotation"),
      };
    case "CLOSED_LOST":
      return {
        kind: "message",
        tone: "terminal",
        title: "Cotización cerrada",
        message: "La cotización se cerró como perdida.",
      };
    default: {
      const exhaustive: never = stage;
      return exhaustive satisfies never;
    }
  }
}

// Derived from record data directly (not from blockingFields, which only reports
// the single current blocker) so each row reflects its own completion.
export function setupChecklist(data: LeadDetailView): SetupChecklistItem[] {
  return [
    { label: "Representante legal", done: data.repLegal !== undefined },
    {
      label: "Política digital",
      done: !data.blockingFields.includes("digitalPolicy"),
    },
    {
      label: "Sedes y cuentas",
      done: data.venues.some((venue) => venue.solesAccount !== undefined),
    },
  ];
}

export function nextActionSummary(data: LeadDetailView): string {
  const action = resolveNextAction(data);
  switch (action.kind) {
    case "message":
      return action.title;
    case "qualify":
      return "Calificar disponibilidad";
    case "propose-rate":
      return "Proponer tarifa";
    case "decide-rate": {
      // The same card serves the executive (who decides) and back office (who
      // may only correct their sent proposal), so label it for the actual role.
      const canDecide =
        data.availableActions.includes("accept-rate") ||
        data.availableActions.includes("request-rate-revision");
      return canDecide ? "Confirmar o revisar tarifa" : "Propuesta enviada";
    }
    case "setup-checklist":
      return "Completar afiliación";
    case "fulfillment":
      return "Gestionar entrega";
    case "expired":
      return "Reserva vencida";
    case "disqualified":
      return "Descalificado";
    default: {
      const exhaustive: never = action;
      return exhaustive satisfies never;
    }
  }
}

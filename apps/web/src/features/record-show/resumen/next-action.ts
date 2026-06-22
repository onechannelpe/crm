import type { LeadDetailView } from "~/contracts/workflow/views";

// The single decision the record surfaces right now, derived from stage plus the
// server-resolved available actions. The action card and the summary rail both
// read this so they never drift.
export type NextAction =
  | {
      kind: "message";
      tone: "success" | "terminal" | "waiting";
      title: string;
      message: string;
    }
  | { kind: "propose-rate" }
  | { kind: "decide-rate" }
  | { kind: "setup-checklist" }
  | { kind: "none" };

export type SetupChecklistItem = { label: string; done: boolean };

export function resolveNextAction(data: LeadDetailView): NextAction {
  const { stage } = data.lead;
  const actions = data.availableActions;

  switch (stage) {
    case "QUALIFYING":
      return {
        kind: "message",
        tone: "success",
        title: "Cliente registrado",
        message:
          "En espera de calificación de disponibilidad por back office (Estado y Prioridad).",
      };
    case "PRICING": {
      if (data.rateProposals.length > 0) {
        return { kind: "decide-rate" };
      }
      if (actions.includes("propose-rate")) {
        return { kind: "propose-rate" };
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
    case "LIVE":
      return {
        kind: "message",
        tone: "success",
        title: "Cliente activo",
        message: "La afiliación está completa.",
      };
    case "DISQUALIFIED":
      return {
        kind: "message",
        tone: "terminal",
        title: "Descalificado",
        message: "Este cliente no continúa en el flujo.",
      };
    case "EXPIRED":
      return {
        kind: "message",
        tone: "terminal",
        title: "Reserva vencida",
        message: "La reserva de tarifa expiró.",
      };
    default: {
      const exhaustive: never = stage;
      return exhaustive;
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
    case "propose-rate":
      return "Proponer tarifa";
    case "decide-rate":
      return "Confirmar o revisar tarifa";
    case "setup-checklist":
      return "Completar afiliación";
    case "none":
      return "Sin acciones pendientes";
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

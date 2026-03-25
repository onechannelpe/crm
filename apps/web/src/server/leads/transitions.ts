import type { Estado, LeadStage, Prioridad } from "~/lib/db/types";

const REJECTED_ESTADOS: Estado[] = ["CARTERIZADO", "STOCK"];
const VALID_ESTADOS: Estado[] = ["DISPONIBLE", "SIN RESULTADO"];
const VALID_PRIORIDADES: Prioridad[] = ["P1", "P2"];

export function evaluatePendingTransition(
  stage: LeadStage,
  estado: Estado | null,
  prioridad: Prioridad | null,
): LeadStage | null {
  if (stage !== "PENDING_EXTERNAL_REVIEW") return null;

  if (estado !== null && REJECTED_ESTADOS.includes(estado)) {
    return "REJECTED_BY_ESTADO";
  }
  if (prioridad === "SIN RESULTADO") {
    return "NEEDS_EXECUTIVE_INPUT";
  }
  if (
    estado !== null &&
    VALID_ESTADOS.includes(estado) &&
    prioridad !== null &&
    VALID_PRIORIDADES.includes(prioridad)
  ) {
    return "READY_FOR_QUOTATION";
  }
  return null;
}

export const ALLOWED_TRANSITIONS: Partial<Record<LeadStage, LeadStage[]>> = {
  REGISTERED: ["ENRICHING"],
  ENRICHING: ["PENDING_EXTERNAL_REVIEW"],
  PENDING_EXTERNAL_REVIEW: [
    "REJECTED_BY_ESTADO",
    "NEEDS_EXECUTIVE_INPUT",
    "READY_FOR_QUOTATION",
  ],
  NEEDS_EXECUTIVE_INPUT: ["READY_FOR_QUOTATION"],
  READY_FOR_QUOTATION: ["QUOTED"],
  QUOTED: ["READY_FOR_SALE"],
  READY_FOR_SALE: ["CONVERTED"],
};

export function canTransition(from: LeadStage, to: LeadStage): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

import {
  type LeadNextStep,
  type LeadStage,
} from "~/contracts/workflow/vocabulary";

const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  QUALIFYING: "En calificación",
  DISQUALIFIED: "Descalificado",
  PRICING: "Definición de tarifa",
  SETUP: "Afiliación",
  LIVE: "Activo",
  EXPIRED: "Vencido",
};

const LEAD_NEXT_STEP_LABELS: Record<LeadNextStep, string> = {
  NO_ACTION: "Sin acciones pendientes",
  PROPOSE_RATE: "Proponer tarifa",
  ACCEPT_RATE: "Confirmar tarifa con el cliente",
  DEFINE_DIGITAL_POLICY: "Definir política digital",
  REGISTER_VENUE_ACCOUNTS: "Registrar cuentas de sedes",
};

export function leadStageLabel(stage: LeadStage): string {
  return LEAD_STAGE_LABELS[stage];
}

export function leadNextStepLabel(nextStep: LeadNextStep): string {
  return LEAD_NEXT_STEP_LABELS[nextStep];
}

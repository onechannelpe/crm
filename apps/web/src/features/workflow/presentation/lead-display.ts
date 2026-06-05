import {
  type LeadNextStep,
  type LeadStage,
} from "~/contracts/workflow/vocabulary";

const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  QUALIFYING: "En calificación",
  DISQUALIFIED: "Descalificado",
  SCOPING: "Relevamiento comercial",
  QUOTING: "Listo para cotización",
  QUOTED: "Cotizado",
  SETUP_PLAN: "Plan de afiliación",
  SETUP_EXECUTION: "Afiliación en curso",
  LIVE: "Activo",
};

const LEAD_NEXT_STEP_LABELS: Record<LeadNextStep, string> = {
  REVIEW_LEAD: "Revisar cliente",
  NO_ACTION: "Sin acciones pendientes",
  SAVE_COMMERCIAL_SCOPE: "Guardar alcance comercial",
  CREATE_QUOTATION: "Crear cotización",
  APPROVE_FOR_SALE: "Aprobar para venta",
  DEFINE_DIGITAL_POLICY: "Definir política digital",
  REGISTER_VENUE_ACCOUNTS: "Registrar cuentas de sedes",
};

export function leadStageLabel(stage: LeadStage): string {
  return LEAD_STAGE_LABELS[stage];
}

export function leadNextStepLabel(nextStep: LeadNextStep): string {
  return LEAD_NEXT_STEP_LABELS[nextStep];
}

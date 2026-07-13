import type { TagColor } from "~/components/ui/tag/tag";
import {
  type LeadNextStep,
  type LeadStage,
} from "~/contracts/workflow/vocabulary";

const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  QUALIFYING: "Calificación",
  DISQUALIFIED: "Descalificado",
  PRICING: "Cotización",
  SETUP: "Afiliación",
  FULFILLMENT: "Entrega",
  LIVE: "Activo",
  EXPIRED: "Vencido",
  CLOSED_LOST: "Perdido",
};

const LEAD_NEXT_STEP_LABELS: Record<LeadNextStep, string> = {
  NO_ACTION: "Sin acciones pendientes",
  PROPOSE_RATE: "Proponer tarifa",
  ACCEPT_RATE: "Confirmar tarifa con el cliente",
  DEFINE_DIGITAL_POLICY: "Definir política digital",
  REGISTER_VENUE_ACCOUNTS: "Registrar cuentas de sedes",
  COMPLETE_FULFILLMENT: "Completar entrega y registro de venta",
};

export function leadStageLabel(stage: LeadStage): string {
  return LEAD_STAGE_LABELS[stage];
}

const LEAD_STAGE_COLORS: Record<LeadStage, TagColor> = {
  QUALIFYING: "blue",
  PRICING: "yellow",
  SETUP: "purple",
  FULFILLMENT: "orange",
  LIVE: "green",
  DISQUALIFIED: "red",
  CLOSED_LOST: "red",
  EXPIRED: "neutral",
};

export function leadStageColor(stage: LeadStage): TagColor {
  return LEAD_STAGE_COLORS[stage];
}

export function leadNextStepLabel(nextStep: LeadNextStep): string {
  return LEAD_NEXT_STEP_LABELS[nextStep];
}

import { APP_LOCALE } from "~/lib/locale";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/workflow/contracts/lead-schema";

const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  QUALIFYING: "Calificando",
  DISQUALIFIED: "Descalificado",
  SCOPING: "Relevamiento comercial",
  QUOTING: "Listo para cotización",
  QUOTED: "Cotizado",
  CLOSING: "En cierre",
  LIVE: "Activo",
};

const LEAD_NEXT_STEP_LABELS: Record<string, string> = {
  "Review lead": "Revisar prospecto",
  "No further action": "Sin acciones pendientes",
  "Complete scoping": "Completar relevamiento comercial",
  "Create quotation": "Crear cotización",
  "Approve for sale": "Aprobar para venta",
  "Register venue accounts": "Registrar cuentas de sedes",
};

export function leadStageLabel(stage: LeadStage): string {
  return LEAD_STAGE_LABELS[stage];
}

export function leadStatusLabel(status: LeadStatus | null): string {
  if (status === null) {
    return "-";
  }
  return capitalizeFirstLetter(status);
}

export function leadPriorityLabel(priority: LeadPriority | null): string {
  if (priority === null) {
    return "-";
  }
  return capitalizeFirstLetter(priority);
}

export function leadNextStepLabel(nextStep: string): string {
  return LEAD_NEXT_STEP_LABELS[nextStep] ?? nextStep;
}

function capitalizeFirstLetter(value: string): string {
  if (value.length === 0) {
    return value;
  }
  const normalized = value.toLocaleLowerCase(APP_LOCALE);
  return normalized[0].toLocaleUpperCase(APP_LOCALE) + normalized.slice(1);
}

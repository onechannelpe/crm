import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/workflow/contracts/lead-schema";

const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  PENDING_EXTERNAL_REVIEW: "Pendiente de revisión externa",
  REJECTED_BY_STATUS: "Rechazado por estado",
  NEEDS_EXECUTIVE_INPUT: "Requiere información comercial",
  READY_FOR_QUOTATION: "Listo para cotización",
  QUOTED: "Cotizado",
  READY_FOR_SALE: "Listo para venta",
  CONVERTED: "Convertido",
};

const LEAD_NEXT_STEP_LABELS: Record<string, string> = {
  "Review lead": "Revisar prospecto",
  "No further action": "Sin acciones pendientes",
  "Complete commercial input": "Completar información comercial",
  "Create quotation": "Crear cotización",
  "Approve for sale": "Aprobar para venta",
  "Create sale": "Crear venta",
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
  const normalized = value.toLocaleLowerCase("es-PE");
  return normalized[0].toLocaleUpperCase("es-PE") + normalized.slice(1);
}

import type { LeadAvailableAction } from "~/server/pipeline/application/contracts/lead-available-action";
import type { LeadBlockingField } from "~/server/pipeline/domain/lead-progress";

const BLOCKING_FIELD_LABELS: Record<LeadBlockingField, string> = {
  proveedorActual: "Proveedor actual",
  tasaActual: "Tasa actual",
  gpv: "GPV",
  ticket: "Ticket",
  abono: "Abono",
  cantidadPos: "Cantidad POS",
  banco: "Banco",
  nroCuenta: "Nro. cuenta",
  cci: "CCI",
};

const BLOCKING_TASK_LABELS: Record<LeadBlockingField, string> = {
  proveedorActual: "Completar proveedor actual",
  tasaActual: "Completar tasa actual",
  gpv: "Completar GPV",
  ticket: "Completar ticket",
  abono: "Completar abono",
  cantidadPos: "Completar cantidad POS",
  banco: "Definir banco",
  nroCuenta: "Registrar numero de cuenta",
  cci: "Registrar CCI",
};

type LeadActionUiItem = {
  id: LeadAvailableAction;
  label: string;
  href?: string;
};

export function blockingFieldLabel(field: LeadBlockingField): string {
  return BLOCKING_FIELD_LABELS[field];
}

export function blockingTaskLabel(field: LeadBlockingField): string {
  return BLOCKING_TASK_LABELS[field];
}

export function mapLeadActionsToUi(
  leadId: number,
  actions: LeadAvailableAction[],
): LeadActionUiItem[] {
  const items: LeadActionUiItem[] = [];

  for (const action of actions) {
    switch (action) {
      case "review-lead":
        items.push({
          id: action,
          label: "Revisar lead",
          href: `/leads/${leadId}`,
        });
        break;
      case "complete-commercial-input":
        items.push({
          id: action,
          label: "Completar informacion comercial",
          href: `/leads/${leadId}/complete`,
        });
        break;
      case "create-sale":
        items.push({
          id: action,
          label: "Crear venta",
          href: `/sales/new/${leadId}`,
        });
        break;
      case "create-quotation":
        items.push({
          id: action,
          label: "Crear cotizacion",
          href: `/quotations/${leadId}`,
        });
        break;
      case "approve-for-sale":
        items.push({ id: action, label: "Aprobar para venta" });
        break;
      case "log-call":
        items.push({ id: action, label: "Registrar llamada" });
        break;
      case "add-note":
        items.push({ id: action, label: "Agregar nota" });
        break;
      case "reassign-lead":
        items.push({ id: action, label: "Reasignar lead" });
        break;
      default:
        break;
    }
  }

  return items;
}

import type { LeadAvailableAction } from "~/server/workflow/application/contracts/lead-available-action";
import type { LeadBlockingField } from "~/server/workflow/domain/lead-progress";

const BLOCKING_FIELD_LABELS: Record<LeadBlockingField, string> = {
  proveedorActual: "Proveedor actual",
  tasaActual: "Tasa actual",
  gpv: "GPV",
  ticket: "Ticket",
  giroNegocio: "Giro de negocio",
  venueAccounts: "Cuentas de sedes",
};

const BLOCKING_TASK_LABELS: Record<LeadBlockingField, string> = {
  proveedorActual: "Completar proveedor actual",
  tasaActual: "Completar tasa actual",
  gpv: "Completar GPV",
  ticket: "Completar ticket",
  giroNegocio: "Completar giro de negocio",
  venueAccounts: "Registrar cuentas en al menos una sede",
};

export type LeadActionUiItem =
  | { id: LeadAvailableAction; label: string; href: string; kind: "link" }
  | { id: LeadAvailableAction; label: string; kind: "button" };

export function blockingFieldLabel(field: LeadBlockingField): string {
  return BLOCKING_FIELD_LABELS[field];
}

export function blockingTaskLabel(field: LeadBlockingField): string {
  return BLOCKING_TASK_LABELS[field];
}

export function mapLeadActionsToUi(
  actions: LeadAvailableAction[],
): LeadActionUiItem[] {
  const items: LeadActionUiItem[] = [];

  for (const action of actions) {
    switch (action) {
      // create-quotation, approve-for-sale, and request-rate-negotiation
      // are rendered as inline sections, not generic action buttons.
      case "create-quotation":
      case "approve-for-sale":
      case "request-rate-negotiation":
        break;
      case "review-lead":
        items.push({
          id: action,
          label: "Revisar prospecto",
          kind: "button",
        });
        break;
      // complete-scoping is rendered as an inline form section, not an action button.
      case "complete-scoping":
      // reassign-lead is handled inline via the RelationFieldRow edit button in the fields widget.
      case "reassign-lead":
      // Actions below have no implemented handler yet.
      // They are intentionally omitted rather than shown as disabled.
      case "log-call":
      case "add-note":
        break;
      default:
        break;
    }
  }

  return items;
}

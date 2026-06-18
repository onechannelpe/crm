import { type LeadBlockingField } from "~/contracts/workflow/views";

const BLOCKING_FIELD_LABELS: Record<LeadBlockingField, string> = {
  digitalPolicy: "Política digital",
  venueAccounts: "Cuentas de sedes",
};

export function blockingFieldLabel(field: LeadBlockingField): string {
  return BLOCKING_FIELD_LABELS[field];
}

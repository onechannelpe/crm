import { type LeadBlockingField } from "~/contracts/workflow/views";

const BLOCKING_FIELD_LABELS: Record<LeadBlockingField, string> = {
  proveedorActual: "Proveedor actual",
  tasaDebitoActual: "Tasa débito actual",
  tasaCreditoActual: "Tasa crédito actual",
  gpv: "GPV",
  ticket: "Ticket",
  giroNegocio: "Giro de negocio",
  abonoBank: "Banco de abono",
  posTotal: "Cantidad de POS",
  digitalPolicy: "Política digital",
  venueAccounts: "Cuentas de sedes",
};

export function blockingFieldLabel(field: LeadBlockingField): string {
  return BLOCKING_FIELD_LABELS[field];
}

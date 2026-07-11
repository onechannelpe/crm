import type {
  FulfillmentAction,
  FulfillmentDocKind,
  FulfillmentStep,
  ProductKind,
} from "./vocabulary";

// Spanish fulfillment copy is the single source: the server timeline presenter
// and the client fulfillment panel both read from this map, so a step reads
// the same in both views.

const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  pos_new: "POS nuevo",
  pos_refurbished: "POS reacondicionado",
  digital_only: "Solo digital",
};

const STEP_LABELS: Record<FulfillmentStep, string> = {
  CHOOSE_PRODUCT: "Definir producto",
  AWAITING_TRANSACTIONS_REPORT: "Reporte de transacciones",
  AWAITING_ADDENDUM: "Generar adenda",
  AWAITING_SIGNATURE: "Firma del cliente",
  AWAITING_PDF_COMPILE: "Compilar adenda firmada",
  AWAITING_SERIALS: "Registrar seriales",
  AWAITING_SERIAL_ENTRY: "Enviar serial del POS",
  AWAITING_PAYMENT_LINK: "Generar link de pago",
  AWAITING_PAYMENT: "Pago del cliente",
  AWAITING_PAYMENT_VALIDATION: "Validar comprobante",
  AWAITING_SALE_REGISTRATION: "Registrar venta",
  COMPLETED: "Venta registrada",
};

const DOC_KIND_LABELS: Record<FulfillmentDocKind, string> = {
  transactions_report: "Reporte de transacciones",
  addendum_unsigned: "Adenda",
  addendum_signed_photo: "Fotos de adenda firmada",
  addendum_signed_pdf: "Adenda firmada (PDF)",
  payment_proof: "Comprobante de pago",
};

const ACTION_LABELS: Record<FulfillmentAction, string> = {
  choose_product: "Definir producto",
  upload_transactions_report: "Subir reporte de transacciones",
  generate_addendum: "Subir adenda",
  submit_signed_addendum: "Subir fotos firmadas",
  compile_signed_pdf: "Subir PDF compilado",
  record_serials: "Registrar serial",
  register_payment_link: "Registrar link de pago",
  upload_payment_proof: "Subir comprobante",
  validate_payment: "Validar pago",
  register_sale: "Registrar venta",
};

export function describeProductKind(kind: ProductKind): string {
  return PRODUCT_KIND_LABELS[kind];
}

export function describeFulfillmentStep(step: FulfillmentStep): string {
  return STEP_LABELS[step];
}

export function describeDocKind(kind: FulfillmentDocKind): string {
  return DOC_KIND_LABELS[kind];
}

export function describeFulfillmentAction(action: FulfillmentAction): string {
  return ACTION_LABELS[action];
}

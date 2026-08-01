export const LEAD_STAGES = [
  "QUALIFYING",
  "DISQUALIFIED",
  "PRICING",
  "SETUP",
  "FULFILLMENT",
  "LIVE",
  "EXPIRED",
  "CLOSED_LOST",
] as const;

// Commercial loss reasons recorded during pricing.
export const CLOSE_REASONS = [
  "RATE",
  "CULQI_REFERENCES",
  "DECLINED_TAX_REPORT",
  "QUOTE_DELAYS",
  "BCP_REFUSAL",
  "OTHER_CHANNEL_QUOTE",
  "POS_COST_REFUSAL",
] as const;

export const PRODUCT_KINDS = [
  "pos_new",
  "pos_refurbished",
  "digital_only",
] as const;

export const FULFILLMENT_STEPS = [
  "CHOOSE_PRODUCT",

  // Refurbished POS
  "AWAITING_TRANSACTIONS_REPORT",
  "AWAITING_ADDENDUM",
  "AWAITING_SIGNATURE",
  "AWAITING_PDF_COMPILE",
  "AWAITING_SERIALS",

  // New POS
  "AWAITING_SERIAL_ENTRY",
  "AWAITING_PAYMENT_LINK",
  "AWAITING_PAYMENT",
  "AWAITING_PAYMENT_VALIDATION",

  // Shared
  "AWAITING_SALE_REGISTRATION",
  "COMPLETED",
] as const;

export const FULFILLMENT_DOC_KINDS = [
  "transactions_report",
  "addendum_unsigned",
  "addendum_signed_photo",
  "addendum_signed_pdf",
  "payment_proof",
] as const;

export const FULFILLMENT_ACTIONS = [
  "choose_product",
  "upload_transactions_report",
  "generate_addendum",
  "submit_signed_addendum",
  "compile_signed_pdf",
  "record_serials",
  "register_payment_link",
  "upload_payment_proof",
  "validate_payment",
  "register_sale",
] as const;

export const INQUIRY_STATES = ["PENDING", "ANSWERED", "CONVERTED"] as const;

export const PRODUCT_SCOPES = ["none", "shared", "per_venue"] as const;

export const LEAD_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;

export const LEAD_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;

const LEAD_NEXT_STEPS = [
  "NO_ACTION",
  "PROPOSE_RATE",
  "ACCEPT_RATE",
  "DEFINE_DIGITAL_POLICY",
  "REGISTER_VENUE_ACCOUNTS",
  "COMPLETE_FULFILLMENT",
] as const;

export const CURRENCIES = ["PEN", "USD"] as const;

export const SETTLEMENT_BANKS = [
  "BCP",
  "BBVA",
  "SCOTIABANK",
  "INTERBANK",
  "NACION",
  "BANBIF",
  "MI BANCO",
] as const;

export const COLLECTION_MODES = [
  "SUSCRIPCIONES",
  "ONE_CLIC",
  "CARGO_UNICO",
] as const;

export const ACCOUNT_TYPE_KINDS = ["AHORROS", "CORRIENTE"] as const;

export type InquiryState = (typeof INQUIRY_STATES)[number];
export type ProductScope = (typeof PRODUCT_SCOPES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type CloseReason = (typeof CLOSE_REASONS)[number];
export type ProductKind = (typeof PRODUCT_KINDS)[number];
export type FulfillmentStep = (typeof FULFILLMENT_STEPS)[number];
export type FulfillmentDocKind = (typeof FULFILLMENT_DOC_KINDS)[number];
export type FulfillmentAction = (typeof FULFILLMENT_ACTIONS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadNextStep = (typeof LEAD_NEXT_STEPS)[number];
export type Currency = (typeof CURRENCIES)[number];
export type SettlementBank = (typeof SETTLEMENT_BANKS)[number];
export type CollectionMode = (typeof COLLECTION_MODES)[number];
export type AccountTypeKind = (typeof ACCOUNT_TYPE_KINDS)[number];

function isStringMember<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.some((member) => member === value);
}

export function isProductKind(value: string): value is ProductKind {
  return isStringMember(PRODUCT_KINDS, value);
}

export function isFulfillmentAction(value: string): value is FulfillmentAction {
  return isStringMember(FULFILLMENT_ACTIONS, value);
}

export function isCloseReason(value: string): value is CloseReason {
  return isStringMember(CLOSE_REASONS, value);
}

export function isBcpBank(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "BCP";
}

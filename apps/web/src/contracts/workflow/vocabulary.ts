export const LEAD_STAGES = [
  "QUALIFYING",
  "DISQUALIFIED",
  "SCOPING",
  "QUOTING",
  "QUOTED",
  "SETUP_PLAN",
  "SETUP_EXECUTION",
  "LIVE",
] as const;

export const PRODUCT_SCOPES = ["none", "shared", "per_venue"] as const;
export const LEAD_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;
export const LEAD_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;
export const LEAD_NEXT_STEPS = [
  "REVIEW_LEAD",
  "NO_ACTION",
  "SAVE_COMMERCIAL_SCOPE",
  "CREATE_QUOTATION",
  "APPROVE_FOR_SALE",
  "DEFINE_DIGITAL_POLICY",
  "REGISTER_VENUE_ACCOUNTS",
] as const;
const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
] as const;
export const MONEDAS = ["PEN", "USD"] as const;
export const ABONO_BANKS = [
  "BCP",
  "BBVA",
  "SCOTIABANK",
  "INTERBANK",
  "NACION",
  "BANBIF",
  "MI BANCO",
] as const;
export const MODALIDAD_COBRO_KINDS = [
  "SUSCRIPCIONES",
  "ONE_CLIC",
  "CARGO_UNICO",
] as const;
export const ACCOUNT_TYPE_KINDS = ["AHORROS", "CORRIENTE"] as const;

export type ProductScope = (typeof PRODUCT_SCOPES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadNextStep = (typeof LEAD_NEXT_STEPS)[number];
export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];
export type Moneda = (typeof MONEDAS)[number];
export type AbonoBank = (typeof ABONO_BANKS)[number];
export type ModalidadCobro = (typeof MODALIDAD_COBRO_KINDS)[number];
export type AccountTypeKind = (typeof ACCOUNT_TYPE_KINDS)[number];

export function isBcpBank(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "BCP";
}

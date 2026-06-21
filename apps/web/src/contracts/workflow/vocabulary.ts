export const LEAD_STAGES = [
  "QUALIFYING",
  "DISQUALIFIED",
  "PRICING",
  "SETUP",
  "LIVE",
  "EXPIRED",
] as const;

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
] as const;
export const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
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

export type ProductScope = (typeof PRODUCT_SCOPES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadNextStep = (typeof LEAD_NEXT_STEPS)[number];
export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type SettlementBank = (typeof SETTLEMENT_BANKS)[number];
export type CollectionMode = (typeof COLLECTION_MODES)[number];
export type AccountTypeKind = (typeof ACCOUNT_TYPE_KINDS)[number];

export function isBcpBank(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "BCP";
}

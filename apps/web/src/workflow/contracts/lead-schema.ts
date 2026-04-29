export const LEAD_STAGES = [
  "PENDING_EXTERNAL_REVIEW",
  "REJECTED_BY_STATUS",
  "NEEDS_EXECUTIVE_INPUT",
  "READY_FOR_QUOTATION",
  "QUOTED",
  "READY_FOR_SALE",
  "CONVERTED",
] as const;

export const LEAD_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;

export const LEAD_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;

export const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
] as const;

export const MONEDAS = ["PEN", "USD"] as const;
export const SALE_BANK_KINDS = ["BCP", "OTRO"] as const;
export const ABONO_BANKS = [
  "BCP",
  "BBVA",
  "SCOTIABANK",
  "INTERBANK",
  "NACION",
  "BANBIF",
  "MI BANCO",
] as const;

export const CULQI_PRODUCT_KINDS = [
  "CULQI_FULL",
  "CULQI_LINK",
  "CULQI_ONLINE",
] as const;

export const MODALIDAD_COBRO_KINDS = [
  "SUSCRIPCIONES",
  "ONE_CLIC",
  "CARGO_UNICO",
] as const;

export const ACCOUNT_TYPE_KINDS = ["AHORROS", "CORRIENTE"] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];
export type Moneda = (typeof MONEDAS)[number];
export type SaleBankKind = (typeof SALE_BANK_KINDS)[number];
export type AbonoBank = (typeof ABONO_BANKS)[number];

export type CulqiProductKind = (typeof CULQI_PRODUCT_KINDS)[number];
export type ModalidadCobro = (typeof MODALIDAD_COBRO_KINDS)[number];
export type AccountTypeKind = (typeof ACCOUNT_TYPE_KINDS)[number];

export function isMoneda(value: string): value is Moneda {
  return (MONEDAS as readonly string[]).includes(value);
}

export function isAbonoBank(
  value: string | null | undefined,
): value is AbonoBank {
  return (ABONO_BANKS as readonly string[]).includes(value ?? "");
}

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function isBcpBank(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "BCP";
}

export function isCulqiProductKind(value: string): value is CulqiProductKind {
  return (CULQI_PRODUCT_KINDS as readonly string[]).includes(value);
}

export function isModalidadCobro(value: string): value is ModalidadCobro {
  return (MODALIDAD_COBRO_KINDS as readonly string[]).includes(value);
}

export function isAccountTypeKind(value: string): value is AccountTypeKind {
  return (ACCOUNT_TYPE_KINDS as readonly string[]).includes(value);
}

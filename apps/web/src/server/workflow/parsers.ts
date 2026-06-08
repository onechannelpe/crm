import {
  LEAD_STAGES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  MONEDAS,
  ABONO_BANKS,
  ACCOUNT_TYPE_KINDS,
  MODALIDAD_COBRO_KINDS,
  PRODUCT_SCOPES,
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
  type Moneda,
  type AbonoBank,
  type AccountTypeKind,
  type ModalidadCobro,
  type ProductScope,
} from "~/contracts/workflow/vocabulary";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function normalizeLeadRuc(ruc: unknown): Result<string, DomainError> {
  if (typeof ruc !== "string") {
    return fail(
      "invalid_ruc",
      "El RUC debe tener 11 dígitos. Intenta nuevamente.",
    );
  }

  const normalizedRuc = ruc.trim();
  if (!/^\d{11}$/.test(normalizedRuc)) {
    return fail(
      "invalid_ruc",
      "El RUC debe tener 11 dígitos. Intenta nuevamente.",
    );
  }

  return Ok(normalizedRuc);
}

function parseOptionalLeadValue<TValue extends string>(
  value: unknown,
  options: readonly TValue[],
  errorCode: string,
  message: string,
): Result<TValue | undefined, DomainError> {
  if (value === undefined || value === null || value === "") {
    return Ok(undefined);
  }
  if (typeof value !== "string") {
    return fail(errorCode, message);
  }

  const parsed = options.find((option) => option === value);
  if (!parsed) {
    return fail(errorCode, message);
  }

  return Ok(parsed);
}

function parseRequiredLeadValue<TValue extends string>(
  value: unknown,
  options: readonly TValue[],
  errorCode: string,
  message: string,
): Result<TValue, DomainError> {
  const parsed = parseOptionalLeadValue(value, options, errorCode, message);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value === undefined) {
    return fail(errorCode, message);
  }

  return Ok(parsed.value);
}

export function parseLeadStage(
  value: unknown,
): Result<LeadStage | undefined, DomainError> {
  return parseOptionalLeadValue(
    value,
    LEAD_STAGES,
    "invalid_stage",
    "Invalid stage filter",
  );
}

export function parseLeadStatus(
  value: unknown,
): Result<LeadStatus | undefined, DomainError> {
  return parseOptionalLeadValue(
    value,
    LEAD_STATUSES,
    "invalid_status",
    "Invalid status filter",
  );
}

export function parseLeadPriority(
  value: unknown,
): Result<LeadPriority | undefined, DomainError> {
  return parseOptionalLeadValue(
    value,
    LEAD_PRIORITIES,
    "invalid_prioridad",
    "Invalid prioridad filter",
  );
}

export function parseRequiredLeadStatus(
  value: unknown,
): Result<LeadStatus, DomainError> {
  return parseRequiredLeadValue(
    value,
    LEAD_STATUSES,
    "invalid_status",
    "Invalid status",
  );
}

export function parseRequiredLeadStage(
  value: unknown,
): Result<LeadStage, DomainError> {
  return parseRequiredLeadValue(
    value,
    LEAD_STAGES,
    "invalid_stage",
    "Invalid stage",
  );
}

export function parseRequiredLeadPriority(
  value: unknown,
): Result<LeadPriority, DomainError> {
  return parseRequiredLeadValue(
    value,
    LEAD_PRIORITIES,
    "invalid_prioridad",
    "Invalid prioridad",
  );
}

export function parseRequiredMoneda(
  value: unknown,
): Result<Moneda, DomainError> {
  return parseRequiredLeadValue(
    value,
    MONEDAS,
    "invalid_moneda",
    "Invalid moneda",
  );
}

export function parseRequiredAbonoBank(
  value: unknown,
): Result<AbonoBank, DomainError> {
  return parseRequiredLeadValue(
    value,
    ABONO_BANKS,
    "invalid_abono",
    "Invalid abono bank",
  );
}

export function parseRequiredAccountType(
  value: unknown,
): Result<AccountTypeKind, DomainError> {
  return parseRequiredLeadValue(
    value,
    ACCOUNT_TYPE_KINDS,
    "invalid_account_type",
    "Invalid account type",
  );
}

export function parseRequiredProductScope(
  value: unknown,
): Result<ProductScope, DomainError> {
  return parseRequiredLeadValue(
    value,
    PRODUCT_SCOPES,
    "invalid_product_scope",
    "Invalid product scope",
  );
}

export function parseRequiredModalidadCobro(
  value: unknown,
): Result<ModalidadCobro, DomainError> {
  return parseRequiredLeadValue(
    value,
    MODALIDAD_COBRO_KINDS,
    "invalid_modalidad",
    "Invalid modalidad de cobro",
  );
}

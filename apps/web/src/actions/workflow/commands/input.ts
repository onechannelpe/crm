import type {
  SaleVenueAccount,
  VenueDigitalConfig,
} from "~/contracts/workflow/primitives";
import type {
  AbonoBank,
  LeadPriority,
  LeadStatus,
  ModalidadCobro,
  Moneda,
  ProductScope,
} from "~/contracts/workflow/vocabulary";
import { isBcpBank } from "~/contracts/workflow/vocabulary";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  parseRequiredAbonoBank,
  parseRequiredAccountType,
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
  parseRequiredLeadText,
  parseRequiredModalidadCobro,
  parseRequiredMoneda,
  parseRequiredProductScope,
  type RequiredLeadText,
} from "~/server/workflow/parsers";

export type AddLeadNoteInput = {
  leadId: string;
  body: string;
};

export type ParsedAddLeadNoteInput = {
  leadId: RequiredLeadText;
  body: RequiredLeadText;
};

export type LeadReviewInput = {
  leadId: string;
  status: string;
  prioridad: string;
  reason: string;
};

export type ParsedLeadReviewInput = {
  leadId: RequiredLeadText;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: RequiredLeadText;
};

export type SaveCommercialScopeInput = {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type ParsedCommercialScopeInput = {
  leadId: RequiredLeadText;
  proveedorActual: RequiredLeadText;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: RequiredLeadText;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type RequestQuotationInput = SaveCommercialScopeInput;
export type ParsedRequestQuotationInput = ParsedCommercialScopeInput;

export type SaveDigitalPolicyInput = {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type ParsedSaveDigitalPolicyInput = {
  leadId: RequiredLeadText;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type RecordRepLegalInput = {
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
};

export type ParsedRecordRepLegalInput = {
  leadId: RequiredLeadText;
  nombres: RequiredLeadText;
  apellidoPaterno: RequiredLeadText;
  apellidoMaterno: RequiredLeadText;
  dni: RequiredLeadText;
  telefono: RequiredLeadText;
  email: RequiredLeadText;
};

export type CreateVenueInput = {
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
};

export type ParsedVenueInput = {
  leadId: RequiredLeadText;
  nombreComercial: RequiredLeadText;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  direccion: RequiredLeadText;
  referencia: RequiredLeadText;
  distrito: RequiredLeadText;
  provincia: RequiredLeadText;
  departamento: RequiredLeadText;
};

export type UpdateVenueInput = CreateVenueInput & {
  venueId: string;
};

export type ParsedUpdateVenueInput = ParsedVenueInput & {
  venueId: RequiredLeadText;
};

export type AddVenueAccountsInput = {
  leadId: string;
  venueId: string;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type ParsedAddVenueAccountsInput = {
  leadId: RequiredLeadText;
  venueId: RequiredLeadText;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type CreateQuotationInput = {
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

export type ParsedCreateQuotationInput = {
  leadId: RequiredLeadText;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
};

type RawRecord = Record<string, unknown>;

function isRawRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(
  code: string,
  message: string,
): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

function readRecord(value: unknown): Result<RawRecord, DomainError> {
  if (!isRawRecord(value)) {
    return validationError("invalid_input", "Invalid workflow command input");
  }
  return Ok(value);
}

function parseNumber(
  value: unknown,
  code: string,
  message: string,
): Result<number, DomainError> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return validationError(code, message);
  }
  return Ok(value);
}

function parseBoolean(
  value: unknown,
  code: string,
  message: string,
): Result<boolean, DomainError> {
  if (typeof value !== "boolean") {
    return validationError(code, message);
  }
  return Ok(value);
}

function parseOptionalText(
  value: unknown,
  code: string,
  message: string,
): Result<string | null, DomainError> {
  if (value === undefined || value === null || value === "") {
    return Ok(null);
  }
  if (typeof value !== "string") {
    return validationError(code, message);
  }
  return Ok(value.trim() || null);
}

function parseCommercialScopeFields(
  input: unknown,
): Result<ParsedCommercialScopeInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const proveedorActual = parseRequiredLeadText(
    record.value.proveedorActual,
    "proveedor_actual_required",
    "Proveedor actual is required",
  );
  if (!proveedorActual.ok) return proveedorActual;

  const tasaActual = parseNumber(
    record.value.tasaActual,
    "tasa_actual_required",
    "Tasa actual is required",
  );
  if (!tasaActual.ok) return tasaActual;

  const gpv = parseNumber(record.value.gpv, "gpv_required", "GPV is required");
  if (!gpv.ok) return gpv;

  const ticket = parseNumber(
    record.value.ticket,
    "ticket_required",
    "Ticket is required",
  );
  if (!ticket.ok) return ticket;

  const giroNegocio = parseRequiredLeadText(
    record.value.giroNegocio,
    "giro_negocio_required",
    "Giro de negocio is required",
  );
  if (!giroNegocio.ok) return giroNegocio;

  const abonoBank = parseRequiredAbonoBank(record.value.abonoBank);
  if (!abonoBank.ok) return abonoBank;

  const posTotal = parseNumber(
    record.value.posTotal,
    "pos_total_required",
    "POS total is required",
  );
  if (!posTotal.ok) return posTotal;

  return Ok({
    leadId: leadId.value,
    proveedorActual: proveedorActual.value,
    tasaActual: tasaActual.value,
    gpv: gpv.value,
    ticket: ticket.value,
    giroNegocio: giroNegocio.value,
    abonoBank: abonoBank.value,
    posTotal: posTotal.value,
  });
}

function parseVenueFields(
  input: unknown,
): Result<ParsedVenueInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const nombreComercial = parseRequiredLeadText(
    record.value.nombreComercial,
    "nombre_comercial_required",
    "Nombre comercial is required",
  );
  if (!nombreComercial.ok) return nombreComercial;

  const posQuantity = parseNumber(
    record.value.posQuantity,
    "pos_quantity_required",
    "POS quantity is required",
  );
  if (!posQuantity.ok) return posQuantity;

  const direccion = parseRequiredLeadText(
    record.value.direccion,
    "direccion_required",
    "Direccion is required",
  );
  if (!direccion.ok) return direccion;

  const referencia = parseRequiredLeadText(
    record.value.referencia,
    "referencia_required",
    "Referencia is required",
  );
  if (!referencia.ok) return referencia;

  const distrito = parseRequiredLeadText(
    record.value.distrito,
    "distrito_required",
    "Distrito is required",
  );
  if (!distrito.ok) return distrito;

  const provincia = parseRequiredLeadText(
    record.value.provincia,
    "provincia_required",
    "Provincia is required",
  );
  if (!provincia.ok) return provincia;

  const departamento = parseRequiredLeadText(
    record.value.departamento,
    "departamento_required",
    "Departamento is required",
  );
  if (!departamento.ok) return departamento;

  const digitalConfig = parseVenueDigitalConfig(record.value.digitalConfig);
  if (!digitalConfig.ok) return digitalConfig;

  return Ok({
    leadId: leadId.value,
    nombreComercial: nombreComercial.value,
    posQuantity: posQuantity.value,
    digitalConfig: digitalConfig.value,
    direccion: direccion.value,
    referencia: referencia.value,
    distrito: distrito.value,
    provincia: provincia.value,
    departamento: departamento.value,
  });
}

function parseVenueDigitalConfig(
  value: unknown,
): Result<VenueDigitalConfig | undefined, DomainError> {
  if (value === undefined || value === null) {
    return Ok(undefined);
  }

  const record = readRecord(value);
  if (!record.ok) return record;

  let onlineModalidad: ModalidadCobro | null = null;
  if (
    record.value.onlineModalidad !== undefined &&
    record.value.onlineModalidad !== null &&
    record.value.onlineModalidad !== ""
  ) {
    const parsed = parseRequiredModalidadCobro(record.value.onlineModalidad);
    if (!parsed.ok) return parsed;
    onlineModalidad = parsed.value;
  }

  return {
    ok: true,
    value: {
      linkUrl:
        typeof record.value.linkUrl === "string" ? record.value.linkUrl : null,
      onlineUrl:
        typeof record.value.onlineUrl === "string"
          ? record.value.onlineUrl
          : null,
      onlineModalidad,
    },
  };
}

function parseAccountFields<TCurrency extends "PEN" | "USD">(
  input: unknown,
  currency: TCurrency,
  prefix: "soles" | "dollar",
): Result<SaleVenueAccount & { currency: TCurrency }, DomainError> {
  const record = readRecord(input);
  if (!record.ok) {
    return validationError(`${prefix}_account_required`, "Account is required");
  }

  if (record.value.currency !== currency) {
    return validationError(
      `${prefix}_account_currency_required`,
      "Account currency is invalid",
    );
  }

  const banco = parseRequiredAbonoBank(record.value.banco);
  if (!banco.ok) return banco;

  const tipoCuenta = parseRequiredAccountType(record.value.tipoCuenta);
  if (!tipoCuenta.ok) return tipoCuenta;

  const nroCuenta = parseRequiredLeadText(
    record.value.nroCuenta,
    `${prefix}_account_number_required`,
    "Account number is required",
  );
  if (!nroCuenta.ok) return nroCuenta;

  const cci = parseOptionalText(
    record.value.cci,
    `${prefix}_account_cci_required`,
    "CCI is required",
  );
  if (!cci.ok) return cci;
  if (!isBcpBank(banco.value) && cci.value === null) {
    return validationError(`${prefix}_account_cci_required`, "CCI is required");
  }

  const isSettlement = parseBoolean(
    record.value.isSettlement,
    `${prefix}_account_settlement_required`,
    "Settlement flag is required",
  );
  if (!isSettlement.ok) return isSettlement;

  return Ok({
    currency,
    banco: banco.value,
    tipoCuenta: tipoCuenta.value,
    nroCuenta: nroCuenta.value,
    ...(cci.value ? { cci: cci.value } : {}),
    isSettlement: isSettlement.value,
  });
}

export function parseLeadReviewInput(
  input: unknown,
): Result<ParsedLeadReviewInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const status = parseRequiredLeadStatus(record.value.status);
  if (!status.ok) return status;

  const prioridad = parseRequiredLeadPriority(record.value.prioridad);
  if (!prioridad.ok) return prioridad;

  const reason = parseRequiredLeadText(
    record.value.reason,
    "reason_required",
    "Reason is required",
  );
  if (!reason.ok) return reason;

  return Ok({
    leadId: leadId.value,
    status: status.value,
    prioridad: prioridad.value,
    reason: reason.value,
  });
}

export function parseAddLeadNoteInput(
  input: unknown,
): Result<ParsedAddLeadNoteInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const body = parseRequiredLeadText(
    record.value.body,
    "body_required",
    "Note body is required",
  );
  if (!body.ok) return body;

  return Ok({ leadId: leadId.value, body: body.value });
}

export function parseSaveCommercialScopeInput(
  input: unknown,
): Result<ParsedCommercialScopeInput, DomainError> {
  return parseCommercialScopeFields(input);
}

export function parseRequestQuotationInput(
  input: unknown,
): Result<ParsedRequestQuotationInput, DomainError> {
  return parseCommercialScopeFields(input);
}

export function parseSaveDigitalPolicyInput(
  input: unknown,
): Result<ParsedSaveDigitalPolicyInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const linkScope = parseRequiredProductScope(record.value.linkScope);
  if (!linkScope.ok) return linkScope;

  const linkUrl = parseOptionalText(
    record.value.linkUrl,
    "invalid_link_url",
    "Invalid link URL",
  );
  if (!linkUrl.ok) return linkUrl;

  const onlineScope = parseRequiredProductScope(record.value.onlineScope);
  if (!onlineScope.ok) return onlineScope;

  const onlineUrl = parseOptionalText(
    record.value.onlineUrl,
    "invalid_online_url",
    "Invalid online URL",
  );
  if (!onlineUrl.ok) return onlineUrl;

  let onlineModalidad: Result<ModalidadCobro, DomainError> | null = null;
  if (
    record.value.onlineModalidad !== undefined &&
    record.value.onlineModalidad !== null &&
    record.value.onlineModalidad !== ""
  ) {
    onlineModalidad = parseRequiredModalidadCobro(record.value.onlineModalidad);
    if (!onlineModalidad.ok) return onlineModalidad;
  }

  return Ok({
    leadId: leadId.value,
    linkScope: linkScope.value,
    linkUrl: linkUrl.value,
    onlineScope: onlineScope.value,
    onlineUrl: onlineUrl.value,
    onlineModalidad: onlineModalidad?.value ?? null,
  });
}

export function parseRecordRepLegalInput(
  input: unknown,
): Result<ParsedRecordRepLegalInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const nombres = parseRequiredLeadText(
    record.value.nombres,
    "nombres_required",
    "Nombres is required",
  );
  if (!nombres.ok) return nombres;

  const apellidoPaterno = parseRequiredLeadText(
    record.value.apellidoPaterno,
    "apellido_paterno_required",
    "Apellido paterno is required",
  );
  if (!apellidoPaterno.ok) return apellidoPaterno;

  const apellidoMaterno = parseRequiredLeadText(
    record.value.apellidoMaterno,
    "apellido_materno_required",
    "Apellido materno is required",
  );
  if (!apellidoMaterno.ok) return apellidoMaterno;

  const dni = parseRequiredLeadText(
    record.value.dni,
    "dni_required",
    "DNI is required",
  );
  if (!dni.ok) return dni;

  const telefono = parseRequiredLeadText(
    record.value.telefono,
    "telefono_required",
    "Telefono is required",
  );
  if (!telefono.ok) return telefono;

  const email = parseRequiredLeadText(
    record.value.email,
    "email_required",
    "Email is required",
  );
  if (!email.ok) return email;

  return Ok({
    leadId: leadId.value,
    nombres: nombres.value,
    apellidoPaterno: apellidoPaterno.value,
    apellidoMaterno: apellidoMaterno.value,
    dni: dni.value,
    telefono: telefono.value,
    email: email.value,
  });
}

export function parseCreateVenueInput(
  input: unknown,
): Result<ParsedVenueInput, DomainError> {
  return parseVenueFields(input);
}

export function parseUpdateVenueInput(
  input: unknown,
): Result<ParsedUpdateVenueInput, DomainError> {
  const venue = parseVenueFields(input);
  if (!venue.ok) return venue;

  const record = readRecord(input);
  if (!record.ok) return record;

  const venueId = parseRequiredLeadText(
    record.value.venueId,
    "venue_id_required",
    "Venue is required",
  );
  if (!venueId.ok) return venueId;

  return Ok({ ...venue.value, venueId: venueId.value });
}

export function parseAddVenueAccountsInput(
  input: unknown,
): Result<ParsedAddVenueAccountsInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const venueId = parseRequiredLeadText(
    record.value.venueId,
    "venue_id_required",
    "Venue is required",
  );
  if (!venueId.ok) return venueId;

  const solesAccount = parseAccountFields(
    record.value.solesAccount,
    "PEN",
    "soles",
  );
  if (!solesAccount.ok) return solesAccount;

  if (
    record.value.dollarAccount === undefined ||
    record.value.dollarAccount === null
  ) {
    return Ok({
      leadId: leadId.value,
      venueId: venueId.value,
      solesAccount: solesAccount.value,
    });
  }

  const dollarAccount = parseAccountFields(
    record.value.dollarAccount,
    "USD",
    "dollar",
  );
  if (!dollarAccount.ok) return dollarAccount;

  return Ok({
    leadId: leadId.value,
    venueId: venueId.value,
    solesAccount: solesAccount.value,
    dollarAccount: dollarAccount.value,
  });
}

export function parseCreateQuotationInput(
  input: unknown,
): Result<ParsedCreateQuotationInput, DomainError> {
  const record = readRecord(input);
  if (!record.ok) return record;

  const leadId = parseRequiredLeadText(
    record.value.leadId,
    "lead_id_required",
    "Lead is required",
  );
  if (!leadId.ok) return leadId;

  const paybackPricing = parseNumber(
    record.value.paybackPricing,
    "payback_pricing_required",
    "Payback pricing is required",
  );
  if (!paybackPricing.ok) return paybackPricing;

  const tarifaDebito = parseNumber(
    record.value.tarifaDebito,
    "tarifa_debito_required",
    "Tarifa debito is required",
  );
  if (!tarifaDebito.ok) return tarifaDebito;

  const tarifaCredito = parseNumber(
    record.value.tarifaCredito,
    "tarifa_credito_required",
    "Tarifa credito is required",
  );
  if (!tarifaCredito.ok) return tarifaCredito;

  const tarifaForaneo = parseNumber(
    record.value.tarifaForaneo,
    "tarifa_foraneo_required",
    "Tarifa foraneo is required",
  );
  if (!tarifaForaneo.ok) return tarifaForaneo;

  const fee = parseNumber(record.value.fee, "fee_required", "Fee is required");
  if (!fee.ok) return fee;

  const moneda = parseRequiredMoneda(record.value.moneda);
  if (!moneda.ok) return moneda;

  return Ok({
    leadId: leadId.value,
    paybackPricing: paybackPricing.value,
    tarifaDebito: tarifaDebito.value,
    tarifaCredito: tarifaCredito.value,
    tarifaForaneo: tarifaForaneo.value,
    fee: fee.value,
    moneda: moneda.value,
  });
}

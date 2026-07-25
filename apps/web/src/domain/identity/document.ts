import { fail, type DomainError } from "~/domain/errors";
import { Err, isErr, Ok, type Result } from "~/shared/result";

// Parse RUC and DNI at input boundaries; branded values are trusted afterward.

export type Ruc = string & { readonly __brand: "Ruc" };
export type Dni = string & { readonly __brand: "Dni" };

export type DocumentKind = "ruc" | "dni";

export type Document =
  | { kind: "ruc"; value: Ruc }
  | { kind: "dni"; value: Dni };

const RUC_PATTERN = /^\d{11}$/;
const DNI_PATTERN = /^\d{8}$/;

export function parseRuc(value: unknown): Result<Ruc, DomainError> {
  if (typeof value !== "string") return Err(fail("invalid_ruc"));
  const trimmed = value.trim();
  if (!RUC_PATTERN.test(trimmed)) return Err(fail("invalid_ruc"));
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return Ok(trimmed as Ruc);
}

function parseDni(value: unknown): Result<Dni, DomainError> {
  if (typeof value !== "string") return Err(fail("invalid_dni"));
  const trimmed = value.trim();
  if (!DNI_PATTERN.test(trimmed)) return Err(fail("invalid_dni"));
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return Ok(trimmed as Dni);
}

export function parseDocument(
  kind: unknown,
  value: unknown,
): Result<Document, DomainError> {
  if (kind === "ruc") {
    const ruc = parseRuc(value);
    return isErr(ruc) ? ruc : Ok({ kind: "ruc", value: ruc.value });
  }
  if (kind === "dni") {
    const dni = parseDni(value);
    return isErr(dni) ? dni : Ok({ kind: "dni", value: dni.value });
  }
  return Err(fail("invalid_document_type"));
}

// Treat malformed persisted RUCs as database corruption, not user input.
export function hydrateRuc(value: string): Ruc {
  const parsed = parseRuc(value);
  if (isErr(parsed)) {
    throw new Error(`corrupt persisted ruc: ${value}`);
  }
  return parsed.value;
}

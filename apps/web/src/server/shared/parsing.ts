import { isPlainRecord } from "~/lib/type-guards";
import type { DomainError } from "~/server/shared/domain-error";
import { ERROR_CATALOG } from "~/server/shared/error-catalog";
import { Err, Ok, type Result } from "~/server/shared/result";

/**
 * Builds the error value for a failed field read. `field` is the dotted
 * camelCase path from the object root (for example "solesAccount.nroCuenta");
 * the root object itself is reported with an empty string. `reason` is
 * "required" when the value is absent or blank, and "invalid" when it is
 * present but the wrong type or outside an allowed set.
 *
 * Consumers map one path plus reason into their own failure channel, so the
 * same readers serve action commands (DomainError), history replay, and CSV
 * import without each rebuilding the traversal.
 */
export type FieldFail<E> = (field: string, reason: "required" | "invalid") => E;

/**
 * Reads typed fields out of an already-narrowed record. Each method returns
 * the value directly and throws the first failure as a sentinel; parseObject
 * catches it and returns an Err. The throw never escapes the toolkit, so every
 * caller observes a Result and the boundary contract stays in Result<T, E>.
 */
export interface Reader<E> {
  str(field: string): string;
  num(field: string): number;
  posInt(field: string): number;
  bool(field: string): boolean;
  enum<T extends string>(field: string, options: readonly T[]): T;
  strList(field: string): string[];
  optNum(field: string): number | null;
  optStr(field: string): string | null;
  optEnum<T extends string>(
    field: string,
    options: readonly T[],
  ): T | undefined;
  obj<T>(field: string, build: (reader: Reader<E>) => T): T;
  optObj<T>(field: string, build: (reader: Reader<E>) => T): T | undefined;
}

// Sentinel for the short-circuit throw. Holds the already-built failure value
// so parseObject can surface it without re-deriving anything. Carries unknown
// because instanceof erases the generic; parseObject restores the type.
class FieldError {
  constructor(readonly error: unknown) {}
}

class RecordReader<E> implements Reader<E> {
  constructor(
    private readonly record: Record<string, unknown>,
    private readonly fail: FieldFail<E>,
    private readonly path: string,
  ) {}

  str(field: string): string {
    const value = this.present(field);
    if (typeof value !== "string") this.reject(field, "invalid");
    const trimmed = value.trim();
    if (!trimmed) this.reject(field, "required");
    return trimmed;
  }

  num(field: string): number {
    const value = this.present(field);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.reject(field, "invalid");
    }
    return value;
  }

  // Positive integer: the common shape for ids and counts. A present value that
  // is not an integer >= 1 is "invalid"; absent is "required".
  posInt(field: string): number {
    const value = this.present(field);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      this.reject(field, "invalid");
    }
    return value;
  }

  bool(field: string): boolean {
    const value = this.present(field);
    if (typeof value !== "boolean") this.reject(field, "invalid");
    return value;
  }

  enum<T extends string>(field: string, options: readonly T[]): T {
    const value = this.record[field];
    if (value === undefined || value === null || value === "") {
      this.reject(field, "required");
    }
    if (typeof value !== "string") this.reject(field, "invalid");
    const match = options.find((option) => option === value);
    if (match === undefined) this.reject(field, "invalid");
    return match;
  }

  strList(field: string): string[] {
    const value = this.present(field);
    if (!Array.isArray(value)) this.reject(field, "invalid");
    const items: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") this.reject(field, "invalid");
      items.push(item.trim());
    }
    return items;
  }

  optNum(field: string): number | null {
    const value = this.record[field];
    if (value === undefined || value === null) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.reject(field, "invalid");
    }
    return value;
  }

  optStr(field: string): string | null {
    const value = this.record[field];
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") this.reject(field, "invalid");
    return value.trim() || null;
  }

  optEnum<T extends string>(
    field: string,
    options: readonly T[],
  ): T | undefined {
    const value = this.record[field];
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string") this.reject(field, "invalid");
    const match = options.find((option) => option === value);
    if (match === undefined) this.reject(field, "invalid");
    return match;
  }

  obj<T>(field: string, build: (reader: Reader<E>) => T): T {
    const value = this.record[field];
    if (value === undefined || value === null) this.reject(field, "required");
    if (!isPlainRecord(value)) this.reject(field, "invalid");
    return build(new RecordReader(value, this.fail, this.pathOf(field)));
  }

  optObj<T>(field: string, build: (reader: Reader<E>) => T): T | undefined {
    const value = this.record[field];
    if (value === undefined || value === null) return undefined;
    if (!isPlainRecord(value)) this.reject(field, "invalid");
    return build(new RecordReader(value, this.fail, this.pathOf(field)));
  }

  private pathOf(field: string): string {
    return this.path ? `${this.path}.${field}` : field;
  }

  // Absent (undefined/null) is "required"; a present value of the wrong type is
  // the caller's "invalid" to report. Splitting the two keeps the failure code
  // honest, so telemetry can tell a missing field from a malformed one.
  private present(field: string): unknown {
    const value = this.record[field];
    if (value === undefined || value === null) this.reject(field, "required");
    return value;
  }

  private reject(field: string, reason: "required" | "invalid"): never {
    throw new FieldError(this.fail(this.pathOf(field), reason));
  }
}

/**
 * Narrows an untrusted value to a typed object. `build` reads each field
 * through the reader; the first bad field short-circuits to an Err carrying
 * the failure that `fail` produced for that field path. A non-object root is
 * reported as an "invalid" failure on the empty path.
 */
export function parseObject<T, E>(
  raw: unknown,
  fail: FieldFail<E>,
  build: (reader: Reader<E>) => T,
): Result<T, E> {
  if (!isPlainRecord(raw)) {
    return Err(fail("", "invalid"));
  }

  try {
    return Ok(build(new RecordReader(raw, fail, "")));
  } catch (error) {
    if (error instanceof FieldError) {
      // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
      return Err(error.error as E);
    }
    throw error;
  }
}

function camelToSnake(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function fieldCode(field: string): string {
  return field.split(".").map(camelToSnake).join("_");
}

/**
 * FieldFail binding that turns a path plus reason into a validation
 * DomainError. The code is the snake_case field path, so "tasaActual" yields
 * "tasa_actual_required" and "solesAccount.nroCuenta" yields
 * "soles_account_nro_cuenta_required". Telemetry and tests can assert on a
 * stable, derivable code without hand-maintained strings. The root failure
 * reports "invalid_input".
 *
 * The user message is the catalog copy when the derived code is curated there
 * (for example "ruc_required"); otherwise it falls back to a generic Spanish
 * line, keeping the long tail of field codes off the catalog.
 */
export const validationFail: FieldFail<DomainError> = (field, reason) => {
  if (!field) {
    return {
      kind: "validation",
      code: "invalid_input",
      message: "Revisa los datos ingresados.",
    };
  }

  const code =
    reason === "required"
      ? `${fieldCode(field)}_required`
      : `invalid_${fieldCode(field)}`;
  const entry = (
    ERROR_CATALOG as Record<string, { kind: string; message: string }>
  )[code];
  const message =
    entry?.message ??
    (reason === "required"
      ? "Completa este campo."
      : "El valor ingresado no es válido.");

  return { kind: "validation", code, message };
};

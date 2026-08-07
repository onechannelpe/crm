import { invalid, type DomainError } from "~/domain/errors";
import type { IdCodec } from "~/domain/ids";
import {
  parseCalendarDate,
  parseCalendarMonth,
  type CalendarDate,
  type CalendarMonth,
} from "~/domain/time/calendar-date";
import { Err, isErr, Ok, type Result } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

export type FieldFail<E> = (field: string, reason: "required" | "invalid") => E;

export type StrListConstraints = {
  min?: number;
  max?: number;
  unique?: boolean;
};

export interface Reader<E> {
  str(field: string, opts?: { min?: number; max?: number }): string;
  id<Id extends string>(field: string, codec: IdCodec<Id>): Id;
  optId<Id extends string>(field: string, codec: IdCodec<Id>): Id | undefined;
  idList<Id extends string>(
    field: string,
    codec: IdCodec<Id>,
    opts?: StrListConstraints,
  ): Id[];
  num(field: string): number;
  posInt(field: string): number;
  numAtLeast(field: string, min: number): number;
  bool(field: string): boolean;
  enum<T extends string>(field: string, options: readonly T[]): T;
  strList(field: string, opts?: StrListConstraints): string[];
  optNum(field: string): number | null;
  optIntRange(field: string, opts: { min: number; max: number }): number | null;
  optStr(field: string): string | null;
  optBool(field: string): boolean | null;
  optEnum<T extends string>(
    field: string,
    options: readonly T[],
  ): T | undefined;
  calendarDate(field: string): CalendarDate;
  optCalendarDate(field: string): CalendarDate | null;
  calendarMonth(field: string): CalendarMonth;
  optCalendarMonth(field: string): CalendarMonth | null;
  obj<T>(field: string, build: (reader: Reader<E>) => T): T;
  optObj<T>(field: string, build: (reader: Reader<E>) => T): T | undefined;
}

// The sentinel carries unknown because instanceof erases the generic.
class FieldError {
  constructor(readonly error: unknown) {}
}

class RecordReader<E> implements Reader<E> {
  constructor(
    private readonly record: Record<string, unknown>,
    private readonly fail: FieldFail<E>,
    private readonly path: string,
  ) {}

  str(field: string, opts?: { min?: number; max?: number }): string {
    const value = this.present(field);
    if (typeof value !== "string") {
      this.reject(field, "invalid");
    }
    const trimmed = value.trim();
    if (!trimmed) {
      this.reject(field, "required");
    }
    if (opts?.min !== undefined && trimmed.length < opts.min) {
      this.reject(field, "invalid");
    }
    if (opts?.max !== undefined && trimmed.length > opts.max) {
      this.reject(field, "invalid");
    }
    return trimmed;
  }

  id<Id extends string>(field: string, codec: IdCodec<Id>): Id {
    const raw = this.str(field);
    const parsed = codec.parse(raw);
    if (isErr(parsed)) {
      this.reject(field, "invalid");
    }
    return parsed.value;
  }

  optId<Id extends string>(field: string, codec: IdCodec<Id>): Id | undefined {
    const raw = this.optStr(field);
    if (raw === null) {
      return undefined;
    }
    const parsed = codec.parse(raw);
    if (isErr(parsed)) {
      this.reject(field, "invalid");
    }
    return parsed.value;
  }

  idList<Id extends string>(
    field: string,
    codec: IdCodec<Id>,
    opts?: StrListConstraints,
  ): Id[] {
    return this.strList(field, opts).map((raw) => {
      const parsed = codec.parse(raw);
      if (isErr(parsed)) {
        this.reject(field, "invalid");
      }
      return parsed.value;
    });
  }

  num(field: string): number {
    const value = this.present(field);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.reject(field, "invalid");
    }
    return value;
  }

  posInt(field: string): number {
    const value = this.present(field);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      this.reject(field, "invalid");
    }
    return value;
  }

  numAtLeast(field: string, min: number): number {
    const value = this.present(field);
    if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
      this.reject(field, "invalid");
    }
    return value;
  }

  bool(field: string): boolean {
    const value = this.present(field);
    if (typeof value !== "boolean") {
      this.reject(field, "invalid");
    }
    return value;
  }

  enum<T extends string>(field: string, options: readonly T[]): T {
    const value = this.record[field];
    if (value === undefined || value === null || value === "") {
      this.reject(field, "required");
    }
    if (typeof value !== "string") {
      this.reject(field, "invalid");
    }
    const match = options.find((option) => option === value);
    if (match === undefined) {
      this.reject(field, "invalid");
    }
    return match;
  }

  strList(field: string, opts?: StrListConstraints): string[] {
    const value = this.present(field);
    if (!Array.isArray(value)) {
      this.reject(field, "invalid");
    }
    const items: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") {
        this.reject(field, "invalid");
      }
      const trimmed = item.trim();
      if (!trimmed) {
        this.reject(field, "invalid");
      }
      items.push(trimmed);
    }
    if (opts?.min !== undefined && items.length < opts.min) {
      this.reject(field, "required");
    }
    if (opts?.max !== undefined && items.length > opts.max) {
      this.reject(field, "invalid");
    }
    if (opts?.unique && new Set(items).size !== items.length) {
      this.reject(field, "invalid");
    }
    return items;
  }

  optNum(field: string): number | null {
    const value = this.record[field];
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.reject(field, "invalid");
    }
    return value;
  }

  optIntRange(
    field: string,
    opts: { min: number; max: number },
  ): number | null {
    const value = this.record[field];
    if (value === undefined || value === null) {
      return null;
    }
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < opts.min ||
      value > opts.max
    ) {
      this.reject(field, "invalid");
    }
    return value;
  }

  optStr(field: string): string | null {
    const value = this.record[field];
    if (value === undefined || value === null || value === "") {
      return null;
    }
    if (typeof value !== "string") {
      this.reject(field, "invalid");
    }
    return value.trim() || null;
  }

  optBool(field: string): boolean | null {
    const value = this.record[field];
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "boolean") {
      this.reject(field, "invalid");
    }
    return value;
  }

  optEnum<T extends string>(
    field: string,
    options: readonly T[],
  ): T | undefined {
    const value = this.record[field];
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (typeof value !== "string") {
      this.reject(field, "invalid");
    }
    const match = options.find((option) => option === value);
    if (match === undefined) {
      this.reject(field, "invalid");
    }
    return match;
  }

  calendarDate(field: string): CalendarDate {
    const value = parseCalendarDate(this.str(field));
    if (!value) {
      this.reject(field, "invalid");
    }
    return value;
  }

  optCalendarDate(field: string): CalendarDate | null {
    const raw = this.optStr(field);
    if (raw === null) {
      return null;
    }
    const value = parseCalendarDate(raw);
    if (!value) {
      this.reject(field, "invalid");
    }
    return value;
  }

  calendarMonth(field: string): CalendarMonth {
    const value = parseCalendarMonth(this.str(field));
    if (!value) {
      this.reject(field, "invalid");
    }
    return value;
  }

  optCalendarMonth(field: string): CalendarMonth | null {
    const raw = this.optStr(field);
    if (raw === null) {
      return null;
    }
    const value = parseCalendarMonth(raw);
    if (!value) {
      this.reject(field, "invalid");
    }
    return value;
  }

  obj<T>(field: string, build: (reader: Reader<E>) => T): T {
    const value = this.record[field];
    if (value === undefined || value === null) {
      this.reject(field, "required");
    }
    if (!isPlainRecord(value)) {
      this.reject(field, "invalid");
    }
    return build(new RecordReader(value, this.fail, this.pathOf(field)));
  }

  optObj<T>(field: string, build: (reader: Reader<E>) => T): T | undefined {
    const value = this.record[field];
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!isPlainRecord(value)) {
      this.reject(field, "invalid");
    }
    return build(new RecordReader(value, this.fail, this.pathOf(field)));
  }

  private pathOf(field: string): string {
    return this.path ? `${this.path}.${field}` : field;
  }

  private present(field: string): unknown {
    const value = this.record[field];
    if (value === undefined || value === null) {
      this.reject(field, "required");
    }
    return value;
  }

  private reject(field: string, reason: "required" | "invalid"): never {
    throw new FieldError(this.fail(this.pathOf(field), reason));
  }
}

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

export const validationFail: FieldFail<DomainError> = (field, reason) => {
  if (!field) {
    return invalid({ code: "invalid_input" });
  }

  const code =
    reason === "required"
      ? `${fieldCode(field)}_required`
      : `invalid_${fieldCode(field)}`;
  return invalid({ code });
};

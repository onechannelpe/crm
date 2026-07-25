declare const calendarDateBrand: unique symbol;
declare const calendarMonthBrand: unique symbol;

export type CalendarDate = string & {
  readonly [calendarDateBrand]: "CalendarDate";
};

export type CalendarMonth = string & {
  readonly [calendarMonthBrand]: "CalendarMonth";
};

export type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function parseCalendarDate(value: unknown): CalendarDate | null {
  if (typeof value !== "string") return null;

  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  return isValidDate(parts) ? asCalendarDate(value) : null;
}

export function parseCalendarMonth(value: unknown): CalendarMonth | null {
  if (typeof value !== "string") return null;

  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1 || month < 1 || month > 12) return null;

  return asCalendarMonth(value);
}

export function calendarDateParts(date: CalendarDate): CalendarDateParts {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

export function calendarDateFromParts(parts: CalendarDateParts): CalendarDate {
  if (!isValidDate(parts)) {
    throw new RangeError("Invalid calendar date");
  }

  return asCalendarDate(
    `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
  );
}

export function addCalendarDays(
  date: CalendarDate,
  amount: number,
): CalendarDate {
  if (!Number.isInteger(amount)) {
    throw new RangeError("Calendar day amount must be an integer");
  }

  const parts = calendarDateParts(date);
  const shifted = utcDate(parts);
  shifted.setUTCDate(shifted.getUTCDate() + amount);

  return calendarDateFromParts({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

export function calendarMonthParts(month: CalendarMonth): {
  year: number;
  month: number;
} {
  return {
    year: Number(month.slice(0, 4)),
    month: Number(month.slice(5, 7)),
  };
}

export function calendarMonthFromDate(date: CalendarDate): CalendarMonth {
  return asCalendarMonth(date.slice(0, 7));
}

export function calendarMonthStart(month: CalendarMonth): CalendarDate {
  return asCalendarDate(`${month}-01`);
}

export function addCalendarMonths(
  month: CalendarMonth,
  amount: number,
): CalendarMonth {
  if (!Number.isInteger(amount)) {
    throw new RangeError("Calendar month amount must be an integer");
  }

  const { year, month: monthNumber } = calendarMonthParts(month);
  const shifted = utcDate({ year, month: monthNumber + amount, day: 1 });

  return asCalendarMonth(
    `${String(shifted.getUTCFullYear()).padStart(4, "0")}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`,
  );
}

function asCalendarDate(value: string): CalendarDate {
  // This assertion is confined to constructors that have already validated or built the canonical shape.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return value as CalendarDate;
}

function asCalendarMonth(value: string): CalendarMonth {
  // This assertion is confined to constructors that have already validated or built the canonical shape.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return value as CalendarMonth;
}

function isValidDate(parts: CalendarDateParts): boolean {
  if (
    !Number.isInteger(parts.year) ||
    !Number.isInteger(parts.month) ||
    !Number.isInteger(parts.day) ||
    parts.year < 1 ||
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1
  ) {
    return false;
  }

  return parts.day <= daysInMonth(parts.year, parts.month);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function utcDate(parts: CalendarDateParts): Date {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

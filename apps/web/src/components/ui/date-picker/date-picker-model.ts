export const DAY_NAMES = ["L", "M", "X", "J", "V", "S", "D"] as const;
const CALENDAR_START_DAY = 1;

export interface CalendarCell {
  iso: string;
  label: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

export interface VisibleMonth {
  year: number;
  month: number;
}

export function buildCalendarCells(
  visibleMonth: VisibleMonth,
  selectedDate: Date | null,
  minDate: Date | null,
): CalendarCell[] {
  const monthStart = toMonthDate(visibleMonth);
  const firstVisibleDate = getStartOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      firstVisibleDate.getFullYear(),
      firstVisibleDate.getMonth(),
      firstVisibleDate.getDate() + index,
    );

    return {
      iso: formatIsoDate(date),
      label: date.getDate(),
      isCurrentMonth:
        date.getFullYear() === visibleMonth.year &&
        date.getMonth() === visibleMonth.month,
      isSelected: selectedDate ? isSameDate(date, selectedDate) : false,
      isDisabled: minDate ? date.getTime() < minDate.getTime() : false,
    };
  });
}

export function clampVisibleMonth(
  visibleMonth: VisibleMonth,
  minDate: Date | null,
): VisibleMonth {
  if (!minDate) return visibleMonth;
  const minMonth = getVisibleMonth(minDate);
  if (compareVisibleMonth(visibleMonth, minMonth) < 0) {
    return minMonth;
  }
  return visibleMonth;
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date: Date, dayDelta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + dayDelta);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function todayLocalDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getVisibleMonth(date: Date): VisibleMonth {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  };
}

export function getMonthOptions(visibleMonth: VisibleMonth): Array<{
  label: string;
  value: number;
}> {
  const formatter = new Intl.DateTimeFormat("es-PE", { month: "long" });

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const label = formatter.format(new Date(visibleMonth.year, monthIndex, 1));

    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: monthIndex,
    };
  });
}

export function shiftDateByMonths(date: Date, monthDelta: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + monthDelta, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isPreviousMonthDisabled(
  visibleMonth: VisibleMonth,
  minDate: Date | null,
): boolean {
  if (!minDate) return false;
  const minMonth = getVisibleMonth(minDate);
  return compareVisibleMonth(visibleMonth, minMonth) <= 0;
}

export function startOfMonth(visibleMonth: VisibleMonth): Date {
  return toMonthDate(visibleMonth);
}

export function endOfMonth(visibleMonth: VisibleMonth): Date {
  const end = new Date(visibleMonth.year, visibleMonth.month + 1, 0);
  end.setHours(0, 0, 0, 0);
  return end;
}

export function withDateMonth(date: Date, month: number): Date {
  const next = new Date(date);
  next.setMonth(month, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function withDateYear(date: Date, year: number): Date {
  const next = new Date(date);
  next.setFullYear(year, next.getMonth(), 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getStartOfWeek(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const weekday = normalized.getDay();
  const offset = (weekday - CALENDAR_START_DAY + 7) % 7;
  normalized.setDate(normalized.getDate() - offset);
  return normalized;
}

function isSameDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function compareVisibleMonth(left: VisibleMonth, right: VisibleMonth): number {
  if (left.year !== right.year) {
    return left.year - right.year;
  }
  return left.month - right.month;
}

function toMonthDate(visibleMonth: VisibleMonth): Date {
  return new Date(visibleMonth.year, visibleMonth.month, 1);
}

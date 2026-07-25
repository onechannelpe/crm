import { formatCalendarLongDate } from "~/domain/time/app-time";
import { parseCalendarDate } from "~/domain/time/calendar-date";

export function formatUpdateDisplayDate(date: string): string {
  const parsed = parseCalendarDate(date);
  return parsed ? formatCalendarLongDate(parsed) : date;
}

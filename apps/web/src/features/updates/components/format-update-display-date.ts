import { formatCalendarLongDate } from "~/lib/time/app-time";
import { parseCalendarDate } from "~/lib/time/calendar-date";

export function formatUpdateDisplayDate(date: string): string {
  const parsed = parseCalendarDate(date);
  return parsed ? formatCalendarLongDate(parsed) : date;
}

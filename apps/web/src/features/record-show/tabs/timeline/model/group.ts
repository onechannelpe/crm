import { appCalendarDateAt } from "~/domain/time/app-time";
import {
  calendarMonthFromDate,
  type CalendarMonth,
} from "~/domain/time/calendar-date";

import type { Event } from "./event";

export type Group = {
  month: CalendarMonth;
  items: Event[];
};

export function groupEventsByMonth(events: Event[]): Group[] {
  const groups: Group[] = [];

  for (const event of events) {
    const month = calendarMonthFromDate(appCalendarDateAt(event.createdAt));
    const existingGroup = groups.find((group) => group.month === month);

    if (existingGroup) {
      existingGroup.items.push(event);
      continue;
    }

    groups.push({ month, items: [event] });
  }

  // Newest month first. CalendarMonth ("YYYY-MM") sorts lexically as chronologically.
  return groups.toSorted((a, b) => b.month.localeCompare(a.month));
}

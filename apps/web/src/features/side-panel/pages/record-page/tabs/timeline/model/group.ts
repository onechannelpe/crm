import type { Event } from "./event";

export type Group = {
  month: number;
  year: number;
  items: Event[];
};

export function groupEventsByMonth(events: Event[]): Group[] {
  const groups: Group[] = [];

  for (const event of events) {
    const date = new Date(event.createdAt);
    const month = date.getMonth();
    const year = date.getFullYear();
    const existingGroup = groups.find(
      (group) => group.year === year && group.month === month,
    );

    if (existingGroup) {
      existingGroup.items.push(event);
      continue;
    }

    groups.push({
      month,
      year,
      items: [event],
    });
  }

  return groups.toSorted((a, b) => b.year - a.year || b.month - a.month);
}

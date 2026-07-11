export type Clock = () => Date;

export function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

export function epochMilliseconds(date: Date): number {
  return date.getTime();
}

export function epochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function dateFromEpochMilliseconds(value: number): Date {
  return new Date(value);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function currentMonthlyPeriod(now: Date): {
  periodStart: string;
  periodEnd: string;
} {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  );

  return {
    periodStart: isoDate(start),
    periodEnd: isoDate(end),
  };
}

export function currentDailyPeriod(now: Date): { date: string } {
  return { date: isoDate(now) };
}

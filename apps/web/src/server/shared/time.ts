export function currentMonthlyPeriod(now: Date): { periodStart: string; periodEnd: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periodStart = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const periodEnd = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  return { periodStart, periodEnd };
}

export function currentDailyPeriod(now: Date): { date: string } {
  return { date: now.toISOString().slice(0, 10) };
}

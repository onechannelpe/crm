export function currentMonthPeriod(now: Date = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periodStart = new Date(Date.UTC(year, month, 1))
    .toISOString()
    .slice(0, 10);
  const periodEnd = new Date(Date.UTC(year, month + 1, 0))
    .toISOString()
    .slice(0, 10);
  return { periodStart, periodEnd };
}

export function availableAllowance(input: {
  baseLimit: number;
  extraGranted: number;
  usedAmount: number;
}) {
  return Math.max(0, input.baseLimit + input.extraGranted - input.usedAmount);
}

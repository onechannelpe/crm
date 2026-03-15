export function todayDateString(now: Date = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function availableLeadRefill(input: {
  baseLimit: number;
  extraGranted: number;
  usedAmount: number;
}) {
  return Math.max(0, input.baseLimit + input.extraGranted - input.usedAmount);
}

export function computeNeededAssignments(
  activeAssignments: number,
  activeBufferTarget: number,
) {
  return Math.max(0, activeBufferTarget - activeAssignments);
}

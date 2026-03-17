export function computeNeededAssignments(
  activeAssignments: number,
  bufferTarget: number,
): number {
  return Math.max(0, bufferTarget - activeAssignments);
}

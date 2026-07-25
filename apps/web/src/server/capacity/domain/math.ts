import type { ReservationStatus } from "~/server/capacity/domain/types";

export function sumAmount(rows: { amount: number }[]): number {
  return rows.reduce((acc, row) => acc + row.amount, 0);
}

export function sumPending(
  rows: { amount: number; status: ReservationStatus }[],
): number {
  return rows
    .filter((row) => row.status === "pending")
    .reduce((acc, row) => acc + row.amount, 0);
}

export function remainingCapacity(input: {
  limit: number;
  granted: number;
  committed: number;
  pending: number;
}): number {
  return Math.max(
    0,
    input.limit + input.granted - input.committed - input.pending,
  );
}

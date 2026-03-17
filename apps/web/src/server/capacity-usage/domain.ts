import type { ReservationStatus } from "~/server/shared/scope";

export function sumGranted(rows: { amount: number }[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

export function sumCommitted(rows: { amount: number }[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

export function sumPending(rows: { amount: number; status: ReservationStatus }[]): number {
  return rows.filter((r) => r.status === "pending").reduce((acc, r) => acc + r.amount, 0);
}

export function remainingCapacity(input: {
  limit: number;
  granted: number;
  committed: number;
  pending: number;
}): number {
  return Math.max(0, input.limit + input.granted - input.committed - input.pending);
}

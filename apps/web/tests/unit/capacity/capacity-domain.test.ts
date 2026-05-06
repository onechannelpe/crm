import { describe, expect, it } from "vitest";

import { remainingCapacity } from "~/server/capacity/domain/math";
import {
  buildLeadCapacitySnapshot,
  buildSearchCapacitySnapshot,
} from "~/server/capacity/domain/snapshot";

describe("remainingCapacity", () => {
  it("calculates capacity correctly for positive values", () => {
    expect(
      remainingCapacity({
        limit: 100,
        granted: 20,
        committed: 30,
        pending: 10,
      }),
    ).toBe(80);
  });

  it("is always >= 0 even when over capacity (bounded at zero)", () => {
    expect(
      remainingCapacity({
        limit: 10,
        granted: 0,
        committed: 20,
        pending: 5,
      }),
    ).toBe(0);
  });

  it("handles zero values", () => {
    expect(
      remainingCapacity({
        limit: 0,
        granted: 0,
        committed: 0,
        pending: 0,
      }),
    ).toBe(0);
  });
});

describe("buildSearchCapacitySnapshot", () => {
  const mockPolicy = { source: "branch" as const, monthlyLimit: 100 };

  it("calculates snapshot fields correctly", () => {
    const snapshot = buildSearchCapacitySnapshot({
      policy: mockPolicy,
      grants: [{ amount: 20 }],
      commits: [{ amount: 30 }],
      reservations: [
        { amount: 10, status: "pending" },
        { amount: 5, status: "committed" },
        { amount: 7, status: "cancelled" },
        { amount: 3, status: "expired" },
      ],
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
    });

    expect(snapshot.policy).toBe(mockPolicy);
    expect(snapshot.granted).toBe(20);
    expect(snapshot.committed).toBe(30);
    // Explicit verification that only 'pending' status was summed (10)
    expect(snapshot.pending).toBe(10);
    expect(snapshot.remaining).toBe(80); // 100 + 20 - 30 - 10
  });

  it("ensures remaining is never negative", () => {
    const snapshot = buildSearchCapacitySnapshot({
      policy: { source: "user" as const, monthlyLimit: 10 },
      grants: [],
      commits: [{ amount: 50 }],
      reservations: [],
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
    });
    expect(snapshot.remaining).toBe(0);
  });
});

describe("buildLeadCapacitySnapshot", () => {
  const mockPolicy = {
    source: "team" as const,
    bufferTarget: 10,
    dailyLimit: 20,
  };

  it("calculates snapshot fields correctly", () => {
    const snapshot = buildLeadCapacitySnapshot({
      policy: mockPolicy,
      grants: [{ amount: 5 }],
      commits: [{ amount: 2 }],
      reservations: [{ amount: 3, status: "pending" }],
      activeAssignments: 7,
    });

    expect(snapshot.policy).toBe(mockPolicy);
    expect(snapshot.granted).toBe(5);
    expect(snapshot.committed).toBe(2);
    expect(snapshot.pending).toBe(3);
    expect(snapshot.activeAssignments).toBe(7);
    expect(snapshot.remaining).toBe(20); // dailyLimit (20) + granted (5) - committed (2) - pending (3)
  });
});

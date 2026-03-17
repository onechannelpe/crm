import * as fc from "fast-check";
import { describe, it } from "vitest";

import { remainingCapacity } from "~/server/capacity-usage/domain";
import {
  buildLeadCapacitySnapshot,
  buildSearchCapacitySnapshot,
} from "~/server/capacity-usage/snapshot";

// Arbitraries

const natRows = fc.array(fc.record({ amount: fc.nat() }));

const reservationRows = fc.array(
  fc.record({
    amount: fc.nat(),
    status: fc.constantFrom("pending", "committed", "cancelled", "expired"),
  }),
);

const searchPolicy = fc.record({
  source: fc.constantFrom("system", "branch", "team", "user"),
  monthlyLimit: fc.nat(),
});

const leadPolicy = fc.record({
  source: fc.constantFrom("system", "branch", "team", "user"),
  bufferTarget: fc.nat(),
  dailyLimit: fc.nat(),
});

// Tests

describe("remainingCapacity", () => {
  it("is always >= 0 for any non-negative inputs", () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.nat(),
        fc.nat(),
        fc.nat(),
        (limit, granted, committed, pending) => {
          const result = remainingCapacity({
            limit,
            granted,
            committed,
            pending,
          });
          return result >= 0;
        },
      ),
    );
  });

  it("equals limit + granted - committed - pending when positive", () => {
    fc.assert(
      fc.property(
        fc.nat(1000),
        fc.nat(1000),
        fc.nat(500),
        fc.nat(500),
        (limit, granted, committed, pending) => {
          const result = remainingCapacity({
            limit,
            granted,
            committed,
            pending,
          });
          const expected = Math.max(0, limit + granted - committed - pending);
          return result === expected;
        },
      ),
    );
  });
});

describe("buildSearchCapacitySnapshot", () => {
  it("remaining is always >= 0", () => {
    fc.assert(
      fc.property(
        searchPolicy,
        natRows,
        natRows,
        reservationRows,
        (policy, grants, commits, reservations) => {
          const snapshot = buildSearchCapacitySnapshot({
            policy,
            grants,
            commits,
            reservations,
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
          });
          return snapshot.remaining >= 0;
        },
      ),
    );
  });

  it("snapshot fields are consistent with inputs", () => {
    fc.assert(
      fc.property(
        searchPolicy,
        natRows,
        natRows,
        reservationRows,
        (policy, grants, commits, reservations) => {
          const snapshot = buildSearchCapacitySnapshot({
            policy,
            grants,
            commits,
            reservations,
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
          });
          return (
            snapshot.granted >= 0 &&
            snapshot.committed >= 0 &&
            snapshot.pending >= 0 &&
            snapshot.policy === policy
          );
        },
      ),
    );
  });
});

describe("buildLeadCapacitySnapshot", () => {
  it("remaining is always >= 0", () => {
    fc.assert(
      fc.property(
        leadPolicy,
        natRows,
        natRows,
        reservationRows,
        fc.nat(),
        (policy, grants, commits, reservations, activeAssignments) => {
          const snapshot = buildLeadCapacitySnapshot({
            policy,
            grants,
            commits,
            reservations,
            activeAssignments,
          });
          return snapshot.remaining >= 0;
        },
      ),
    );
  });

  it("snapshot fields are consistent with inputs", () => {
    fc.assert(
      fc.property(
        leadPolicy,
        natRows,
        natRows,
        reservationRows,
        fc.nat(),
        (policy, grants, commits, reservations, activeAssignments) => {
          const snapshot = buildLeadCapacitySnapshot({
            policy,
            grants,
            commits,
            reservations,
            activeAssignments,
          });
          return (
            snapshot.granted >= 0 &&
            snapshot.committed >= 0 &&
            snapshot.pending >= 0 &&
            snapshot.activeAssignments === activeAssignments &&
            snapshot.policy === policy
          );
        },
      ),
    );
  });
});

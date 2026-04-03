import { describe, expect, it } from "vitest";

import {
  requestContactAssignmentRefill,
  type RefillTransactionRunner,
  type RefillTxRepos,
} from "~/server/contact-assignments/application/request-refill";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { type LeadCandidate } from "~/server/shared/engine/lead-contract";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  makeLeadCapacityGrantsRepo,
  makeLeadUsageCommitsRepo,
  makeLeadUsageReservationsRepo,
  makeNullLeadPolicyRepos,
} from "../support/capacity-fakes";

const USER_ID = 1;
const BRANCH_ID = 1;

function makeCandidate(n: number): LeadCandidate {
  return {
    ruc: `2010000000${n}`,
    organization_name: `Org ${n}`,
    dni: `7000000${n}`,
    person_name: `Person ${n}`,
    phone_primary: `+5199900000${n}`,
  };
}

function makeRepos(activeAssignments = 0) {
  return {
    users: {
      findById: async () => ({ team_id: null, branch_id: BRANCH_ID }),
    },
    ...makeNullLeadPolicyRepos(),
    leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    leadUsageReservations: makeLeadUsageReservationsRepo(),
    leadUsageCommits: makeLeadUsageCommitsRepo(),
    contactAssignments: {
      countActiveByUser: async () => activeAssignments,
      createMany: async () => undefined,
    },
    organizations: {
      findOrCreate: async (_ruc: string, _name: string) => ({ id: 1 }),
    },
    contacts: {
      findOrCreate: async (
        _orgId: number,
        _dni: string,
        _name: string,
        _phone: string,
      ): Promise<{ id: number; cooldown_until: number | null }> => ({
        id: Math.floor(Math.random() * 10000),
        cooldown_until: null,
      }),
    },
  };
}

function makeTransaction(repos: RefillTxRepos): RefillTransactionRunner {
  return async <T>(op: (r: RefillTxRepos) => Promise<T>) => op(repos);
}

const emptyEngine = {
  requestCandidates: async (): Promise<Result<LeadCandidate[], DomainError>> =>
    Ok([]),
};

describe("requestContactAssignmentRefill", () => {
  it("returns 0 requested and 0 assigned when buffer is already full", async () => {
    // System default bufferTarget is read from config; we simulate full buffer
    // by setting activeAssignments to a large number.
    const repos = makeRepos(9999);
    const result = await requestContactAssignmentRefill(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      {
        repos,
        runInTransaction: makeTransaction(repos),
        engine: emptyEngine,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requested).toBe(0);
      expect(result.value.assigned).toBe(0);
    }
    expect(repos.leadUsageReservations.rows).toHaveLength(0);
  });

  it("commits assigned amount and cancels unused when partial assignment occurs", async () => {
    const repos = makeRepos(0);

    // Gateway returns 2 candidates but contacts will all have cooldowns after first
    let contactCallCount = 0;
    repos.contacts.findOrCreate = async (): Promise<{
      id: number;
      cooldown_until: number | null;
    }> => {
      contactCallCount++;
      // First contact is contactable, rest are on cooldown
      const cooldown_until = contactCallCount === 1 ? null : Date.now() + 99999;
      return { id: contactCallCount, cooldown_until };
    };

    const candidates: LeadCandidate[] = [
      makeCandidate(1),
      makeCandidate(2),
      makeCandidate(3),
    ];
    const engine = {
      requestCandidates: async (_input: {
        branchId: number;
        userId: number;
        amount: number;
      }): Promise<Result<LeadCandidate[], DomainError>> => Ok(candidates),
    };

    const result = await requestContactAssignmentRefill(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, runInTransaction: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // assigned < requested means partial use cancellation happened
      expect(result.value.assigned).toBeLessThan(result.value.requested);
    }

    const reservations = repos.leadUsageReservations.rows;
    expect(reservations).toHaveLength(1);

    const commits = repos.leadUsageCommits.rows;
    const committed = commits.reduce((s, r) => s + r.amount, 0);
    const cancelled = reservations
      .filter((r) => r.status === "cancelled")
      .reduce((s, r) => s + r.amount, 0);

    // committed + cancelled must equal the original reservation amount
    expect(committed + cancelled).toBe(reservations[0].amount);
  });

  it("commits full amount when all candidates are assigned", async () => {
    const repos = makeRepos(0);
    const candidates: LeadCandidate[] = [makeCandidate(1)];
    const engine = {
      requestCandidates: async (_input: {
        branchId: number;
        userId: number;
        amount: number;
      }): Promise<Result<LeadCandidate[], DomainError>> => Ok(candidates),
    };

    const result = await requestContactAssignmentRefill(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, runInTransaction: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(true);
    const reservations = repos.leadUsageReservations.rows;
    expect(reservations[0].status).toBe("committed");
    // No cancelled reservations
    expect(reservations.filter((r) => r.status === "cancelled")).toHaveLength(
      0,
    );
  });

  it("cancels reservation when gateway fails", async () => {
    const repos = makeRepos(0);
    const engine = {
      requestCandidates: async (_input: {
        branchId: number;
        userId: number;
        amount: number;
      }): Promise<Result<LeadCandidate[], DomainError>> =>
        Err(
          domainError(
            "external",
            "engine_request_failed",
            "service unavailable",
            {
              status: 503,
              request_id: "req-leads-1",
              engine_error: "service unavailable",
            },
          ),
        ),
    };

    const result = await requestContactAssignmentRefill(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, runInTransaction: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.details).toMatchObject({
        status: 503,
        request_id: "req-leads-1",
        engine_error: "service unavailable",
      });
    }
    const reservations = repos.leadUsageReservations.rows;
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("cancelled");
  });
});

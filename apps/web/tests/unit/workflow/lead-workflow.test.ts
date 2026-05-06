import {
  makeLeadCapacityGrantsRepo,
  makeLeadUsageCommitsRepo,
  makeLeadUsageReservationsRepo,
  makeNullLeadPolicyRepos,
} from "@tests/support/fakes/capacity";
import { describe, expect, it } from "vitest";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import type {
  AssignContactsTransactionRepos,
  AssignContactsTransactionRunner,
} from "~/server/contact-assignments/application/contact-assignment-writer";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { type RecordCandidate } from "~/server/shared/engine/record-contract";
import { Err, Ok, type Result } from "~/server/shared/result";

const USER_ID = 1;
const BRANCH_ID = 1;

function makeCandidate(n: number): RecordCandidate {
  return {
    ruc: `2010000000${n}`,
    organization_name: `Org ${n}`,
    dni: `7000000${n}`,
    person_name: `Person ${n}`,
    phone_primary: `+5199900000${n}`,
  };
}

function makeRepos(activeAssignments = 0) {
  let nextContactId = 1;
  return {
    users: {
      findById: async () => ({ teamId: null, branchId: BRANCH_ID }),
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
      findOrCreate: async (_ruc: string, _name: string) => ({
        id: "01974fd5-f261-7a7d-93f5-2f3d0f963001",
      }),
    },
    contacts: {
      findOrCreate: async (
        _orgId: string,
        _dni: string,
        _name: string,
        _phone: string,
      ): Promise<{ id: number; cooldown_until: number | null }> => ({
        id: nextContactId++,
        cooldown_until: null,
      }),
    },
  };
}

function makeTransaction(
  repos: AssignContactsTransactionRepos,
): AssignContactsTransactionRunner {
  return async <T>(op: (r: AssignContactsTransactionRepos) => Promise<T>) =>
    op(repos);
}

const emptyEngine = {
  requestCandidates: async (): Promise<
    Result<RecordCandidate[], DomainError>
  > => Ok([]),
};

describe("assignContacts", () => {
  it("returns 0 requested and 0 assigned when buffer is already full", async () => {
    // System default bufferTarget is read from config; we simulate full buffer
    // by setting activeAssignments to a large number.
    const repos = makeRepos(9999);
    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      {
        repos,
        runInTransaction: makeTransaction(repos),
        engine: emptyEngine,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const value = result.value;
    expect(value.requested).toBe(0);
    expect(value.assigned).toBe(0);
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
      const cooldown_until = contactCallCount === 1 ? null : 1_700_000_099_999;
      return { id: contactCallCount, cooldown_until };
    };

    const candidates: RecordCandidate[] = [
      makeCandidate(1),
      makeCandidate(2),
      makeCandidate(3),
    ];
    const engine = {
      requestCandidates: async (_input: {
        branchId: number;
        userId: number;
        amount: number;
      }): Promise<Result<RecordCandidate[], DomainError>> => Ok(candidates),
    };

    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, runInTransaction: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const value = result.value;
    expect(value.assigned).toBeLessThan(value.requested);

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
    const candidates: RecordCandidate[] = [makeCandidate(1)];
    const engine = {
      requestCandidates: async (_input: {
        branchId: number;
        userId: number;
        amount: number;
      }): Promise<Result<RecordCandidate[], DomainError>> => Ok(candidates),
    };

    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, runInTransaction: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
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
      }): Promise<Result<RecordCandidate[], DomainError>> =>
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

    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, runInTransaction: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.details).toMatchObject({
      status: 503,
      request_id: "req-leads-1",
      engine_error: "service unavailable",
    });
    const reservations = repos.leadUsageReservations.rows;
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("cancelled");
  });
});

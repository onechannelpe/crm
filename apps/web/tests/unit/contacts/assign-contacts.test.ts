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
  AssignContactsUow,
} from "~/server/contact-assignments/application/contact-assignment-writer";
import { external, type DomainError } from "~/server/shared/domain-error";
import { type RecordCandidate } from "~/server/shared/engine/record-contract";
import {
  asBranchId,
  asOrganizationId,
  asOrganizationPersonId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

const USER_ID = asUserId("1");
const BRANCH_ID: BranchId = asBranchId("1");
const EXHAUSTED_ACTIVE_ASSIGNMENTS = 9_999;

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
        id: asOrganizationId("01974fd5-f261-7a7d-93f5-2f3d0f963001"),
        ruc: _ruc,
        legal_name: null,
        giro_negocio: null,
        address: null,
        district: null,
        department: null,
        email: null,
        phone: null,
        province: null,
        created_at: new Date(),
      }),
    },
    contacts: {
      findOrCreate: async (
        orgId: ReturnType<typeof asOrganizationId>,
        dni: string,
        name: string,
        _phone: string | null,
      ) => ({
        id: asOrganizationPersonId(`contact-${nextContactId++}`),
        dni,
        organization_id: orgId,
        name,
        phone_primary: _phone,
        email: null,
        last_contacted_at: null,
        cooldown_until: null as Date | null,
      }),
    },
  };
}

function makeTransaction(
  repos: AssignContactsTransactionRepos,
): AssignContactsUow {
  return {
    run: async (work) => work(repos),
  };
}

const emptyEngine = {
  requestCandidates: async (): Promise<
    Result<RecordCandidate[], DomainError>
  > => Ok([]),
};

describe("assignContacts", () => {
  it("returns 0 requested and 0 assigned when buffer is already full", async () => {
    const repos = makeRepos(EXHAUSTED_ACTIVE_ASSIGNMENTS);
    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      {
        repos,
        uow: makeTransaction(repos),
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

    let contactCallCount = 0;
    repos.contacts.findOrCreate = async (
      orgId: ReturnType<typeof asOrganizationId>,
      dni: string,
      name: string,
      phone: string | null,
    ) => {
      contactCallCount++;
      const cooldown_until =
        contactCallCount === 1 ? null : new Date(1_700_000_099_999);
      return {
        id: asOrganizationPersonId(`contact-${contactCallCount}`),
        dni,
        organization_id: orgId,
        name,
        phone_primary: phone,
        email: null,
        last_contacted_at: null,
        cooldown_until,
      };
    };

    const candidates: RecordCandidate[] = [
      makeCandidate(1),
      makeCandidate(2),
      makeCandidate(3),
    ];
    const engine = {
      requestCandidates: async (_input: {
        branchId: BranchId;
        userId: UserId;
        amount: number;
      }): Promise<Result<RecordCandidate[], DomainError>> => Ok(candidates),
    };

    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, uow: makeTransaction(repos), engine },
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

    expect(committed + cancelled).toBe(reservations[0].amount);
  });

  it("commits full amount when all candidates are assigned", async () => {
    const repos = makeRepos(0);
    const candidates: RecordCandidate[] = [makeCandidate(1)];
    const engine = {
      requestCandidates: async (_input: {
        branchId: BranchId;
        userId: UserId;
        amount: number;
      }): Promise<Result<RecordCandidate[], DomainError>> => Ok(candidates),
    };

    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, uow: makeTransaction(repos), engine },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const reservations = repos.leadUsageReservations.rows;
    expect(reservations[0].status).toBe("committed");
    expect(reservations.filter((r) => r.status === "cancelled")).toHaveLength(
      0,
    );
  });

  it("cancels reservation when gateway fails", async () => {
    const repos = makeRepos(0);
    const engine = {
      requestCandidates: async (_input: {
        branchId: BranchId;
        userId: UserId;
        amount: number;
      }): Promise<Result<RecordCandidate[], DomainError>> =>
        Err(
          external("service unavailable", {
            code: "engine_request_failed",
            details: {
              status: 503,
              request_id: "req-leads-1",
              engine_error: "service unavailable",
            },
          }),
        ),
    };

    const result = await assignContacts(
      { actorUserId: USER_ID, branchId: BRANCH_ID },
      { repos, uow: makeTransaction(repos), engine },
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

  it("cancels reservation when assignment persistence throws", async () => {
    const repos = makeRepos(0);
    repos.contactAssignments.createMany = async () => {
      throw new Error("db write failed");
    };
    const engine = {
      requestCandidates: async (): Promise<
        Result<RecordCandidate[], DomainError>
      > => Ok([makeCandidate(1)]),
    };

    await expect(
      assignContacts(
        { actorUserId: USER_ID, branchId: BRANCH_ID },
        { repos, uow: makeTransaction(repos), engine },
      ),
    ).rejects.toThrow("db write failed");

    const reservations = repos.leadUsageReservations.rows;
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("cancelled");
  });
});

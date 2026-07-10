import {
  makeLeadCapacityGrantsRepo,
  makeLeadUsageReservationPorts,
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
import type { CadenceSnapshot } from "~/server/contact-assignments/infrastructure/cadence-repo";
import type {
  Membership,
  OrganizationProfile,
} from "~/server/organization/organization-repo";
import { external, type DomainError } from "~/server/shared/domain-error";
import { type RecordCandidate } from "~/server/shared/engine/record-contract";
import {
  asBranchId,
  asOrganizationId,
  asOrganizationPersonId,
  asPersonId,
  asUserId,
  type BranchId,
  type OrganizationId,
  type OrganizationPersonId,
  type UserId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

const USER_ID = asUserId("1");
const BRANCH_ID: BranchId = asBranchId("1");
const ORG_ID: OrganizationId = asOrganizationId(
  "01974fd5-f261-7a7d-93f5-2f3d0f963001",
);
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

function makeOrganizationProfile(ruc: string): OrganizationProfile {
  return {
    id: ORG_ID,
    ruc,
    legalName: null,
    lineOfBusiness: null,
    address: null,
    district: null,
    province: null,
    department: null,
    phone: null,
    email: null,
  };
}

function makeRepos(activeAssignments = 0) {
  let nextContactId = 1;
  const repos = {
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
    organization: {
      upsertOrganization: async (
        input: AssignContactsTransactionRepos["organization"]["upsertOrganization"] extends (
          arg: infer Arg,
        ) => unknown
          ? Arg
          : never,
      ) => makeOrganizationProfile(input.ruc),
      upsertMembership: async (
        input: AssignContactsTransactionRepos["organization"]["upsertMembership"] extends (
          arg: infer Arg,
        ) => unknown
          ? Arg
          : never,
      ): Promise<Membership> => {
        const id = asOrganizationPersonId(`contact-${nextContactId++}`);
        return {
          id,
          organizationId: input.organizationId,
          person: {
            id: asPersonId(`person-${input.person.dni}`),
            dni: input.person.dni,
            names: input.person.names,
            firstSurname: input.person.firstSurname,
            secondSurname: input.person.secondSurname,
            email: input.person.email,
            displayName: input.person.names,
          },
          phone: input.phone,
          email: input.email,
        };
      },
    },
    cadence: {
      findMany: async (
        _ids: OrganizationPersonId[],
      ): Promise<Map<OrganizationPersonId, CadenceSnapshot>> => new Map(),
    },
  };
  return {
    ...repos,
    leadUsageReservationPorts: makeLeadUsageReservationPorts(repos),
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
        leadUsageReservationPorts: repos.leadUsageReservationPorts,
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

    // The third membership returns a contact_cadence entry whose cooldown is in
    // the future, so the writer filters it out and the count of assigned is
    // strictly less than the count of requested.
    let cadenceCallCount = 0;
    const cooldownMembership = asOrganizationPersonId("contact-3");
    repos.cadence.findMany = async (ids: OrganizationPersonId[]) => {
      cadenceCallCount++;
      const map = new Map<OrganizationPersonId, CadenceSnapshot>();
      if (cadenceCallCount >= 2) {
        map.set(cooldownMembership, {
          organizationPersonId: cooldownMembership,
          lastContactedAt: null,
          cooldownUntil: new Date(1_700_000_099_999),
        });
      }
      for (const id of ids) {
        if (!map.has(id)) {
          map.set(id, {
            organizationPersonId: id,
            lastContactedAt: null,
            cooldownUntil: null,
          });
        }
      }
      return map;
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
      {
        repos,
        uow: makeTransaction(repos),
        engine,
        leadUsageReservationPorts: repos.leadUsageReservationPorts,
      },
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
      {
        repos,
        uow: makeTransaction(repos),
        engine,
        leadUsageReservationPorts: repos.leadUsageReservationPorts,
      },
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
      {
        repos,
        uow: makeTransaction(repos),
        engine,
        leadUsageReservationPorts: repos.leadUsageReservationPorts,
      },
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
        {
          repos,
          uow: makeTransaction(repos),
          engine,
          leadUsageReservationPorts: repos.leadUsageReservationPorts,
        },
      ),
    ).rejects.toThrow("db write failed");

    const reservations = repos.leadUsageReservations.rows;
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("cancelled");
  });
});

import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import { external, type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import type { RecordCandidate } from "~/server/shared/engine/record-contract";
import { Err, Ok, type Result } from "~/server/shared/result";
import { currentDailyPeriod } from "~/server/shared/time";

const ACTOR_ID = TEST_FIXTURES.users.execOne.id;
const BRANCH_ID = TEST_FIXTURES.branches.lima.id;
const BUFFER_TARGET = 10; // config.leadAssignment.defaultBufferTarget

function makeCandidate(seed: number): RecordCandidate {
  const n = String(seed).padStart(3, "0");
  return {
    ruc: `2099${n}0000${n}`,
    organization_name: `Org ${n}`,
    dni: `70${n}0000`,
    person_name: `Person ${n}`,
    phone_primary: `+51999${n}0000`,
  };
}

function engineReturning(
  candidates: RecordCandidate[],
): Pick<EngineClient, "requestCandidates"> {
  return { requestCandidates: async () => Ok(candidates) };
}

function engineFailing(): Pick<EngineClient, "requestCandidates"> {
  return {
    requestCandidates: async (): Promise<
      Result<RecordCandidate[], DomainError>
    > =>
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
}

function engineThrowing(
  message: string,
): Pick<EngineClient, "requestCandidates"> {
  return {
    requestCandidates: async () => {
      throw new Error(message);
    },
  };
}

describe("assignContacts", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("assign-contacts");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  async function runAssign(engine: Pick<EngineClient, "requestCandidates">) {
    const context = createContactAssignmentsContext({
      executor: ctx.db,
      engine,
    });
    return assignContacts(
      { actorUserId: ACTOR_ID, branchId: BRANCH_ID },
      {
        repos: context.repos,
        uow: context.uow,
        engine: context.engine,
        leadUsageReservationPorts: context.leadUsageReservationPorts,
      },
    );
  }

  it("stops requesting candidates once the buffer is full", async () => {
    const candidates = Array.from({ length: BUFFER_TARGET }, (_, i) =>
      makeCandidate(i + 1),
    );
    const fill = await runAssign(engineReturning(candidates));
    expect(fill.ok).toBe(true);
    if (!fill.ok) throw new Error("expected success");
    expect(fill.value).toEqual({
      requested: BUFFER_TARGET,
      assigned: BUFFER_TARGET,
    });

    let engineCalled = false;
    const result = await runAssign({
      requestCandidates: async () => {
        engineCalled = true;
        return Ok([]);
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.value).toEqual({ requested: 0, assigned: 0 });
    expect(engineCalled).toBe(false);

    const { date } = currentDailyPeriod(new Date());
    const reservations =
      await ctx.repos.leadUsageReservations.findByUserAndDate(ACTOR_ID, date);
    expect(reservations).toHaveLength(1);
  });

  it("skips a candidate on cooldown and only commits the assigned amount", async () => {
    const onCooldown = makeCandidate(1);
    const organization = await ctx.repos.organization.upsertOrganization({
      ruc: onCooldown.ruc,
      legalName: onCooldown.organization_name,
    });
    const membership = await ctx.repos.organization.upsertMembership({
      organizationId: organization.id,
      person: {
        dni: onCooldown.dni,
        names: onCooldown.person_name,
        firstSurname: null,
        secondSurname: null,
        email: null,
      },
      phone: onCooldown.phone_primary,
      email: null,
    });
    await ctx.repos.cadence.touch({
      organizationPersonId: membership.id,
      userId: ACTOR_ID,
      contactedAt: new Date(),
      cooldownUntil: new Date(Date.now() + 60 * 60 * 1000),
    });

    const candidates = [onCooldown, makeCandidate(2), makeCandidate(3)];
    const result = await runAssign(engineReturning(candidates));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    // requested is the buffer shortfall, not the candidate count.
    expect(result.value).toEqual({ requested: BUFFER_TARGET, assigned: 2 });

    const activeCount =
      await ctx.repos.contactAssignments.countActiveByUser(ACTOR_ID);
    expect(activeCount).toBe(2);

    const { date } = currentDailyPeriod(new Date());
    const [reservations, commits] = await Promise.all([
      ctx.repos.leadUsageReservations.findByUserAndDate(ACTOR_ID, date),
      ctx.repos.leadUsageCommits.findByUserAndDate(ACTOR_ID, date),
    ]);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({ amount: 2, status: "committed" });
    expect(commits).toHaveLength(1);
    expect(commits[0].amount).toBe(2);
  });

  it("commits the full amount when every candidate is assigned", async () => {
    const result = await runAssign(engineReturning([makeCandidate(1)]));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.value).toEqual({ requested: BUFFER_TARGET, assigned: 1 });

    const { date } = currentDailyPeriod(new Date());
    const reservations =
      await ctx.repos.leadUsageReservations.findByUserAndDate(ACTOR_ID, date);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({ amount: 1, status: "committed" });
  });

  it("cancels the reservation when the engine reports an error", async () => {
    const result = await runAssign(engineFailing());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.details).toMatchObject({
      status: 503,
      request_id: "req-leads-1",
    });

    const { date } = currentDailyPeriod(new Date());
    const reservations =
      await ctx.repos.leadUsageReservations.findByUserAndDate(ACTOR_ID, date);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("cancelled");
  });

  // A thrown engine call must cancel the reservation like any failure inside
  // the reservation callback.
  it("cancels the reservation and rethrows when a downstream step throws", async () => {
    await expect(
      runAssign(engineThrowing("engine connection lost")),
    ).rejects.toThrow("engine connection lost");

    const { date } = currentDailyPeriod(new Date());
    const reservations =
      await ctx.repos.leadUsageReservations.findByUserAndDate(ACTOR_ID, date);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("cancelled");
  });
});

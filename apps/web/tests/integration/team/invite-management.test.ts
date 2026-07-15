import { expectOk } from "@tests/support/_core/assertions";
import { createInviteTestKit } from "@tests/support/invite/api";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { AppContext } from "~/server/platform/action/context";
import { getInviteManagement } from "~/server/team/application/invites";
import { createInviteManagementContext } from "~/server/team/infrastructure/invite-management-context";

const HR_BRANCH_ID = TEST_FIXTURES.branches.lima.id;
const OTHER_BRANCH_ID = TEST_FIXTURES.branches.norte.id;
const NOW = new Date("2026-07-15T12:00:00.000Z");

function makeHrContext(): AppContext {
  return {
    actor: {
      id: "hr-session",
      userId: TEST_FIXTURES.users.backOne.id,
      role: "hr",
      branchId: HR_BRANCH_ID,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
      impersonatorUserId: null,
    },
    requestId: "req-test",
    traceId: "trace-test",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost:3000",
    now: () => NOW,
  };
}

async function seedTeam(ctx: TestDbContext, branchId: string, name: string) {
  const row = await ctx.db
    .insertInto("teams")
    .values({ branch_id: branchId, name, created_at: NOW })
    .returning(["id", "name"])
    .executeTakeFirstOrThrow();
  return row;
}

describe("getInviteManagement", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("invite-management");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("scopes teams and pending invites to the actor's branch", async () => {
    const [ownTeam] = await Promise.all([
      seedTeam(ctx, HR_BRANCH_ID, "Operaciones"),
      seedTeam(ctx, OTHER_BRANCH_ID, "Otro Equipo"),
    ]);

    const kit = createInviteTestKit(ctx, { now: () => NOW });
    const ownInvite = expectOk(
      await kit.commands.create({
        actorUserId: TEST_FIXTURES.users.superUser.id,
        actorRole: "superuser",
        branchId: HR_BRANCH_ID,
        names: "Pending",
        firstSurname: "User",
        secondSurname: "Lima",
        email: "pending-lima@test.local",
        role: "executive",
        executiveCategory: "elite",
        teamId: null,
      }),
    );
    await kit.commands.create({
      actorUserId: TEST_FIXTURES.users.superUser.id,
      actorRole: "superuser",
      branchId: OTHER_BRANCH_ID,
      names: "Pending",
      firstSurname: "User",
      secondSurname: "Norte",
      email: "pending-norte@test.local",
      role: "executive",
      executiveCategory: "elite",
      teamId: null,
    });

    const result = await getInviteManagement(
      makeHrContext(),
      createInviteManagementContext(ctx.db),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    const value = result.value;

    expect(value.teams).toEqual([{ id: ownTeam.id, name: ownTeam.name }]);
    expect(value.pendingInvites).toHaveLength(1);
    expect(value.pendingInvites[0]).toMatchObject({
      inviteId: ownInvite.inviteId,
      email: "pending-lima@test.local",
    });
    expect(value.assignableRoles.length).toBeGreaterThan(0);
  });
});

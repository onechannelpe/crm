import { afterEach, describe, expect, it } from "vitest";

import { createInviteTestKit } from "../support/invite-test-kit";
import type { TestDbContext } from "../support/test-db";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("user invite lifecycle", () => {
  let ctx: TestDbContext | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("creates and accepts an invite for a new user", async () => {
    ctx = await createIsolatedTestDb("user-invites");
    const kit = createInviteTestKit(ctx, {
      now: () => 1_700_000_000_000,
    });

    const created = await kit.commands.create({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      names: "Nueva",
      firstSurname: "Ejecutiva",
      secondSurname: "Garcia",
      email: "nueva-ejecutiva@test.local",
      role: "executive",
      executiveCategory: "elite",
      teamId: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const accepted = await kit.commands.accept({
      token: created.value.token,
      password: "StrongPass123",
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    expect(await kit.expect.userActive(accepted.value.userId)).toBe(1);
    expect(await kit.expect.inviteStatus(created.value.inviteId)).toBe(
      "accepted",
    );
  });

  it("can revoke a pending invite", async () => {
    ctx = await createIsolatedTestDb("user-invites-revoke");
    const kit = createInviteTestKit(ctx, {
      now: () => 1_700_000_000_000,
    });

    const created = await kit.commands.create({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      names: "Nuevo",
      firstSurname: "Analista",
      secondSurname: "Lopez",
      email: "nuevo-analista@test.local",
      role: "back_office",
      teamId: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const revoked = await kit.commands.revoke({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      inviteId: created.value.inviteId,
    });
    expect(revoked.ok).toBe(true);

    expect(await kit.expect.inviteStatus(created.value.inviteId)).toBe(
      "revoked",
    );
  });

  it("handles raced user creation without escaping the Result contract", async () => {
    ctx = await createIsolatedTestDb("user-invites-race");
    let shouldSimulateRace = true;
    const baseUsersRepo = ctx.repos.users;
    type CreateUserInput = Parameters<typeof baseUsersRepo.create>[0];

    const reposWithRace = {
      ...ctx.repos,
      users: {
        ...baseUsersRepo,
        async create(values: CreateUserInput): Promise<number> {
          if (!shouldSimulateRace) {
            return baseUsersRepo.create(values);
          }
          shouldSimulateRace = false;
          const racedUserId = await baseUsersRepo.create(values);
          await baseUsersRepo.updateInviteProvisioning(racedUserId, {
            team_id: null,
            names: values.names,
            first_surname: values.first_surname,
            second_surname: values.second_surname,
            role: values.role,
            is_active: 0,
          });
          throw new Error(
            "SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: users.email",
          );
        },
      },
    };

    const service = createInviteTestKit(
      {
        ...ctx,
        repos: reposWithRace,
      },
      {
        now: () => 1_700_000_000_000,
      },
    ).service;

    const created = await service.createInvite({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      names: "Race",
      firstSurname: "User",
      secondSurname: "Test",
      email: "race-user@test.local",
      role: "executive",
      executiveCategory: "elite",
      teamId: null,
    });

    expect(created.ok).toBe(true);
    expect(shouldSimulateRace).toBe(false);
  });
});

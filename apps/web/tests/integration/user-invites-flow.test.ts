import { afterEach, describe, expect, it } from "vitest";

import { createInviteService } from "../../src/server/invites/application/invite-service";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("user invite lifecycle", () => {
  let ctx: Awaited<ReturnType<typeof createIsolatedTestDb>> | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("creates and accepts an invite for a new user", async () => {
    ctx = await createIsolatedTestDb("user-invites");
    const service = createInviteService(ctx.repos, {
      now: () => 1_700_000_000_000,
    });

    const created = await service.createInvite({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      names: "Nueva",
      firstSurname: "Ejecutiva",
      secondSurname: "Garcia",
      email: "nueva-ejecutiva@test.local",
      role: "executive",
      teamId: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const accepted = await service.acceptInvite({
      token: created.value.token,
      password: "StrongPass123",
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const user = await ctx.repos.users.findById(accepted.value.userId);
    expect(user?.is_active).toBe(1);

    const invite = await ctx.repos.userInvites.findById(created.value.inviteId);
    expect(invite?.status).toBe("accepted");
  });

  it("can revoke a pending invite", async () => {
    ctx = await createIsolatedTestDb("user-invites-revoke");
    const service = createInviteService(ctx.repos, {
      now: () => 1_700_000_000_000,
    });

    const created = await service.createInvite({
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

    const revoked = await service.revokeInvite({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      inviteId: created.value.inviteId,
    });
    expect(revoked.ok).toBe(true);

    const invite = await ctx.repos.userInvites.findById(created.value.inviteId);
    expect(invite?.status).toBe("revoked");
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

    const service = createInviteService(reposWithRace, {
      now: () => 1_700_000_000_000,
    });

    const created = await service.createInvite({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      names: "Race",
      firstSurname: "User",
      secondSurname: "Test",
      email: "race-user@test.local",
      role: "executive",
      teamId: null,
    });

    expect(created.ok).toBe(true);
    expect(shouldSimulateRace).toBe(false);
  });
});

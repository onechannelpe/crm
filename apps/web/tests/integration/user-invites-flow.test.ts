import { afterEach, describe, expect, it } from "vitest";

import { hashPassword } from "../../src/lib/auth/password/password";
import { createUserProvisioningService } from "../../src/server/users/service-user-provisioning";
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
    const service = createUserProvisioningService(ctx.repos, {
      now: () => 1_700_000_000_000,
    });

    const created = await service.createInvite({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      fullName: "Nueva Ejecutiva",
      email: "nueva-ejecutiva@test.local",
      role: "executive",
      teamId: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const accepted = await service.acceptInvite({
      token: created.value.token,
      fullName: "Nueva Ejecutiva",
      passwordHash: await hashPassword("StrongPass123"),
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
    const service = createUserProvisioningService(ctx.repos, {
      now: () => 1_700_000_000_000,
    });

    const created = await service.createInvite({
      actorUserId: 5,
      actorRole: "superuser",
      branchId: 2,
      fullName: "Nuevo Analista",
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
});

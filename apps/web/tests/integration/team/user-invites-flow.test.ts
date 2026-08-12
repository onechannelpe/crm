import { expectOk } from "@tests/support/_core/assertions";
import { createInviteTestKit } from "@tests/support/invite/api";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { createTestRepositories } from "@tests/support/runtime/repos";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const NOW = new Date(1_700_000_000_000);

describe("user invite lifecycle", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("user-invites-flow");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("creates and accepts an invite for a new user", async () => {
    const kit = createInviteTestKit(ctx, {
      now: () => NOW,
    });

    const created = expectOk(
      await kit.commands.create({
        actorUserId: TEST_FIXTURES.users.superUser.id,
        actorRole: "superuser",
        branchId: TEST_FIXTURES.branches.norte.id,
        names: "Nueva",
        firstSurname: "Ejecutiva",
        secondSurname: "Garcia",
        email: "nueva-ejecutiva@test.local",
        role: "executive",
        executiveCategory: "elite",
        teamId: null,
      }),
    );

    const accepted = expectOk(
      await kit.commands.accept({
        token: created.token,
        password: "StrongPass123",
      }),
    );

    expect(await kit.expect.userActive(accepted.userId)).toBe(true);
    expect(await kit.expect.inviteStatus(created.inviteId)).toBe("accepted");
  });

  it("can revoke a pending invite", async () => {
    const kit = createInviteTestKit(ctx, {
      now: () => NOW,
    });

    const created = expectOk(
      await kit.commands.create({
        actorUserId: TEST_FIXTURES.users.superUser.id,
        actorRole: "superuser",
        branchId: TEST_FIXTURES.branches.norte.id,
        names: "Nuevo",
        firstSurname: "Analista",
        secondSurname: "Lopez",
        email: "nuevo-analista@test.local",
        role: "back_office",
        teamId: null,
      }),
    );

    expectOk(
      await kit.commands.revoke({
        actorUserId: TEST_FIXTURES.users.superUser.id,
        actorRole: "superuser",
        branchId: TEST_FIXTURES.branches.norte.id,
        inviteId: created.inviteId,
      }),
    );

    expect(await kit.expect.inviteStatus(created.inviteId)).toBe("revoked");
  });

  it("recovers the invite when a concurrent insert wins the email race", async () => {
    let raceTriggered = false;

    const kit = createInviteTestKit(ctx, {
      now: () => NOW,
      createRepos(db) {
        const repos = createTestRepositories(db);

        return {
          ...repos,
          users: {
            ...repos.users,
            async create(values) {
              if (!raceTriggered) {
                raceTriggered = true;

                // Insert through the outer connection so this transaction loses
                // the real unique-email race.
                await ctx.repos.users.create({
                  ...values,
                  username: `competitor.${values.username}`,
                });
              }

              return repos.users.create(values);
            },
          },
        };
      },
    });

    const created = expectOk(
      await kit.commands.create({
        actorUserId: TEST_FIXTURES.users.superUser.id,
        actorRole: "superuser",
        branchId: TEST_FIXTURES.branches.norte.id,
        names: "Race",
        firstSurname: "User",
        secondSurname: "Test",
        email: "race-user@test.local",
        role: "executive",
        executiveCategory: "elite",
        teamId: null,
      }),
    );

    expect(raceTriggered).toBe(true);

    const racedUser = await ctx.repos.users.findByEmail("race-user@test.local");

    expect(racedUser?.is_active).toBe(false);
    expect(racedUser?.branch_id).toBe(TEST_FIXTURES.branches.norte.id);

    const rows = await ctx.db
      .selectFrom("users")
      .select("id")
      .where("email", "=", "race-user@test.local")
      .execute();

    expect(rows).toHaveLength(1);

    const invite = await ctx.repos.userInvites.findById(created.inviteId);

    expect(invite?.status).toBe("pending");
    expect(invite?.user_id).toBe(racedUser?.id);
  });
});

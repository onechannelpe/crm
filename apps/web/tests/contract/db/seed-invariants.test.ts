import { operationAt } from "@tests/support/operation";
import {
  cleanupFreshDb,
  createFreshDb,
  type FreshDbContext,
} from "@tests/support/runtime/db";
import { createTestRepositories } from "@tests/support/runtime/repos";
import { afterEach, describe, expect, it } from "vitest";

import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import { createAuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { verifyPassword } from "~/server/auth/password/password";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { getStrongAuthStatus } from "~/server/auth/security/strong-auth-status";
import { migrateToLatest } from "~/server/platform/database/migrate";
import { seedIfEmpty } from "~/server/platform/database/seed";
import { isErr } from "~/shared/result";

describe("seed invariants", () => {
  let ctx: FreshDbContext | null = null;

  afterEach(async () => {
    await cleanupFreshDb(ctx);
    ctx = null;
  });

  it("provisions installation accounts and repeatable development fixtures", async () => {
    ctx = await createFreshDb("seed-invariants");

    await migrateToLatest(ctx.db);
    await seedIfEmpty(ctx.db);
    await seedIfEmpty(ctx.db);

    const repos = createTestRepositories(ctx.db);
    const valeria = await repos.users.findByUsername("valeria.paredes");
    const manager = await repos.users.findByUsername("roberto.quispe");
    const installationAdmin = await repos.users.findByUsername("david.duran");

    if (!valeria) {
      throw new Error("valeria not found in seed");
    }

    if (!manager) {
      throw new Error("manager not found in seed");
    }

    if (!installationAdmin) {
      throw new Error("installation administrator not found in seed");
    }

    expect(valeria.onboarding_completed_at).toBeNull();
    expect(valeria.password_change_required).toBe(false);
    expect(requiresStrongAuthRole(valeria.role)).toBe(true);
    expect(installationAdmin.password_change_required).toBe(true);

    const setup = createAuthSetupContext(ctx.db);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);

    await Promise.all(
      ["current-installation-session", "stale-installation-session"].map((id) =>
        setup.repos.sessions.create({
          id,
          user_id: installationAdmin.id,
          branch_id: installationAdmin.branch_id,
          role: installationAdmin.role,
          session_class: "pre_auth",
          primary_auth_method: "password",
          strong_auth_method: null,
          strong_auth_at: null,
          impersonator_user_id: null,
          ip_address: "127.0.0.1",
          user_agent: "seed-invariant-test",
          created_at: now,
          last_activity: now,
          expires_at: expiresAt,
        }),
      ),
    );

    const passwordChanged = await changeInstallationPassword(
      setup,
      {
        userId: installationAdmin.id,
        password: "new-installation-password",
        confirmPassword: "new-installation-password",
      },
      operationAt(now),
    );

    if (isErr(passwordChanged)) {
      throw new Error(passwordChanged.error.code ?? "");
    }

    const updatedAdmin = await repos.users.findById(installationAdmin.id);

    if (!updatedAdmin) {
      throw new Error(
        "installation administrator missing after password change",
      );
    }

    expect(updatedAdmin.password_change_required).toBe(false);

    const remainingSessions = await setup.repos.sessions.listForUser(
      installationAdmin.id,
    );

    expect(remainingSessions).toHaveLength(0);
    expect(
      await verifyPassword(
        updatedAdmin.password_hash,
        "new-installation-password",
      ),
    ).toBe(true);

    const valeriaStatus = await getStrongAuthStatus(valeria.id, repos);

    expect(valeriaStatus.hasVerifiedStrongAuth).toBe(false);
    expect(valeriaStatus.hasTotp).toBe(false);
    expect(valeriaStatus.hasPasskey).toBe(false);

    const managerStatus = await getStrongAuthStatus(manager.id, repos);

    expect(managerStatus.hasVerifiedStrongAuth).toBe(true);
    expect(managerStatus.hasTotp).toBe(true);
  }, 20_000);
});

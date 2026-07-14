import {
  cleanupFreshDb,
  createFreshDb,
  type FreshDbContext,
} from "@tests/support/runtime/db";
import { createTestRepositories } from "@tests/support/runtime/repos";
import { afterEach, describe, expect, it } from "vitest";

import { verifyPassword } from "~/lib/auth/password/password";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { migrateToLatest } from "~/lib/db/migrate";
import { seedIfEmpty } from "~/lib/db/seed";
import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import { createAuthOnboardingContext } from "~/server/auth/infrastructure/onboarding-context";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { isErr } from "~/server/shared/result";

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

    expect(valeria?.onboarding_completed_at).toBeNull();
    expect(valeria?.password_change_required).toBe(false);
    expect(valeria && requiresStrongAuthRole(valeria.role)).toBe(true);
    expect(installationAdmin?.password_change_required).toBe(true);

    if (installationAdmin == null) {
      throw new Error("installation administrator not found in seed");
    }
    const onboarding = createAuthOnboardingContext(ctx.db);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    for (const id of [
      "current-installation-session",
      "stale-installation-session",
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await onboarding.repos.sessions.create({
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
      });
    }
    const passwordChanged = await changeInstallationPassword(onboarding, {
      userId: installationAdmin.id,
      currentSessionId: "current-installation-session",
      password: "new-installation-password",
      confirmPassword: "new-installation-password",
      now: new Date(),
    });
    if (isErr(passwordChanged))
      throw new Error(passwordChanged.error.code ?? "");

    const updatedAdmin = await repos.users.findById(installationAdmin.id);
    expect(updatedAdmin?.password_change_required).toBe(false);
    const remainingSessions = await onboarding.repos.sessions.listForUser(
      installationAdmin.id,
    );
    expect(remainingSessions.map((session) => session.id)).toEqual([
      "current-installation-session",
    ]);
    expect(
      updatedAdmin &&
        (await verifyPassword(
          updatedAdmin.password_hash,
          "new-installation-password",
        )),
    ).toBe(true);

    if (valeria == null) throw new Error("valeria not found in seed");
    const valeriaStatus = await getStrongAuthStatus(valeria.id, repos);
    expect(valeriaStatus.hasVerifiedStrongAuth).toBe(false);
    expect(valeriaStatus.hasTotp).toBe(false);
    expect(valeriaStatus.hasPasskey).toBe(false);

    if (manager == null) throw new Error("manager not found in seed");
    const managerStatus = await getStrongAuthStatus(manager.id, repos);
    expect(managerStatus.hasVerifiedStrongAuth).toBe(true);
    expect(managerStatus.hasTotp).toBe(true);
  });
});

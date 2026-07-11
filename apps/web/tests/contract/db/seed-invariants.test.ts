import {
  cleanupFreshDb,
  createFreshDb,
  type FreshDbContext,
} from "@tests/support/runtime/db";
import { createTestRepositories } from "@tests/support/runtime/repos";
import { afterEach, describe, expect, it } from "vitest";

import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { migrateToLatest } from "~/lib/db/migrate";
import { seedIfEmpty } from "~/lib/db/seed";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";

describe("seed invariants", () => {
  let ctx: FreshDbContext | null = null;

  afterEach(async () => {
    await cleanupFreshDb(ctx);
    ctx = null;
  });

  it("keeps invited privileged users without verified strong factors", async () => {
    ctx = await createFreshDb("seed-invariants");
    await migrateToLatest(ctx.db);
    await seedIfEmpty(ctx.db);

    const repos = createTestRepositories(ctx.db);
    const valeria = await repos.users.findByUsername("valeria.paredes");
    const manager = await repos.users.findByUsername("roberto.quispe");

    expect(valeria?.onboarding_completed_at).toBeNull();
    expect(valeria && requiresStrongAuthRole(valeria.role)).toBe(true);

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

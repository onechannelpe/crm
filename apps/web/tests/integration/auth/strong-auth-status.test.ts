import { createAuthScenario } from "@tests/support/auth/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";

describe("strong auth status", () => {
  const scenario = createAuthScenario("strong-auth-status");

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("derives verified strong auth from a configured passkey", async () => {
    await scenario.enablePasskey("superuser", "pk-status-user-5");

    const status = await getStrongAuthStatus(scenario.identity("superuser").userId, scenario.ctx.repos);

    expect(status.hasPasskey).toBe(true);
    expect(status.passkeyCount).toBe(1);
    expect(status.hasTotp).toBe(false);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });

  it("derives verified strong auth from an enabled totp factor", async () => {
    await scenario.enableTotp("superuser");

    const status = await getStrongAuthStatus(scenario.identity("superuser").userId, scenario.ctx.repos);

    expect(status.hasTotp).toBe(true);
    expect(status.hasPasskey).toBe(false);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });

  it("does not lose strong factors when a user role is downgraded", async () => {
    const identity = scenario.identity("superuser");
    await scenario.enableTotp("superuser");
    await scenario.enablePasskey("superuser", "pk-status-downgrade-user-5");

    await scenario.ctx.repos.users.updateInviteProvisioning(identity.userId, {
      team_id: null,
      names: "Super",
      first_surname: "User",
      second_surname: "Test",
      role: "executive",
      is_active: 1,
    });

    const status = await getStrongAuthStatus(identity.userId, scenario.ctx.repos);

    expect(status.hasTotp).toBe(true);
    expect(status.hasPasskey).toBe(true);
    expect(status.passkeyCount).toBe(1);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });
});

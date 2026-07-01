import { createAuthScenario } from "@tests/support/auth/scenario";
import { createTestPasskeyProvider } from "@tests/support/passkey/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { createPasskeyLoginStartAuthService } from "~/server/auth/factors/passkey/service";
import { asAuthLoginFlowId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

describe("login flow service", () => {
  const scenario = createAuthScenario("login-flow");

  beforeAll(async () => {
    await scenario.setup();
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
    await scenario.setPassword("execOne", "Secret123!");
    await scenario.setPassword("superuser", "SuperSecret123!");
  });

  it("completes a standard password login without creating a flow", async () => {
    const result = await scenario.loginPassword("execOne", "Secret123!", {
      ipAddress: "198.51.100.44",
      userAgent: "vitest-agent",
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) throw new Error("expected successful password login");
    expect(result.value.kind).toBe("complete");
    const persisted = await scenario.ctx.db
      .selectFrom("login_flows")
      .select("id")
      .executeTakeFirst();
    expect(persisted).toBeUndefined();
  });

  it("creates a server-owned totp flow only when password login needs strong auth", async () => {
    await scenario.enableTotp("superuser");

    const passwordResult = await scenario.loginPassword(
      "superuser",
      "SuperSecret123!",
      {
        ipAddress: "198.51.100.88",
        userAgent: "vitest-agent",
      },
    );

    expect(isErr(passwordResult)).toBe(false);
    if (
      isErr(passwordResult) ||
      passwordResult.value.kind !== "totp_required"
    ) {
      throw new Error("expected totp_required");
    }

    const user = scenario.identity("superuser");
    const flowId = asAuthLoginFlowId(passwordResult.value.flow.id);
    const stored = await scenario.ctx.repos.loginFlows.findById(flowId);
    expect(stored?.state).toBe("totp");
    expect(stored?.user_id).toBe(user.userId);

    const code = await scenario.currentTotpCode("superuser");
    const totpResult = await scenario.loginTotp(flowId, code, {
      ipAddress: "198.51.100.88",
      userAgent: "vitest-agent",
    });

    expect(isErr(totpResult)).toBe(false);
    const consumed = await scenario.ctx.repos.loginFlows.findById(flowId);
    expect(consumed).toBeUndefined();
  });

  it("creates a server-owned passkey flow with reusable request options", async () => {
    await scenario.enablePasskey("execOne", "pk-login-flow");

    const result = await createPasskeyLoginStartAuthService(
      scenario.ctx.repos,
      {
        webauthnProvider: createTestPasskeyProvider(scenario.ctx.repos),
      },
    ).beginLogin({
      identifier: "exec.one",
      ipAddress: "198.51.100.55",
      mode: "identified",
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) throw new Error("expected passkey flow");

    const flow = await getLoginFlowState(
      asAuthLoginFlowId(result.value.id),
      scenario.ctx.repos,
      createTestPasskeyProvider(scenario.ctx.repos),
    );
    expect(flow?.state).toBe("passkey");
    if (!flow || flow.state !== "passkey")
      throw new Error("expected passkey state");
    expect(flow.requestOptions.allowCredentials).toHaveLength(1);
    expect(flow.requestOptions.rpId).toBe(result.value.requestOptions.rpId);
    expect(flow.requestOptions.challenge).toBe(
      result.value.requestOptions.challenge,
    );
  });

  it("throws when password login cannot create the required passkey flow", async () => {
    await scenario.enablePasskey("superuser", "pk-login-required-failure");

    await expect(
      scenario.loginPassword(
        "superuser",
        "SuperSecret123!",
        { ipAddress: "198.51.100.77", userAgent: "vitest-agent" },
        {
          ...scenario.ctx.repos,
          loginFlows: {
            ...scenario.ctx.repos.loginFlows,
            async create() {
              throw new Error("boom");
            },
          },
        },
      ),
    ).rejects.toThrow("boom");
  });
});

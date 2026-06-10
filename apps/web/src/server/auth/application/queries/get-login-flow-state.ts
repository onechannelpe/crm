import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { createPasskeyProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyLoginStateService } from "~/server/auth/factors/passkey/service/login-state";
import type { AuthLoginDeps } from "~/server/auth/flows/login-deps";

import type { LoginFlowState } from "../contracts";

export async function getLoginFlowState(
  flowId: number,
  deps: AuthLoginDeps,
): Promise<LoginFlowState | null> {
  const flow = await deps.loginFlows.findById(flowId);

  if (!flow) {
    return null;
  }

  if (flow.expires_at < Date.now()) {
    await deleteLoginFlow(flow, deps);
    return null;
  }

  switch (flow.state) {
    case "totp":
      return {
        id: flow.id,
        identifier: flow.identifier,
        state: "totp",
      };

    case "passkey":
      return createPasskeyLoginStateService(deps, {
        webauthnService: createPasskeyProvider(deps),
      }).hydrateLoginFlow(flow);

    default:
      await deleteLoginFlow(flow, deps);
      return null;
  }
}

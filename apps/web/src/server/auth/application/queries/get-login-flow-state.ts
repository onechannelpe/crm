import { assertPositiveInt } from "~/contracts/guards";
import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { createPasskeyProvider } from "~/lib/auth/providers/passkey-provider";
import type { AuthLoginDeps } from "~/server/auth/application/login-deps";
import { createPasskeyLoginStateService } from "~/server/auth/passkey/service/login-state";

import type { LoginFlowState } from "../contracts";

async function readActiveLoginFlow(
  flowId: number,
  deps: AuthLoginDeps,
): Promise<LoginFlowState | null> {
  const safeFlowId = assertPositiveInt(flowId, "flowId");
  const flow = await deps.loginFlows.findById(safeFlowId);

  if (!flow) return null;
  if (flow.expires_at < Date.now()) {
    await deleteLoginFlow(flow, deps);
    return null;
  }

  if (flow.state === "totp") {
    return {
      id: flow.id,
      identifier: flow.identifier,
      state: "totp",
    };
  }

  if (flow.state === "passkey") {
    return createPasskeyLoginStateService(deps, {
      webauthnService: createPasskeyProvider(deps),
    }).hydrateLoginFlow(flow);
  }

  await deleteLoginFlow(flow, deps);
  return null;
}

export async function getLoginFlowState(
  flowId: number,
  deps: AuthLoginDeps,
): Promise<LoginFlowState | null> {
  return readActiveLoginFlow(flowId, deps);
}

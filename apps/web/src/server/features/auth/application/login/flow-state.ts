import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { createPasskeyLoginStateService } from "~/lib/auth/passkey/service/login-state";
import { createPasskeyProvider } from "~/lib/auth/providers/passkey-provider";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { AuthLoginRepos } from "~/server/auth/infrastructure/login-context";

import type { LoginFlowState } from "./types";

async function readActiveLoginFlow(
  flowId: number,
  deps: AuthLoginRepos,
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
  deps: AuthLoginRepos,
): Promise<LoginFlowState | null> {
  return readActiveLoginFlow(flowId, deps);
}

import type { AuthLoginFlowId } from "~/domain/ids";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyLoginStateService } from "~/server/auth/factors/passkey/service/login-state";
import type { AuthLoginRepos } from "~/server/auth/flows/login-deps";
import { deleteLoginFlow } from "~/server/auth/login-flow/shared";
import type { OperationContext } from "~/server/platform/operation/context";

import type { LoginFlowState } from "../login-contracts";

export async function getLoginFlowState(
  flowId: AuthLoginFlowId,
  deps: Pick<AuthLoginRepos, "loginFlows" | "passkeys" | "webauthnChallenges">,
  webauthnProvider: WebauthnProvider,
  operation: OperationContext,
): Promise<LoginFlowState | null> {
  const flow = await deps.loginFlows.findById(flowId);

  if (!flow) {
    return null;
  }

  if (flow.expires_at < operation.operationAt) {
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
        webauthnProvider,
      }).hydrateLoginFlow(flow, operation.operationAt);

    default:
      await deleteLoginFlow(flow, deps);
      return null;
  }
}

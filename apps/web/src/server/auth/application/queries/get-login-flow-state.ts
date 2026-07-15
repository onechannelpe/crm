import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyLoginStateService } from "~/server/auth/factors/passkey/service/login-state";
import type { AuthLoginRepos } from "~/server/auth/flows/login-deps";
import type { AuthLoginFlowId } from "~/server/shared/ids";

import type { LoginFlowState } from "../login-contracts";

export async function getLoginFlowState(
  flowId: AuthLoginFlowId,
  deps: Pick<
    AuthLoginRepos,
    "events" | "loginFlows" | "passkeys" | "webauthnChallenges"
  >,
  webauthnProvider: WebauthnProvider,
): Promise<LoginFlowState | null> {
  const flow = await deps.loginFlows.findById(flowId);

  if (!flow) {
    return null;
  }

  if (flow.expires_at < new Date()) {
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
      }).hydrateLoginFlow(flow);

    default:
      await deleteLoginFlow(flow, deps);
      return null;
  }
}

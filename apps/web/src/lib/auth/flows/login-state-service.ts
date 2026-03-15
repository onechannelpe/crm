import { config } from "~/lib/config";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";

import { deleteLoginFlow } from "../login-flow/shared";
import { createPasskeyLoginStateService } from "../passkey/service/login-state";
import { createPasskeyProvider } from "../providers/passkey-provider";
import type { LoginFlowState, TotpLoginFlowState } from "./login-types";

type LoginStateDeps = Pick<
  Repositories,
  "loginFlows" | "passkeys" | "webauthnChallenges" | "users" | "auditLogs"
>;

async function readActiveLoginFlow(
  flowId: number,
  deps: LoginStateDeps,
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
  deps: LoginStateDeps,
): Promise<LoginFlowState | null> {
  return readActiveLoginFlow(flowId, deps);
}

export async function createTotpLoginFlow(
  identifier: string,
  userId: number,
  primaryAuthMethod: "password" | "google" | "passkey",
  deps: Pick<Repositories, "loginFlows">,
): Promise<TotpLoginFlowState> {
  const flowId = await deps.loginFlows.create({
    identifier,
    primary_auth_method: primaryAuthMethod,
    user_id: userId,
    challenge_id: null,
    state: "totp",
    expires_at: Date.now() + config.auth.loginFlowTtlMs,
  });

  return {
    id: flowId,
    identifier,
    state: "totp",
  };
}

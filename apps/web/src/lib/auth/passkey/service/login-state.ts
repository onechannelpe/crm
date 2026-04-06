import type { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import { deleteLoginFlow } from "../../login-flow/shared";
import type { PasskeyLoginFlowState } from "./types";

type PasskeyLoginStateRepos = {
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
};

type PasskeyFlowRecord = Awaited<
  ReturnType<PasskeyLoginStateRepos["loginFlows"]["findById"]>
>;

interface PasskeyLoginStateServiceDeps {
  webauthnService: {
    getAuthenticationOptionsForChallenge(input: {
      userId: number;
      challenge: string;
      userVerification: "preferred" | "required";
    }): Promise<PasskeyLoginFlowState["requestOptions"]>;
  };
}

export function createPasskeyLoginStateService(
  repos: PasskeyLoginStateRepos,
  deps: PasskeyLoginStateServiceDeps,
) {
  async function hydrateLoginFlow(
    flow: PasskeyFlowRecord,
  ): Promise<PasskeyLoginFlowState | null> {
    if (
      !flow ||
      flow.state !== "passkey" ||
      !flow.user_id ||
      !flow.challenge_id
    ) {
      await deleteLoginFlow(flow, repos);
      return null;
    }

    if (flow.expires_at < Date.now()) {
      await deleteLoginFlow(flow, repos);
      return null;
    }

    const challenge = await repos.webauthnChallenges.findById(
      flow.challenge_id,
    );
    if (
      !challenge ||
      challenge.type !== "authentication" ||
      challenge.user_id !== flow.user_id ||
      challenge.expires_at < Date.now()
    ) {
      await deleteLoginFlow(flow, repos);
      return null;
    }

    return {
      id: flow.id,
      identifier: flow.identifier,
      mode: "identified",
      state: "passkey",
      requestOptions:
        await deps.webauthnService.getAuthenticationOptionsForChallenge({
          userId: flow.user_id,
          challenge: challenge.challenge,
          userVerification: "preferred",
        }),
    };
  }

  return {
    hydrateLoginFlow,
  };
}

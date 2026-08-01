import type { PasskeyLoginFlowState } from "~/domain/auth/passkey/types";
import type { UserId } from "~/domain/ids";
import { deleteLoginFlow } from "~/server/auth/login-flow/shared";
import type { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { createEventsRepo } from "~/server/event-logs/events-repo";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

type PasskeyLoginStateRepos = {
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  events: ReturnType<typeof createEventsRepo>;
};

type PasskeyFlowRecord = Awaited<
  ReturnType<PasskeyLoginStateRepos["loginFlows"]["findById"]>
>;

interface PasskeyLoginStateServiceDeps {
  webauthnProvider: {
    getAuthenticationOptionsForChallenge(input: {
      userId: UserId;
      challenge: string;
    }): Promise<PasskeyLoginFlowState["requestOptions"]>;
  };
}

export function createPasskeyLoginStateService(
  repos: PasskeyLoginStateRepos,
  deps: PasskeyLoginStateServiceDeps,
) {
  async function hydrateLoginFlow(
    flow: PasskeyFlowRecord,
    asOf: Date,
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

    if (flow.expires_at < asOf) {
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
      challenge.expires_at < asOf
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
        await deps.webauthnProvider.getAuthenticationOptionsForChallenge({
          userId: flow.user_id,
          challenge: challenge.challenge,
        }),
    };
  }

  return {
    hydrateLoginFlow,
  };
}

import { deleteLoginFlow } from "../../login-flow/shared";
import type { PasskeyAuthRepos } from "./shared";
import type { PasskeyLoginFlowState } from "./types";

type PasskeyFlowRecord = Awaited<
  ReturnType<PasskeyAuthRepos["loginFlows"]["findById"]>
>;

interface PasskeyLoginStateServiceDeps {
  webauthnService: {
    getAuthenticationOptionsForChallenge(
      userId: number,
      challenge: string,
    ): Promise<PasskeyLoginFlowState["requestOptions"]>;
  };
}

export function createPasskeyLoginStateService(
  repos: PasskeyAuthRepos,
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
      state: "passkey",
      requestOptions:
        await deps.webauthnService.getAuthenticationOptionsForChallenge(
          flow.user_id,
          challenge.challenge,
        ),
    };
  }

  return {
    hydrateLoginFlow,
  };
}

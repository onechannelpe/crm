import type { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

type LoginFlowCleanupRepos = {
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
};

export async function deleteLoginFlow(
  flow: Awaited<ReturnType<LoginFlowCleanupRepos["loginFlows"]["findById"]>>,
  repos: LoginFlowCleanupRepos,
): Promise<void> {
  if (!flow) {
    return;
  }

  if (flow.challenge_id) {
    await repos.webauthnChallenges.delete(flow.challenge_id);
  }

  await repos.loginFlows.delete(flow.id);
}

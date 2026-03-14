import type { Repositories } from "~/server/shared/registry";

type LoginFlowCleanupRepos = Pick<
  Repositories,
  "loginFlows" | "webauthnChallenges"
>;

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

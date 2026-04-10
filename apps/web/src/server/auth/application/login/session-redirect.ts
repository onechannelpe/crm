import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { serverRuntime } from "~/server/runtime";

export async function replaceCurrentSessionAndResolveRedirect(input: {
  token: string;
  onboardingCompleted: boolean;
  role: Parameters<typeof getDefaultAppPath>[0];
}) {
  await replaceCurrentSession(input.token, (id) =>
    serverRuntime.auth.sessionService.invalidateSession(id),
  );
  return input.onboardingCompleted
    ? getDefaultAppPath(input.role)
    : "/onboarding";
}

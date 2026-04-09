import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";

export async function replaceCurrentSessionAndResolveRedirect(input: {
  token: string;
  onboardingCompleted: boolean;
  role: Parameters<typeof getDefaultAppPath>[0];
}) {
  await replaceCurrentSession(input.token);
  return input.onboardingCompleted
    ? getDefaultAppPath(input.role)
    : "/onboarding";
}

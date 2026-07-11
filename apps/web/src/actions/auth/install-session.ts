import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { getServerRuntime } from "~/server/platform/container";

// Revoke the prior session, then install the new cookie. Revocation
// failure must not block the install.
export async function installSession(token: string): Promise<void> {
  const previous = getSessionCookie();
  if (previous) {
    const previousId = hashSessionToken(previous);
    await getServerRuntime()
      .auth.sessionService.revoke(previousId)
      .catch(() => {});
  }

  setSessionCookie(token);
}

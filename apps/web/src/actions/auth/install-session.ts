import { getSessionCookie, setSessionCookie } from "~/lib/auth/session/cookies";
import { hashSessionToken } from "~/lib/auth/session/tokens";
import { getServerRuntime } from "~/server/platform/container";

/**
 * Installs a freshly issued token as the current session cookie and revokes the
 * session it replaces. Revocation of the prior session is best-effort: a
 * failure to delete the old row must not block installing the new cookie.
 */
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

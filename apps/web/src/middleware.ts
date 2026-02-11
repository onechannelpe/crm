import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie } from "vinxi/http";
import { getAuthSession } from "~/server/auth/session";
import {
  getUserPasskeyCount,
  isPasskeyRequired,
} from "~/lib/server/passkey-utils";

export default createMiddleware({
  onRequest: async (event) => {
    const url = new URL(event.request.url);
    const isPublic =
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/auth") ||
      url.pathname.startsWith("/_") ||
      url.pathname.includes(".");

    if (isPublic) return;

    const hasSession = !!getCookie(event.nativeEvent, "session");
    if (!hasSession) {
      return redirect("/login");
    }

    try {
      const session = await getAuthSession();
      const sessionData = session.data;

      if (sessionData?.userId && isPasskeyRequired(sessionData.role)) {
        if (!sessionData.passkeyVerified) {
          const count = await getUserPasskeyCount(sessionData.userId);
          return redirect(
            count === 0 ? "/auth/passkey-enroll" : "/auth/passkey-verify",
          );
        }
      }
    } catch {
      return redirect("/login");
    }
  },
});

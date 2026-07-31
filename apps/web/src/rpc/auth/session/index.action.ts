import { logoutUser } from "~/server/auth/flows/logout-user";
import { deleteSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function logout(): Promise<void> {
  "use server";

  await executeSessionServerFunction({
    name: "auth.session.logout",
    access: { kind: "session" },
    execute: (context) => logoutUser(context, composeAuth().sessionLogout),
  });

  // Only reached once revocation succeeded, so a cookie that survives an early
  // throw always points at a session that is already gone.
  deleteSessionCookie();
}

import { deleteSessionCookie } from "~/server/auth/session/cookies";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";

export async function logout(): Promise<void> {
  "use server";

  await executeSessionServerFunction({
    name: "auth.session.logout",
    access: { kind: "session" },
    execute: (context) => application.auth.sessions.logout(context),
  });

  // Only reached once revocation succeeded, so a cookie that survives an early
  // throw always points at a session that is already gone.
  deleteSessionCookie();
}

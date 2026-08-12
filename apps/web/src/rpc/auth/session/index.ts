import { deleteSessionCookie } from "~/server/auth/session/cookies";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";

export async function logout(): Promise<void> {
  "use server";

  await executeSessionServerFunction({
    name: "auth.session.logout",
    access: { kind: "session" },
    execute: (context) => application.auth.sessions.logout(context),
  });

  deleteSessionCookie();
}

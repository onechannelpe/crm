import "server-only";
import { redirect } from "@solidjs/router";

import type { OnboardingSnapshot } from "~/contracts/auth";
import { getSessionPath } from "~/domain/auth/access/route-policy";
import { getSession } from "~/server/platform/action/session";
import { application } from "~/server/platform/composition/application";
import { isErr } from "~/shared/result";

export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const session = await getSession();
  if (!session) {
    throw redirect("/login");
  }
  if (session.sessionClass !== "pre_auth") {
    throw redirect(getSessionPath(session.sessionClass, session.role));
  }

  const result = await application.auth.onboarding.snapshot(session.userId);
  if (isErr(result)) {
    throw redirect("/login");
  }
  return result.value;
}

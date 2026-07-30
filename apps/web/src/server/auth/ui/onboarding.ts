import { redirect } from "@solidjs/router";

import type { OnboardingSnapshot } from "~/contracts/auth";
import { getSessionPath } from "~/domain/auth/access/route-policy";
import { loadOnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { composeAuth } from "~/server/auth/ui/composition";
import { getSession } from "~/server/platform/action/session";
import { isErr } from "~/shared/result";

export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  "use server";

  const session = await getSession();
  if (!session) {
    throw redirect("/login");
  }
  if (session.sessionClass !== "pre_auth") {
    throw redirect(getSessionPath(session.sessionClass, session.role));
  }

  const result = await loadOnboardingSnapshot(
    composeAuth().setup.repos,
    session.userId,
  );
  if (isErr(result)) {
    throw redirect("/login");
  }
  return result.value;
}

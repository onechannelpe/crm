"use server";

import { redirect } from "@solidjs/router";

import type { OnboardingSnapshot } from "~/contracts/auth";
import { getSessionPath } from "~/lib/auth/access/route-policy";
import { getSession } from "~/lib/auth/access/session";
import { loadOnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { getServerRuntime } from "~/server/platform/container";
import { isErr } from "~/server/shared/result";

export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const session = await getSession();
  if (!session) {
    throw redirect("/login");
  }
  if (session.sessionClass !== "pre_auth") {
    throw redirect(getSessionPath(session.sessionClass, session.role));
  }

  const result = await loadOnboardingSnapshot(
    getServerRuntime().auth.setup.repos,
    session.userId,
  );
  if (isErr(result)) {
    throw redirect("/login");
  }
  return result.value;
}

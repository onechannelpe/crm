"use server";

import { redirect } from "@solidjs/router";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { getSession } from "~/lib/auth/access/session";
import type { OnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { loadOnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { getServerRuntime } from "~/server/platform/container";
import { isErr } from "~/server/shared/result";

export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const session = await getSession();
  if (!session) {
    throw redirect("/login");
  }
  if (session.onboardingCompleted) {
    throw redirect(getDefaultAppPath(session.role));
  }

  const result = await loadOnboardingSnapshot(
    getServerRuntime().auth.setup.repos,
    session.userId,
  );
  if (isErr(result)) {
    throw redirect("/login");
  }
  if (result.value.onboardingCompleted) {
    throw redirect(getDefaultAppPath(session.role));
  }

  return result.value;
}

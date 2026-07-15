"use server";

import { redirect } from "@solidjs/router";

import { parseLoginFlowId } from "~/features/auth/model/login-route-flow";
import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import type { AuthLoginFlowId } from "~/server/shared/ids";

export function readPasskeyStartMode(
  formData: FormData,
): "identified" | "discoverable" | null {
  const value = formData.get("mode");

  return value === "identified" || value === "discoverable" ? value : null;
}

export function readLoginText(
  formData: FormData,
  field: "identifier" | "password" | "totpCode" | "recoveryCode",
  options?: { trim?: boolean },
): string {
  const value = formData.get(field);

  if (typeof value !== "string") {
    return "";
  }

  return options?.trim === false ? value : value.trim();
}

export function readLoginFlowId(
  formData: FormData,
  field: "flowId",
): AuthLoginFlowId | null {
  const value = formData.get(field);

  return typeof value === "string" ? parseLoginFlowId(value) : null;
}

export function completeLoginAndRedirect(result: {
  token: string;
  role: Role;
  onboardingCompleted: boolean;
}): never {
  setSessionCookie(result.token);

  throw redirect(
    result.onboardingCompleted ? getDefaultAppPath(result.role) : "/onboarding",
  );
}

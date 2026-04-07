"use server";

import { redirect } from "@solidjs/router";

import { internalError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import type { SubmitPrimaryLoginError } from "~/lib/auth/flows/primary-login-service";
import { parseLoginFlowId } from "~/lib/auth/login-route-flow";
import type { BeginPasskeyLoginError } from "~/lib/auth/passkey/service";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import type {
  PasskeyStartSubmissionResult,
  PasswordLoginSubmissionResult,
} from "~/server/auth/application/contracts";

export function readPasskeyStartMode(
  formData: FormData,
): "identified" | "discoverable" | null {
  const value = formData.get("mode");
  return value === "identified" || value === "discoverable" ? value : null;
}

export function readLoginText(
  formData: FormData,
  field: "identifier" | "password" | "totpCode",
  options?: { trim?: boolean },
): string {
  const value = formData.get(field);
  if (typeof value !== "string") return "";
  return options?.trim === false ? value : value.trim();
}

export function readLoginFlowId(
  formData: FormData,
  field: "flowId",
): number | null {
  const value = formData.get(field);
  return typeof value === "string" ? parseLoginFlowId(value) : null;
}

export async function completeLoginAndRedirect(result: {
  token: string;
  role: Role;
  onboardingCompleted: boolean;
}): Promise<never> {
  await replaceCurrentSession(result.token);
  throw redirect(
    result.onboardingCompleted ? getDefaultAppPath(result.role) : "/onboarding",
  );
}

export function normalizePasskeyStartError(
  error: BeginPasskeyLoginError,
): PasskeyStartSubmissionResult {
  if (error.kind === "unexpected") {
    throw internalError(error.message);
  }

  return {
    ok: false,
    code: "invalid_credentials",
  };
}

export function resolvePasskeyStartAnalyticsCode(
  error: BeginPasskeyLoginError,
): "invalid_credentials" | "internal" {
  return error.kind === "unexpected" ? "internal" : "invalid_credentials";
}

export function normalizePasswordLoginError(
  error: SubmitPrimaryLoginError,
): PasswordLoginSubmissionResult {
  if (error.kind === "unexpected") {
    throw internalError(error.message ?? "Unexpected password login failure");
  }

  return {
    ok: false,
    code: error.kind,
  };
}

export function resolvePasswordAnalyticsCode(
  error: SubmitPrimaryLoginError,
): "invalid_credentials" | "strong_auth_required" | "internal" {
  return error.kind === "unexpected" ? "internal" : error.kind;
}

import { action, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  submitPasswordLogin,
  submitTotpForLoginFlow,
} from "~/lib/auth/login-flow";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { createPrivilegedLoginAlertSender } from "~/lib/auth/security/login-alerts";
import { replaceCurrentSession } from "~/lib/auth/session/login-completion";
import { env } from "~/lib/env";
import { getErrorMessage } from "~/lib/errors";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

const sendPrivilegedLoginAlert = createPrivilegedLoginAlertSender(repos, {
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

export type PasswordLoginSubmissionResult = {
  ok: false;
  code: "invalid_credentials";
  message: string;
};

export type TotpLoginSubmissionResult = {
  ok: false;
  code: "invalid_totp";
  message: string;
};

function readText(
  formData: FormData,
  field: "identifier" | "password" | "totpCode",
  options?: { trim?: boolean },
): string {
  const value = formData.get(field);
  if (typeof value !== "string") return "";
  return options?.trim === false ? value : value.trim();
}

function readPositiveInt(formData: FormData, field: "flowId"): number | null {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function completeLoginAndRedirect(result: {
  token: string;
  role: Role;
  onboardingCompleted: boolean;
}): Promise<never> {
  await replaceCurrentSession(result.token);
  throw redirect(
    result.onboardingCompleted ? getDefaultAppPath(result.role) : "/onboarding",
  );
}

function rethrowRedirect(error: unknown): void {
  if (error instanceof Response) throw error;
}

function getRequestContext() {
  const event = getRequestEvent();

  return {
    ipAddress: getClientIp(event?.request.headers ?? new Headers()),
    userAgent: event?.request.headers.get("user-agent") ?? null,
  };
}

export const passwordLoginMutation = action(
  async (formData: FormData): Promise<PasswordLoginSubmissionResult> => {
    const identifier = readText(formData, "identifier");
    const password = readText(formData, "password", { trim: false });

    try {
      const request = getRequestContext();
      const result = await submitPasswordLogin(
        {
          identifier,
          password,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
        repos,
        sendPrivilegedLoginAlert,
      );
      if (isErr(result)) {
        return {
          ok: false,
          code: "invalid_credentials",
          message: "Credenciales invalidas",
        };
      }

      if (result.value.kind === "totp_required") {
        throw redirect(`/login?flow=${result.value.flow.id}`);
      }

      await completeLoginAndRedirect(result.value.result);
      throw new Error("unreachable");
    } catch (error: unknown) {
      rethrowRedirect(error);
      return {
        ok: false,
        code: "invalid_credentials",
        message: getErrorMessage(error, "Credenciales invalidas"),
      };
    }
  },
  "passwordLogin",
);

export const totpLoginMutation = action(
  async (formData: FormData): Promise<TotpLoginSubmissionResult> => {
    const flowId = readPositiveInt(formData, "flowId");
    const totpCode = readText(formData, "totpCode");
    if (!flowId) {
      throw redirect("/login?error=flow_expired");
    }

    try {
      const request = getRequestContext();
      const result = await submitTotpForLoginFlow(
        {
          flowId,
          totpCode,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
        repos,
        sendPrivilegedLoginAlert,
      );
      if (isErr(result)) {
        if (result.error.kind === "flow_expired") {
          throw redirect("/login?error=flow_expired");
        }

        return {
          ok: false,
          code: "invalid_totp",
          message: "No se pudo verificar el codigo",
        };
      }

      await completeLoginAndRedirect(result.value.result);
      throw new Error("unreachable");
    } catch (error: unknown) {
      rethrowRedirect(error);
      return {
        ok: false,
        code: "invalid_totp",
        message: getErrorMessage(error, "No se pudo verificar el codigo"),
      };
    }
  },
  "totpLogin",
);

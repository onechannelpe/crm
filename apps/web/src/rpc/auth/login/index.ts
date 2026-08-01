import { redirect } from "@solidjs/router";

import type { PasskeyLoginFlowState } from "~/domain/auth/passkey/types";
import { fail, internal } from "~/domain/errors";
import {
  completeLoginAndRedirect,
  readLoginFlowId,
  readLoginText,
  readPasskeyStartMode,
} from "~/server/auth/ui/login-support";
import { throwDomain } from "~/server/platform/action/domain-error";
import { application } from "~/server/platform/composition/application";
import {
  getRequestClientMetadata,
  getRequestContext,
  getRequestInstant,
} from "~/server/platform/http/request-context";
import { getActionRequestContext } from "~/server/platform/observability/context";
import { isErr } from "~/shared/result";

function recordAuthAnalyticsEvent(
  event: Parameters<typeof application.auth.analytics>[0],
  context: Parameters<typeof application.auth.analytics>[1],
  occurredAt: Date,
) {
  return application.auth.analytics(event, context, occurredAt);
}

export async function passwordLogin(
  formData: FormData,
): Promise<{ nextStep: "passkey"; flow: PasskeyLoginFlowState }> {
  "use server";

  const identifier = readLoginText(formData, "identifier");
  const password = readLoginText(formData, "password", { trim: false });
  const request = getRequestClientMetadata();
  const analyticsContext = getActionRequestContext();
  const now = getRequestInstant();

  const result = await application.auth.login.password(
    {
      identifier,
      password,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    getRequestContext().publicOrigin,
    now,
  );

  if (isErr(result)) {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "password_result",
        outcome: "failed",
        code: result.error.kind,
      },
      analyticsContext,
      now,
    );

    throwDomain(fail(result.error.kind));
  }

  if (result.value.kind === "totp_required") {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "password_result",
        outcome: "totp_required",
      },
      analyticsContext,
      now,
    );

    throw redirect(`/login/verify?flow=${result.value.flow.id}`);
  }

  if (result.value.kind === "passkey_required") {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "password_result",
        outcome: "passkey_required",
      },
      analyticsContext,
      now,
    );

    return {
      nextStep: "passkey",
      flow: result.value.flow,
    };
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "password_result",
      outcome: "succeeded",
    },
    analyticsContext,
    now,
  );

  return completeLoginAndRedirect(result.value.result);
}

export async function passkeyStart(
  formData: FormData,
): Promise<{ flow: PasskeyLoginFlowState }> {
  "use server";

  const mode = readPasskeyStartMode(formData);

  if (!mode) {
    throwDomain(internal("Invalid passkey login mode"));
  }

  const request = getRequestClientMetadata();
  const analyticsContext = getActionRequestContext();
  const now = getRequestInstant();

  const command =
    mode === "identified"
      ? {
          identifier: readLoginText(formData, "identifier"),
          ipAddress: request.ipAddress,
          mode,
        }
      : {
          ipAddress: request.ipAddress,
          mode,
        };

  const result = await application.auth.login.startPasskey(
    command,
    getRequestContext().publicOrigin,
    now,
  );

  if (isErr(result)) {
    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "passkey_start_result",
        outcome: "failed",
        code: "invalid_credentials",
      },
      analyticsContext,
      now,
    );

    throwDomain(fail("invalid_credentials"));
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "passkey_start_result",
      outcome: "started",
    },
    analyticsContext,
    now,
  );

  return { flow: result.value };
}

export async function totpLogin(formData: FormData): Promise<void> {
  "use server";

  const flowId = readLoginFlowId(formData, "flowId");
  const totpCode = readLoginText(formData, "totpCode");

  if (!flowId) {
    throwDomain(fail("flow_expired"));
  }

  const request = getRequestClientMetadata();
  const analyticsContext = getActionRequestContext();
  const now = getRequestInstant();
  const verifiedAt = now;
  const verified = await application.auth.login.verifyTotp({
    flowId,
    totpCode,
    ipAddress: request.ipAddress,
    occurredAt: verifiedAt,
  });

  if (isErr(verified)) {
    if (verified.error.kind === "flow_expired") {
      await recordAuthAnalyticsEvent(
        {
          source: "server",
          kind: "totp_result",
          outcome: "failed",
          code: "flow_expired",
        },
        analyticsContext,
        now,
      );

      throwDomain(fail("flow_expired"));
    }

    await recordAuthAnalyticsEvent(
      {
        source: "server",
        kind: "totp_result",
        outcome: "failed",
        code: "invalid_totp",
      },
      analyticsContext,
      now,
    );

    throwDomain(fail("totp_code_invalid"));
  }

  const completed = await application.auth.login.complete({
    proof: verified.value,
    occurredAt: verifiedAt,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });
  if (isErr(completed)) {
    throwDomain(
      fail(
        completed.error.kind === "flow_expired"
          ? "flow_expired"
          : "totp_code_invalid",
      ),
    );
  }

  await recordAuthAnalyticsEvent(
    {
      source: "server",
      kind: "totp_result",
      outcome: "succeeded",
    },
    analyticsContext,
    now,
  );

  return completeLoginAndRedirect(completed.value);
}

export async function recoveryLogin(formData: FormData): Promise<void> {
  "use server";

  const flowId = readLoginFlowId(formData, "flowId");
  const recoveryCode = readLoginText(formData, "recoveryCode");

  if (!flowId) {
    throwDomain(fail("flow_expired"));
  }

  const request = getRequestClientMetadata();
  const verifiedAt = getRequestInstant();
  const verified = await application.auth.login.verifyRecovery({
    flowId,
    recoveryCode,
    ipAddress: request.ipAddress,
    occurredAt: verifiedAt,
  });

  if (isErr(verified)) {
    throwDomain(
      fail(
        verified.error.kind === "flow_expired"
          ? "flow_expired"
          : "recovery_code_invalid",
      ),
    );
  }

  const completed = await application.auth.login.complete({
    proof: verified.value,
    occurredAt: verifiedAt,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });
  if (isErr(completed)) {
    throwDomain(
      fail(
        completed.error.kind === "flow_expired"
          ? "flow_expired"
          : "recovery_code_invalid",
      ),
    );
  }

  return completeLoginAndRedirect(completed.value);
}
